import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { postsApi, commentsApi } from '../api/resources';
import PublicHeader from '../components/PublicHeader';
import { LoadingBlock, EmptyState } from '../components/Surfaces';
import Button from '../components/Button';
import { Textarea } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import './PostPage.css';

export default function PostPage() {
  const { slug } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLoading(true);
    postsApi
      .getBySlug(slug)
      .then(({ data }) => {
        setPost(data.data);
        return commentsApi.listForPost(data.data.post_id);
      })
      .then(({ data }) => setComments(data.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleLike = async () => {
    if (liked || !post) return;
    try {
      const { data } = await postsApi.like(post.post_id);
      setPost((p) => ({ ...p, like_count: data.data.likeCount }));
      setLiked(true);
    } catch {
      // silent fail on like
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const { data } = await commentsApi.create(post.post_id, { content: commentText.trim() });
      toast.success(
        ['admin', 'editor'].includes(user?.role)
          ? 'Commentaire publié.'
          : 'Commentaire envoyé, en attente de modération.'
      );
      if (['admin', 'editor'].includes(user?.role)) {
        setComments((prev) => [...prev, data.data]);
      }
      setCommentText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="public-page">
        <PublicHeader />
        <LoadingBlock label="Chargement de l'article…" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="public-page">
        <PublicHeader />
        <EmptyState title="Article introuvable" description="Cet article n'existe pas ou a été retiré." />
      </div>
    );
  }

  return (
    <div className="public-page">
      <PublicHeader />
      <article className="post-article">
        <span className="post-article-category">
          {post.category_name ? <Link to={`/?categorie=${post.category_slug}`}>{post.category_name}</Link> : 'Général'}
        </span>
        <h1>{post.title}</h1>
        <div className="post-article-meta">
          <span>{post.author_first_name || post.author_username}</span>
          <span className="dot">·</span>
          <span>{format(new Date(post.published_at || post.created_at), 'd MMMM yyyy', { locale: fr })}</span>
          <span className="dot">·</span>
          <span>{post.reading_time} min de lecture</span>
          <span className="dot">·</span>
          <span>{post.view_count} vues</span>
        </div>

        {post.tags?.length > 0 && (
          <div className="post-article-tags">
            {post.tags.map((t) => (
              <span key={t.tag_id} className="post-article-tag">#{t.name}</span>
            ))}
          </div>
        )}

        <div className="post-article-body" dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="post-article-actions">
          <button className={`like-btn ${liked ? 'is-liked' : ''}`} onClick={handleLike}>
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {post.like_count}
          </button>
          <span className="comment-count"><MessageCircle size={16} /> {comments.length}</span>
        </div>

        {post.author_bio && (
          <div className="author-card">
            <p className="author-card-label">À propos de l'auteur</p>
            <p className="author-card-name">{post.author_first_name} {post.author_last_name}</p>
            <p className="author-card-bio">{post.author_bio}</p>
          </div>
        )}

        {post.allow_comments && (
          <section className="comments-section">
            <h2>Commentaires ({comments.length})</h2>

            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="comment-form">
                <Textarea
                  placeholder="Partagez votre avis…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  required
                />
                <Button type="submit" size="sm" disabled={submittingComment}>
                  {submittingComment ? 'Envoi…' : 'Publier le commentaire'}
                </Button>
              </form>
            ) : (
              <p className="comment-login-prompt">
                <Link to="/connexion">Connectez-vous</Link> pour rejoindre la discussion.
              </p>
            )}

            {comments.length > 0 ? (
              <ul className="comment-list">
                {comments.map((c) => (
                  <li key={c.comment_id} className="comment-item">
                    <div className="comment-avatar">{(c.first_name || c.username || '?')[0]}</div>
                    <div>
                      <p className="comment-author">{c.first_name || c.username || 'Visiteur'}</p>
                      <p className="comment-text">{c.content}</p>
                      <p className="comment-date">
                        {format(new Date(c.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-comments">Soyez le premier à commenter cet article.</p>
            )}
          </section>
        )}
      </article>
    </div>
  );
}

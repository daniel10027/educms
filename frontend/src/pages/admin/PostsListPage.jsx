import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FileText, Eye, MessageSquareText, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { postsApi, categoriesApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { Input, Select } from '../../components/Field';
import { Ledger, LedgerRow } from '../../components/Ledger';
import StatusSeal from '../../components/StatusSeal';
import { LoadingBlock, EmptyState } from '../../components/Surfaces';
import { useAuth } from '../../context/AuthContext';
import './PostsListPage.css';

export default function PostsListPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadPosts = useCallback(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    postsApi
      .list(params)
      .then(({ data }) => setPosts(data.data))
      .catch(() => toast.error('Impossible de charger les articles.'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    categoriesApi.list().then(({ data }) => setCategories(data.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadPosts, 300);
    return () => clearTimeout(timeout);
  }, [loadPosts]);

  const handleDelete = async (post) => {
    if (!window.confirm(`Supprimer l'article « ${post.title} » ? Cette action est irréversible.`)) return;
    try {
      await postsApi.remove(post.post_id);
      toast.success('Article supprimé.');
      setPosts((prev) => prev.filter((p) => p.post_id !== post.post_id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const canEdit = (post) => ['admin', 'editor'].includes(user.role) || post.author_id === user.user_id;

  return (
    <AdminLayout
      title="Articles"
      subtitle={`${posts.length} article${posts.length > 1 ? 's' : ''} dans le registre`}
      actions={
        <Button as={Link} to="/admin/articles/nouveau">
          <Plus size={16} /> Nouvel article
        </Button>
      }
    >
      <div className="posts-toolbar">
        <div className="search-input">
          <Search size={16} />
          <input
            placeholder="Rechercher un article…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
          <option value="archived">Archivé</option>
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.slug}>{c.name}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <LoadingBlock label="Chargement du registre…" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun article ne correspond"
          description="Ajustez vos filtres ou créez un nouvel article."
          action={
            <Button as={Link} to="/admin/articles/nouveau" variant="secondary" size="sm">
              <Plus size={14} /> Créer un article
            </Button>
          }
        />
      ) : (
        <Ledger>
          {posts.map((post, i) => (
            <LedgerRow key={post.post_id} index={i + 1}>
              <div className="post-row">
                <div className="post-row-main">
                  <Link to={`/admin/articles/${post.post_id}/modifier`} className="post-row-title">
                    {post.title}
                  </Link>
                  <div className="post-row-meta">
                    <span>{post.author_username}</span>
                    <span className="dot">·</span>
                    <span>{post.category_name || 'Sans catégorie'}</span>
                    <span className="dot">·</span>
                    <span>
                      {format(new Date(post.created_at), "d MMM yyyy", { locale: fr })}
                    </span>
                    {post.status === 'published' && (
                      <>
                        <span className="dot">·</span>
                        <span className="post-row-stat"><Eye size={12} /> {post.view_count}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="post-row-actions">
                  <StatusSeal status={post.status} size="sm" />
                  {canEdit(post) && (
                    <>
                      <Link to={`/admin/articles/${post.post_id}/modifier`} className="row-icon-btn" aria-label="Modifier">
                        <Pencil size={15} />
                      </Link>
                      <button className="row-icon-btn row-icon-danger" onClick={() => handleDelete(post)} aria-label="Supprimer">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </LedgerRow>
          ))}
        </Ledger>
      )}
    </AdminLayout>
  );
}

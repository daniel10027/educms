import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { postsApi, categoriesApi } from '../api/resources';
import PublicHeader from '../components/PublicHeader';
import { LoadingBlock, EmptyState } from '../components/Surfaces';
import { FileText } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    categoriesApi.list().then(({ data }) => setCategories(data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { sort: 'published', limit: 20 };
    if (activeCategory) params.category = activeCategory;
    postsApi.list(params).then(({ data }) => setPosts(data.data)).finally(() => setLoading(false));
  }, [activeCategory]);

  const featured = posts.find((p) => p.is_featured) || posts[0];
  const rest = posts.filter((p) => p.post_id !== featured?.post_id);

  return (
    <div className="public-page">
      <PublicHeader />

      <section className="hero-section">
        <span className="hero-eyebrow">Cabinet de contenu éducatif</span>
        <h1>Des ressources rédigées avec soin,<br />classées pour durer.</h1>
        <p className="hero-subtitle">
          Articles, tutoriels et notes de cours, organisés comme un véritable catalogue de bibliothèque.
        </p>
      </section>

      <div className="category-pills">
        <button
          className={`category-pill ${!activeCategory ? 'is-active' : ''}`}
          onClick={() => setActiveCategory('')}
        >
          Tout
        </button>
        {categories.map((c) => (
          <button
            key={c.category_id}
            className={`category-pill ${activeCategory === c.slug ? 'is-active' : ''}`}
            onClick={() => setActiveCategory(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <main className="home-main">
        {loading ? (
          <LoadingBlock label="Chargement des articles…" />
        ) : posts.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun article publié pour l'instant" />
        ) : (
          <>
            {featured && (
              <Link to={`/articles/${featured.slug}`} className="featured-card">
                <span className="featured-eyebrow">À la une</span>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
                <span className="featured-meta">
                  {featured.category_name} · {format(new Date(featured.published_at || featured.created_at), 'd MMMM yyyy', { locale: fr })} · {featured.reading_time} min de lecture
                </span>
              </Link>
            )}

            <div className="post-grid">
              {rest.map((post) => (
                <Link key={post.post_id} to={`/articles/${post.slug}`} className="post-card">
                  <span className="post-card-category">{post.category_name || 'Général'}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <span className="post-card-meta">
                    {format(new Date(post.published_at || post.created_at), 'd MMM yyyy', { locale: fr })} · {post.reading_time} min
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

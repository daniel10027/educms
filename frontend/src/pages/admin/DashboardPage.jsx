import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Eye, MessageSquare, Users, ArrowUpRight } from 'lucide-react';
import { usersApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import { Card, LoadingBlock, EmptyState } from '../../components/Surfaces';
import StatusSeal from '../../components/StatusSeal';
import { useAuth } from '../../context/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi
      .dashboard()
      .then(({ data }) => setStats(data.data))
      .finally(() => setLoading(false));
  }, []);

  const publishedCount = stats?.posts?.find((p) => p.status === 'published')?.count || 0;
  const draftCount = stats?.posts?.find((p) => p.status === 'draft')?.count || 0;
  const pendingComments = stats?.comments?.find((c) => c.status === 'pending')?.count || 0;

  return (
    <AdminLayout
      title={`Bonjour, ${user?.first_name || user?.username}`}
      subtitle="Voici un aperçu de l'activité du cabinet."
    >
      {loading ? (
        <LoadingBlock label="Préparation du tableau de bord…" />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon={FileText} label="Articles publiés" value={publishedCount} accent="pine" />
            <StatCard icon={FileText} label="Brouillons en cours" value={draftCount} accent="amber" />
            <StatCard icon={Eye} label="Vues cumulées" value={stats?.totalViews ?? 0} accent="seal" />
            <StatCard icon={Users} label="Membres du cabinet" value={stats?.totalUsers ?? 0} accent="bark" />
          </div>

          <div className="dashboard-columns">
            <Card className="dashboard-panel">
              <div className="panel-header">
                <h2>Derniers articles</h2>
                <Link to="/admin/articles" className="panel-link">
                  Tout voir <ArrowUpRight size={14} />
                </Link>
              </div>
              {stats?.recentPosts?.length ? (
                <ul className="panel-list">
                  {stats.recentPosts.map((post) => (
                    <li key={post.post_id}>
                      <div className="panel-list-main">
                        <span className="panel-list-title">{post.title}</span>
                        <span className="panel-list-meta">{post.view_count} vues</span>
                      </div>
                      <StatusSeal status={post.status} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FileText} title="Aucun article pour l'instant" />
              )}
            </Card>

            <Card className="dashboard-panel">
              <div className="panel-header">
                <h2>Commentaires récents</h2>
                {pendingComments > 0 && (
                  <Link to="/admin/commentaires" className="panel-link panel-link-flag">
                    {pendingComments} en attente
                  </Link>
                )}
              </div>
              {stats?.recentComments?.length ? (
                <ul className="panel-list">
                  {stats.recentComments.map((c) => (
                    <li key={c.comment_id}>
                      <div className="panel-list-main">
                        <span className="panel-list-title">{c.content?.slice(0, 60)}{c.content?.length > 60 ? '…' : ''}</span>
                        <span className="panel-list-meta">sur « {c.post_title} »</span>
                      </div>
                      <StatusSeal status={c.status} size="sm" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={MessageSquare} title="Aucun commentaire pour l'instant" />
              )}
            </Card>
          </div>

          {stats?.topPosts?.length > 0 && (
            <Card className="dashboard-panel" style={{ marginTop: '1.5rem' }}>
              <div className="panel-header">
                <h2>Articles les plus consultés</h2>
              </div>
              <ul className="panel-list">
                {stats.topPosts.map((post, i) => (
                  <li key={post.post_id}>
                    <div className="panel-list-main">
                      <span className="rank-badge">{i + 1}</span>
                      <span className="panel-list-title">{post.title}</span>
                    </div>
                    <span className="panel-list-meta">{post.view_count} vues</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className={`stat-card stat-accent-${accent}`}>
      <div className="stat-icon">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </Card>
  );
}

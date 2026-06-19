import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Check, Ban, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { commentsApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import { Select } from '../../components/Field';
import { Ledger, LedgerRow } from '../../components/Ledger';
import StatusSeal from '../../components/StatusSeal';
import { LoadingBlock, EmptyState } from '../../components/Surfaces';
import './CommentsPage.css';

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  const load = useCallback(() => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter, limit: 50 } : { limit: 50 };
    commentsApi.listAll(params).then(({ data }) => setComments(data.data)).finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(load, [load]);

  const handleModerate = async (comment, status) => {
    try {
      await commentsApi.moderate(comment.comment_id, status);
      toast.success('Commentaire mis à jour.');
      setComments((prev) => prev.filter((c) => c.comment_id !== comment.comment_id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible.');
    }
  };

  const handleDelete = async (comment) => {
    if (!window.confirm('Supprimer définitivement ce commentaire ?')) return;
    try {
      await commentsApi.remove(comment.comment_id);
      toast.success('Commentaire supprimé.');
      setComments((prev) => prev.filter((c) => c.comment_id !== comment.comment_id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  return (
    <AdminLayout
      title="Commentaires"
      subtitle="Modérez les échanges sur vos articles"
      actions={
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="pending">En attente</option>
          <option value="approved">Approuvés</option>
          <option value="spam">Indésirables</option>
          <option value="">Tous</option>
        </Select>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : comments.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Rien à modérer ici" description="Les nouveaux commentaires apparaîtront dans cette liste." />
      ) : (
        <Ledger>
          {comments.map((c, i) => (
            <LedgerRow key={c.comment_id} index={i + 1}>
              <div className="comment-row">
                <div className="comment-row-main">
                  <p className="comment-row-content">{c.content}</p>
                  <p className="comment-row-meta">
                    {c.username || 'Visiteur'} · sur « {c.post_title} » ·{' '}
                    {format(new Date(c.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
                <div className="comment-row-actions">
                  <StatusSeal status={c.status} size="sm" />
                  {c.status !== 'approved' && (
                    <button className="row-icon-btn" onClick={() => handleModerate(c, 'approved')} aria-label="Approuver">
                      <Check size={15} />
                    </button>
                  )}
                  {c.status !== 'spam' && (
                    <button className="row-icon-btn" onClick={() => handleModerate(c, 'spam')} aria-label="Marquer indésirable">
                      <Ban size={15} />
                    </button>
                  )}
                  <button className="row-icon-btn row-icon-danger" onClick={() => handleDelete(c)} aria-label="Supprimer">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </LedgerRow>
          ))}
        </Ledger>
      )}
    </AdminLayout>
  );
}

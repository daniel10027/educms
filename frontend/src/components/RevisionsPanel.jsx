import { useEffect, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { postsApi } from '../api/resources';
import Button from './Button';
import { LoadingBlock, EmptyState } from './Surfaces';
import './RevisionsPanel.css';

export default function RevisionsPanel({ postId, onClose, onRestored }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    postsApi
      .revisions(postId)
      .then(({ data }) => setRevisions(data.data))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleRestore = async (revisionId) => {
    if (!window.confirm('Restaurer cette révision ? Le contenu actuel sera remplacé.')) return;
    setRestoringId(revisionId);
    try {
      await postsApi.restoreRevision(postId, revisionId);
      toast.success('Révision restaurée.');
      onRestored();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restauration impossible.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="revisions-overlay" onClick={onClose}>
      <div className="revisions-panel" onClick={(e) => e.stopPropagation()}>
        <header className="revisions-header">
          <h2>Historique des révisions</h2>
          <button className="revisions-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="revisions-body">
          {loading ? (
            <LoadingBlock label="Chargement de l'historique…" />
          ) : revisions.length === 0 ? (
            <EmptyState title="Aucune révision enregistrée" description="Les modifications futures apparaîtront ici." />
          ) : (
            <ul className="revisions-list">
              {revisions.map((rev) => (
                <li key={rev.revision_id} className="revisions-item">
                  <div>
                    <p className="revisions-item-title">{rev.title}</p>
                    <p className="revisions-item-meta">
                      {rev.edited_by_username || 'Inconnu'} ·{' '}
                      {format(new Date(rev.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(rev.revision_id)}
                    disabled={restoringId === rev.revision_id}
                  >
                    <RotateCcw size={14} />
                    {restoringId === rev.revision_id ? 'Restauration…' : 'Restaurer'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

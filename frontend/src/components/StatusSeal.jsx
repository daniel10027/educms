import './StatusSeal.css';

const CONFIG = {
  published: { label: 'Publié', className: 'seal-published' },
  draft: { label: 'Brouillon', className: 'seal-draft' },
  archived: { label: 'Archivé', className: 'seal-archived' },
  pending: { label: 'En attente', className: 'seal-draft' },
  approved: { label: 'Approuvé', className: 'seal-published' },
  spam: { label: 'Indésirable', className: 'seal-archived' },
  trash: { label: 'Corbeille', className: 'seal-archived' },
};

export default function StatusSeal({ status, size = 'md' }) {
  const config = CONFIG[status] || { label: status, className: 'seal-draft' };
  return (
    <span className={`status-seal ${config.className} seal-${size}`}>
      <span className="seal-ring" aria-hidden="true" />
      {config.label}
    </span>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { Card, LoadingBlock, EmptyState } from '../../components/Surfaces';
import './MediaPage.css';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');

export default function MediaPage() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    mediaApi.list({ limit: 60 }).then(({ data }) => setMedia(data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await mediaApi.upload(formData);
      toast.success('Fichier importé.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Importation impossible.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Supprimer ce fichier de la médiathèque ?')) return;
    try {
      await mediaApi.remove(item.media_id);
      toast.success('Fichier supprimé.');
      setMedia((prev) => prev.filter((m) => m.media_id !== item.media_id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const copyUrl = (item) => {
    const url = `${API_ORIGIN}${item.file_path}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié.');
  };

  return (
    <AdminLayout
      title="Médiathèque"
      subtitle="Images et documents disponibles pour vos articles"
      actions={
        <>
          <input ref={fileInputRef} type="file" hidden onChange={handleFileSelect} accept="image/*,application/pdf" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={16} /> {uploading ? 'Import…' : 'Importer un fichier'}
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : media.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Médiathèque vide"
          description="Importez des images pour illustrer vos articles."
        />
      ) : (
        <div className="media-grid">
          {media.map((item) => (
            <Card key={item.media_id} className="media-tile">
              <div className="media-tile-preview">
                {item.file_type === 'image' ? (
                  <img src={`${API_ORIGIN}/uploads/thumb-${item.filename}`} alt={item.alt_text || item.original_name} loading="lazy" />
                ) : (
                  <div className="media-tile-doc"><ImageIcon size={28} /></div>
                )}
              </div>
              <div className="media-tile-info">
                <p className="media-tile-name" title={item.original_name}>{item.original_name}</p>
                <p className="media-tile-meta">{formatSize(item.file_size)}</p>
              </div>
              <div className="media-tile-actions">
                <button className="row-icon-btn" onClick={() => copyUrl(item)} aria-label="Copier le lien"><Copy size={14} /></button>
                <button className="row-icon-btn row-icon-danger" onClick={() => handleDelete(item)} aria-label="Supprimer"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} Ko`;
  return `${(kb / 1024).toFixed(1)} Mo`;
}

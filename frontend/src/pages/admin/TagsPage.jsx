import { useEffect, useState } from 'react';
import { Plus, Tags as TagsIcon, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { tagsApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { Field, Input } from '../../components/Field';
import { Card, LoadingBlock, EmptyState } from '../../components/Surfaces';
import './TaxonomyPage.css';

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    tagsApi.list().then(({ data }) => setTags(data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await tagsApi.create({ name: name.trim() });
      toast.success('Étiquette créée.');
      setName('');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Supprimer l'étiquette « ${tag.name} » ?`)) return;
    try {
      await tagsApi.remove(tag.tag_id);
      toast.success('Étiquette supprimée.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  return (
    <AdminLayout
      title="Étiquettes"
      subtitle="Mots-clés pour affiner la recherche d'articles"
      actions={<Button onClick={() => setShowForm((v) => !v)}><Plus size={16} /> Nouvelle étiquette</Button>}
    >
      {showForm && (
        <Card className="taxonomy-form-card">
          <div className="taxonomy-form-header">
            <h3>Nouvelle étiquette</h3>
            <button className="row-icon-btn" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="taxonomy-form" style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Field label="Nom" required htmlFor="tag-name" style={{ flex: 1 }}>
              <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={saving}>{saving ? '…' : 'Ajouter'}</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <LoadingBlock />
      ) : tags.length === 0 ? (
        <EmptyState icon={TagsIcon} title="Aucune étiquette" description="Créez des étiquettes pour catégoriser finement vos articles." />
      ) : (
        <div className="tag-grid">
          {tags.map((tag) => (
            <Card key={tag.tag_id} className="tag-grid-item">
              <span>{tag.name}</span>
              <div className="tag-grid-item-meta">
                <span className="taxonomy-count">{tag.post_count}</span>
                <button className="row-icon-btn row-icon-danger" onClick={() => handleDelete(tag)} aria-label="Supprimer">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

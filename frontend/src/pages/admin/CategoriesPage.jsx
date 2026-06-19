import { useEffect, useState } from 'react';
import { Plus, FolderTree, Trash2, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoriesApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { Field, Input, Textarea } from '../../components/Field';
import { Card, LoadingBlock, EmptyState } from '../../components/Surfaces';
import { Ledger, LedgerRow } from '../../components/Ledger';
import './TaxonomyPage.css';

const EMPTY = { name: '', description: '' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    categoriesApi.list().then(({ data }) => setCategories(data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setShowForm(true); };
  const openEdit = (cat) => { setForm({ name: cat.name, description: cat.description || '' }); setEditingId(cat.category_id); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await categoriesApi.update(editingId, form);
        toast.success('Catégorie mise à jour.');
      } else {
        await categoriesApi.create(form);
        toast.success('Catégorie créée.');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie « ${cat.name} » ?`)) return;
    try {
      await categoriesApi.remove(cat.category_id);
      toast.success('Catégorie supprimée.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  return (
    <AdminLayout
      title="Catégories"
      subtitle="Organisez les articles par thème"
      actions={<Button onClick={openCreate}><Plus size={16} /> Nouvelle catégorie</Button>}
    >
      {showForm && (
        <Card className="taxonomy-form-card">
          <div className="taxonomy-form-header">
            <h3>{editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
            <button className="row-icon-btn" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="taxonomy-form">
            <Field label="Nom" required htmlFor="cat-name">
              <Input id="cat-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Field>
            <Field label="Description" htmlFor="cat-desc">
              <Textarea id="cat-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <LoadingBlock />
      ) : categories.length === 0 ? (
        <EmptyState icon={FolderTree} title="Aucune catégorie" description="Créez votre première catégorie pour classer les articles." />
      ) : (
        <Ledger>
          {categories.map((cat, i) => (
            <LedgerRow key={cat.category_id} index={i + 1}>
              <div className="taxonomy-row">
                <div>
                  <p className="taxonomy-row-name">{cat.name}</p>
                  {cat.description && <p className="taxonomy-row-desc">{cat.description}</p>}
                </div>
                <div className="taxonomy-row-actions">
                  <span className="taxonomy-count">{cat.post_count} article{cat.post_count !== 1 ? 's' : ''}</span>
                  <button className="row-icon-btn" onClick={() => openEdit(cat)} aria-label="Modifier"><Pencil size={15} /></button>
                  <button className="row-icon-btn row-icon-danger" onClick={() => handleDelete(cat)} aria-label="Supprimer"><Trash2 size={15} /></button>
                </div>
              </div>
            </LedgerRow>
          ))}
        </Ledger>
      )}
    </AdminLayout>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { postsApi, categoriesApi, tagsApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { Field, Input, Textarea, Select } from '../../components/Field';
import { Card, LoadingBlock } from '../../components/Surfaces';
import RevisionsPanel from '../../components/RevisionsPanel';
import './PostEditorPage.css';

const EMPTY_POST = {
  title: '',
  content: '',
  excerpt: '',
  categoryId: '',
  status: 'draft',
  tags: [],
  metaTitle: '',
  metaDescription: '',
  isFeatured: false,
  allowComments: true,
};

export default function PostEditorPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_POST);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(({ data }) => setCategories(data.data));
    tagsApi.list().then(({ data }) => setTags(data.data));
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    setLoading(true);
    postsApi
      .getById(id)
      .then(({ data }) => {
        const post = data.data;
        setForm({
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || '',
          categoryId: post.category_id || '',
          status: post.status,
          tags: post.tags?.map((t) => t.tag_id) || [],
          metaTitle: post.meta_title || '',
          metaDescription: post.meta_description || '',
          isFeatured: post.is_featured,
          allowComments: post.allow_comments,
        });
      })
      .catch(() => {
        toast.error('Article introuvable.');
        navigate('/admin/articles');
      })
      .finally(() => setLoading(false));
  }, [id, isEditing, navigate]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleTag = (tagId) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tagId) ? f.tags.filter((t) => t !== tagId) : [...f.tags, tagId],
    }));
  };

  const handleSubmit = async (e, statusOverride) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Le titre et le contenu sont obligatoires.');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      status: statusOverride || form.status,
    };
    try {
      if (isEditing) {
        await postsApi.update(id, payload);
        toast.success('Article mis à jour.');
      } else {
        const { data } = await postsApi.create(payload);
        toast.success('Article créé.');
        navigate(`/admin/articles/${data.data.post_id}/modifier`, { replace: true });
        setSaving(false);
        return;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Chargement…">
        <LoadingBlock />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEditing ? 'Modifier l\'article' : 'Nouvel article'}
      subtitle={isEditing ? `Référence #${id}` : 'Rédigez et classez un nouvel article'}
      actions={
        <>
          <Button variant="ghost" onClick={() => navigate('/admin/articles')}>
            <ArrowLeft size={16} /> Retour
          </Button>
          {isEditing && (
            <Button variant="ghost" onClick={() => setShowRevisions(true)}>
              <History size={16} /> Révisions
            </Button>
          )}
        </>
      }
    >
      <form className="editor-grid" onSubmit={(e) => handleSubmit(e)}>
        <div className="editor-main">
          <Card className="editor-card">
            <Field label="Titre" required htmlFor="title">
              <Input
                id="title"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Titre de l'article"
                required
              />
            </Field>
            <Field label="Contenu" required htmlFor="content" hint="Le HTML simple est accepté (titres, paragraphes, listes).">
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="<p>Rédigez votre article ici…</p>"
                rows={16}
                required
              />
            </Field>
            <Field label="Extrait" htmlFor="excerpt" hint="Laissez vide pour générer automatiquement à partir du contenu.">
              <Textarea
                id="excerpt"
                value={form.excerpt}
                onChange={(e) => handleChange('excerpt', e.target.value)}
                rows={3}
              />
            </Field>
          </Card>

          <Card className="editor-card">
            <h3 className="editor-section-title">Référencement (SEO)</h3>
            <Field label="Titre méta" htmlFor="metaTitle">
              <Input id="metaTitle" value={form.metaTitle} onChange={(e) => handleChange('metaTitle', e.target.value)} />
            </Field>
            <Field label="Description méta" htmlFor="metaDescription">
              <Textarea id="metaDescription" value={form.metaDescription} onChange={(e) => handleChange('metaDescription', e.target.value)} rows={2} />
            </Field>
          </Card>
        </div>

        <div className="editor-sidebar">
          <Card className="editor-card">
            <h3 className="editor-section-title">Publication</h3>
            <Field label="Statut" htmlFor="status">
              <Select id="status" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </Select>
            </Field>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => handleChange('isFeatured', e.target.checked)}
              />
              Mettre en avant
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.allowComments}
                onChange={(e) => handleChange('allowComments', e.target.checked)}
              />
              Autoriser les commentaires
            </label>

            <div className="editor-save-actions">
              <Button type="submit" disabled={saving} style={{ width: '100%' }}>
                <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              {form.status !== 'published' && (
                <Button
                  type="button"
                  variant="pine"
                  disabled={saving}
                  style={{ width: '100%' }}
                  onClick={(e) => handleSubmit(e, 'published')}
                >
                  Publier maintenant
                </Button>
              )}
            </div>
          </Card>

          <Card className="editor-card">
            <h3 className="editor-section-title">Catégorie</h3>
            <Select value={form.categoryId} onChange={(e) => handleChange('categoryId', e.target.value)}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </Select>
          </Card>

          <Card className="editor-card">
            <h3 className="editor-section-title">Étiquettes</h3>
            <div className="tag-cloud">
              {tags.map((tag) => (
                <button
                  key={tag.tag_id}
                  type="button"
                  className={`tag-chip ${form.tags.includes(tag.tag_id) ? 'is-selected' : ''}`}
                  onClick={() => toggleTag(tag.tag_id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </form>

      {showRevisions && isEditing && (
        <RevisionsPanel
          postId={id}
          onClose={() => setShowRevisions(false)}
          onRestored={() => window.location.reload()}
        />
      )}
    </AdminLayout>
  );
}

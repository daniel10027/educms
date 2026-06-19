import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Field, Input } from '../components/Field';
import Button from '../components/Button';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      await register(form);
      navigate('/admin', { replace: true });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const fieldErrors = {};
        apiErrors.forEach((fe) => { fieldErrors[fe.field] = fe.message; });
        setErrors(fieldErrors);
      } else {
        toast.error(err.response?.data?.message || 'Inscription impossible.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <BookOpen size={22} strokeWidth={1.75} />
          <span>EduCMS</span>
        </div>
        <h1 className="auth-title">Créer un compte</h1>
        <p className="auth-subtitle">Rejoignez le cabinet de rédaction en quelques instants.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Prénom" htmlFor="firstName">
              <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} />
            </Field>
            <Field label="Nom" htmlFor="lastName">
              <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} />
            </Field>
          </div>
          <Field label="Nom d'utilisateur" required error={errors.username} htmlFor="username">
            <Input id="username" name="username" value={form.username} onChange={handleChange} required />
          </Field>
          <Field label="Adresse e-mail" required error={errors.email} htmlFor="email">
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </Field>
          <Field
            label="Mot de passe"
            required
            error={errors.password}
            hint="8 caractères minimum, avec au moins un chiffre."
            htmlFor="password"
          >
            <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
          </Field>
          <Button type="submit" size="lg" disabled={submitting} style={{ marginTop: '0.5rem' }}>
            {submitting ? 'Création…' : 'Créer mon compte'}
          </Button>
        </form>

        <p className="auth-switch">
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
      <div className="auth-illustration" aria-hidden="true">
        <div className="auth-illustration-card">
          <span className="auth-illustration-eyebrow">Cahier no. 02</span>
          <p>
            « Chaque nouvel arrivant commence comme abonné — les rôles s'élèvent
            à mesure que la confiance se construit. »
          </p>
        </div>
      </div>
    </div>
  );
}

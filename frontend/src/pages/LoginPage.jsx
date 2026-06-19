import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Field, Input } from '../components/Field';
import Button from '../components/Button';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      const dest = location.state?.from?.pathname || '/admin';
      navigate(dest, { replace: true });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const fieldErrors = {};
        apiErrors.forEach((fe) => { fieldErrors[fe.field] = fe.message; });
        setErrors(fieldErrors);
      } else {
        toast.error(err.response?.data?.message || 'Connexion impossible.');
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
        <h1 className="auth-title">Bon retour</h1>
        <p className="auth-subtitle">Connectez-vous pour accéder au cabinet de rédaction.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <Field label="Adresse e-mail" required error={errors.email} htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vous@etablissement.edu"
              value={form.email}
              onChange={handleChange}
              required
            />
          </Field>
          <Field label="Mot de passe" required error={errors.password} htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </Field>
          <Button type="submit" size="lg" disabled={submitting} style={{ marginTop: '0.5rem' }}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <p className="auth-switch">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>

        <div className="auth-demo-note">
          <span className="auth-demo-label">Compte de démonstration</span>
          <code>admin@educms.local — Admin123!</code>
        </div>
      </div>
      <div className="auth-illustration" aria-hidden="true">
        <div className="auth-illustration-card">
          <span className="auth-illustration-eyebrow">Cahier no. 01</span>
          <p>
            « Un système de gestion de contenu pensé comme un cabinet de bibliothèque :
            chaque article classé, chaque révision conservée. »
          </p>
        </div>
      </div>
    </div>
  );
}

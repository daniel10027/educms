import { Link } from 'react-router-dom';
import Button from '../components/Button';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      <span className="notfound-eyebrow">Référence introuvable</span>
      <h1>Erreur 404</h1>
      <p>Cette page n'existe pas dans le registre, ou a été déplacée.</p>
      <Button as={Link} to="/">Retour à l'accueil</Button>
    </div>
  );
}

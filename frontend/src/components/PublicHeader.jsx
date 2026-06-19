import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import './PublicHeader.css';

export default function PublicHeader() {
  const { isAuthenticated, isStaff } = useAuth();

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link to="/" className="public-brand">
          <BookOpen size={20} strokeWidth={1.75} />
          <span>EduCMS</span>
        </Link>
        <nav className="public-nav">
          {isAuthenticated && isStaff ? (
            <Button as={Link} to="/admin" variant="secondary" size="sm">Cabinet de rédaction</Button>
          ) : (
            <Button as={Link} to="/connexion" variant="secondary" size="sm">Se connecter</Button>
          )}
        </nav>
      </div>
    </header>
  );
}

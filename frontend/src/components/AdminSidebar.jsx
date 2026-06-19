import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, FileText, FolderTree, Tags, MessageSquare,
  Image, Users, LogOut, BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminSidebar.css';

const NAV_ITEMS = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutGrid, end: true, roles: ['admin', 'editor', 'author'] },
  { to: '/admin/articles', label: 'Articles', icon: FileText, roles: ['admin', 'editor', 'author'] },
  { to: '/admin/categories', label: 'Catégories', icon: FolderTree, roles: ['admin', 'editor'] },
  { to: '/admin/etiquettes', label: 'Étiquettes', icon: Tags, roles: ['admin', 'editor', 'author'] },
  { to: '/admin/commentaires', label: 'Commentaires', icon: MessageSquare, roles: ['admin', 'editor'] },
  { to: '/admin/medias', label: 'Médiathèque', icon: Image, roles: ['admin', 'editor', 'author'] },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users, roles: ['admin'] },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-spine" aria-hidden="true" />
      <div className="sidebar-content">
        <div className="sidebar-brand">
          <BookOpen size={20} strokeWidth={1.75} />
          <span>EduCMS</span>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={17} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/admin/profil" className="sidebar-account">
            <span className="account-initial">{user?.first_name?.[0] || user?.username?.[0] || '?'}</span>
            <span className="account-info">
              <span className="account-name">{user?.first_name || user?.username}</span>
              <span className="account-role">{roleLabel(user?.role)}</span>
            </span>
          </NavLink>
          <button className="sidebar-logout" onClick={logout} type="button" aria-label="Se déconnecter">
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function roleLabel(role) {
  const labels = { admin: 'Administrateur', editor: 'Éditeur', author: 'Auteur', subscriber: 'Abonné' };
  return labels[role] || role;
}

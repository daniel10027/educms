import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

export default function AdminLayout({ title, subtitle, actions, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell">
      <div className={`admin-sidebar-wrap ${mobileOpen ? 'is-open' : ''}`}>
        <AdminSidebar />
      </div>
      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="admin-topbar-text">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="admin-topbar-actions">{actions}</div>}
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

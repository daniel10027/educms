import { useEffect, useState } from 'react';
import { Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usersApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import { Select } from '../../components/Field';
import { Ledger, LedgerRow } from '../../components/Ledger';
import { LoadingBlock, EmptyState } from '../../components/Surfaces';
import { useAuth } from '../../context/AuthContext';
import './UsersPage.css';

const ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'author', label: 'Auteur' },
  { value: 'subscriber', label: 'Abonné' },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    usersApi.list({ limit: 100 }).then(({ data }) => setUsers(data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRoleChange = async (u, role) => {
    try {
      await usersApi.updateRole(u.user_id, role);
      toast.success('Rôle mis à jour.');
      setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? { ...x, role } : x)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible.');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      const { data } = await usersApi.toggleActive(u.user_id);
      toast.success(data.data.is_active ? 'Compte réactivé.' : 'Compte désactivé.');
      setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? { ...x, is_active: data.data.is_active } : x)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action impossible.');
    }
  };

  return (
    <AdminLayout title="Utilisateurs" subtitle="Membres du cabinet de rédaction">
      {loading ? (
        <LoadingBlock />
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Aucun utilisateur" />
      ) : (
        <Ledger>
          {users.map((u, i) => (
            <LedgerRow key={u.user_id} index={i + 1}>
              <div className="user-row">
                <div className="user-row-main">
                  <p className="user-row-name">
                    {u.first_name || u.username} {u.last_name || ''}
                    {!u.is_active && <span className="user-inactive-badge">Désactivé</span>}
                  </p>
                  <p className="user-row-meta">
                    {u.email} · membre depuis {format(new Date(u.created_at), 'MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div className="user-row-actions">
                  <Select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                    disabled={u.user_id === currentUser.user_id}
                    style={{ maxWidth: 160 }}
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                  <button
                    className="user-toggle-btn"
                    onClick={() => handleToggleActive(u)}
                    disabled={u.user_id === currentUser.user_id}
                  >
                    {u.is_active ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </div>
            </LedgerRow>
          ))}
        </Ledger>
      )}
    </AdminLayout>
  );
}

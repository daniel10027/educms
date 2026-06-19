import { useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi, authApi } from '../../api/resources';
import AdminLayout from '../../components/AdminLayout';
import Button from '../../components/Button';
import { Field, Input, Textarea } from '../../components/Field';
import { Card } from '../../components/Surfaces';
import { useAuth } from '../../context/AuthContext';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    bio: user?.bio || '',
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await usersApi.updateProfile(profileForm);
      updateUser(data.data);
      toast.success('Profil mis à jour.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await authApi.changePassword(passwordForm);
      toast.success('Mot de passe modifié. Reconnectez-vous.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Modification impossible.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AdminLayout title="Mon profil" subtitle="Gérez vos informations personnelles">
      <div className="profile-grid">
        <Card className="profile-card">
          <h3 className="editor-section-title">Informations</h3>
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Prénom" htmlFor="firstName">
                <Input id="firstName" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} />
              </Field>
              <Field label="Nom" htmlFor="lastName">
                <Input id="lastName" value={profileForm.lastName} onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} />
              </Field>
            </div>
            <Field label="Biographie" htmlFor="bio">
              <Textarea id="bio" rows={3} value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))} />
            </Field>
            <Button type="submit" disabled={savingProfile}>{savingProfile ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </form>
        </Card>

        <Card className="profile-card">
          <h3 className="editor-section-title">Mot de passe</h3>
          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <Field label="Mot de passe actuel" required htmlFor="currentPassword">
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                required
              />
            </Field>
            <Field label="Nouveau mot de passe" required htmlFor="newPassword" hint="8 caractères minimum, avec au moins un chiffre.">
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                required
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={savingPassword}>
              {savingPassword ? 'Modification…' : 'Modifier le mot de passe'}
            </Button>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}

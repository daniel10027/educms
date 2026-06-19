import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import PostPage from './pages/PostPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

import DashboardPage from './pages/admin/DashboardPage';
import PostsListPage from './pages/admin/PostsListPage';
import PostEditorPage from './pages/admin/PostEditorPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import TagsPage from './pages/admin/TagsPage';
import CommentsPage from './pages/admin/CommentsPage';
import MediaPage from './pages/admin/MediaPage';
import UsersPage from './pages/admin/UsersPage';
import ProfilePage from './pages/admin/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1C1A17',
              color: '#FAF7F0',
              fontSize: '14px',
              borderRadius: '8px',
            },
          }}
        />
        <Routes>
          {/* Public site */}
          <Route path="/" element={<HomePage />} />
          <Route path="/articles/:slug" element={<PostPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />

          {/* Admin — staff only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'author']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/articles"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'author']}>
                <PostsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/articles/nouveau"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'author']}>
                <PostEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/articles/:id/modifier"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'author']}>
                <PostEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute roles={['admin', 'editor']}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/etiquettes"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'author']}>
                <TagsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/commentaires"
            element={
              <ProtectedRoute roles={['admin', 'editor']}>
                <CommentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/medias"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'author']}>
                <MediaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/utilisateurs"
            element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profil"
            element={
              <ProtectedRoute roles={['admin', 'editor', 'author', 'subscriber']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

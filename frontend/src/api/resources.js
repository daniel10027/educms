import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  register: (payload) => client.post('/auth/register', payload),
  me: () => client.get('/auth/me'),
  logout: (refreshToken) => client.post('/auth/logout', { refreshToken }),
  changePassword: (payload) => client.post('/auth/change-password', payload),
};

export const postsApi = {
  list: (params) => client.get('/posts', { params }),
  getBySlug: (slug) => client.get(`/posts/${slug}`),
  getById: (id) => client.get(`/posts/by-id/${id}`),
  create: (payload) => client.post('/posts', payload),
  update: (id, payload) => client.put(`/posts/${id}`, payload),
  remove: (id) => client.delete(`/posts/${id}`),
  revisions: (id) => client.get(`/posts/${id}/revisions`),
  restoreRevision: (id, revisionId) => client.post(`/posts/${id}/revisions/${revisionId}/restore`),
  like: (id) => client.post(`/posts/${id}/like`),
};

export const categoriesApi = {
  list: () => client.get('/categories'),
  get: (slug) => client.get(`/categories/${slug}`),
  create: (payload) => client.post('/categories', payload),
  update: (id, payload) => client.put(`/categories/${id}`, payload),
  remove: (id) => client.delete(`/categories/${id}`),
};

export const tagsApi = {
  list: () => client.get('/tags'),
  create: (payload) => client.post('/tags', payload),
  update: (id, payload) => client.put(`/tags/${id}`, payload),
  remove: (id) => client.delete(`/tags/${id}`),
};

export const commentsApi = {
  listForPost: (postId) => client.get(`/comments/post/${postId}`),
  listAll: (params) => client.get('/comments', { params }),
  create: (postId, payload) => client.post(`/comments/post/${postId}`, payload),
  moderate: (id, status) => client.patch(`/comments/${id}/moderate`, { status }),
  remove: (id) => client.delete(`/comments/${id}`),
};

export const mediaApi = {
  list: (params) => client.get('/media', { params }),
  upload: (formData, onUploadProgress) =>
    client.post('/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  update: (id, payload) => client.put(`/media/${id}`, payload),
  remove: (id) => client.delete(`/media/${id}`),
};

export const usersApi = {
  list: (params) => client.get('/users', { params }),
  dashboard: () => client.get('/users/dashboard'),
  stats: (id) => client.get(`/users/${id}/stats`),
  updateProfile: (payload) => client.put('/users/profile', payload),
  updateRole: (id, role) => client.patch(`/users/${id}/role`, { role }),
  toggleActive: (id) => client.patch(`/users/${id}/toggle-active`),
};

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const getStoredAuth = () => {
  try {
    return JSON.parse(localStorage.getItem('educms_auth') || 'null');
  } catch {
    return null;
  }
};

const setStoredAuth = (auth) => {
  if (auth) {
    localStorage.setItem('educms_auth', JSON.stringify(auth));
  } else {
    localStorage.removeItem('educms_auth');
  }
};

client.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

let refreshPromise = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const auth = getStoredAuth();

    if (
      error.response?.status === 401 &&
      auth?.refreshToken &&
      !original._retry &&
      !original.url.includes('/auth/')
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/auth/refresh`, { refreshToken: auth.refreshToken })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const { data } = await refreshPromise;
        const newAuth = { ...auth, accessToken: data.data.accessToken };
        setStoredAuth(newAuth);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return client(original);
      } catch (refreshError) {
        setStoredAuth(null);
        window.location.href = '/connexion';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { getStoredAuth, setStoredAuth };
export default client;

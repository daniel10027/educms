import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/resources';
import { getStoredAuth, setStoredAuth } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = getStoredAuth();
      if (stored?.accessToken) {
        try {
          const { data } = await authApi.me();
          setUser(data.data);
        } catch {
          setStoredAuth(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    const { user: loggedUser, accessToken, refreshToken } = data.data;
    setStoredAuth({ accessToken, refreshToken });
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    const { user: newUser, accessToken, refreshToken } = data.data;
    setStoredAuth({ accessToken, refreshToken });
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    const stored = getStoredAuth();
    try {
      await authApi.logout(stored?.refreshToken);
    } catch {
      // ignore network errors on logout
    }
    setStoredAuth(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isStaff: !!user && ['admin', 'editor', 'author'].includes(user.role),
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

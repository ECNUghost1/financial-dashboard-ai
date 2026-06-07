import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, isLoading, login, register, logout, checkAuth, init } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isLoading,
    login,
    register,
    logout,
    init,
    isAuthenticated: !!user,
  };
};

export const useRequireAuth = () => {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/';
    }
  }, [user, isLoading]);

  return { user, isLoading };
};
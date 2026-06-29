import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api';
import toast from 'react-hot-toast';

export function useAuth() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore();

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await authApi.login({ email, password });
      setAuth(data.user, data.accessToken);
      toast.success('Login successful');
      navigate('/');
      return data;
    } catch (error) {
      const msg = error.response?.data?.error || 'Login failed';
      toast.error(msg);
      throw error;
    }
  }, [setAuth, navigate]);

  const pinLogin = useCallback(async (pin, branchId) => {
    try {
      const { data } = await authApi.pinLogin({ pin, branchId });
      setAuth(data.user, data.accessToken);
      toast.success('Login successful');
      navigate('/pos');
      return data;
    } catch (error) {
      const msg = error.response?.data?.error || 'Login failed';
      toast.error(msg);
      throw error;
    }
  }, [setAuth, navigate]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  return { user, isAuthenticated, login, pinLogin, logout };
}

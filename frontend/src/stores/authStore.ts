import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
  fullName: string;
  companyName?: string;
  plan: 'free' | 'pro' | 'enterprise';
  apiQuotaMonthly?: number;
  apiQuotaUsed?: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, companyName?: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (fullName: string, companyName?: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      set({ user, token, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Login failed', loading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, fullName: string, companyName?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', { email, password, fullName, companyName });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      set({ user, token, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Registration failed', loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/auth/profile');
      set({ user: response.data.user, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch profile', loading: false });
      throw error;
    }
  },

  updateProfile: async (fullName: string, companyName?: string) => {
    try {
      const response = await api.put('/auth/profile', { fullName, companyName });
      set({ user: response.data.user });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update profile' });
      throw error;
    }
  },
}));

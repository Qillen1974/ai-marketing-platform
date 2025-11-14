import { create } from 'zustand';

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface AdminAuthStore {
  token: string | null;
  admin: AdminUser | null;
  isLoggedIn: boolean;
  login: (token: string, admin: AdminUser) => void;
  logout: () => void;
  loadFromLocalStorage: () => void;
}

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  token: null,
  admin: null,
  isLoggedIn: false,

  login: (token: string, admin: AdminUser) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('admin', JSON.stringify(admin));
    set({
      token,
      admin,
      isLoggedIn: true,
    });
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    localStorage.removeItem('token'); // Also remove regular token
    set({
      token: null,
      admin: null,
      isLoggedIn: false,
    });
  },

  loadFromLocalStorage: () => {
    if (typeof window !== 'undefined') {
      // Try to load adminToken first, then fall back to regular token
      let token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const adminStr = localStorage.getItem('admin');
      if (token && adminStr) {
        try {
          const admin = JSON.parse(adminStr);
          set({
            token,
            admin,
            isLoggedIn: true,
          });
        } catch (error) {
          console.error('Error loading admin auth:', error);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin');
          localStorage.removeItem('token');
        }
      }
    }
  },
}));

import { create } from 'zustand';
import api from '@/lib/api';

interface Website {
  id: number;
  domain: string;
  targetKeywords?: string;
  lastAuditDate?: string;
  monitoringEnabled: boolean;
  createdAt: string;
}

interface WebsiteStore {
  websites: Website[];
  selectedWebsite: Website | null;
  loading: boolean;
  error: string | null;

  fetchWebsites: () => Promise<void>;
  addWebsite: (domain: string, targetKeywords?: string) => Promise<void>;
  updateWebsite: (id: number, data: Partial<Website>) => Promise<void>;
  deleteWebsite: (id: number) => Promise<void>;
  selectWebsite: (website: Website | null) => void;
}

export const useWebsiteStore = create<WebsiteStore>((set) => ({
  websites: [],
  selectedWebsite: null,
  loading: false,
  error: null,

  fetchWebsites: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/websites');
      set({ websites: response.data.websites, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to fetch websites', loading: false });
      throw error;
    }
  },

  addWebsite: async (domain: string, targetKeywords?: string) => {
    try {
      const response = await api.post('/websites', { domain, targetKeywords });
      set((state) => ({ websites: [...state.websites, response.data.website] }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to add website' });
      throw error;
    }
  },

  updateWebsite: async (id: number, data: Partial<Website>) => {
    try {
      const response = await api.put(`/websites/${id}`, data);
      set((state) => ({
        websites: state.websites.map((w) => (w.id === id ? response.data.website : w)),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update website' });
      throw error;
    }
  },

  deleteWebsite: async (id: number) => {
    try {
      await api.delete(`/websites/${id}`);
      set((state) => ({ websites: state.websites.filter((w) => w.id !== id) }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete website' });
      throw error;
    }
  },

  selectWebsite: (website: Website | null) => {
    set({ selectedWebsite: website });
  },
}));

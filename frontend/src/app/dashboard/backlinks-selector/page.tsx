'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWebsiteStore } from '@/stores/websiteStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BacklinkStats {
  totalBacklinks: number;
  newThisMonth: number;
  totalReferringDomains: number;
  lastCheckDate?: string;
}

interface WebsiteWithStats {
  id: number;
  domain: string;
  stats: BacklinkStats | null;
  loading: boolean;
}

export default function BacklinksSelectorPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websites = useWebsiteStore((state) => state.websites);
  const fetchWebsites = useWebsiteStore((state) => state.fetchWebsites);
  const [loading, setLoading] = useState(true);
  const [websiteStats, setWebsiteStats] = useState<Record<number, BacklinkStats | null>>({});
  const [loadingStats, setLoadingStats] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadWebsites = async () => {
      try {
        await fetchWebsites();
      } catch (error) {
        toast.error('Failed to load websites');
      } finally {
        setLoading(false);
      }
    };

    loadWebsites();
  }, [token]);

  // Load backlink stats for all websites
  useEffect(() => {
    if (websites.length > 0 && token) {
      websites.forEach(async (website) => {
        if (!websiteStats[website.id] && !loadingStats[website.id]) {
          setLoadingStats(prev => ({ ...prev, [website.id]: true }));
          try {
            const [metricsResponse, historyResponse] = await Promise.all([
              api.get(`/backlinks/${website.id}/metrics`).catch(() => null),
              api.get(`/backlinks/${website.id}/checks`).catch(() => null),
            ]);

            const lastCheck = historyResponse?.data?.checks?.[0];
            setWebsiteStats(prev => ({
              ...prev,
              [website.id]: metricsResponse?.data ? {
                totalBacklinks: metricsResponse.data.totalBacklinks || 0,
                newThisMonth: metricsResponse.data.newThisMonth || 0,
                totalReferringDomains: metricsResponse.data.totalReferringDomains || 0,
                lastCheckDate: lastCheck?.check_date || null,
              } : null,
            }));
          } catch (error) {
            console.error(`Error loading stats for website ${website.id}:`, error);
            setWebsiteStats(prev => ({ ...prev, [website.id]: null }));
          } finally {
            setLoadingStats(prev => ({ ...prev, [website.id]: false }));
          }
        }
      });
    }
  }, [websites, token]);

  const handleSelectWebsite = (websiteId: number) => {
    router.push(`/dashboard/backlinks/${websiteId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Backlinks Monitor</h1>
        <p className="text-gray-600 mt-2">Select a website to view its backlinks</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading websites...</p>
        </div>
      ) : websites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🌐</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No websites yet</h3>
          <p className="text-gray-600 mb-4">
            Add a website to start monitoring backlinks
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((website) => {
            const stats = websiteStats[website.id];
            const isLoadingStats = loadingStats[website.id];

            return (
              <div
                key={website.id}
                onClick={() => handleSelectWebsite(website.id)}
                className="bg-white rounded-lg shadow hover:shadow-xl transition cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{website.domain}</h3>
                    {stats?.lastCheckDate ? (
                      <p className="text-xs text-gray-500">Last check: {formatDate(stats.lastCheckDate)}</p>
                    ) : (
                      <p className="text-xs text-gray-500">No checks yet</p>
                    )}
                  </div>
                  <div className="text-3xl">🔗</div>
                </div>

                {/* Stats Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {isLoadingStats ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xl font-bold text-gray-900">{stats.totalBacklinks}</p>
                        <p className="text-xs text-gray-500">Backlinks</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-green-600">+{stats.newThisMonth}</p>
                        <p className="text-xs text-gray-500">This Month</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-blue-600">{stats.totalReferringDomains}</p>
                        <p className="text-xs text-gray-500">Domains</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-500 py-2">Run first check to see stats</p>
                  )}
                </div>

                <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition">
                  View Backlinks
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

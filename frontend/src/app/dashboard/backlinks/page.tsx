'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface WebsiteOption {
  id: number;
  domain: string;
}

interface BacklinkStats {
  totalOpportunities: number;
  discovered: number;
  contacted: number;
  pending: number;
  secured: number;
  rejected: number;
  avgDomainAuthority: number;
  avgRelevance: number;
}

export default function BacklinksPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<number | null>(null);
  const [stats, setStats] = useState<BacklinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('guest_posts');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadWebsites();
  }, [token]);

  const loadWebsites = async () => {
    setLoading(true);
    try {
      const response = await api.get('/websites');
      setWebsites(response.data.websites);
      if (response.data.websites.length > 0) {
        setSelectedWebsiteId(response.data.websites[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (websiteId: number) => {
    try {
      const response = await api.get(`/backlinks/${websiteId}/stats`);
      setStats(response.data.stats);
    } catch (error: any) {
      console.error('Failed to load stats');
    }
  };

  useEffect(() => {
    if (selectedWebsiteId) {
      loadStats(selectedWebsiteId);
    }
  }, [selectedWebsiteId]);

  const handleDiscoverOpportunities = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWebsiteId) {
      toast.error('Please select a website');
      return;
    }

    setDiscovering(true);
    try {
      const response = await api.post(`/backlinks/${selectedWebsiteId}/discover`, {
        campaignName: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        campaignType,
      });

      toast.success(`Found ${response.data.opportunities.length} backlink opportunities!`);
      setCampaignName('');
      loadStats(selectedWebsiteId);

      // Navigate to opportunities view
      router.push(`/dashboard/backlinks/${selectedWebsiteId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to discover opportunities');
    } finally {
      setDiscovering(false);
    }
  };

  if (!token) return null;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const selectedWebsite = websites.find((w) => w.id === selectedWebsiteId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Backlink Building</h1>
        <p className="text-gray-600 mt-2">
          Discover high-quality backlink opportunities and manage your link building campaigns
        </p>
      </div>

      {websites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No websites added yet. Please add a website first.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Website Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Website
            </label>
            <select
              value={selectedWebsiteId || ''}
              onChange={(e) => setSelectedWebsiteId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.domain}
                </option>
              ))}
            </select>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold">Total Opportunities</h3>
                <p className="text-3xl font-bold mt-2 text-blue-600">
                  {stats.totalOpportunities}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold">Secured Backlinks</h3>
                <p className="text-3xl font-bold mt-2 text-green-600">{stats.secured}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold">Avg Domain Authority</h3>
                <p className="text-3xl font-bold mt-2 text-orange-600">{stats.avgDomainAuthority}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold">Avg Relevance</h3>
                <p className="text-3xl font-bold mt-2 text-purple-600">{stats.avgRelevance}%</p>
              </div>
            </div>
          )}

          {/* Discover Opportunities */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Discover New Opportunities</h2>
            <p className="text-gray-600 mb-6">
              Scan {selectedWebsite?.domain} for high-quality backlink opportunities based on your
              target keywords
            </p>

            <form onSubmit={handleDiscoverOpportunities} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Q1 Guest Post Campaign"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opportunity Type
                  </label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="guest_posts">Guest Posts</option>
                    <option value="broken_links">Broken Links</option>
                    <option value="resource_pages">Resource Pages</option>
                    <option value="directories">Directories</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={discovering}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {discovering ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Scanning for opportunities...
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    Discover Opportunities
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-1 gap-4">
            <button
              onClick={() => {
                if (selectedWebsiteId) {
                  router.push(`/dashboard/backlinks/${selectedWebsiteId}`);
                }
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow hover:shadow-lg transition text-left"
            >
              <h3 className="text-lg font-bold mb-1">View Opportunities</h3>
              <p className="text-blue-100">Browse and manage discovered backlink opportunities</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

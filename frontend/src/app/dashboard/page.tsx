'use client';

import { useAuthStore } from '@/stores/authStore';
import { useWebsiteStore } from '@/stores/websiteStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import BacklinkHealthWidget from '@/components/BacklinkHealthWidget';

interface QuotaData {
  plan: string;
  usage: {
    audits: { used: number; limit: number };
    backlink_discovery: { used: number; limit: number };
    email_sent: { used: number; limit: number };
  };
}

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const websites = useWebsiteStore((state) => state.websites);
  const fetchWebsites = useWebsiteStore((state) => state.fetchWebsites);
  const addWebsite = useWebsiteStore((state) => state.addWebsite);
  const deleteWebsite = useWebsiteStore((state) => state.deleteWebsite);

  const [domain, setDomain] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        // Load websites
        await fetchWebsites();

        // Load quota data
        const quotaResponse = await api.get('/quota');
        setQuotaData(quotaResponse.data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) {
      toast.error('Domain is required');
      return;
    }

    setAddingWebsite(true);
    try {
      await addWebsite(domain, targetKeywords);
      setDomain('');
      setTargetKeywords('');
      toast.success('Website added successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add website');
    } finally {
      setAddingWebsite(false);
    }
  };

  const handleDeleteWebsite = async (id: number) => {
    if (!confirm('Are you sure you want to delete this website?')) return;

    try {
      await deleteWebsite(id);
      toast.success('Website deleted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete website');
    }
  };

  if (!token) return null;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.fullName}! Manage your websites and track their performance.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Total Websites</h3>
          <p className="text-3xl font-bold mt-2">{websites.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Plan</h3>
          <p className="text-3xl font-bold mt-2">{user?.plan.toUpperCase()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Monthly Audits</h3>
          <p className="text-3xl font-bold mt-2">
            {quotaData ? `${quotaData.usage.audits.used}/${quotaData.usage.audits.limit}` : 'Loading...'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {quotaData ? `${quotaData.usage.audits.limit - quotaData.usage.audits.used} remaining` : ''}
          </p>
        </div>
      </div>

      {/* Add Website Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Add New Website</h2>
        <form onSubmit={handleAddWebsite} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
                placeholder="seo, digital marketing"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={addingWebsite}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {addingWebsite ? 'Adding...' : 'Add Website'}
          </button>
        </form>
      </div>

      {/* Websites List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Your Websites</h2>
        </div>

        {websites.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No websites added yet. Add one to get started!
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {websites.map((website) => (
              <div key={website.id} className="px-6 py-6">
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {website.domain}
                      </h3>
                      {website.targetKeywords && (
                        <p className="text-sm text-gray-500 mt-1">
                          Keywords: {website.targetKeywords}
                        </p>
                      )}
                      {website.lastAuditDate && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last audit: {new Date(website.lastAuditDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => router.push(`/dashboard/website/${website.id}`)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        Audit
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/rankings/${website.id}`)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm flex items-center gap-1"
                      >
                        📊 Rankings
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/backlinks/${website.id}`)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                      >
                        Backlinks
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/reddit/${website.id}`)}
                        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm flex items-center gap-1"
                      >
                        🔗 Reddit
                      </button>
                      <button
                        onClick={() => handleDeleteWebsite(website.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Backlink Health Widget */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <BacklinkHealthWidget websiteId={website.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

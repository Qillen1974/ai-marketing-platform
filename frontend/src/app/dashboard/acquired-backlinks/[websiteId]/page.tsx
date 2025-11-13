'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface AcquiredBacklink {
  id: number;
  backlinkUrl: string;
  anchorText: string;
  referringDomain: string;
  domainAuthority: number;
  isActive: boolean;
  verifiedDate: string;
  lastChecked: string;
  createdAt: string;
}

interface BacklinkHealth {
  totalBacklinks: number;
  activeBacklinks: number;
  brokenBacklinks: number;
  activePercentage: number;
  averageDomainAuthority: number;
  averageHealth: number;
  healthStatus: string;
}

interface FilterOptions {
  status: string;
  searchTerm: string;
}

export default function AcquiredBacklinksPage({
  params,
}: {
  params: { websiteId: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [backlinks, setBacklinks] = useState<AcquiredBacklink[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    searchTerm: '',
  });
  const [health, setHealth] = useState<BacklinkHealth | null>(null);
  const [selectedBacklink, setSelectedBacklink] = useState<AcquiredBacklink | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadAcquiredBacklinks();
    loadBacklinkHealth();
  }, [token, filters]);

  const loadAcquiredBacklinks = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/monitoring/${websiteId}/acquired`);
      let filteredBacklinks = response.data.backlinks || [];

      // Client-side filtering
      if (filters.status === 'active') {
        filteredBacklinks = filteredBacklinks.filter((b: AcquiredBacklink) => b.isActive);
      } else if (filters.status === 'broken') {
        filteredBacklinks = filteredBacklinks.filter((b: AcquiredBacklink) => !b.isActive);
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredBacklinks = filteredBacklinks.filter(
          (b: AcquiredBacklink) =>
            b.referringDomain.toLowerCase().includes(searchLower) ||
            b.backlinkUrl.toLowerCase().includes(searchLower) ||
            (b.anchorText && b.anchorText.toLowerCase().includes(searchLower))
        );
      }

      setBacklinks(filteredBacklinks);
    } catch (error: any) {
      toast.error('Failed to load acquired backlinks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadBacklinkHealth = async () => {
    try {
      const response = await api.get(`/monitoring/${websiteId}/health`);
      setHealth(response.data.health);
    } catch (error: any) {
      console.error('Failed to load backlink health:', error);
    }
  };

  const handleVerifyAllBacklinks = async () => {
    if (backlinks.length === 0) {
      toast.error('No backlinks to verify');
      return;
    }

    setVerifying(true);
    try {
      await api.post(`/monitoring/${websiteId}/check-all`);
      toast.success('All backlinks verified! Refreshing data...');

      // Reload data after verification
      setTimeout(() => {
        loadAcquiredBacklinks();
        loadBacklinkHealth();
      }, 1500);
    } catch (error: any) {
      toast.error('Failed to verify backlinks');
      console.error(error);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyBacklink = async (backlinkId: number) => {
    try {
      await api.post(`/monitoring/${websiteId}/acquired/${backlinkId}/verify`);
      toast.success('Backlink verified!');

      // Reload data
      loadAcquiredBacklinks();
      loadBacklinkHealth();
    } catch (error: any) {
      toast.error('Failed to verify backlink');
      console.error(error);
    }
  };

  if (!token) return null;

  const getHealthColor = (status: string) => {
    if (status === 'Excellent') return 'text-green-600';
    if (status === 'Good') return 'text-blue-600';
    return 'text-orange-600';
  };

  const getHealthBgColor = (status: string) => {
    if (status === 'Excellent') return 'bg-green-50 border-green-200';
    if (status === 'Good') return 'bg-blue-50 border-blue-200';
    return 'bg-orange-50 border-orange-200';
  };

  const getActiveStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Acquired Backlinks</h1>
          <p className="text-gray-600 mt-2">
            Track and monitor all your acquired backlinks
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/backlinks/${websiteId}`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          ← Back to Opportunities
        </button>
      </div>

      {/* Health Overview */}
      {health && (
        <div className={`rounded-lg shadow p-8 mb-8 border-l-4 ${getHealthBgColor(health.healthStatus)}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className={`text-2xl font-bold ${getHealthColor(health.healthStatus)}`}>
                {health.healthStatus}
              </h2>
              <p className="text-gray-600 mt-1">Overall Backlink Health Status</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600">Active Backlinks</p>
                <p className="text-3xl font-bold text-green-600">{health.activeBacklinks}</p>
                <p className="text-xs text-gray-500 mt-1">of {health.totalBacklinks} total</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Domain Authority</p>
                <p className="text-3xl font-bold text-blue-600">{health.averageDomainAuthority}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-700">Health Score</p>
              <p className="text-sm font-bold text-gray-900">{health.averageHealth}/100</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  health.averageHealth >= 80
                    ? 'bg-green-600'
                    : health.averageHealth >= 60
                    ? 'bg-blue-600'
                    : 'bg-orange-600'
                }`}
                style={{ width: `${Math.min(health.averageHealth, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {health && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-xs text-gray-600 mb-1">Total Backlinks</p>
            <p className="text-3xl font-bold text-blue-600">{health.totalBacklinks}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-xs text-gray-600 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600">{health.activeBacklinks}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-xs text-gray-600 mb-1">Broken</p>
            <p className="text-3xl font-bold text-red-600">{health.brokenBacklinks}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-xs text-gray-600 mb-1">Active Rate</p>
            <p className="text-3xl font-bold text-purple-600">{health.activePercentage}%</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold">Filters</h2>
          <button
            onClick={handleVerifyAllBacklinks}
            disabled={verifying || backlinks.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium disabled:bg-gray-400 flex items-center gap-2"
          >
            {verifying ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                Verifying...
              </>
            ) : (
              <>
                <span>🔍</span>
                Verify All Backlinks
              </>
            )}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by domain, URL, or anchor text..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="broken">Broken</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backlinks List */}
      {loading ? (
        <div className="text-center py-8">Loading acquired backlinks...</div>
      ) : backlinks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No acquired backlinks found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {backlinks.map((backlink) => (
            <div key={backlink.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{backlink.referringDomain}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getActiveStatusColor(
                        backlink.isActive
                      )}`}
                    >
                      {backlink.isActive ? '✅ Active' : '❌ Broken'}
                    </span>
                  </div>
                  <a
                    href={backlink.backlinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {backlink.backlinkUrl}
                  </a>
                </div>
              </div>

              <div className="grid md:grid-cols-5 gap-4 mb-4 py-4 border-t border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-600">Domain Authority</p>
                  <p className="text-2xl font-bold text-blue-600">{backlink.domainAuthority || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Anchor Text</p>
                  <p className="font-semibold text-gray-900 truncate">
                    {backlink.anchorText || 'No anchor text'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Added</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(backlink.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Last Checked</p>
                  <p className="font-semibold text-gray-900">
                    {backlink.lastChecked
                      ? new Date(backlink.lastChecked).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <p className={`font-bold ${backlink.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {backlink.isActive ? 'Live' : 'Broken'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedBacklink(backlink);
                    setShowDetails(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                >
                  View Details
                </button>

                <button
                  onClick={() => handleVerifyBacklink(backlink.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm flex items-center gap-1"
                >
                  <span>🔍</span>
                  Verify Now
                </button>

                <a
                  href={backlink.backlinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
                >
                  Visit Page
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedBacklink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedBacklink.referringDomain}</h2>
                  <span
                    className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${getActiveStatusColor(
                      selectedBacklink.isActive
                    )}`}
                  >
                    {selectedBacklink.isActive ? '✅ Active' : '❌ Broken'}
                  </span>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Backlink URL</p>
                  <a
                    href={selectedBacklink.backlinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {selectedBacklink.backlinkUrl}
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Domain Authority</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedBacklink.domainAuthority || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Anchor Text</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBacklink.anchorText || 'No anchor text'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Date Added</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedBacklink.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Verified</p>
                    <p className="font-semibold text-gray-900">
                      {selectedBacklink.lastChecked
                        ? new Date(selectedBacklink.lastChecked).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Never verified'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Status Summary</p>
                  <p className="text-sm text-gray-600">
                    {selectedBacklink.isActive
                      ? '✅ This backlink is currently active and live on the referring domain.'
                      : '❌ This backlink appears to be broken or no longer available on the referring domain.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleVerifyBacklink(selectedBacklink.id)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                >
                  <span>🔍</span>
                  Verify Backlink
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

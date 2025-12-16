'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BacklinkData {
  id: number;
  referring_url: string;
  referring_domain: string;
  anchor_text: string | null;
  link_type: string;
  is_dofollow: boolean;
  first_found_date: string;
  last_seen_date: string;
  status: string;
  domain_authority?: number;
  inlink_rank?: number;
}

interface BacklinkMetrics {
  totalBacklinks: number;
  newThisMonth: number;
  totalReferringDomains: number;
  dofollowPercentage: number;
  averageDomainAuthority: number | null;
  topReferringDomains: Array<{
    referring_domain: string;
    backlinks_count: number;
  }>;
}

export default function BacklinksMonitorPage({
  params,
}: {
  params: { websiteId: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [backlinks, setBacklinks] = useState<BacklinkData[]>([]);
  const [metrics, setMetrics] = useState<BacklinkMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [expandedBacklink, setExpandedBacklink] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [linkTypeFilter, setLinkTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadBacklinks();
  }, [token, statusFilter, linkTypeFilter]);

  const loadBacklinks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (linkTypeFilter !== 'all') params.append('linkType', linkTypeFilter);

      const response = await api.get(`/backlinks/${websiteId}/latest?${params.toString()}`);
      setBacklinks(response.data.backlinks);
      setMetrics(response.data.metrics);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load backlinks');
      }
      console.error('Error loading backlinks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckBacklinks = async () => {
    setChecking(true);
    try {
      const response = await api.post(`/backlinks/${websiteId}/check`);
      toast.success(
        `Found ${response.data.totalBacklinks} backlinks! (${response.data.newBacklinks} new, ${response.data.lostBacklinks} lost)`
      );
      setBacklinks(response.data.backlinks);
      setMetrics(response.data.metrics);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to check backlinks');
      console.error('Error checking backlinks:', error);
    } finally {
      setChecking(false);
    }
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backlinks Monitor</h1>
            <p className="text-gray-600 mt-2">Track all backlinks pointing to your domain</p>
          </div>
          <button
            onClick={handleCheckBacklinks}
            disabled={checking}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium flex items-center gap-2 transition"
          >
            {checking ? '🔄 Checking...' : '🔗 Check Backlinks'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Total Backlinks</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalBacklinks}</p>
            <p className="text-xs text-gray-500 mt-1">Active backlinks found</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">New This Month</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              +{metrics.newThisMonth}
            </p>
            <p className="text-xs text-gray-500 mt-1">New backlinks added</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Referring Domains</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{metrics.totalReferringDomains}</p>
            <p className="text-xs text-gray-500 mt-1">Unique domains linking to you</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Dofollow %</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {metrics.dofollowPercentage.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">SEO value backlinks</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Type</label>
            <select
              value={linkTypeFilter}
              onChange={(e) => setLinkTypeFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="dofollow">Dofollow</option>
              <option value="nofollow">Nofollow</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backlinks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading backlinks...</p>
        </div>
      ) : backlinks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No backlinks found yet</h3>
          <p className="text-gray-600 mb-4">
            Click "Check Backlinks" to scan your domain for backlinks!
          </p>
          <button
            onClick={handleCheckBacklinks}
            disabled={checking}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition"
          >
            {checking ? 'Checking...' : 'Check Backlinks'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {backlinks.map((backlink) => (
            <div key={backlink.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{backlink.referring_domain}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          backlink.is_dofollow
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {backlink.is_dofollow ? 'Dofollow' : 'Nofollow'}
                      </span>
                      {backlink.status === 'lost' && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                          Lost
                        </span>
                      )}
                    </div>
                    <a
                      href={backlink.referring_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {backlink.referring_url}
                    </a>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedBacklink(expandedBacklink === backlink.id ? null : backlink.id)
                    }
                    className="text-gray-500 hover:text-gray-700 text-lg ml-4"
                  >
                    {expandedBacklink === backlink.id ? '▼' : '▶'}
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Anchor Text</p>
                    <p className="text-sm font-medium text-gray-900">
                      {backlink.anchor_text || 'No anchor text'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">First Found</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(backlink.first_found_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Last Seen</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(backlink.last_seen_date)}
                    </p>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedBacklink === backlink.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Backlink Details</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {backlink.domain_authority && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Domain Authority</p>
                          <p className="text-lg font-bold text-blue-600">{backlink.domain_authority}</p>
                        </div>
                      )}
                      {backlink.inlink_rank && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">InLink Rank</p>
                          <p className="text-lg font-bold text-purple-600">{backlink.inlink_rank}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Link Type</p>
                        <p className="text-sm font-medium text-gray-900">{backlink.link_type || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Status</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{backlink.status}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

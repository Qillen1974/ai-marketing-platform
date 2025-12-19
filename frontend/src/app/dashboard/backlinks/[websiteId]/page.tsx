'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// Helper function defined at module level to avoid initialization issues
const formatDateString = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

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

interface BacklinkHistoryEntry {
  id: number;
  check_date: string;
  check_status: string;
  total_backlinks: number;
  new_backlinks_count: number;
  lost_backlinks_count: number;
  total_referring_domains: number;
  dofollow_count: number;
  nofollow_count: number;
}

export default function BacklinksMonitorPage() {
  const params = useParams();
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [backlinks, setBacklinks] = useState<BacklinkData[]>([]);
  const [metrics, setMetrics] = useState<BacklinkMetrics | null>(null);
  const [history, setHistory] = useState<BacklinkHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [expandedBacklink, setExpandedBacklink] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'backlinks' | 'history'>('overview');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [linkTypeFilter, setLinkTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadBacklinks();
    loadHistory();
  }, [token]);

  useEffect(() => {
    if (token) {
      loadBacklinks();
    }
  }, [statusFilter, linkTypeFilter]);

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

  const loadHistory = async () => {
    try {
      const response = await api.get(`/backlinks/${websiteId}/history?days=90`);
      setHistory(response.data.history || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
    }
  };

  // Calculate growth metrics from history
  const growthMetrics = useMemo(() => {
    if (history.length < 2) return null;

    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.check_date).getTime() - new Date(b.check_date).getTime()
    );

    const latest = sortedHistory[sortedHistory.length - 1];
    const oldest = sortedHistory[0];

    // Calculate net growth
    const totalGrowth = latest.total_backlinks - oldest.total_backlinks;
    const domainGrowth = latest.total_referring_domains - oldest.total_referring_domains;

    // Calculate total new and lost
    const totalNewBacklinks = sortedHistory.reduce((sum, h) => sum + (h.new_backlinks_count || 0), 0);
    const totalLostBacklinks = sortedHistory.reduce((sum, h) => sum + (h.lost_backlinks_count || 0), 0);

    // Growth rate percentage
    const growthRate = oldest.total_backlinks > 0
      ? ((totalGrowth / oldest.total_backlinks) * 100).toFixed(1)
      : 'N/A';

    return {
      totalGrowth,
      domainGrowth,
      totalNewBacklinks,
      totalLostBacklinks,
      growthRate,
      checkCount: sortedHistory.length,
      period: `${formatDateString(oldest.check_date)} - ${formatDateString(latest.check_date)}`,
    };
  }, [history]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.check_date).getTime() - new Date(b.check_date).getTime()
    );
    return sorted.map(h => ({
      date: new Date(h.check_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: h.total_backlinks,
      domains: h.total_referring_domains,
      new: h.new_backlinks_count || 0,
      lost: h.lost_backlinks_count || 0,
    }));
  }, [history]);

  // Calculate max value for chart scaling
  const chartMax = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.total), 10);
  }, [chartData]);

  const handleCheckBacklinks = async () => {
    setChecking(true);
    try {
      const response = await api.post(`/backlinks/${websiteId}/check`);
      toast.success(
        `Found ${response.data.totalBacklinks} backlinks! (${response.data.newBacklinks} new, ${response.data.lostBacklinks} lost)`
      );
      setBacklinks(response.data.backlinks);
      setMetrics(response.data.metrics);
      // Reload history after check
      loadHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to check backlinks');
      console.error('Error checking backlinks:', error);
    } finally {
      setChecking(false);
    }
  };

  const exportToCSV = () => {
    if (backlinks.length === 0) {
      toast.error('No backlinks to export');
      return;
    }

    const headers = ['Referring Domain', 'Referring URL', 'Anchor Text', 'Link Type', 'Status', 'Domain Authority', 'First Found', 'Last Seen'];
    const rows = backlinks.map(b => [
      b.referring_domain,
      b.referring_url,
      b.anchor_text || '',
      b.is_dofollow ? 'Dofollow' : 'Nofollow',
      b.status,
      b.domain_authority || '',
      formatDate(b.first_found_date),
      formatDate(b.last_seen_date),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `backlinks-${websiteId}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Backlinks exported to CSV');
  };

  // Use module-level formatDateString function
  const formatDate = formatDateString;

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
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              disabled={backlinks.length === 0}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 font-medium flex items-center gap-2 transition"
            >
              Export CSV
            </button>
            <button
              onClick={handleCheckBacklinks}
              disabled={checking}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium flex items-center gap-2 transition"
            >
              {checking ? 'Checking...' : 'Check Backlinks'}
            </button>
          </div>
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

      {/* Growth Summary (if history exists) */}
      {growthMetrics && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Growth Summary</h3>
          <p className="text-sm text-gray-600 mb-4">Period: {growthMetrics.period} ({growthMetrics.checkCount} checks)</p>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Net Growth</p>
              <p className={`text-2xl font-bold ${growthMetrics.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthMetrics.totalGrowth >= 0 ? '+' : ''}{growthMetrics.totalGrowth}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Growth Rate</p>
              <p className={`text-2xl font-bold ${Number(growthMetrics.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthMetrics.growthRate}%
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Gained</p>
              <p className="text-2xl font-bold text-green-600">+{growthMetrics.totalNewBacklinks}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Lost</p>
              <p className="text-2xl font-bold text-red-600">-{growthMetrics.totalLostBacklinks}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Growth Chart
            </button>
            <button
              onClick={() => setActiveTab('backlinks')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                activeTab === 'backlinks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Backlinks ({backlinks.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Check History ({history.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Growth Chart Tab */}
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Backlink Growth Over Time</h3>
              {chartData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📊</div>
                  <p className="text-gray-600">No historical data yet. Run backlink checks to see growth trends.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Simple CSS-based chart */}
                  <div className="h-64 flex items-end gap-1 border-b border-l border-gray-200 p-4">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                          style={{ height: `${(d.total / chartMax) * 100}%`, minHeight: '4px' }}
                          title={`${d.date}: ${d.total} backlinks`}
                        />
                        <span className="text-xs text-gray-500 -rotate-45 origin-left whitespace-nowrap mt-2">
                          {d.date}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-8 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-gray-600">Total Backlinks</span>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="mt-8">
                    <h4 className="font-semibold text-gray-900 mb-3">Recent Check Results</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domains</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[...chartData].reverse().slice(0, 10).map((d, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{d.date}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.total}</td>
                              <td className="px-4 py-3 text-sm text-green-600">+{d.new}</td>
                              <td className="px-4 py-3 text-sm text-red-600">-{d.lost}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{d.domains}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backlinks Tab */}
          {activeTab === 'backlinks' && (
            <div>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
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

              {/* Backlinks List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600 mt-4">Loading backlinks...</p>
                </div>
              ) : backlinks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🔗</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No backlinks found yet</h3>
                  <p className="text-gray-600 mb-4">
                    Click "Check Backlinks" to scan your domain for backlinks!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backlinks.map((backlink) => (
                    <div key={backlink.id} className="border border-gray-200 rounded-lg hover:shadow-md transition">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-base font-bold text-gray-900">{backlink.referring_domain}</h3>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  backlink.is_dofollow
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {backlink.is_dofollow ? 'Dofollow' : 'Nofollow'}
                              </span>
                              {backlink.status === 'lost' && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
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

                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Anchor Text</p>
                            <p className="font-medium text-gray-900">
                              {backlink.anchor_text || 'No anchor text'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">First Found</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(backlink.first_found_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Last Seen</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(backlink.last_seen_date)}
                            </p>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedBacklink === backlink.id && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">Backlink Details</h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              {backlink.domain_authority && (
                                <div>
                                  <p className="text-xs text-gray-500">Domain Authority</p>
                                  <p className="text-lg font-bold text-blue-600">{backlink.domain_authority}</p>
                                </div>
                              )}
                              {backlink.inlink_rank && (
                                <div>
                                  <p className="text-xs text-gray-500">InLink Rank</p>
                                  <p className="text-lg font-bold text-purple-600">{backlink.inlink_rank}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500">Link Type</p>
                                <p className="font-medium text-gray-900">{backlink.link_type || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Status</p>
                                <p className="font-medium text-gray-900 capitalize">{backlink.status}</p>
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
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Backlink Check History</h3>
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📅</div>
                  <p className="text-gray-600">No check history yet. Run a backlink check to start tracking.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domains</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dofollow</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {history.map((check) => (
                        <tr key={check.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(check.check_date).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                check.check_status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : check.check_status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {check.check_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.total_backlinks || 0}</td>
                          <td className="px-4 py-3 text-sm text-green-600">+{check.new_backlinks_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-red-600">-{check.lost_backlinks_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.total_referring_domains || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.dofollow_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

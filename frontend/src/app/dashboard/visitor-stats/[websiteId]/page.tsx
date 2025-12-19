'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface DailyStats {
  date: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface TrafficSource {
  channel: string;
  sessions: number;
  activeUsers: number;
  newUsers: number;
}

interface TopPage {
  path: string;
  title: string;
  pageViews: number;
  activeUsers: number;
  avgDuration: number;
}

interface Country {
  country: string;
  activeUsers: number;
  sessions: number;
}

interface Device {
  device: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
}

interface DashboardData {
  propertyId: string;
  realTimeUsers: number;
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
  };
  dailyStats: DailyStats[];
  trafficSources: TrafficSource[];
  topPages: TopPage[];
  countries: Country[];
  devices: Device[];
}

const formatDate = (dateStr: string) => {
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VisitorStatsPage() {
  const params = useParams();
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30daysAgo');
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [token, dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/visitor-stats/${websiteId}/dashboard?startDate=${dateRange}&endDate=today`);
      setData(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to load visitor statistics';
      setError(errorMsg);
      if (errorMsg.includes('Property ID not configured')) {
        setShowPropertyModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePropertyId = async () => {
    if (!propertyId.trim()) {
      toast.error('Please enter a Property ID');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/visitor-stats/${websiteId}/property`, { propertyId: propertyId.trim() });
      toast.success('GA4 Property ID saved successfully!');
      setShowPropertyModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save Property ID');
    } finally {
      setSaving(false);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!data?.dailyStats) return [];
    return data.dailyStats.map(d => ({
      date: formatDate(d.date),
      users: d.activeUsers,
      sessions: d.sessions,
      pageViews: d.pageViews,
    }));
  }, [data]);

  const chartMax = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => Math.max(d.users, d.pageViews)), 10);
  }, [chartData]);

  if (!token) return null;

  // Property ID Modal
  if (showPropertyModal) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900">Configure Google Analytics</h2>
            <p className="text-gray-600 mt-2">
              Enter your GA4 Property ID to start tracking visitor statistics
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GA4 Property ID
            </label>
            <input
              type="text"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="e.g., 516911594"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-2">
              Find this in GA4: Admin → Property Settings → Property ID
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/visitor-stats-selector')}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePropertyId}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save & Connect'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Setup Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. Add GA4 tracking code to your website</li>
              <li>2. Give API access to: <code className="bg-blue-100 px-1 rounded">ai-marketing@ai-marketing-478005.iam.gserviceaccount.com</code></li>
              <li>3. Enter your Property ID above</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visitor Statistics</h1>
            <p className="text-gray-600 mt-2">Real-time visitor data from Google Analytics</p>
          </div>
          <div className="flex gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7daysAgo">Last 7 Days</option>
              <option value="30daysAgo">Last 30 Days</option>
              <option value="90daysAgo">Last 90 Days</option>
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading visitor statistics...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setShowPropertyModal(true)}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Configure GA4 Property ID
          </button>
        </div>
      ) : data ? (
        <>
          {/* Metrics Cards */}
          <div className="grid md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-gray-600 text-sm font-semibold">Real-Time Users</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">{data.realTimeUsers}</p>
              <p className="text-xs text-gray-500 mt-1">Active now</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.totals.activeUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Unique visitors</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold">New Users</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{data.totals.newUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">First-time visitors</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold">Sessions</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">{data.totals.sessions.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total visits</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold">Page Views</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">{data.totals.pageViews.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total views</p>
            </div>
          </div>

          {/* Visitors Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Visitors</h3>
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No data available for this period
              </div>
            ) : (
              <div className="h-64 flex items-end gap-1 border-b border-l border-gray-200 p-4">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${(d.users / chartMax) * 100}%`, minHeight: '4px' }}
                      title={`${d.date}: ${d.users} users`}
                    />
                    {chartData.length <= 15 && (
                      <span className="text-xs text-gray-500 -rotate-45 origin-left whitespace-nowrap mt-2">
                        {d.date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traffic Sources */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Traffic Sources</h3>
              {data.trafficSources.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No traffic source data</p>
              ) : (
                <div className="space-y-3">
                  {data.trafficSources.map((source, i) => {
                    const totalSessions = data.trafficSources.reduce((sum, s) => sum + s.sessions, 0);
                    const percentage = totalSessions > 0 ? (source.sessions / totalSessions) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900">{source.channel}</span>
                          <span className="text-gray-600">{source.sessions.toLocaleString()} sessions</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Devices */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Devices</h3>
              {data.devices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No device data</p>
              ) : (
                <div className="space-y-3">
                  {data.devices.map((device, i) => {
                    const totalUsers = data.devices.reduce((sum, d) => sum + d.activeUsers, 0);
                    const percentage = totalUsers > 0 ? (device.activeUsers / totalUsers) * 100 : 0;
                    const icon = device.device === 'desktop' ? '💻' : device.device === 'mobile' ? '📱' : '📺';
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900">
                            {icon} {device.device.charAt(0).toUpperCase() + device.device.slice(1)}
                          </span>
                          <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Pages</h3>
            {data.topPages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No page data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.topPages.slice(0, 10).map((page, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={page.path}>
                            {page.path}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-xs" title={page.title}>
                            {page.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{page.pageViews.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{page.activeUsers.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(page.avgDuration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Countries */}
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Countries</h3>
            {data.countries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No geographic data</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {data.countries.slice(0, 9).map((country, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{country.country}</span>
                    <span className="text-gray-600">{country.activeUsers.toLocaleString()} users</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

'use client';

import { useAuthStore } from '@/stores/authStore';
import { useWebsiteStore } from '@/stores/websiteStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface HealthAudit {
  id: number;
  website_id: number;
  health_score: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  total_issues: number;
  previous_score: number | null;
  issue_summary: any;
  created_at: string;
}

interface HealthDashboard {
  currentHealth: {
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    totalIssues: number;
    lastAuditDate: string;
  };
  trend: {
    previousScore: number | null;
    scoreChange: number | null;
    direction: 'improving' | 'declining' | 'new';
    history: Array<{ score: number; date: string }>;
  };
  quickWins: any;
}

export default function SiteHealthPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const websites = useWebsiteStore((state) => state.websites);
  const fetchWebsites = useWebsiteStore((state) => state.fetchWebsites);

  const [selectedWebsiteId, setSelectedWebsiteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);
  const [health, setHealth] = useState<HealthDashboard | null>(null);
  const [auditProgress, setAuditProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchWebsites();
  }, [token]);

  useEffect(() => {
    if (selectedWebsiteId) {
      loadHealthDashboard();
    }
  }, [selectedWebsiteId]);

  const loadHealthDashboard = async () => {
    if (!selectedWebsiteId) return;

    setLoading(true);
    try {
      const response = await api.get(`/site-health/${selectedWebsiteId}/dashboard`);
      setHealth(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHealth(null);
        toast.success('No audit found for this website. Run an audit to get started.');
      } else {
        toast.error('Failed to load health dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartAudit = async () => {
    if (!selectedWebsiteId) {
      toast.error('Please select a website first');
      return;
    }

    const website = websites.find((w) => w.id === selectedWebsiteId);
    if (!website) return;

    setAuditRunning(true);
    setAuditProgress(10);

    try {
      // Start the audit
      const auditResponse = await api.post('/site-health/audit', {
        websiteId: selectedWebsiteId,
        domain: website.domain,
      });

      toast.success('Audit started! This may take 5-30 minutes depending on your site size.');

      // Poll for results
      let jobId = auditResponse.data.jobId;
      let attempts = 0;
      const maxAttempts = 180; // 30 minutes with 10-second intervals

      const pollInterval = setInterval(async () => {
        attempts++;
        setAuditProgress(Math.min(10 + (attempts / maxAttempts) * 80, 90));

        try {
          const statusResponse = await api.get('/site-health/audit-status', {
            params: {
              domain: website.domain,
              jobId,
            },
          });

          if (statusResponse.data.status === 'completed') {
            clearInterval(pollInterval);

            // Get the full report
            const reportResponse = await api.post('/site-health/audit-report', {
              websiteId: selectedWebsiteId,
              domain: website.domain,
            });

            setAuditProgress(100);
            toast.success('Audit complete!');

            // Reload dashboard
            setTimeout(() => {
              loadHealthDashboard();
              setAuditRunning(false);
              setAuditProgress(0);
            }, 1000);
          }
        } catch (error) {
          console.error('Poll error:', error);
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setAuditRunning(false);
          toast.error('Audit timed out. Please check back in a few minutes.');
        }
      }, 10000); // Poll every 10 seconds

      setProgressInterval(pollInterval);
    } catch (error: any) {
      setAuditRunning(false);
      toast.error(error.response?.data?.error || 'Failed to start audit');
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Site Health Monitor</h1>
        <p className="text-gray-600 mt-2">
          Track your website's SEO health with 115+ automated checks
        </p>
      </div>

      {/* Website Selector */}
      {websites.length > 0 && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Website</label>
          <select
            value={selectedWebsiteId || ''}
            onChange={(e) => setSelectedWebsiteId(Number(e.target.value))}
            className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a website...</option>
            {websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.domain}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* No websites message */}
      {websites.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <p className="text-blue-900">
            No websites found. Please add a website from the dashboard first.
          </p>
        </div>
      )}

      {/* Audit Controls */}
      {selectedWebsiteId && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Run SEO Audit</h2>
              <p className="text-gray-600 text-sm mt-1">
                Comprehensive health check with 115+ SEO issues
              </p>
            </div>
            <button
              onClick={handleStartAudit}
              disabled={auditRunning || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {auditRunning ? 'Audit Running...' : 'Start Audit'}
            </button>
          </div>

          {/* Progress Bar */}
          {auditRunning && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${auditProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{auditProgress}% complete</p>
            </div>
          )}
        </div>
      )}

      {/* Health Dashboard */}
      {selectedWebsiteId && health && (
        <div className="space-y-8">
          {/* Current Health Score */}
          <div className={`rounded-lg shadow p-8 border-l-4 ${getHealthBgColor(health.currentHealth.score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-gray-700 text-sm font-semibold uppercase">Overall Health Score</h2>
                <p className={`text-5xl font-bold mt-2 ${getHealthColor(health.currentHealth.score)}`}>
                  {health.currentHealth.score}/100
                </p>
              </div>
              <div className="text-right">
                {health.trend.direction === 'improving' && (
                  <div className="text-green-600 text-2xl">📈 Improving</div>
                )}
                {health.trend.direction === 'declining' && (
                  <div className="text-red-600 text-2xl">📉 Declining</div>
                )}
                {health.trend.direction === 'new' && (
                  <div className="text-gray-600 text-2xl">✨ First Audit</div>
                )}
                {health.trend.scoreChange !== null && (
                  <p className={`text-lg font-semibold mt-2 ${health.trend.scoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {health.trend.scoreChange > 0 ? '+' : ''}{health.trend.scoreChange} points
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Issues Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 font-bold text-2xl">{health.currentHealth.criticalIssues}</p>
              <p className="text-gray-600 text-sm mt-1">Critical Issues</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-600 font-bold text-2xl">{health.currentHealth.highIssues}</p>
              <p className="text-gray-600 text-sm mt-1">High Priority</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-600 font-bold text-2xl">{health.currentHealth.mediumIssues}</p>
              <p className="text-gray-600 text-sm mt-1">Medium Issues</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-600 font-bold text-2xl">{health.currentHealth.lowIssues}</p>
              <p className="text-gray-600 text-sm mt-1">Low Issues</p>
            </div>
          </div>

          {/* Health Trend Chart */}
          {health.trend.history.length > 1 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4">Health Score Trend</h3>
              <div className="flex items-end gap-2 h-40">
                {health.trend.history.map((point, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition"
                      style={{ height: `${(point.score / 100) * 100}px` }}
                      title={`${point.score}/100`}
                    ></div>
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      {new Date(point.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Wins */}
          {health.quickWins && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4">💡 Quick Wins</h3>
              <p className="text-gray-600 mb-4">
                Easy fixes that could improve your score by {health.quickWins.totalPotentialImpact || 0} points
              </p>
              <div className="space-y-3">
                {(health.quickWins.topQuickWins || []).map((win: any, idx: number) => (
                  <div
                    key={idx}
                    className="border border-gray-200 p-4 rounded hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{win.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{win.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Time to fix: {win.estimatedTimeToFix}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${getSeverityColor(win.severity)}`}>
                          {win.severity.toUpperCase()}
                        </span>
                        <p className="text-sm font-bold text-gray-900 mt-2">
                          +{win.impactScore} impact
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {selectedWebsiteId && loading && (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin">
              <div className="text-4xl">⚙️</div>
            </div>
            <p className="text-gray-600 mt-4">Loading health dashboard...</p>
          </div>
        </div>
      )}

      {/* No Audit Message */}
      {selectedWebsiteId && health === null && !loading && !auditRunning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-900">
            No audit data yet. Click "Start Audit" above to run your first site health check.
          </p>
        </div>
      )}
    </div>
  );
}

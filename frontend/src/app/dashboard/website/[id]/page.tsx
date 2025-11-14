'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import QuotaExceededModal from '@/components/QuotaExceededModal';

interface Website {
  id: number;
  domain: string;
  targetKeywords?: string;
  lastAuditDate?: string;
}

interface Report {
  id: number;
  auditDate: string;
  overallScore: number;
  scores: {
    onPage: number;
    technical: number;
    content: number;
  };
  issues: any[];
  recommendations: any[];
  quotaRemaining: number;
}

interface Keyword {
  id: number;
  keyword: string;
  searchVolume: number;
  difficulty: number;
  currentPosition: number;
  trend: string;
}

export default function WebsiteDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  const [website, setWebsite] = useState<Website | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords'>('overview');
  const [newKeyword, setNewKeyword] = useState('');
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState<{
    isOpen: boolean;
    service?: 'audit' | 'backlink_discovery' | 'email_sent';
    quotaUsed?: number;
    quotaLimit?: number;
    message?: string;
  }>({ isOpen: false });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch website
      const websiteRes = await api.get(`/websites/${params.id}`);
      setWebsite(websiteRes.data.website);

      // Fetch latest audit report
      try {
        const auditRes = await api.get(`/audits/${params.id}/history?limit=1`);
        if (auditRes.data.reports && auditRes.data.reports.length > 0) {
          const latestReportId = auditRes.data.reports[0].id;
          const reportRes = await api.get(`/audits/${params.id}/report/${latestReportId}`);
          setReport(reportRes.data.report);
        }
      } catch (error) {
        console.error('Failed to fetch audit report');
      }

      // Fetch keywords
      try {
        const keywordsRes = await api.get(`/keywords/${params.id}`);
        setKeywords(keywordsRes.data.keywords);
      } catch (error) {
        console.error('Failed to fetch keywords');
      }
    } catch (error: any) {
      toast.error('Failed to load website details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setRunningAudit(true);
    try {
      const response = await api.post(`/audits/${params.id}/run`);
      setReport(response.data.report);
      toast.success('Audit completed successfully!');

      // Reload keywords after audit (they were just researched)
      try {
        const keywordsRes = await api.get(`/keywords/${params.id}`);
        setKeywords(keywordsRes.data.keywords);
      } catch (error) {
        console.error('Failed to reload keywords after audit');
      }
    } catch (error: any) {
      // Check if it's a quota exceeded error
      if (error.response?.status === 429) {
        setQuotaExceeded({
          isOpen: true,
          service: 'audit',
          quotaUsed: error.response?.data?.quotaUsed,
          quotaLimit: error.response?.data?.quotaLimit,
          message: error.response?.data?.message,
        });
      } else {
        toast.error(error.response?.data?.error || 'Failed to run audit');
      }
    } finally {
      setRunningAudit(false);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }

    setAddingKeyword(true);
    try {
      const response = await api.post(`/keywords/${params.id}`, {
        keyword: newKeyword,
      });

      // Add the new keyword to the list
      setKeywords([response.data.keyword, ...keywords]);
      setNewKeyword('');
      toast.success('Keyword added successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add keyword');
    } finally {
      setAddingKeyword(false);
    }
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await api.get(`/keywords/${params.id}/suggestions`);
      setSuggestedKeywords(response.data.keywords);
      toast.success('Keyword suggestions loaded!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to get keyword suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSuggestedKeyword = async (keyword: string) => {
    try {
      const response = await api.post(`/keywords/${params.id}`, {
        keyword: keyword,
      });

      // Add the new keyword to the list
      setKeywords([response.data.keyword, ...keywords]);

      // Remove from suggestions
      setSuggestedKeywords(suggestedKeywords.filter(kw => kw.keyword !== keyword));

      toast.success(`Added "${keyword}" to tracked keywords!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add keyword');
    }
  };

  if (!token) return null;
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!website) {
    return <div className="text-center py-8">Website not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Back to Dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{website.domain}</h1>
        <p className="text-gray-600 mt-2">Monitor and optimize your website</p>
      </div>

      {/* Action Button */}
      <div className="mb-8">
        <button
          onClick={handleRunAudit}
          disabled={runningAudit}
          className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
        >
          {runningAudit ? 'Running Audit...' : 'Run SEO Audit'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'keywords'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          Keywords
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {report ? (
            <div className="space-y-6">
              {/* Scores */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-4">SEO Scores</h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded">
                    <p className="text-gray-600 text-sm">Overall Score</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {report.overallScore}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <p className="text-gray-600 text-sm">On-Page SEO</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {report.scores.onPage}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded">
                    <p className="text-gray-600 text-sm">Technical</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {report.scores.technical}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded">
                    <p className="text-gray-600 text-sm">Content</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                      {report.scores.content}
                    </p>
                  </div>
                </div>
              </div>

              {/* Issues */}
              {report.issues && report.issues.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Issues Found</h2>
                  <div className="space-y-3">
                    {report.issues.slice(0, 5).map((issue: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border-l-4 ${
                          issue.severity === 'critical'
                            ? 'bg-red-50 border-red-500'
                            : issue.severity === 'high'
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-yellow-50 border-yellow-500'
                        }`}
                      >
                        <h3 className="font-semibold">{issue.issue}</h3>
                        <p className="text-sm text-gray-600 mt-1">{issue.fix}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
                  <div className="space-y-4">
                    {report.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-semibold">{rec.category}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {rec.recommendation}
                        </p>
                        {rec.estimatedTraffic && (
                          <p className="text-xs text-green-600 mt-2">
                            Potential traffic increase: +{rec.estimatedTraffic} visits
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No audit has been run yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Click the "Run SEO Audit" button to analyze your website.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="space-y-6">
          {/* Add Keyword Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Keyword to Track</h2>
              <button
                onClick={handleGetSuggestions}
                disabled={loadingSuggestions}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 text-sm"
              >
                {loadingSuggestions ? 'Scanning...' : '✨ Get Suggestions'}
              </button>
            </div>
            <form onSubmit={handleAddKeyword} className="flex gap-3">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Enter a keyword to track"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={addingKeyword}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {addingKeyword ? 'Adding...' : 'Add Keyword'}
              </button>
            </form>
          </div>

          {/* Suggested Keywords */}
          {suggestedKeywords.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Suggested Keywords for Your Website</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestedKeywords.map((kw, idx) => (
                  <div key={idx} className="bg-white rounded border border-purple-200 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1">{kw.keyword}</h3>
                      <button
                        onClick={() => handleAddSuggestedKeyword(kw.keyword)}
                        className="ml-2 bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Search Volume: <span className="font-semibold">{kw.searchVolume?.toLocaleString() || 'N/A'}</span></p>
                      <p>Difficulty: <span className="font-semibold">{kw.difficulty || 'N/A'}/100</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
          {keywords.length > 0 ? (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Keyword
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Search Volume
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Difficulty
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {keywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {kw.keyword}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {kw.searchVolume.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {kw.difficulty}/100
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {kw.currentPosition > 0 ? `#${kw.currentPosition}` : 'Not ranked'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              kw.trend === 'up'
                                ? 'bg-green-100 text-green-800'
                                : kw.trend === 'down'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {kw.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No keywords tracked yet. Run an audit to get keyword recommendations.
            </div>
          )}
        </div>
        </div>
      )}

      {/* Quota Exceeded Modal */}
      {quotaExceeded.service && (
        <QuotaExceededModal
          isOpen={quotaExceeded.isOpen}
          onClose={() => setQuotaExceeded({ isOpen: false })}
          service={quotaExceeded.service}
          quotaUsed={quotaExceeded.quotaUsed || 0}
          quotaLimit={quotaExceeded.quotaLimit || 0}
          message={quotaExceeded.message}
        />
      )}
    </div>
  );
}

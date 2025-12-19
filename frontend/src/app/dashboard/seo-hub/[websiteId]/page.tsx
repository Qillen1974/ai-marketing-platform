'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface KeywordData {
  keyword: string;
  source: string;
  position: number | null;
  change: number | null;
  backlinkCount: number;
  articleCount: number;
  lastChecked: string | null;
}

interface BacklinkByKeyword {
  keyword: string;
  count: number;
  backlinks: Array<{
    id: number;
    referring_domain: string;
    anchor_text: string;
    match_score: number;
  }>;
}

interface ArticleData {
  id: number;
  title: string;
  keyword: string;
  status: string;
  created_at: string;
}

interface DashboardData {
  website: {
    id: number;
    domain: string;
  };
  campaign: {
    id: number;
    websiteName: string;
    websiteDescription: string;
    targetUrl: string;
    autoKeywords: string[];
    customKeywords: string[];
    seoScore: number;
    keywordsSyncedAt: string | null;
    lastArticleDate: string | null;
    totalArticlesGenerated: number;
  } | null;
  keywords: KeywordData[];
  backlinks: {
    total: number;
    matchedToKeywords: number;
    byKeyword: BacklinkByKeyword[];
  };
  articles: {
    items: ArticleData[];
    total: number;
  };
  summary: {
    totalKeywords: number;
    keywordsRanking: number;
    keywordsInTop10: number;
    keywordsInTop3: number;
    avgPosition: number | null;
    totalBacklinks: number;
    backlinksMatchedToKeywords: number;
    articlesGenerated: number;
    seoScore: number;
  };
}

export default function SEOHubDashboardPage({
  params,
}: {
  params: { websiteId: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'keywords' | 'backlinks' | 'articles'>('keywords');
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadDashboard();
  }, [token, websiteId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/seo-hub/${websiteId}/dashboard`);
      setData(response.data);
    } catch (error: any) {
      console.error('Error loading SEO Hub dashboard:', error);
      toast.error('Failed to load SEO Hub data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post(`/seo-hub/${websiteId}/sync`);
      toast.success('Keywords synced successfully');
      loadDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to sync keywords');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPositionColor = (position: number | null) => {
    if (!position) return 'text-gray-400';
    if (position <= 3) return 'text-green-600';
    if (position <= 10) return 'text-blue-600';
    if (position <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getChangeIndicator = (change: number | null) => {
    if (!change) return null;
    if (change > 0) return <span className="text-green-600">+{change}</span>;
    if (change < 0) return <span className="text-red-600">{change}</span>;
    return <span className="text-gray-400">-</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBorderColor = (score: number) => {
    if (score >= 70) return 'border-green-500';
    if (score >= 40) return 'border-yellow-500';
    return 'border-red-500';
  };

  if (!token) return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 mt-4">Loading SEO Hub...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">Error</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to load data</h3>
          <button
            onClick={loadDashboard}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data.campaign) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">Setup Required</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Article Campaign Found</h3>
          <p className="text-gray-600 mb-4">
            Create an article campaign first to use the SEO Hub
          </p>
          <button
            onClick={() => router.push(`/dashboard/article-generator/${websiteId}`)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Setup Article Campaign
          </button>
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
            <h1 className="text-3xl font-bold text-gray-900">SEO Command Center</h1>
            <p className="text-gray-600 mt-1">{data.website.domain}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* SEO Score Circle */}
            <div className={`w-20 h-20 rounded-full border-4 ${getScoreBorderColor(data.summary.seoScore)} flex items-center justify-center bg-white shadow-lg`}>
              <div className="text-center">
                <span className={`text-2xl font-bold ${getScoreColor(data.summary.seoScore)}`}>
                  {data.summary.seoScore}
                </span>
                <p className="text-xs text-gray-500">SEO</p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition"
            >
              {syncing ? 'Syncing...' : 'Sync Keywords'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-gray-600 text-sm font-semibold">Keywords</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{data.summary.totalKeywords}</p>
          <p className="text-xs text-gray-500 mt-1">{data.summary.keywordsRanking} ranking</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-gray-600 text-sm font-semibold">Top 10</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{data.summary.keywordsInTop10}</p>
          <p className="text-xs text-gray-500 mt-1">{data.summary.keywordsInTop3} in top 3</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-gray-600 text-sm font-semibold">Avg Position</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {data.summary.avgPosition ? `#${data.summary.avgPosition}` : '-'}
          </p>
          <p className="text-xs text-gray-500 mt-1">SERP ranking</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-gray-600 text-sm font-semibold">Backlinks</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{data.summary.totalBacklinks}</p>
          <p className="text-xs text-gray-500 mt-1">{data.summary.backlinksMatchedToKeywords} matched</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-gray-600 text-sm font-semibold">Articles</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{data.summary.articlesGenerated}</p>
          <p className="text-xs text-gray-500 mt-1">Generated</p>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Campaign Keywords</h3>
        <div className="flex flex-wrap gap-2">
          {[...(data.campaign.autoKeywords || []), ...(data.campaign.customKeywords || [])].map((kw, i) => (
            <span
              key={i}
              className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-700 border border-purple-200"
            >
              {kw}
            </span>
          ))}
        </div>
        {data.campaign.keywordsSyncedAt && (
          <p className="text-xs text-gray-500 mt-3">
            Last synced: {formatDate(data.campaign.keywordsSyncedAt)}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('keywords')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                activeTab === 'keywords'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Keywords & Rankings ({data.keywords.length})
            </button>
            <button
              onClick={() => setActiveTab('backlinks')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                activeTab === 'backlinks'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Backlinks by Keyword ({data.backlinks.byKeyword.length})
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                activeTab === 'articles'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Articles ({data.articles.total})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div>
              {data.keywords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">Target keywords</div>
                  <p className="text-gray-600">No keywords tracked yet. Click "Sync Keywords" to import from your campaign.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Position</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Change</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Backlinks</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Articles</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Checked</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.keywords.map((kw, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{kw.keyword}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              kw.source === 'campaign_auto'
                                ? 'bg-blue-100 text-blue-800'
                                : kw.source === 'campaign_custom'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {kw.source === 'campaign_auto' ? 'Auto' : kw.source === 'campaign_custom' ? 'Custom' : 'Manual'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-lg font-bold ${getPositionColor(kw.position)}`}>
                              {kw.position ? `#${kw.position}` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getChangeIndicator(kw.change)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-blue-600 font-medium">{kw.backlinkCount}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-orange-600 font-medium">{kw.articleCount}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(kw.lastChecked)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Backlinks Tab */}
          {activeTab === 'backlinks' && (
            <div>
              {data.backlinks.byKeyword.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">Links by keyword</div>
                  <p className="text-gray-600">No backlinks matched to keywords yet. Run a backlink check first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.backlinks.byKeyword.map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setExpandedKeyword(expandedKeyword === item.keyword ? null : item.keyword)}
                        className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{item.keyword}</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                            {item.count} backlinks
                          </span>
                        </div>
                        <span className="text-gray-400">
                          {expandedKeyword === item.keyword ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedKeyword === item.keyword && (
                        <div className="px-4 pb-4 border-t border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200 mt-2">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Domain</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Anchor Text</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Match Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {item.backlinks.map((bl) => (
                                <tr key={bl.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-sm text-gray-900">{bl.referring_domain}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600">{bl.anchor_text || '-'}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      bl.match_score >= 80
                                        ? 'bg-green-100 text-green-800'
                                        : bl.match_score >= 50
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {bl.match_score}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Articles Tab */}
          {activeTab === 'articles' && (
            <div>
              {data.articles.items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">Generated articles</div>
                  <p className="text-gray-600 mb-4">No articles generated yet.</p>
                  <button
                    onClick={() => router.push(`/dashboard/article-generator/${websiteId}`)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Generate Articles
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.articles.items.map((article) => (
                    <div key={article.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{article.title}</h4>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                              {article.keyword}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              article.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : article.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {article.status}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(article.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {data.articles.total > data.articles.items.length && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => router.push(`/dashboard/article-generator/${websiteId}`)}
                        className="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        View all {data.articles.total} articles
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push(`/dashboard/rankings-selector`)}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
        >
          <div className="text-2xl mb-2">Rankings</div>
          <h4 className="font-bold text-gray-900">Track Rankings</h4>
          <p className="text-sm text-gray-600">Check SERP positions for your keywords</p>
        </button>
        <button
          onClick={() => router.push(`/dashboard/backlinks/${websiteId}`)}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
        >
          <div className="text-2xl mb-2">Backlinks</div>
          <h4 className="font-bold text-gray-900">Monitor Backlinks</h4>
          <p className="text-sm text-gray-600">Scan for new and lost backlinks</p>
        </button>
        <button
          onClick={() => router.push(`/dashboard/article-generator/${websiteId}`)}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
        >
          <div className="text-2xl mb-2">Articles</div>
          <h4 className="font-bold text-gray-900">Generate Content</h4>
          <p className="text-sm text-gray-600">Create SEO articles for your keywords</p>
        </button>
      </div>
    </div>
  );
}

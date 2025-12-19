'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWebsiteStore } from '@/stores/websiteStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Campaign {
  id: number;
  websiteId: number;
  targetUrl: string;
  websiteName: string;
  websiteDescription: string;
  targetAudience: string;
  autoKeywords: string[];
  customKeywords: string[];
  totalArticles: number;
  lastArticleDate: string | null;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  metaDescription: string;
  targetKeyword: string;
  wordCount: number;
  provider: string;
  status: string;
  heroImageUrl: string | null;
  createdAt: string;
}

interface Stats {
  totalArticles: number;
  articlesThisMonth: number;
  lastArticleDate: string | null;
  keywordsCount: number;
}

export default function ArticleGeneratorPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const params = useParams();
  const websiteId = params.websiteId as string;

  const websites = useWebsiteStore((state) => state.websites);
  const fetchWebsites = useWebsiteStore((state) => state.fetchWebsites);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [previewArticle, setPreviewArticle] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const website = websites.find((w) => w.id === parseInt(websiteId));

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        await fetchWebsites();
        await loadCampaignAndArticles();
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, websiteId]);

  const loadCampaignAndArticles = async () => {
    try {
      // Get campaign
      const campaignResponse = await api.get(`/articles/campaigns/${websiteId}`);
      if (!campaignResponse.data.exists) {
        router.push(`/dashboard/article-generator/${websiteId}/setup`);
        return;
      }
      setCampaign(campaignResponse.data.campaign);

      // Get articles
      const articlesResponse = await api.get(`/articles/${websiteId}/articles`);
      setArticles(articlesResponse.data.articles);

      // Get stats
      const statsResponse = await api.get(`/articles/${websiteId}/stats`);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleGenerateArticle = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/articles/${websiteId}/generate`, {
        provider: selectedProvider,
      });

      toast.success('Article generated successfully!');
      await loadCampaignAndArticles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate article');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewArticle = async (articleId: number) => {
    try {
      const response = await api.get(`/articles/${websiteId}/articles/${articleId}`);
      setPreviewArticle(response.data.article);
    } catch (error) {
      toast.error('Failed to load article preview');
    }
  };

  const handleDownloadArticle = async (articleId: number, slug: string) => {
    try {
      const response = await api.get(`/articles/${websiteId}/articles/${articleId}/html`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'article'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Article downloaded!');
    } catch (error) {
      toast.error('Failed to download article');
    }
  };

  const handleCopyHtml = async (articleId: number) => {
    try {
      const response = await api.get(`/articles/${websiteId}/articles/${articleId}`);
      await navigator.clipboard.writeText(response.data.article.htmlContent);
      toast.success('HTML copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy HTML');
    }
  };

  const handleDeleteArticle = async (articleId: number) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      await api.delete(`/articles/${websiteId}/articles/${articleId}`);
      toast.success('Article deleted');
      await loadCampaignAndArticles();
    } catch (error) {
      toast.error('Failed to delete article');
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!token) return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 mt-4">Loading article generator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push('/dashboard/article-generator-selector')}
            className="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1 text-sm"
          >
            ← Back to selector
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Article Generator</h1>
          <p className="text-gray-600 mt-1">{website?.domain || campaign?.websiteName}</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Total Articles</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalArticles || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">This Month</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{stats?.articlesThisMonth || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Keywords</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.keywordsCount || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Last Generated</h3>
          <p className="text-lg font-bold text-gray-900 mt-2">{formatDate(stats?.lastArticleDate)}</p>
        </div>
      </div>

      {/* Generate Article Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1">Generate New Article</h2>
            <p className="opacity-90">
              AI will create an SEO-optimized article with images based on your keywords
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="openai" className="text-gray-900">OpenAI GPT-4</option>
              <option value="claude" className="text-gray-900">Claude</option>
              <option value="gemini" className="text-gray-900">Gemini</option>
            </select>
            <button
              onClick={handleGenerateArticle}
              disabled={generating}
              className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  Generating...
                </>
              ) : (
                <>
                  ✨ Generate Article
                </>
              )}
            </button>
          </div>
        </div>

        {generating && (
          <div className="mt-6 bg-white/10 rounded-lg p-4">
            <p className="font-semibold mb-2">🤖 AI is working on your article...</p>
            <div className="space-y-1 text-sm opacity-90">
              <p>• Selecting optimal keyword and topic</p>
              <p>• Generating SEO-optimized content</p>
              <p>• Creating AI images with DALL-E</p>
              <p>• Building HTML document</p>
            </div>
            <p className="text-xs opacity-75 mt-2">This may take 1-2 minutes</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && campaign && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Settings</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website Name
              </label>
              <p className="text-gray-900">{campaign.websiteName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URL
              </label>
              <p className="text-gray-900">{campaign.targetUrl}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords ({(campaign.autoKeywords?.length || 0) + (campaign.customKeywords?.length || 0)} total)
              </label>
              <div className="flex flex-wrap gap-2">
                {[...(campaign.autoKeywords || []), ...(campaign.customKeywords || [])].map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => router.push(`/dashboard/article-generator/${websiteId}/setup`)}
              className="text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              Edit Campaign Settings →
            </button>
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Generated Articles</h2>
        </div>

        {articles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No articles yet</h3>
            <p className="text-gray-600">
              Click &quot;Generate Article&quot; above to create your first SEO article
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {articles.map((article) => (
              <div key={article.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {article.heroImageUrl && (
                    <img
                      src={article.heroImageUrl}
                      alt={article.title}
                      className="w-24 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-1">
                      {article.metaDescription}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>🎯 {article.targetKeyword}</span>
                      <span>📝 {article.wordCount} words</span>
                      <span>🤖 {article.provider}</span>
                      <span>📅 {formatDate(article.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreviewArticle(article.id)}
                      className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleCopyHtml(article.id)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Copy HTML
                    </button>
                    <button
                      onClick={() => handleDownloadArticle(article.id, article.slug)}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(article.id)}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{previewArticle.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyHtml(previewArticle.id)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Copy HTML
                </button>
                <button
                  onClick={() => handleDownloadArticle(previewArticle.id, previewArticle.slug)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                >
                  Download
                </button>
                <button
                  onClick={() => setPreviewArticle(null)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={previewArticle.htmlContent}
                className="w-full h-full min-h-[600px]"
                title="Article Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

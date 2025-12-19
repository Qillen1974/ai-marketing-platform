'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWebsiteStore } from '@/stores/websiteStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CampaignInfo {
  exists: boolean;
  totalArticles?: number;
  lastArticleDate?: string;
}

export default function ArticleGeneratorSelectorPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websites = useWebsiteStore((state) => state.websites);
  const fetchWebsites = useWebsiteStore((state) => state.fetchWebsites);
  const [loading, setLoading] = useState(true);
  const [campaignInfo, setCampaignInfo] = useState<Record<number, CampaignInfo>>({});

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        await fetchWebsites();
      } catch (error) {
        toast.error('Failed to load websites');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Load campaign info for each website
  useEffect(() => {
    const loadCampaignInfo = async () => {
      const info: Record<number, CampaignInfo> = {};
      for (const website of websites) {
        try {
          const response = await api.get(`/articles/campaigns/${website.id}`);
          info[website.id] = {
            exists: response.data.exists,
            totalArticles: response.data.campaign?.totalArticles,
            lastArticleDate: response.data.campaign?.lastArticleDate,
          };
        } catch {
          info[website.id] = { exists: false };
        }
      }
      setCampaignInfo(info);
    };

    if (websites.length > 0) {
      loadCampaignInfo();
    }
  }, [websites]);

  const handleSelectWebsite = (websiteId: number) => {
    const info = campaignInfo[websiteId];
    if (info?.exists) {
      // Campaign exists, go to main article generator page
      router.push(`/dashboard/article-generator/${websiteId}`);
    } else {
      // No campaign, go to setup page
      router.push(`/dashboard/article-generator/${websiteId}/setup`);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Article Generator</h1>
        <p className="text-gray-600 mt-2">
          Generate SEO-optimized articles for your websites using AI
        </p>
      </div>

      {/* Feature highlights */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
        <h2 className="text-xl font-bold mb-3">AI-Powered Article Generation</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold">SEO Optimized</p>
              <p className="opacity-90">Keyword-targeted content with proper structure</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">🎨</span>
            <div>
              <p className="font-semibold">AI Images</p>
              <p className="opacity-90">DALL-E generated images for each article</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-semibold">Ready to Publish</p>
              <p className="opacity-90">Download HTML files for your blog</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 mt-4">Loading websites...</p>
        </div>
      ) : websites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No websites yet</h3>
          <p className="text-gray-600 mb-4">
            Add a website first to start generating articles
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium transition"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((website) => {
            const info = campaignInfo[website.id];
            const isSetup = info?.exists;

            return (
              <div
                key={website.id}
                onClick={() => handleSelectWebsite(website.id)}
                className="bg-white rounded-lg shadow hover:shadow-xl transition cursor-pointer p-6 border-2 border-transparent hover:border-purple-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{website.domain}</h3>
                    {isSetup ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Campaign Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Not Set Up
                      </span>
                    )}
                  </div>
                  <div className="text-3xl">{isSetup ? '📝' : '⚙️'}</div>
                </div>

                {isSetup && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Articles:</span>
                      <span className="font-semibold text-gray-900">
                        {info.totalArticles || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Generated:</span>
                      <span className="font-semibold text-gray-900">
                        {formatDate(info.lastArticleDate)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  className={`mt-4 w-full px-4 py-2 rounded-lg font-medium transition ${
                    isSetup
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSetup ? 'Open Article Generator' : 'Set Up Campaign'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface WebsiteWithSEOStatus {
  id: number;
  domain: string;
  hasCampaign: boolean;
  seoScore: number;
  keywordCount: number;
  backlinkCount: number;
  articlesGenerated: number;
  lastArticleDate: string | null;
  keywordsSyncedAt: string | null;
}

export default function SEOHubSelectorPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [websites, setWebsites] = useState<WebsiteWithSEOStatus[]>([]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadWebsites = async () => {
      try {
        const response = await api.get('/seo-hub/websites');
        setWebsites(response.data.websites || []);
      } catch (error) {
        console.error('Failed to load websites:', error);
        toast.error('Failed to load websites');
      } finally {
        setLoading(false);
      }
    };

    loadWebsites();
  }, [token]);

  const handleSelectWebsite = (websiteId: number) => {
    router.push(`/dashboard/seo-hub/${websiteId}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">SEO Hub</h1>
        <p className="text-gray-600 mt-2">
          Unified SEO command center - Track keywords, rankings, backlinks, and content performance
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 mt-4">Loading websites...</p>
        </div>
      ) : websites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No websites yet</h3>
          <p className="text-gray-600 mb-4">
            Add a website and create an article campaign to use the SEO Hub
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
          {websites.map((website) => (
            <div
              key={website.id}
              onClick={() => handleSelectWebsite(website.id)}
              className="bg-white rounded-lg shadow hover:shadow-xl transition cursor-pointer p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{website.domain}</h3>
                  {website.hasCampaign ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Campaign Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      No Campaign
                    </span>
                  )}
                </div>
                {/* SEO Score Circle */}
                <div className={`w-14 h-14 rounded-full ${getScoreBg(website.seoScore)} flex items-center justify-center`}>
                  <span className={`text-lg font-bold ${getScoreColor(website.seoScore)}`}>
                    {website.seoScore}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center mt-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xl font-bold text-purple-600">{website.keywordCount}</p>
                  <p className="text-xs text-gray-500">Keywords</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600">{website.backlinkCount}</p>
                  <p className="text-xs text-gray-500">Backlinks</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-600">{website.articlesGenerated}</p>
                  <p className="text-xs text-gray-500">Articles</p>
                </div>
              </div>

              {/* Last Updated */}
              {website.keywordsSyncedAt && (
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Keywords synced: {formatDate(website.keywordsSyncedAt)}
                </p>
              )}

              <button className="mt-4 w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium transition">
                Open SEO Hub
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

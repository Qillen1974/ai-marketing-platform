'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface RankingData {
  keywordId: number;
  keyword: string;
  currentPosition: number | null;
  previousPosition: number | null;
  isRanking: boolean;
  positionChange: number | null;
  topThree: Array<{
    position: number;
    title: string;
    link: string;
  }>;
}

interface RankingMetrics {
  totalKeywordsTracked: number;
  keywordsRanking: number;
  top10Keywords: number;
  top3Keywords: number;
  averagePosition: number | null;
  bestPosition: number | null;
  worstPosition: number | null;
  improvedKeywords: number;
}

const positionColor = (position: number | null) => {
  if (!position) return 'text-gray-500';
  if (position <= 3) return 'text-green-600';
  if (position <= 10) return 'text-blue-600';
  if (position <= 30) return 'text-yellow-600';
  return 'text-red-600';
};

const positionEmoji = (position: number | null) => {
  if (!position) return '❌';
  if (position <= 3) return '🏆';
  if (position <= 10) return '⭐';
  if (position <= 30) return '📈';
  return '📉';
};

export default function RankingsPage({
  params,
}: {
  params: { websiteId: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [metrics, setMetrics] = useState<RankingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [expandedKeyword, setExpandedKeyword] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadRankings();
  }, [token]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/rankings/${websiteId}/latest`);
      setRankings(response.data.rankings);
      setMetrics(response.data.metrics);
    } catch (error: any) {
      toast.error('Failed to load rankings');
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckRankings = async () => {
    setChecking(true);
    try {
      const response = await api.post(`/rankings/${websiteId}/check`);
      toast.success(`✅ Checked rankings for ${response.data.rankings.length} keywords!`);
      setRankings(response.data.rankings);
      setMetrics(response.data.metrics);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to check rankings');
      console.error('Error checking rankings:', error);
    } finally {
      setChecking(false);
    }
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Keyword Rankings</h1>
            <p className="text-gray-600 mt-2">Real Google SERP positions for your keywords</p>
          </div>
          <button
            onClick={handleCheckRankings}
            disabled={checking}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
          >
            {checking ? '🔄 Checking...' : '🔍 Check Rankings'}
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Keywords Tracked</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalKeywordsTracked}</p>
            <p className="text-xs text-gray-500 mt-1">Total tracked keywords</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Keywords Ranking</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {metrics.keywordsRanking}
              <span className="text-lg text-gray-500">/{metrics.totalKeywordsTracked}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">In Google top 100</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Top 10 Keywords</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{metrics.top10Keywords}</p>
            <p className="text-xs text-gray-500 mt-1">Ranking in top 10</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Avg Position</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {metrics.averagePosition ? `#${Math.round(metrics.averagePosition)}` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Average ranking position</p>
          </div>
        </div>
      )}

      {/* Rankings List */}
      {loading ? (
        <div className="text-center py-8">Loading rankings...</div>
      ) : rankings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No ranking data yet. Click "Check Rankings" to get started!</p>
          <button
            onClick={handleCheckRankings}
            disabled={checking}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium"
          >
            {checking ? 'Checking...' : 'Check Rankings'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rankings.map((ranking) => (
            <div key={ranking.keywordId} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{ranking.keyword}</h3>
                      {ranking.isRanking && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                          ✅ Ranking
                        </span>
                      )}
                      {!ranking.isRanking && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                          ❌ Not Ranking
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedKeyword(expandedKeyword === ranking.keywordId ? null : ranking.keywordId)
                    }
                    className="text-gray-500 hover:text-gray-700 text-lg"
                  >
                    {expandedKeyword === ranking.keywordId ? '▼' : '▶'}
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Current Position</p>
                    {ranking.currentPosition ? (
                      <p className={`text-2xl font-bold ${positionColor(ranking.currentPosition)}`}>
                        {positionEmoji(ranking.currentPosition)} #{ranking.currentPosition}
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-500">Not Ranking</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Position Change</p>
                    {ranking.positionChange ? (
                      <p
                        className={`text-2xl font-bold ${
                          ranking.positionChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {ranking.positionChange > 0 ? '📈 +' : '📉 '}
                        {Math.abs(ranking.positionChange)}
                      </p>
                    ) : ranking.previousPosition ? (
                      <p className="text-2xl font-bold text-gray-500">No change</p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-500">First check</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">Previous Position</p>
                    {ranking.previousPosition ? (
                      <p className="text-2xl font-bold text-gray-500">#{ranking.previousPosition}</p>
                    ) : (
                      <p className="text-2xl font-bold text-gray-500">-</p>
                    )}
                  </div>
                </div>

                {/* Top 3 Results */}
                {expandedKeyword === ranking.keywordId && ranking.topThree && ranking.topThree.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4">Top 3 Results for This Keyword</h4>
                    <div className="space-y-3">
                      {ranking.topThree.map((result) => (
                        <div key={result.position} className="bg-gray-50 p-4 rounded">
                          <div className="flex items-start gap-3">
                            <span className="font-bold text-gray-600 text-lg w-8">#{result.position}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 mb-1">{result.title}</p>
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline break-all"
                              >
                                {result.link}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
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

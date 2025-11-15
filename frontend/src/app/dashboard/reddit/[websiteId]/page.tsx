'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface RedditCommunity {
  id: number;
  subredditName: string;
  displayName: string;
  description: string;
  subscribers: number;
  activeUsers: number;
  relevanceScore: number;
  difficulty: string;
  tracked: boolean;
  postingAllowed: boolean;
  avgPostsPerDay: number;
  redditUrl: string;
  redditIconUrl: string;
  notes?: string;
  createdAt: string;
}

interface FilterOptions {
  tracked: string;
  difficulty: string;
}

const difficultyColors: { [key: string]: string } = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  difficult: 'bg-red-100 text-red-800',
};

const difficultyEmoji: { [key: string]: string } = {
  easy: '✅',
  medium: '⚠️',
  difficult: '🔴',
};

export default function RedditCommunitiesPage({
  params,
}: {
  params: { websiteId: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [communities, setCommunities] = useState<RedditCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    tracked: '',
    difficulty: '',
  });
  const [selectedCommunity, setSelectedCommunity] = useState<RedditCommunity | null>(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackingNotes, setTrackingNotes] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadCommunities();
  }, [token, filters]);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.tracked) params.append('tracked', filters.tracked);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);

      const response = await api.get(`/reddit/${websiteId}/communities?${params.toString()}`);
      setCommunities(response.data.communities);
    } catch (error: any) {
      toast.error('Failed to load communities');
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverCommunities = async () => {
    setDiscovering(true);
    try {
      const response = await api.post(`/reddit/${websiteId}/discover`);
      toast.success(`Discovered ${response.data.communities.length} new communities!`);
      loadCommunities();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to discover communities');
      console.error('Error discovering communities:', error);
    } finally {
      setDiscovering(false);
    }
  };

  const handleTrackCommunity = async (community: RedditCommunity) => {
    try {
      const newTrackedStatus = !community.tracked;
      await api.put(`/reddit/${websiteId}/communities/${community.id}/track`, {
        tracked: newTrackedStatus,
        notes: trackingNotes,
      });

      toast.success(
        newTrackedStatus ? 'Community added to tracking' : 'Community removed from tracking'
      );

      // Update local state
      setCommunities(
        communities.map((c) => (c.id === community.id ? { ...c, tracked: newTrackedStatus } : c))
      );
      setShowTrackModal(false);
      setTrackingNotes('');
    } catch (error: any) {
      toast.error('Failed to update tracking');
    }
  };

  if (!token) return null;

  const filteredCommunities = communities;
  const trackedCount = communities.filter((c) => c.tracked).length;
  const easyCount = communities.filter((c) => c.difficulty === 'easy').length;
  const mediumCount = communities.filter((c) => c.difficulty === 'medium').length;
  const difficultCount = communities.filter((c) => c.difficulty === 'difficult').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reddit Community Discovery</h1>
            <p className="text-gray-600 mt-2">Find and track relevant Reddit communities for your niche</p>
          </div>
          <button
            onClick={handleDiscoverCommunities}
            disabled={discovering}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium flex items-center gap-2"
          >
            {discovering ? '🔄 Discovering...' : '🔍 Discover Communities'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Total Communities</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{communities.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Tracked</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{trackedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Easy Communities</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{easyCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-semibold">Medium Communities</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{mediumCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Filters</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tracked Status</label>
            <select
              value={filters.tracked}
              onChange={(e) => setFilters({ ...filters, tracked: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Communities</option>
              <option value="true">Tracked Only</option>
              <option value="false">Untracked Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty to Post</label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy (✅)</option>
              <option value="medium">Medium (⚠️)</option>
              <option value="difficult">Difficult (🔴)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Communities List */}
      {loading ? (
        <div className="text-center py-8">Loading communities...</div>
      ) : filteredCommunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No communities found. Try discovering some first!</p>
          <button
            onClick={handleDiscoverCommunities}
            disabled={discovering}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium"
          >
            {discovering ? 'Discovering...' : 'Discover Communities'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCommunities.map((community) => (
            <div key={community.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {community.redditIconUrl && (
                    <img
                      src={community.redditIconUrl}
                      alt={community.subredditName}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">/r/{community.subredditName}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${difficultyColors[community.difficulty] || 'bg-gray-100'}`}>
                        {difficultyEmoji[community.difficulty]} {community.difficulty.toUpperCase()}
                      </span>
                      {community.tracked && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          📌 TRACKED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{community.displayName}</p>
                    {community.description && (
                      <p className="text-sm text-gray-500 mt-2 max-w-2xl line-clamp-2">
                        {community.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-5 gap-4 mb-4 py-4 border-t border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-600">Members</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(community.subscribers / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Active Now</p>
                  <p className="text-lg font-bold text-gray-900">{community.activeUsers}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Posts/Day</p>
                  <p className="text-lg font-bold text-gray-900">
                    {Number(community.avgPostsPerDay).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Relevance</p>
                  <p className="text-lg font-bold text-green-600">{community.relevanceScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Posting</p>
                  <p className="text-sm font-bold text-gray-900">
                    {community.postingAllowed ? '✅ Allowed' : '🚫 Restricted'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedCommunity(community);
                    setTrackingNotes(community.notes || '');
                    setShowTrackModal(true);
                  }}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    community.tracked
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {community.tracked ? '📌 Untrack' : '📌 Track'}
                </button>

                <a
                  href={community.redditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 flex items-center gap-1"
                >
                  🔗 Visit
                </a>

                <button
                  onClick={() => router.push(`/dashboard/reddit/${websiteId}/${community.id}/posts`)}
                  className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700"
                >
                  📊 History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Track Modal */}
      {showTrackModal && selectedCommunity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {selectedCommunity.tracked ? 'Untrack Community' : 'Track Community'}
            </h2>
            <p className="text-gray-600 mb-4">/r/{selectedCommunity.subredditName}</p>

            {!selectedCommunity.tracked && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={trackingNotes}
                  onChange={(e) => setTrackingNotes(e.target.value)}
                  placeholder="Add notes about your strategy for this community..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowTrackModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTrackCommunity(selectedCommunity)}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition ${
                  selectedCommunity.tracked
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {selectedCommunity.tracked ? 'Untrack' : 'Track'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

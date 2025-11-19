'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface CompetitorDomain {
  domain: string;
  backlinks: number;
  keywords: number;
}

interface BacklinkGap {
  domain: string;
  backlinksCount: number;
  trafficEstimate: number;
  authority: number;
}

interface KeywordGap {
  keyword: string;
  position: number;
  trafficEstimate: number;
  difficulty: number;
  url: string;
}

interface Analysis {
  id: number;
  competitor_domain: string;
  user_domain: string;
  competitor_backlinks: number;
  user_backlinks: number;
  gap_opportunities: number;
  analysis_data: {
    backlinkGaps: BacklinkGap[];
    competitorTopAnchors: Array<{ text: string; count: number }>;
    userTopAnchors: Array<{ text: string; count: number }>;
  };
  created_at: string;
}

export default function CompetitorAnalysisPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [competitorDomain, setCompetitorDomain] = useState('');
  const [userDomain, setUserDomain] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [activeTab, setActiveTab] = useState<'backlinks' | 'keywords' | 'history'>('backlinks');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadAnalyses();
  }, [token]);

  const loadAnalyses = async () => {
    try {
      const response = await api.get(`/competitors/${user?.id}/analyses`);
      setAnalyses(response.data);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    }
  };

  const handleAnalyzeBacklinks = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!competitorDomain || !userDomain) {
      toast.error('Both domains are required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/competitors/backlinks', {
        competitorDomain,
        userDomain,
        userId: user?.id,
      });

      toast.success('Backlink analysis complete!');
      setSelectedAnalysis(response.data.analysis);
      setCompetitorDomain('');
      setUserDomain('');
      loadAnalyses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to analyze backlinks');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeKeywords = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!competitorDomain || !userDomain) {
      toast.error('Both domains are required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/competitors/keywords', {
        competitorDomain,
        userDomain,
        countryCode: 'US',
        userId: user?.id,
      });

      toast.success('Keyword gap analysis complete!');
      setSelectedAnalysis(response.data.analysis as any);
      setActiveTab('keywords');
      loadAnalyses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to analyze keywords');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id: number) => {
    if (!confirm('Delete this analysis?')) return;

    try {
      await api.delete(`/competitors/analyses/${id}`);
      toast.success('Analysis deleted');
      loadAnalyses();
      setSelectedAnalysis(null);
    } catch (error: any) {
      toast.error('Failed to delete analysis');
    }
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Competitor Analysis</h1>
        <p className="text-gray-600 mt-2">
          Analyze competitor backlinks and keywords to identify growth opportunities
        </p>
      </div>

      {/* Analysis Form */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Backlink Analysis Form */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">🔗 Backlink Analysis</h2>
          <form onSubmit={handleAnalyzeBacklinks} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Domain
              </label>
              <input
                type="text"
                value={userDomain}
                onChange={(e) => setUserDomain(e.target.value)}
                placeholder="mysite.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competitor Domain
              </label>
              <input
                type="text"
                value={competitorDomain}
                onChange={(e) => setCompetitorDomain(e.target.value)}
                placeholder="competitor.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Analyzing...' : 'Analyze Backlinks'}
            </button>
          </form>
        </div>

        {/* Keyword Gap Form */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">🔑 Keyword Gap Analysis</h2>
          <form onSubmit={handleAnalyzeKeywords} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Domain
              </label>
              <input
                type="text"
                value={userDomain}
                onChange={(e) => setUserDomain(e.target.value)}
                placeholder="mysite.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competitor Domain
              </label>
              <input
                type="text"
                value={competitorDomain}
                onChange={(e) => setCompetitorDomain(e.target.value)}
                placeholder="competitor.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {loading ? 'Analyzing...' : 'Find Keyword Gaps'}
            </button>
          </form>
        </div>
      </div>

      {/* Results Section */}
      {selectedAnalysis && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
              <p className="text-gray-600 mt-1">
                {selectedAnalysis.competitor_domain} vs {selectedAnalysis.user_domain}
              </p>
            </div>
            <button
              onClick={() => handleDeleteAnalysis(selectedAnalysis.id)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
            >
              Delete
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('backlinks')}
              className={`px-4 py-2 font-semibold border-b-2 transition ${
                activeTab === 'backlinks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🔗 Backlinks
            </button>
            <button
              onClick={() => setActiveTab('keywords')}
              className={`px-4 py-2 font-semibold border-b-2 transition ${
                activeTab === 'keywords'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🔑 Keywords
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-semibold border-b-2 transition ${
                activeTab === 'history'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Metrics
            </button>
          </div>

          {/* Backlinks Tab */}
          {activeTab === 'backlinks' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Competitor Backlinks</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(selectedAnalysis as any).competitorBacklinks || 0}
                  </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Your Backlinks</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {(selectedAnalysis as any).userBacklinks || 0}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Gap Opportunities</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(selectedAnalysis as any).backlinkGapCount || 0}
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-lg mb-4">Top Backlink Opportunities</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {((selectedAnalysis as any).backlinkGaps || []).slice(0, 15).map(
                  (gap: BacklinkGap, idx: number) => (
                    <div key={idx} className="border border-gray-200 p-4 rounded hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{gap.domain}</p>
                          <p className="text-sm text-gray-600">
                            {gap.backlinksCount} backlinks • {gap.trafficEstimate} traffic estimate
                          </p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          DA {gap.authority}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Common Keywords</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(selectedAnalysis as any).commonKeywordsCount || 0}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Gap Keywords</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(selectedAnalysis as any).gapOpportunitiesCount || 0}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Your Exclusive</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(selectedAnalysis as any).userExclusiveCount || 0}
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-lg mb-4">Top Keyword Opportunities</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {((selectedAnalysis as any).topGapKeywords || []).map(
                  (keyword: KeywordGap, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-200 p-4 rounded hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{keyword.keyword}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Position {keyword.position} • {keyword.trafficEstimate} monthly traffic
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Difficulty: {keyword.difficulty}/100
                          </p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {keyword.opportunity || 'Medium'}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'history' && (
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold text-lg mb-3">Competitor Top Anchors</h3>
                  <div className="space-y-2">
                    {((selectedAnalysis as any).competitorTopAnchors || [])
                      .slice(0, 10)
                      .map((anchor: any, idx: number) => (
                        <div key={idx} className="flex justify-between p-2 border border-gray-200 rounded">
                          <span className="text-gray-900 font-medium">{anchor.text}</span>
                          <span className="text-gray-600 text-sm">{anchor.count}x</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Your Top Anchors</h3>
                  <div className="space-y-2">
                    {((selectedAnalysis as any).userTopAnchors || [])
                      .slice(0, 10)
                      .map((anchor: any, idx: number) => (
                        <div key={idx} className="flex justify-between p-2 border border-gray-200 rounded">
                          <span className="text-gray-900 font-medium">{anchor.text}</span>
                          <span className="text-gray-600 text-sm">{anchor.count}x</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous Analyses */}
      {analyses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Previous Analyses</h2>
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => setSelectedAnalysis(analysis)}
                className="w-full text-left border border-gray-200 p-4 rounded hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {analysis.competitor_domain} vs {analysis.user_domain}
                    </p>
                    <p className="text-sm text-gray-600">
                      {analysis.gap_opportunities} opportunities • {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

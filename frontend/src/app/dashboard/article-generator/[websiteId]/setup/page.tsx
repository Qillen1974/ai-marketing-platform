'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWebsiteStore } from '@/stores/websiteStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AnalysisResult {
  keywords: string[];
  websiteDescription: string;
  targetAudience: string;
  websiteName: string;
  suggestedTopics: string[];
}

export default function ArticleGeneratorSetupPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const params = useParams();
  const websiteId = params.websiteId as string;

  const websites = useWebsiteStore((state) => state.websites);
  const fetchWebsites = useWebsiteStore((state) => state.fetchWebsites);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [targetUrl, setTargetUrl] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  const website = websites.find((w) => w.id === parseInt(websiteId));

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

  useEffect(() => {
    if (website) {
      // Pre-fill URL with website domain
      setTargetUrl(`https://${website.domain}`);
    }
  }, [website]);

  const handleAnalyzeUrl = async () => {
    if (!targetUrl) {
      toast.error('Please enter a URL');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await api.post('/articles/analyze-url', { url: targetUrl });
      const result = response.data.analysis;

      setAnalysis(result);
      setSelectedKeywords(result.keywords || []);
      setWebsiteName(result.websiteName || '');
      setWebsiteDescription(result.websiteDescription || '');
      setTargetAudience(result.targetAudience || '');

      toast.success('URL analyzed successfully!');
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to analyze URL');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  const handleAddCustomKeyword = () => {
    if (!customKeyword.trim()) return;
    if (selectedKeywords.includes(customKeyword.trim())) {
      toast.error('Keyword already exists');
      return;
    }
    setSelectedKeywords([...selectedKeywords, customKeyword.trim()]);
    setCustomKeyword('');
  };

  const handleCreateCampaign = async () => {
    if (selectedKeywords.length === 0) {
      toast.error('Please select at least one keyword');
      return;
    }

    setSaving(true);
    try {
      await api.post('/articles/campaigns', {
        websiteId: parseInt(websiteId),
        targetUrl,
        websiteName,
        websiteDescription,
        targetAudience,
        autoKeywords: analysis?.keywords || [],
        customKeywords: selectedKeywords.filter((k) => !analysis?.keywords.includes(k)),
      });

      toast.success('Article campaign created!');
      router.push(`/dashboard/article-generator/${websiteId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  if (!token) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/article-generator-selector')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
        >
          ← Back to selector
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Set Up Article Generator</h1>
        <p className="text-gray-600 mt-2">
          {website?.domain || 'Configure'} - Let&apos;s analyze your website and set up keyword targeting
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step > s ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: URL Analysis */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Step 1: Analyze Your Website</h2>
          <p className="text-gray-600 mb-6">
            Enter your website URL and we&apos;ll use AI to analyze it and suggest relevant keywords for article generation.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleAnalyzeUrl}
              disabled={analyzing || !targetUrl}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analyzing Website...
                </>
              ) : (
                <>
                  🔍 Analyze Website
                </>
              )}
            </button>
          </div>

          {/* Analyzing Animation */}
          {analyzing && (
            <div className="mt-8 p-6 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="animate-pulse">
                  <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                    🤖
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-purple-900">AI is analyzing your website...</p>
                  <p className="text-sm text-purple-700">
                    Extracting content, identifying keywords, and understanding your audience
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-purple-800">
                  <span className="animate-pulse">●</span> Fetching website content
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-800">
                  <span className="animate-pulse">●</span> Analyzing page structure
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-800">
                  <span className="animate-pulse">●</span> Generating SEO keywords
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Keyword Selection */}
      {step === 2 && analysis && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Step 2: Review Keywords</h2>
          <p className="text-gray-600 mb-6">
            Select the keywords you want to target in your articles. You can also add custom keywords.
          </p>

          {/* AI-Generated Keywords */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">AI-Suggested Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => handleToggleKeyword(keyword)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    selectedKeywords.includes(keyword)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedKeywords.includes(keyword) ? '✓ ' : ''}
                  {keyword}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Keywords */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Add Custom Keywords</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomKeyword()}
                placeholder="Enter a keyword"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleAddCustomKeyword}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Custom Keywords Display */}
          {selectedKeywords.filter((k) => !analysis.keywords.includes(k)).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Your Custom Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {selectedKeywords
                  .filter((k) => !analysis.keywords.includes(k))
                  .map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => handleToggleKeyword(keyword)}
                      className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200"
                    >
                      ✓ {keyword} ×
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 mt-6">
            <p className="text-sm text-gray-600 mb-4">
              <strong>{selectedKeywords.length}</strong> keywords selected
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedKeywords.length === 0}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Create */}
      {step === 3 && analysis && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Step 3: Confirm Campaign</h2>
          <p className="text-gray-600 mb-6">
            Review your settings and create your article generation campaign.
          </p>

          <div className="space-y-6">
            {/* Website Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website Name
              </label>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website Description
              </label>
              <textarea
                value={websiteDescription}
                onChange={(e) => setWebsiteDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., US professionals, small business owners"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Campaign Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target URL:</span>
                  <span className="font-medium">{targetUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Keywords:</span>
                  <span className="font-medium">{selectedKeywords.length} selected</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                ← Back
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={saving}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    🚀 Create Campaign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Topics Preview */}
      {step >= 2 && analysis?.suggestedTopics && analysis.suggestedTopics.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Suggested Article Topics</h3>
          <p className="text-sm text-gray-600 mb-4">
            Based on your website, here are some article ideas:
          </p>
          <ul className="space-y-2">
            {analysis.suggestedTopics.map((topic, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <span className="text-purple-600">•</span>
                {topic}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

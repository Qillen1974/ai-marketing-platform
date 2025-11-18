'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import BacklinkSettingsPanel from '@/components/BacklinkSettingsPanel';

interface ApiKey {
  id: number;
  provider: string;
  isConfigured: boolean;
  lastUpdated: string;
}

interface UserSettings {
  apiKeys: ApiKey[];
  preferredAiProvider: string;
}

export default function SettingsPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [preferredAiProvider, setPreferredAiProvider] = useState('openai');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const aiProviders = [
    { id: 'openai', name: 'OpenAI (ChatGPT)', color: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'claude', name: 'Anthropic (Claude)', color: 'bg-purple-50', borderColor: 'border-purple-200' },
    { id: 'gemini', name: 'Google (Gemini)', color: 'bg-blue-50', borderColor: 'border-blue-200' },
  ];

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadSettings();
  }, [token]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/api-keys');
      setSettings(response.data);
      setPreferredAiProvider(response.data.preferredAiProvider || 'openai');
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      // Initialize with default settings if endpoint doesn't exist yet
      setSettings({
        apiKeys: [],
        preferredAiProvider: 'openai',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKeyValue.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setSavingKey(true);
    try {
      await api.post('/settings/api-keys', {
        provider: selectedProvider,
        apiKey: apiKeyValue,
      });

      toast.success(`${selectedProvider.toUpperCase()} API key saved successfully!`);
      setApiKeyValue('');
      setShowApiKeyForm(false);
      loadSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save API key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteApiKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to remove your ${provider.toUpperCase()} API key?`)) {
      return;
    }

    try {
      await api.delete(`/settings/api-keys/${provider}`);
      toast.success('API key removed');
      loadSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove API key');
    }
  };

  const handleSetPreferredProvider = async (provider: string) => {
    try {
      await api.post('/settings/preferred-ai-provider', { provider });
      setPreferredAiProvider(provider);
      toast.success(`Preferred AI provider set to ${provider.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update preference');
    }
  };

  if (!token) return null;
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your API keys, preferences, and backlink discovery settings</p>
      </div>

      {/* Backlink Discovery Settings Section */}
      <div className="mb-8">
        <BacklinkSettingsPanel />
      </div>

      {/* AI API Keys Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI API Keys</h2>
            <p className="text-gray-600 mt-1 text-sm">Add your own AI provider keys for email generation</p>
          </div>
          {!showApiKeyForm && (
            <button
              onClick={() => setShowApiKeyForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              + Add API Key
            </button>
          )}
        </div>

        {/* Add API Key Form */}
        {showApiKeyForm && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Add New API Key</h3>
            <form onSubmit={handleSaveApiKey}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  AI Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {aiProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  placeholder={`Enter your ${selectedProvider.toUpperCase()} API key`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  🔒 Your API keys are encrypted and never shared with anyone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingKey}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {savingKey ? 'Saving...' : 'Save API Key'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyForm(false);
                    setApiKeyValue('');
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI Providers Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Your AI Providers</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {aiProviders.map((provider) => {
              const isConfigured = settings?.apiKeys.some((key) => key.provider === provider.id);
              const isPreferred = preferredAiProvider === provider.id;

              return (
                <div
                  key={provider.id}
                  className={`${provider.color} border-2 ${provider.borderColor} rounded-lg p-4`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                    {isConfigured && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                        ✓ Configured
                      </span>
                    )}
                    {!isConfigured && (
                      <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">
                        Not Set
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {isConfigured && (
                      <p className="text-sm text-gray-600">
                        Last updated: {new Date(settings?.apiKeys.find((k) => k.provider === provider.id)?.lastUpdated || '').toLocaleDateString()}
                      </p>
                    )}

                    {isConfigured && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSetPreferredProvider(provider.id)}
                          className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition ${
                            isPreferred
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {isPreferred ? '⭐ Preferred' : 'Use This'}
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(provider.id)}
                          className="flex-1 px-3 py-2 rounded text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    {!isConfigured && (
                      <p className="text-sm text-gray-600">
                        Add your API key to use {provider.name} for email generation.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">How to get API keys?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              <strong>OpenAI:</strong> Get at{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                platform.openai.com
              </a>
            </li>
            <li>
              <strong>Claude:</strong> Get at{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">
                console.anthropic.com
              </a>
            </li>
            <li>
              <strong>Gemini:</strong> Get at{' '}
              <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="underline">
                ai.google.dev
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* API Usage Limits Section (for future) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Plan</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-semibold text-green-900 mb-2">Free Plan</p>
          <p className="text-sm text-green-800 mb-4">
            You're currently on the Free plan. Upgrade to unlock more features and higher usage limits.
          </p>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700">
            View Upgrade Options
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface BacklinkSettings {
  minDomainAuthority: number;
  maxDomainAuthority: number;
  minDifficulty: number;
  maxDifficulty: number;
  minTraffic?: number;
  excludeEduGov?: boolean;
  excludeNewsSites?: boolean;
}

interface Preset {
  label: string;
  description: string;
  minDomainAuthority: number;
  maxDomainAuthority: number;
  minDifficulty: number;
  maxDifficulty: number;
}

const PRESETS: Record<string, Preset> = {
  startup: {
    label: 'Startup / New Site',
    description: 'Easy wins with smaller sites',
    minDomainAuthority: 10,
    maxDomainAuthority: 40,
    minDifficulty: 10,
    maxDifficulty: 50,
  },
  growing: {
    label: 'Growing Site',
    description: 'Balanced mix of easy and moderate',
    minDomainAuthority: 30,
    maxDomainAuthority: 60,
    minDifficulty: 25,
    maxDifficulty: 65,
  },
  established: {
    label: 'Established Brand',
    description: 'Quality over quantity',
    minDomainAuthority: 50,
    maxDomainAuthority: 80,
    minDifficulty: 40,
    maxDifficulty: 80,
  },
  aggressive: {
    label: 'Aggressive Growth',
    description: 'All opportunities',
    minDomainAuthority: 20,
    maxDomainAuthority: 90,
    minDifficulty: 20,
    maxDifficulty: 90,
  },
};

interface BacklinkSettingsPanelProps {
  onSettingsUpdated?: (settings: BacklinkSettings) => void;
}

export default function BacklinkSettingsPanel({ onSettingsUpdated }: BacklinkSettingsPanelProps) {
  const [settings, setSettings] = useState<BacklinkSettings>({
    minDomainAuthority: 10,
    maxDomainAuthority: 60,
    minDifficulty: 20,
    maxDifficulty: 70,
    minTraffic: 0,
    excludeEduGov: false,
    excludeNewsSites: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/backlinks/settings/discovery');
      if (response.data && response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error: any) {
      console.error('Failed to load backlink settings:', error);
      // Use defaults if endpoint fails
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    // Validate ranges
    if (settings.maxDomainAuthority <= settings.minDomainAuthority) {
      toast.error('Max Domain Authority must be greater than Min');
      return;
    }

    if (settings.maxDifficulty <= settings.minDifficulty) {
      toast.error('Max Difficulty must be greater than Min');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/backlinks/settings/discovery', {
        minDomainAuthority: settings.minDomainAuthority,
        maxDomainAuthority: settings.maxDomainAuthority,
        minDifficulty: settings.minDifficulty,
        maxDifficulty: settings.maxDifficulty,
        minTraffic: settings.minTraffic || 0,
        excludeEduGov: settings.excludeEduGov || false,
        excludeNewsSites: settings.excludeNewsSites || false,
      });

      if (response.data && response.data.settings) {
        setSettings(response.data.settings);
      }

      toast.success('Backlink discovery settings updated successfully!');

      if (onSettingsUpdated) {
        onSettingsUpdated(settings);
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    const newSettings = {
      ...settings,
      minDomainAuthority: preset.minDomainAuthority,
      maxDomainAuthority: preset.maxDomainAuthority,
      minDifficulty: preset.minDifficulty,
      maxDifficulty: preset.maxDifficulty,
    };
    setSettings(newSettings);
    toast.success(`Applied preset: ${preset.label}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Backlink Opportunity Preferences
      </h2>

      <p className="text-gray-600 mb-6">
        Customize the Domain Authority and Difficulty ranges for backlink opportunities. This controls what types of opportunities you see when discovering backlinks.
      </p>

      {/* Domain Authority Section */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Domain Authority Range
        </label>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Minimum</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.minDomainAuthority}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  minDomainAuthority: parseInt(e.target.value) || 1,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-gray-500">to</div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Maximum</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.maxDomainAuthority}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxDomainAuthority: parseInt(e.target.value) || 100,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Higher DA means more established sites (harder to get links from)
        </p>
      </div>

      {/* Difficulty Section */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Difficulty Range
        </label>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Minimum</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.minDifficulty}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  minDifficulty: parseInt(e.target.value) || 1,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-gray-500">to</div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Maximum</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.maxDifficulty}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxDifficulty: parseInt(e.target.value) || 100,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          20-70 is recommended for achievable targets
        </p>
      </div>

      {/* Quick Presets */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handleApplyPreset(key)}
              className="text-left p-3 border border-gray-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <div className="font-semibold text-gray-800 text-sm">{preset.label}</div>
              <div className="text-xs text-gray-600 mt-1">{preset.description}</div>
              <div className="text-xs text-gray-500 mt-2">
                DA {preset.minDomainAuthority}-{preset.maxDomainAuthority}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Options */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Additional Filters
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.excludeEduGov || false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  excludeEduGov: e.target.checked,
                })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Exclude .edu and .gov sites</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.excludeNewsSites || false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  excludeNewsSites: e.target.checked,
                })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Exclude news sites</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={loadSettings}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-gray-700"
        >
          Reset
        </button>
      </div>

      {/* Current Settings Display */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">Current Settings</h3>
        <p className="text-sm text-blue-800">
          Your discovery will find opportunities with Domain Authority {settings.minDomainAuthority}-{settings.maxDomainAuthority} and Difficulty {settings.minDifficulty}-{settings.maxDifficulty}.
        </p>
      </div>
    </div>
  );
}

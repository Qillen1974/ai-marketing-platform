'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface BacklinkHealth {
  totalBacklinks: number;
  activeBacklinks: number;
  brokenBacklinks: number;
  activePercentage: number;
  averageDomainAuthority: number;
  averageHealth: number;
  healthStatus: string;
}

interface BacklinkHealthWidgetProps {
  websiteId: number;
}

export default function BacklinkHealthWidget({ websiteId }: BacklinkHealthWidgetProps) {
  const [health, setHealth] = useState<BacklinkHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBacklinkHealth();
  }, [websiteId]);

  const loadBacklinkHealth = async () => {
    try {
      const response = await api.get(`/monitoring/${websiteId}/health`);
      setHealth(response.data.health);
    } catch (error) {
      console.error('Failed to load backlink health:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-32 flex items-center justify-center">
          <p className="text-gray-500">Loading backlink health...</p>
        </div>
      </div>
    );
  }

  if (!health || health.totalBacklinks === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">🔗 Backlink Health</h3>
        <p className="text-gray-600">
          No acquired backlinks yet. Start by discovering opportunities and acquiring backlinks!
        </p>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    if (status === 'Excellent') return 'text-green-600 bg-green-50';
    if (status === 'Good') return 'text-blue-600 bg-blue-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getHealthBorder = (status: string) => {
    if (status === 'Excellent') return 'border-green-200';
    if (status === 'Good') return 'border-blue-200';
    return 'border-orange-200';
  };

  const getHealthProgress = (status: string) => {
    if (status === 'Excellent') return 'bg-green-600';
    if (status === 'Good') return 'bg-blue-600';
    return 'bg-orange-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 border-b-2 ${getHealthColor(health.healthStatus)}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">🔗 Backlink Health</h3>
          <p className={`text-sm font-semibold mt-1 ${getHealthColor(health.healthStatus).split(' ')[0]}`}>
            {health.healthStatus}
          </p>
        </div>
        <Link
          href={`/dashboard/acquired-backlinks/${websiteId}`}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          View All →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-xs text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{health.totalBacklinks}</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <p className="text-xs text-green-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{health.activeBacklinks}</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <p className="text-xs text-red-600 mb-1">Broken</p>
          <p className="text-2xl font-bold text-red-600">{health.brokenBacklinks}</p>
        </div>
      </div>

      {/* Health Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-medium text-gray-700">Health Score</p>
          <p className="text-xs font-bold text-gray-900">{health.averageHealth}/100</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getHealthProgress(health.healthStatus)}`}
            style={{ width: `${Math.min(health.averageHealth, 100)}%` }}
          />
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-600">Active Rate</p>
          <p className="text-lg font-bold text-gray-900">{health.activePercentage}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Avg Domain Authority</p>
          <p className="text-lg font-bold text-blue-600">{health.averageDomainAuthority}</p>
        </div>
      </div>
    </div>
  );
}

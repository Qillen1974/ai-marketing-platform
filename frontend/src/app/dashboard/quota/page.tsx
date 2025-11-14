'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isUnlimited: boolean;
}

interface UsageData {
  month: string;
  plan: string;
  audits: QuotaUsage;
  backlink_discovery: QuotaUsage;
  email_sent: QuotaUsage;
}

export default function QuotaPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadQuota();
  }, [token]);

  const loadQuota = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quota');
      setUsage(response.data.usage);
    } catch (error: any) {
      toast.error('Failed to load quota information');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading quota...</div>;
  }

  if (!usage) {
    return <div className="text-center py-8">Failed to load quota information</div>;
  }

  const QuotaBar = ({ quota, label }: { quota: QuotaUsage; label: string }) => {
    const getColor = () => {
      if (quota.isUnlimited) return 'bg-green-500';
      if (quota.percentage >= 90) return 'bg-red-500';
      if (quota.percentage >= 70) return 'bg-orange-500';
      return 'bg-blue-500';
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
          <span className={`text-sm font-bold px-3 py-1 rounded text-white ${getColor()}`}>
            {quota.isUnlimited ? '∞ Unlimited' : `${quota.percentage}%`}
          </span>
        </div>

        {!quota.isUnlimited ? (
          <>
            <div className="mb-2">
              <p className="text-sm text-gray-600">
                {quota.used} / {quota.limit} used
              </p>
              <p className="text-xs text-gray-500">
                {quota.remaining} remaining this month
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getColor()}`}
                style={{ width: `${Math.min(quota.percentage, 100)}%` }}
              ></div>
            </div>

            {quota.percentage >= 70 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-xs text-amber-800">
                  ⚠️ You're using {quota.percentage}% of your monthly quota.
                  {quota.percentage >= 90 && ' Consider upgrading your plan or providing your own API keys.'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-xs text-green-800">✓ Unlimited usage on your plan</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Usage & Quota</h1>
        <p className="text-gray-600 mt-2">Track your monthly API usage</p>
      </div>

      {/* Plan Info */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-100">Current Plan</p>
            <p className="text-3xl font-bold mt-2">{usage.plan.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100">Month</p>
            <p className="text-2xl font-bold mt-2">{usage.month}</p>
          </div>
        </div>
      </div>

      {/* Usage Bars */}
      <div className="grid md:grid-cols-1 gap-6 mb-8">
        <QuotaBar quota={usage.audits} label="SEO Audits" />
        <QuotaBar quota={usage.backlink_discovery} label="Backlink Discoveries" />
        <QuotaBar quota={usage.email_sent} label="Emails Sent" />
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">About Your Quota</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ Quotas reset on the 1st of each month</li>
          <li>✓ If you provide your own API keys, your usage limits increase</li>
          <li>
            ✓ Upgrade your plan to unlock higher quotas and more features
          </li>
          <li>✓ Enterprise plan offers unlimited usage</li>
        </ul>
      </div>

      {/* Upgrade Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-6 border-2 border-blue-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Need more quota?</h3>
        <p className="text-gray-600 mb-4">
          You have two options to increase your quota:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Option 1: Upgrade Plan</h4>
            <p className="text-sm text-gray-600 mb-3">
              Upgrade to Starter, Professional, or Enterprise for higher quotas.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 text-sm">
              View Plans
            </button>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Option 2: Add Your API Keys</h4>
            <p className="text-sm text-gray-600 mb-3">
              Provide your own API keys to bypass our limits and pay directly.
            </p>
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 text-sm"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

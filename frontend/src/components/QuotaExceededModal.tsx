'use client';

import { useRouter } from 'next/navigation';

interface QuotaExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: 'audit' | 'backlink_discovery' | 'email_sent';
  quotaUsed: number;
  quotaLimit: number;
  message?: string;
}

export default function QuotaExceededModal({
  isOpen,
  onClose,
  service,
  quotaUsed,
  quotaLimit,
  message,
}: QuotaExceededModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const getServiceInfo = () => {
    switch (service) {
      case 'audit':
        return {
          title: 'SEO Audit Quota Exceeded',
          icon: '📊',
          description: 'You have reached your monthly SEO audit limit.',
          apiKey: 'Google PageSpeed API key',
        };
      case 'backlink_discovery':
        return {
          title: 'Backlink Discovery Quota Exceeded',
          icon: '🔗',
          description: 'You have reached your monthly backlink discovery limit.',
          apiKey: 'Serper API key',
        };
      case 'email_sent':
        return {
          title: 'Email Sending Quota Exceeded',
          icon: '📧',
          description: 'You have reached your monthly email sending limit.',
          apiKey: 'Resend API key',
        };
      default:
        return {
          title: 'Quota Exceeded',
          icon: '⚠️',
          description: 'You have reached your monthly quota.',
          apiKey: 'API key',
        };
    }
  };

  const info = getServiceInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{info.icon}</span>
            <h2 className="text-2xl font-bold text-red-900">{info.title}</h2>
          </div>
          <p className="text-red-700 text-sm">{info.description}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Usage Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Monthly Usage</p>
            <div className="flex items-end gap-4 mb-3">
              <div>
                <p className="text-3xl font-bold text-red-600">{quotaUsed}</p>
                <p className="text-xs text-gray-500">used</p>
              </div>
              <div className="text-gray-400">/</div>
              <div>
                <p className="text-3xl font-bold text-gray-700">{quotaLimit}</p>
                <p className="text-xs text-gray-500">limit</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-red-600"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>

          {/* Custom Message */}
          {message && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">{message}</p>
            </div>
          )}

          {/* Solutions */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Choose an option to continue:</p>

            {/* Option 1: Upgrade */}
            <button
              onClick={() => {
                onClose();
                router.push('/dashboard/plans');
              }}
              className="w-full p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-left"
            >
              <p className="font-semibold text-blue-900 mb-1">📈 Upgrade Your Plan</p>
              <p className="text-xs text-blue-700">
                Get higher monthly limits with Starter, Professional, or Enterprise plans.
              </p>
            </button>

            {/* Option 2: Add API Key */}
            <button
              onClick={() => {
                onClose();
                router.push('/dashboard/settings');
              }}
              className="w-full p-4 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition text-left"
            >
              <p className="font-semibold text-green-900 mb-1">🔑 Add {info.apiKey}</p>
              <p className="text-xs text-green-700">
                Use your own API key to bypass our limits completely.
              </p>
            </button>
          </div>

          {/* Upgrade Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> When you provide your own {info.apiKey}, you pay only for what you use and skip our quota limits entirely.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

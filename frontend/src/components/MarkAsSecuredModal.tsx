'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface MarkAsSecuredModalProps {
  opportunityId: number;
  sourceDomain: string;
  websiteId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MarkAsSecuredModal({
  opportunityId,
  sourceDomain,
  websiteId,
  onClose,
  onSuccess,
}: MarkAsSecuredModalProps) {
  const [backlinkUrl, setBacklinkUrl] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleAddBacklink = async () => {
    if (!backlinkUrl.trim()) {
      toast.error('Backlink URL is required');
      return;
    }

    // Validate URL
    try {
      new URL(backlinkUrl);
    } catch (err) {
      toast.error('Invalid URL format');
      return;
    }

    setLoading(true);
    setVerifying(true);

    try {
      const response = await api.post(`/monitoring/${websiteId}/acquired`, {
        backlinkUrl,
        anchorText: anchorText || undefined,
        opportunityId,
      });

      toast.success('Backlink added and verified!');

      // Clear form
      setBacklinkUrl('');
      setAnchorText('');

      // Notify parent
      if (onSuccess) {
        onSuccess();
      }

      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add backlink');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mark as Secured</h2>
              <p className="text-gray-600 mt-1">{sourceDomain}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Found a backlink from this site?</strong> Enter the URL where your backlink
              appears. We'll verify it and track its performance over time.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backlink URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                placeholder="https://example.com/article"
                value={backlinkUrl}
                onChange={(e) => setBacklinkUrl(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Full URL to the page that contains your backlink
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anchor Text <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., your website name or keyword"
                value={anchorText}
                onChange={(e) => setAnchorText(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                The text of the link pointing to your site
              </p>
            </div>
          </div>

          {/* Status */}
          {verifying && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-900 flex items-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Verifying backlink...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleAddBacklink}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  Adding...
                </>
              ) : (
                <>
                  <span>✅</span>
                  Add Backlink
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Opportunity {
  id: number;
  sourceDomain: string;
  sourceUrl: string;
  opportunityType: string;
  domainAuthority: number;
}

interface EmailGeneratorModalProps {
  opportunity: Opportunity;
  websiteId: number;
  onClose: () => void;
  onEmailSent?: () => void;
}

export default function EmailGeneratorModal({
  opportunity,
  websiteId,
  onClose,
  onEmailSent,
}: EmailGeneratorModalProps) {
  const [step, setStep] = useState<'generate' | 'edit' | 'sent'>('generate');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState('initial');

  const handleGenerateEmail = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        `/outreach/${websiteId}/opportunities/${opportunity.id}/generate-email`,
        { messageType }
      );

      setSubject(response.data.email.subject);
      setBody(response.data.email.body);
      setStep('edit');
      toast.success('Email generated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/outreach/${websiteId}/opportunities/${opportunity.id}/send-email`, {
        subject,
        body,
        messageType,
      });

      toast.success('Email sent successfully!');
      setStep('sent');

      // Notify parent component
      if (onEmailSent) {
        onEmailSent();
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: { [key: string]: string } = {
    guest_post: '📝 Guest Post',
    broken_link: '🔗 Broken Link',
    resource_page: '📚 Resource Page',
    directory: '📁 Directory',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Generate Outreach Email</h2>
              <p className="text-gray-600 mt-1">{opportunity.sourceDomain}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {/* Opportunity Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600">Type</p>
                <p className="font-semibold">
                  {typeLabels[opportunity.opportunityType] || opportunity.opportunityType}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Domain Authority</p>
                <p className="font-semibold text-blue-600">{opportunity.domainAuthority}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">URL</p>
                <a
                  href={opportunity.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm truncate"
                >
                  Visit
                </a>
              </div>
            </div>
          </div>

          {/* Step: Generate */}
          {step === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Type
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="initial">Initial Outreach</option>
                  <option value="followup_1">Follow-up #1</option>
                  <option value="followup_2">Follow-up #2</option>
                </select>
              </div>

              <p className="text-sm text-gray-600">
                AI will generate a personalized email based on the opportunity type and your
                website's keywords.
              </p>

              <button
                onClick={handleGenerateEmail}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Generating email...
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    Generate Email with AI
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step: Edit */}
          {step === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={loading}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('generate')}
                  disabled={loading}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Sent */}
          {step === 'sent' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email Sent Successfully!</h3>
              <p className="text-gray-600">
                Your outreach email has been sent to {opportunity.sourceDomain}. You'll be
                notified when they respond.
              </p>
              <p className="text-sm text-gray-500 mt-4">Closing in a few seconds...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

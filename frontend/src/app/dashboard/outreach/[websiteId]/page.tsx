'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface OutreachMessage {
  id: number;
  opportunityId: number;
  sourceDomain: string;
  opportunityType: string;
  messageType: string;
  subject: string;
  body: string;
  status: string;
  sentDate: string;
  responseReceived: boolean;
  responseDate: string;
}

interface FilterOptions {
  status: string;
  messageType: string;
  searchTerm: string;
}

const statusColors: { [key: string]: string } = {
  sent: 'bg-blue-100 text-blue-800',
  replied: 'bg-green-100 text-green-800',
  opened: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
};

const messageTypeLabels: { [key: string]: string } = {
  initial: '📧 Initial Outreach',
  followup_1: '📨 Follow-up #1',
  followup_2: '📩 Follow-up #2',
};

const typeLabels: { [key: string]: string } = {
  guest_post: '📝 Guest Post',
  broken_link: '🔗 Broken Link',
  resource_page: '📚 Resource Page',
  directory: '📁 Directory',
};

export default function OutreachHistoryPage({
  params,
}: {
  params: { websiteId: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    messageType: '',
    searchTerm: '',
  });
  const [selectedMessage, setSelectedMessage] = useState<OutreachMessage | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    totalEmails: 0,
    emailsSent: 0,
    responsesReceived: 0,
    replies: 0,
    responseRate: 0,
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadOutreachHistory();
    loadOutreachStats();
  }, [token, filters]);

  const loadOutreachHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const response = await api.get(`/outreach/${websiteId}/history?${params.toString()}`);
      let filteredMessages = response.data.messages || [];

      // Client-side filtering
      if (filters.status) {
        filteredMessages = filteredMessages.filter((m: OutreachMessage) => m.status === filters.status);
      }
      if (filters.messageType) {
        filteredMessages = filteredMessages.filter((m: OutreachMessage) => m.messageType === filters.messageType);
      }
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredMessages = filteredMessages.filter(
          (m: OutreachMessage) =>
            m.subject.toLowerCase().includes(searchLower) ||
            m.sourceDomain.toLowerCase().includes(searchLower)
        );
      }

      setMessages(filteredMessages);
    } catch (error: any) {
      toast.error('Failed to load outreach history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadOutreachStats = async () => {
    try {
      const response = await api.get(`/outreach/${websiteId}/stats`);
      setStats(response.data.stats);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Outreach History</h1>
        <p className="text-gray-600 mt-2">
          Track all your outreach emails and engagement metrics
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs text-gray-600 mb-1">Total Emails</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalEmails}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs text-gray-600 mb-1">Sent</p>
          <p className="text-3xl font-bold text-green-600">{stats.emailsSent}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs text-gray-600 mb-1">Responses</p>
          <p className="text-3xl font-bold text-purple-600">{stats.responsesReceived}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs text-gray-600 mb-1">Replies</p>
          <p className="text-3xl font-bold text-orange-600">{stats.replies}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-xs text-gray-600 mb-1">Response Rate</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.responseRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Filters</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by domain or subject..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="replied">Replied</option>
              <option value="opened">Opened</option>
              <option value="failed">Failed</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
            <select
              value={filters.messageType}
              onChange={(e) => setFilters({ ...filters, messageType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="initial">Initial Outreach</option>
              <option value="followup_1">Follow-up #1</option>
              <option value="followup_2">Follow-up #2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="text-center py-8">Loading outreach history...</div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No outreach messages found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{msg.sourceDomain}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[msg.status] || 'bg-gray-100'}`}>
                      {msg.status}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      {messageTypeLabels[msg.messageType] || msg.messageType}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Subject: {msg.subject}</p>
                  <p className="text-sm text-gray-600">
                    {typeLabels[msg.opportunityType] || msg.opportunityType}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(msg.sentDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  {msg.responseReceived && (
                    <p className="text-xs text-green-600 font-semibold">✅ Response Received</p>
                  )}
                </div>
              </div>

              <div className="mb-4 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-700 line-clamp-2">{msg.body}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedMessage(msg);
                    setShowDetails(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                >
                  View Full Email
                </button>

                {msg.responseReceived && msg.responseDate && (
                  <button
                    onClick={() => {
                      setSelectedMessage(msg);
                      setShowDetails(true);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                  >
                    View Response
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedMessage.sourceDomain}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {messageTypeLabels[selectedMessage.messageType]}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Subject</p>
                  <p className="font-semibold text-gray-900">{selectedMessage.subject}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Email Body</p>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm whitespace-pre-wrap">
                    {selectedMessage.body}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold text-gray-900">{selectedMessage.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sent Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedMessage.sentDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {selectedMessage.responseReceived && selectedMessage.responseDate && (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <p className="text-sm text-green-900 font-semibold mb-2">✅ Response Received</p>
                    <p className="text-sm text-green-800">
                      {new Date(selectedMessage.responseDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

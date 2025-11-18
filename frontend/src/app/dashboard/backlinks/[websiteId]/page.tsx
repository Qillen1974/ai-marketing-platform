'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import EmailGeneratorModal from '@/components/EmailGeneratorModal';
import MarkAsSecuredModal from '@/components/MarkAsSecuredModal';

interface Opportunity {
  id: number;
  sourceUrl: string;
  sourceDomain: string;
  domainAuthority: number;
  opportunityType: string;
  relevanceScore: number;
  difficultyScore: number;
  status: string;
  contactEmail?: string;
  notes?: string;
}

interface FilterOptions {
  status: string;
  type: string;
  difficulty: string;
}

const statusColors: { [key: string]: string } = {
  discovered: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-purple-100 text-purple-800',
  secured: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const typeLabels: { [key: string]: string } = {
  guest_post: '📝 Guest Post',
  broken_link: '🔗 Broken Link',
  resource_page: '📚 Resource Page',
  directory: '📁 Directory',
};

export default function OpportunitiesPage({
  params,
}: {
  params: { websiteId: string };
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websiteId = Number(params.websiteId);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    type: '',
    difficulty: '',
  });
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [notes, setNotes] = useState('');
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  const [showMarkSecured, setShowMarkSecured] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadOpportunities();
  }, [token, filters]);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);

      console.log(`📋 Frontend: Fetching opportunities for website ${websiteId}`);
      console.log(`🔍 Frontend: Query params: ${params.toString()}`);

      const response = await api.get(`/backlinks/${websiteId}/opportunities?${params.toString()}`);

      console.log(`📊 Frontend: Received ${response.data.opportunities?.length || 0} opportunities`);
      console.log(`📝 Frontend: Response data:`, response.data);

      setOpportunities(response.data.opportunities);
      console.log(`✅ Frontend: State updated with ${response.data.opportunities?.length || 0} opportunities`);
    } catch (error: any) {
      console.error(`❌ Frontend: Error loading opportunities:`, error);
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (opportunityId: number, newStatus: string) => {
    try {
      await api.put(`/backlinks/${websiteId}/opportunities/${opportunityId}`, {
        status: newStatus,
      });

      setOpportunities(
        opportunities.map((opp) =>
          opp.id === opportunityId ? { ...opp, status: newStatus } : opp
        )
      );

      toast.success('Opportunity updated successfully');
    } catch (error: any) {
      toast.error('Failed to update opportunity');
    }
  };

  const handleSaveNotes = async (opportunityId: number) => {
    try {
      await api.put(`/backlinks/${websiteId}/opportunities/${opportunityId}`, {
        notes: notes,
      });

      setOpportunities(
        opportunities.map((opp) =>
          opp.id === opportunityId ? { ...opp, notes: notes } : opp
        )
      );

      setShowDetails(false);
      toast.success('Notes saved successfully');
    } catch (error: any) {
      toast.error('Failed to save notes');
    }
  };

  if (!token) return null;

  const filteredOpportunities = opportunities;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backlink Opportunities</h1>
          <p className="text-gray-600 mt-2">
            Found {filteredOpportunities.length} high-quality backlink opportunities
          </p>
          {/* Debug info */}
          <p className="text-xs text-gray-400 mt-2">
            [DEBUG] opportunities state: {opportunities.length}, filtered: {filteredOpportunities.length}, loading: {loading ? 'yes' : 'no'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/dashboard/outreach/${websiteId}`)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            📧 Outreach History
          </button>
          <button
            onClick={() => router.push(`/dashboard/acquired-backlinks/${websiteId}`)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            🔗 Acquired Backlinks
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">Filters</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="discovered">Discovered</option>
              <option value="contacted">Contacted</option>
              <option value="pending">Pending</option>
              <option value="secured">Secured</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="guest_post">Guest Post</option>
              <option value="broken_link">Broken Link</option>
              <option value="resource_page">Resource Page</option>
              <option value="directory">Directory</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy (0-35)</option>
              <option value="medium">Medium (36-65)</option>
              <option value="difficult">Difficult (66-100)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="text-center py-8">Loading opportunities...</div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No opportunities found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map((opp) => (
            <div key={opp.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{opp.sourceDomain}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[opp.status] || 'bg-gray-100'}`}>
                      {opp.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{opp.sourceUrl}</p>
                </div>

                <span className="ml-4 px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                  {typeLabels[opp.opportunityType] || opp.opportunityType}
                </span>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-4 py-4 border-t border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-600">Domain Authority</p>
                  <p className="text-2xl font-bold text-blue-600">{opp.domainAuthority}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Relevance</p>
                  <p className="text-2xl font-bold text-green-600">{opp.relevanceScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Difficulty</p>
                  <p className="text-2xl font-bold text-orange-600">{opp.difficultyScore}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Score</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round((opp.domainAuthority * 0.3 + opp.relevanceScore * 0.4) / 0.7)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Email Generator */}
                <button
                  onClick={() => {
                    setSelectedOpportunity(opp);
                    setShowEmailGenerator(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <span>🤖</span>
                  Generate Email
                </button>

                {/* Mark as Secured */}
                {opp.status !== 'secured' && opp.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setSelectedOpportunity(opp);
                      setShowMarkSecured(true);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm flex items-center gap-1"
                  >
                    <span>✅</span>
                    Mark as Secured
                  </button>
                )}

                {/* Status Workflow */}
                {opp.status !== 'secured' && opp.status !== 'rejected' && (
                  <>
                    {opp.status === 'discovered' && (
                      <button
                        onClick={() => handleUpdateStatus(opp.id, 'contacted')}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
                      >
                        Mark as Contacted
                      </button>
                    )}
                    {opp.status === 'contacted' && (
                      <button
                        onClick={() => handleUpdateStatus(opp.id, 'pending')}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
                      >
                        Mark as Pending
                      </button>
                    )}
                    {opp.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(opp.id, 'rejected')}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
                      >
                        Mark as Rejected
                      </button>
                    )}
                  </>
                )}

                {/* View Details */}
                <button
                  onClick={() => {
                    setSelectedOpportunity(opp);
                    setNotes(opp.notes || '');
                    setShowDetails(true);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
                >
                  Notes
                </button>

                {opp.contactEmail && (
                  <a
                    href={`mailto:${opp.contactEmail}`}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
                  >
                    Send Email
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedOpportunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedOpportunity.sourceDomain}</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">URL</p>
                  <a
                    href={selectedOpportunity.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {selectedOpportunity.sourceUrl}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this opportunity..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveNotes(selectedOpportunity.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Notes
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Generator Modal */}
      {showEmailGenerator && selectedOpportunity && (
        <EmailGeneratorModal
          opportunity={selectedOpportunity}
          websiteId={websiteId}
          onClose={() => {
            setShowEmailGenerator(false);
            setSelectedOpportunity(null);
          }}
          onEmailSent={() => {
            loadOpportunities();
          }}
        />
      )}

      {/* Mark as Secured Modal */}
      {showMarkSecured && selectedOpportunity && (
        <MarkAsSecuredModal
          opportunityId={selectedOpportunity.id}
          sourceDomain={selectedOpportunity.sourceDomain}
          websiteId={websiteId}
          onClose={() => {
            setShowMarkSecured(false);
            setSelectedOpportunity(null);
          }}
          onSuccess={() => {
            loadOpportunities();
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

interface Website {
  id: number;
  domain: string;
  ga4_property_id: string | null;
}

export default function VisitorStatsSelectorPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadWebsites();
  }, [token]);

  const loadWebsites = async () => {
    try {
      const response = await api.get('/websites');
      setWebsites(response.data);
    } catch (error) {
      console.error('Error loading websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWebsite = (websiteId: number) => {
    router.push(`/dashboard/visitor-stats/${websiteId}`);
  };

  if (!token) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Visitor Statistics</h1>
        <p className="text-gray-600 mt-2">
          Track daily visitors, page views, and traffic sources using Google Analytics
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading websites...</p>
        </div>
      ) : websites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-5xl mb-4">🌐</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Websites Found</h3>
          <p className="text-gray-600 mb-4">
            Add a website first to track visitor statistics.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Website
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {websites.map((website) => (
            <div
              key={website.id}
              onClick={() => handleSelectWebsite(website.id)}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition border border-gray-200 hover:border-blue-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{website.domain}</h3>
                    {website.ga4_property_id ? (
                      <p className="text-sm text-green-600">
                        GA4 Connected (Property: {website.ga4_property_id})
                      </p>
                    ) : (
                      <p className="text-sm text-orange-600">
                        GA4 Not Configured - Click to set up
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

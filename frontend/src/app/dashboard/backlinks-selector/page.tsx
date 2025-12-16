'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWebsiteStore } from '@/stores/websiteStore';
import toast from 'react-hot-toast';

export default function BacklinksSelectorPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const websites = useWebsiteStore((state) => state.websites);
  const fetchWebsites = useWebsiteStore((state) => state.fetchWebsites);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadWebsites = async () => {
      try {
        await fetchWebsites();
      } catch (error) {
        toast.error('Failed to load websites');
      } finally {
        setLoading(false);
      }
    };

    loadWebsites();
  }, [token]);

  const handleSelectWebsite = (websiteId: number) => {
    router.push(`/dashboard/backlinks/${websiteId}`);
  };

  if (!token) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Backlinks Monitor</h1>
        <p className="text-gray-600 mt-2">Select a website to view its backlinks</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading websites...</p>
        </div>
      ) : websites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🌐</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No websites yet</h3>
          <p className="text-gray-600 mb-4">
            Add a website to start monitoring backlinks
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((website) => (
            <div
              key={website.id}
              onClick={() => handleSelectWebsite(website.id)}
              className="bg-white rounded-lg shadow hover:shadow-xl transition cursor-pointer p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{website.domain}</h3>
                  <p className="text-sm text-gray-600">Click to view backlinks</p>
                </div>
                <div className="text-3xl">🔗</div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Website ID:</span>
                  <span className="font-semibold text-gray-900">{website.id}</span>
                </div>
              </div>

              <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition">
                View Backlinks
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

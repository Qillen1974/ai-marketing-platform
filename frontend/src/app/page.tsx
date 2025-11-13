'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  if (token) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">AI Marketing Platform</h1>
        <p className="text-xl mb-8 text-blue-100">
          Automate your SEO and website marketing with AI-powered insights
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-block bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

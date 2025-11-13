'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import '@/app/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  return (
    <html lang="en">
      <head>
        <title>AI Marketing Platform</title>
        <meta name="description" content="AI-powered website marketing platform" />
      </head>
      <body className="bg-gray-50">
        {token && <Navbar />}
        <main>{children}</main>
      </body>
    </html>
  );
}

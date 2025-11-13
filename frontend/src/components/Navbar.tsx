'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
          AI Marketing
        </Link>

        <div className="flex items-center space-x-4 md:space-x-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/backlinks"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Backlinks
          </Link>

          <div className="text-sm hidden sm:block">
            <p className="font-semibold text-gray-800">{user?.fullName}</p>
            <p className="text-gray-500 text-xs">{user?.plan.toUpperCase()} Plan</p>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

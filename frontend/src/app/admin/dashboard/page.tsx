'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface User {
  id: number;
  email: string;
  fullName: string;
  companyName: string;
  plan: string;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isLoggedIn, token, admin, logout } = useAdminAuthStore();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/admin/login');
      return;
    }

    loadUsers();
  }, [isLoggedIn, router]);

  const loadUsers = async (page = 1, searchTerm = '') => {
    setSearchLoading(true);
    try {
      const response = await api.get('/admin/users', {
        params: { page, limit: 20, search: searchTerm },
      });

      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setSearchLoading(false);
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    loadUsers(1, search);
  };

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {admin?.fullName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold">Total Users</h3>
            <p className="text-4xl font-bold text-gray-900 mt-2">{pagination.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold">Pages</h3>
            <p className="text-4xl font-bold text-gray-900 mt-2">{pagination.totalPages}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold">Current Page</h3>
            <p className="text-4xl font-bold text-gray-900 mt-2">{pagination.page}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, name, or company..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={searchLoading}
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Users</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.fullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{user.companyName || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.plan === 'free'
                            ? 'bg-gray-100 text-gray-800'
                            : user.plan === 'starter'
                            ? 'bg-blue-100 text-blue-800'
                            : user.plan === 'professional'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => loadUsers(pagination.page - 1, search)}
                disabled={pagination.page === 1 || searchLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => loadUsers(pagination.page + 1, search)}
                disabled={pagination.page === pagination.totalPages || searchLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

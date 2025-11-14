'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  fullName: string;
  companyName: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

interface Usage {
  serviceType: string;
  usageCount: number;
  monthYear: string;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { isLoggedIn } = useAdminAuthStore();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [websitesCount, setWebsitesCount] = useState(0);
  const [newPlan, setNewPlan] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);
  const [resettingUsage, setResettingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/admin/login');
      return;
    }

    loadUserDetails();
  }, [isLoggedIn, router, userId]);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setUser(response.data.user);
      setUsage(response.data.usage);
      setWebsitesCount(response.data.websitesCount);
      setNewPlan(response.data.user.plan);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load user details');
      console.error('Error loading user:', error);
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!user || newPlan === user.plan) {
      toast.error('Please select a different plan');
      return;
    }

    setChangingPlan(true);
    try {
      await api.put(`/admin/users/${userId}/plan`, { newPlan });
      toast.success(`User plan changed to ${newPlan}`);
      setUser({ ...user, plan: newPlan });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change plan');
    } finally {
      setChangingPlan(false);
    }
  };

  const handleResetUsage = async (serviceType: string) => {
    if (!confirm(`Reset ${serviceType} usage for this month?`)) {
      return;
    }

    setResettingUsage(true);
    try {
      await api.post(`/admin/users/${userId}/reset-usage`, { serviceType });
      toast.success(`${serviceType} usage reset`);
      loadUserDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset usage');
    } finally {
      setResettingUsage(false);
    }
  };

  const handleDeleteUser = async () => {
    if (
      !confirm(
        `Are you sure you want to delete this user? This will also delete all their websites, audits, and data. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      router.push('/admin/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="md:col-span-2 space-y-6">
            {/* User Details */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">User Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900 font-semibold">{user.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-gray-900 font-semibold">{user.fullName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <p className="text-gray-900 font-semibold">{user.companyName || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joined</label>
                  <p className="text-gray-900 font-semibold">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Websites</label>
                  <p className="text-gray-900 font-semibold">{websitesCount}</p>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Monthly Usage</h2>

              {usage.length === 0 ? (
                <p className="text-gray-600">No usage data</p>
              ) : (
                <div className="space-y-4">
                  {usage.map((u) => (
                    <div key={`${u.monthYear}-${u.serviceType}`} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold text-gray-900">{u.serviceType}</p>
                        <p className="text-sm text-gray-600">{u.monthYear}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl font-bold text-gray-900">{u.usageCount}</p>
                        <button
                          onClick={() => handleResetUsage(u.serviceType)}
                          disabled={resettingUsage}
                          className="px-3 py-1 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 disabled:opacity-50 text-sm font-semibold transition"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plan Management */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Change Plan</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Plan</label>
                  <p className="text-2xl font-bold text-gray-900 mb-4">
                    {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Plan</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    disabled={changingPlan}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <button
                  onClick={handleChangePlan}
                  disabled={changingPlan || newPlan === user.plan}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition"
                >
                  {changingPlan ? 'Changing...' : 'Change Plan'}
                </button>

                <div className="text-xs text-gray-600 p-3 bg-blue-50 rounded">
                  💡 Changing a user's plan will update their quota limits immediately.
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-red-900 mb-6">Danger Zone</h2>

              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold transition"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>

              <p className="text-xs text-red-700 mt-3">
                ⚠️ Permanently delete this user and all associated data. This cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

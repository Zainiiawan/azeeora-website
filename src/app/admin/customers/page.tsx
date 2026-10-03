'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Shield, ShieldOff, Trash2, Star } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { userApi } from '@/lib/api/userApi';
import { formatDate } from '@/lib/utils';

import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => userApi.getAll({ limit: 50 }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'customer' | 'warehouse' }) =>
      userApi.updateRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      userApi.setActive(userId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => userApi.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.users ?? [];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-black">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold text-black">Customers</h1>
            <p className="text-sm text-gray-500">{data?.pagination.total ?? 0} total users</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading customers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Total Spent</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Joined</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        {user.firstName} {user.lastName}
                        {user.isVip && <span title="VIP Customer"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /></span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                        {user.totalSpent ? formatPrice(user.totalSpent) : 'Rs. 0'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          user.role === 'admin' ? 'bg-rose-gold/10 text-rose-gold' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.createdAt ? formatDate(user.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {currentUser?._id !== user._id && (
                            <>
                              <label className="inline-flex items-center gap-1 text-gray-500" title="Role">
                                <Shield className="w-4 h-4" />
                                <select
                                  value={user.role}
                                  onChange={(e) => {
                                    const role = e.target.value as 'admin' | 'customer' | 'warehouse';
                                    if (role === 'admin' && !window.confirm(`Give ${user.firstName} full admin access?`)) return;
                                    roleMutation.mutate({ userId: user._id, role });
                                  }}
                                  className="text-xs border border-gray-200 rounded px-1 py-1 bg-white"
                                >
                                  <option value="customer">Customer</option>
                                  <option value="warehouse">Warehouse staff</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </label>
                              <button
                                onClick={() =>
                                  activeMutation.mutate({
                                    userId: user._id,
                                    isActive: user.isActive === false,
                                  })
                                }
                                className="p-1.5 text-gray-500 hover:text-red-500"
                                title="Toggle active"
                              >
                                <ShieldOff className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to permanently delete this user?')) {
                                    deleteMutation.mutate(user._id);
                                  }
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-600"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { m as motion } from 'framer-motion';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Package, User, Lock } from 'lucide-react';
import { RootState } from '@/store';
import { orderApi } from '@/lib/api/orderApi';
import { authApi } from '@/lib/api/authApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatPrice, formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import AccountMemberPanel from '@/components/member/AccountMemberPanel';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AccountPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'password'>('orders');
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderApi.getAll({ limit: 20 }),
    enabled: isAuthenticated,
  });

  const profileForm = useForm<ProfileFormData>({
    values: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  const passwordForm = useForm<PasswordFormData>();

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-rose-gold mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-2">Sign in to your account</h2>
          <Link href="/login?redirect=/account">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      await authApi.updateProfile(data);
      setProfileMsg('Profile updated successfully');
    } catch {
      setProfileMsg('Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await authApi.changePassword(data);
      setPasswordMsg('Password changed successfully');
      passwordForm.reset();
    } catch {
      setPasswordMsg('Failed to change password');
    }
  };

  const orders = ordersData?.orders ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-serif font-bold text-black">My Account</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AccountMemberPanel />
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-56">
            <nav className="bg-white rounded-xl shadow-sm p-4 space-y-1">
              {[
                { id: 'orders', label: 'My Orders', icon: Package },
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'password', label: 'Password', icon: Lock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-rose-gold/10 text-rose-gold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1">
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-serif font-bold mb-6">Order History</h2>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No orders yet</p>
                    <Link href="/shop"><Button>Start Shopping</Button></Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Link
                        key={order._id}
                        href={`/account/orders/${order._id}`}
                        className="block border border-gray-100 rounded-xl p-4 hover:border-rose-gold/30 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-black">{order.orderNumber}</p>
                            <p className="text-sm text-gray-500">
                              {order.createdAt ? formatDate(order.createdAt) : ''} · {order.items.length} items
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-gold">{formatPrice(order.total)}</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-serif font-bold mb-6">Profile Settings</h2>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 max-w-md">
                  <Input label="First Name" {...profileForm.register('firstName', { required: true })} />
                  <Input label="Last Name" {...profileForm.register('lastName', { required: true })} />
                  <Input label="Phone" {...profileForm.register('phone')} />
                  <Input label="Email" value={user?.email ?? ''} disabled />
                  {profileMsg && <p className="text-sm text-gray-600">{profileMsg}</p>}
                  <Button type="submit">Save Changes</Button>
                </form>
              </motion.div>
            )}

            {activeTab === 'password' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-serif font-bold mb-6">Change Password</h2>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                  <Input
                    label="Current Password"
                    type="password"
                    {...passwordForm.register('currentPassword', { required: true })}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    {...passwordForm.register('newPassword', { required: true, minLength: 8 })}
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    {...passwordForm.register('confirmPassword', {
                      required: true,
                      validate: (v) =>
                        v === passwordForm.watch('newPassword') || 'Passwords do not match',
                    })}
                  />
                  {passwordMsg && <p className="text-sm text-gray-600">{passwordMsg}</p>}
                  <Button type="submit">Update Password</Button>
                </form>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

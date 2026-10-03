'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { m as motion } from 'framer-motion';
import {
  LayoutDashboard, Package, Users, ShoppingCart,
  Settings, TrendingUp, DollarSign, ArrowUpRight,
  Menu, X, LogOut, Bell, Search, Star, Tag, MessageSquare, Layers, Truck
} from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { analyticsApi } from '@/lib/api/analyticsApi';
import { orderApi } from '@/lib/api/orderApi';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Catalog', href: '/admin/catalog', icon: Layers },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Payments', href: '/admin/payments', icon: DollarSign },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Reviews', href: '/admin/reviews', icon: MessageSquare },
  { name: 'Coupons', href: '/admin/coupons', icon: Tag },
  { name: 'Shipping', href: '/admin/shipping', icon: Truck },
  { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
};

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const router = useRouter();

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: analyticsApi.getSummary,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => orderApi.getAllAdmin({ limit: 5 }),
    refetchInterval: 10000,
  });

  const stats = [
    {
      name: 'Total Revenue',
      value: analytics ? formatPrice(analytics.revenue) : '—',
      change: 'Paid orders',
      trend: 'up',
      icon: DollarSign,
      href: '/admin/orders',
    },
    {
      name: 'Total Orders',
      value: analytics ? String(analytics.paidOrders) : '—',
      change: 'Completed payments',
      trend: 'up',
      icon: ShoppingCart,
      href: '/admin/orders',
    },
    {
      name: 'Low Stock',
      value: analytics ? String(analytics.lowStockCount) : '—',
      change: 'Needs attention',
      trend: 'up',
      icon: Package,
      href: '/admin/products',
    },
    {
      name: 'Top Sellers',
      value: analytics ? String(analytics.topProducts.length) : '—',
      change: 'Active products',
      trend: 'up',
      icon: Users,
      href: '/admin/catalog',
    },
  ];

  const recentOrders = ordersData?.orders ?? [];
  const topProducts = analytics?.topProducts ?? [];

  const handleLogout = async () => {
    await dispatch(logout() as any);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-serif font-bold text-black">AZEEORA Admin</h1>
        <button className="text-gray-600">
          <Bell className="w-6 h-6" />
        </button>
      </div>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-xl font-serif font-bold text-black">
                AZEEORA <span className="text-rose-gold">Admin</span>
              </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {sidebarItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-rose-gold/10 hover:text-rose-gold transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-gold/10 rounded-full flex items-center justify-center">
                  <span className="text-rose-gold font-medium">
                    {user?.firstName?.[0] ?? 'A'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-black">{user?.firstName ?? 'Admin'}</p>
                  <p className="text-sm text-gray-500">{user?.email ?? 'azeeoracosmetics@gmail.com'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 lg:ml-0">
          <div className="bg-white border-b border-gray-200 px-6 py-4 hidden lg:flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20 w-64"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-gold/10 rounded-full flex items-center justify-center">
                <span className="text-rose-gold font-medium text-sm">{user?.firstName?.[0] ?? 'A'}</span>
              </div>
              <span className="font-medium text-black">{user?.firstName ?? 'Admin'}</span>
            </div>
          </div>

          <div className="p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-serif font-bold text-black mb-6">Dashboard Overview</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => router.push(stat.href)}
                    className="bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-rose-gold/10 rounded-lg flex items-center justify-center">
                        <stat.icon className="w-6 h-6 text-rose-gold" />
                      </div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <ArrowUpRight className="w-4 h-4" />
                        {stat.change}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-1">
                      {analyticsLoading ? '...' : stat.value}
                    </h3>
                    <p className="text-gray-600">{stat.name}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">Recent Orders</h3>
                  {ordersLoading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                  ) : recentOrders.length === 0 ? (
                    <p className="text-gray-500 text-sm">No orders yet</p>
                  ) : (
                    <div className="space-y-4">
                      {recentOrders.map((order) => {
                        const customer = typeof order.user === 'object' ? order.user : null;
                        return (
                          <div key={order._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                            <div>
                              <p className="font-medium text-black">{order.orderNumber}</p>
                              <p className="text-sm text-gray-500">
                                {customer ? `${customer.firstName} ${customer.lastName}` : 'Customer'}
                              </p>
                            </div>
                            <div className="text-right">
                              {((order.discount || 0) + (order.productDiscount || 0) + (order.manualDiscount || 0)) > 0 ? (
                                <div className="flex flex-col items-end mb-1">
                                  <span className="text-xs text-gray-400 line-through">{formatPrice(order.subtotal + (order.shippingCost || 0) + (order.tax || 0))}</span>
                                  <span className="text-xs text-green-600">- {formatPrice((order.discount || 0) + (order.productDiscount || 0) + (order.manualDiscount || 0))}</span>
                                  <p className="font-bold text-black border-t border-gray-100 mt-0.5 pt-0.5">{formatPrice(order.total)}</p>
                                </div>
                              ) : (
                                <p className="font-medium text-black mb-1">{formatPrice(order.total)}</p>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                {order.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Link href="/admin/orders" className="block mt-4 text-center text-rose-gold hover:text-rose-gold-dark font-medium">
                    View All Orders
                  </Link>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-black mb-4">Top Products</h3>
                  {analyticsLoading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                  ) : topProducts.length === 0 ? (
                    <p className="text-gray-500 text-sm">No sales data yet</p>
                  ) : (
                    <div className="space-y-4">
                      {topProducts.slice(0, 5).map((product) => (
                        <div key={product._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="font-medium text-black">{product.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              {product.soldCount} sold
                              <Star className="w-3 h-3 fill-rose-gold text-rose-gold" />
                              {product.rating}
                            </p>
                          </div>
                          <p className="font-medium text-rose-gold">{formatPrice(product.basePrice)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/admin/products" className="block mt-4 text-center text-rose-gold hover:text-rose-gold-dark font-medium">
                    View All Products
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

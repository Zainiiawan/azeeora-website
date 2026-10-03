'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { orderApi, Order } from '@/lib/api/orderApi';
import { RootState } from '@/store';
import { ORDER_STATUS_LABELS } from '../../shared';
import OrderTrackingView from '@/components/orders/OrderTrackingView';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isHydrated } = useSelector((state: RootState) => state.auth);

  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') ?? '');
  const [email, setEmail] = useState(searchParams.get('email') ?? user?.email ?? '');
  const [guestOrder, setGuestOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: myOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders-track'],
    queryFn: () => orderApi.getAll({ limit: 50 }),
    enabled: isHydrated && isAuthenticated,
  });

  const myOrders = myOrdersData?.orders ?? [];
  const selectedOrder =
    selectedOrderId
      ? myOrders.find((o) => o._id === selectedOrderId) ?? null
      : null;

  const handleGuestTrack = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError('Please enter order number and email.');
      return;
    }
    setLoading(true);
    setError('');
    setGuestOrder(null);
    setSelectedOrderId(null);
    try {
      const data = await orderApi.trackLookup(orderNumber.trim(), email.trim());
      setGuestOrder(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Order not found. Check your order number and email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    const qOrder = searchParams.get('orderNumber');
    const qEmail = searchParams.get('email');
    if (qOrder && qEmail) {
      setOrderNumber(qOrder);
      setEmail(qEmail);
      void handleGuestTrack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayOrder = selectedOrder || guestOrder;

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-black text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <Package className="w-12 h-12 text-rose-gold mx-auto mb-4" />
          <h1 className="text-4xl font-serif font-bold mb-4">Track Your Order</h1>
          <p className="text-gray-300">
            {isAuthenticated
              ? 'View your orders and shipping status below'
              : 'Enter your order number and email to track your shipment'}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {isHydrated && isAuthenticated && (
          <div className="mb-10">
            <h2 className="text-xl font-serif font-bold mb-4">Your Orders</h2>
            {ordersLoading ? (
              <p className="text-gray-500 py-8 text-center">Loading your orders…</p>
            ) : myOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-600 mb-4">You haven&apos;t placed any orders yet.</p>
                <Link href="/shop"><Button>Start Shopping</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <button
                    key={order._id}
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(order._id);
                      setGuestOrder(null);
                      setError('');
                    }}
                    className={`w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between text-left transition-colors hover:border-rose-gold border ${
                      selectedOrderId === order._id ? 'border-rose-gold ring-2 ring-rose-gold/20' : 'border-transparent'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-black">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {ORDER_STATUS_LABELS[order.status] || order.status.replace(/_/g, ' ')}
                        {order.trackingNumber && ` · Tracking: ${order.trackingNumber}`}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {displayOrder && <OrderTrackingView order={displayOrder} />}

        {(!isAuthenticated || !displayOrder) && (
          <div className={isAuthenticated && myOrders.length > 0 ? 'mt-10 pt-10 border-t border-gray-200' : ''}>
            {!isAuthenticated && (
              <p className="text-sm text-gray-600 mb-4 text-center">
                Have an account?{' '}
                <Link href="/login?redirect=/track-order" className="text-rose-gold font-medium hover:underline">
                  Sign in
                </Link>{' '}
                to see all your orders.
              </p>
            )}
            {isAuthenticated && myOrders.length > 0 && (
              <h2 className="text-lg font-serif font-bold mb-4">Track by Order Number</h2>
            )}
            <form onSubmit={handleGuestTrack} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
              <Input
                label="Order Number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. AZR-1785327733518-0001"
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email used during checkout"
                required
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Track Order
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}

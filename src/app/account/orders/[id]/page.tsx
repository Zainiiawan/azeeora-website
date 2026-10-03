'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { orderApi } from '@/lib/api/orderApi';
import { formatPrice, formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import OrderTimeline, { buildOrderTimeline } from '@/components/orders/OrderTimeline';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  pending_confirmation: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  waiting_verification: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function OrderTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.id as string;
  const justPlaced = searchParams.get('placed') === '1';
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getById(orderId),
    enabled: !!orderId && isAuthenticated,
    refetchInterval: 8000,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Link href={`/login?redirect=/account/orders/${orderId}`}>
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading order...</div>;
  }

  if (isError || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Order not found</p>
        <Link href="/account"><Button>Back to Account</Button></Link>
      </div>
    );
  }

  const timeline = buildOrderTimeline(order);
  const needsProof =
    (order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa') &&
    order.paymentStatus !== 'paid';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/account" className="inline-flex items-center text-rose-gold hover:text-rose-gold-dark mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
          {justPlaced && (
            <div className="mb-4 rounded-lg bg-green-50 text-green-800 px-4 py-3 text-sm">
              Order placed successfully. Track progress below.
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-serif font-bold text-black">Order {order.orderNumber}</h1>
              <a href={`/invoice/${order._id}`} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">View invoice</a>
              <p className="text-gray-500 text-sm mt-1">
                Placed {order.createdAt ? formatDate(order.createdAt) : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${PAYMENT_COLORS[order.paymentStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                Payment: {order.paymentStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border p-6">
              <h2 className="font-serif text-xl font-semibold mb-6">Order Timeline</h2>
              <OrderTimeline steps={timeline} />
            </div>

            <div className="bg-white rounded-2xl border p-6">
              <h2 className="font-serif text-xl font-semibold mb-4">Items</h2>
              <div className="space-y-4">
                {order.items.map((item, idx) => (
                  <div key={`${item.product}-${idx}`} className="flex justify-between gap-4 text-sm border-b border-gray-100 pb-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-gray-500">Qty {item.quantity}{item.variant ? ` · ${item.variant}` : ''}</p>
                    </div>
                    <p className="font-medium">{formatPrice(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            {order.trackingHistory && order.trackingHistory.length > 0 && (
              <div className="bg-white rounded-2xl border p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">Updates</h2>
                <ul className="space-y-3">
                  {[...order.trackingHistory].reverse().map((entry, i) => (
                    <li key={i} className="text-sm border-l-2 border-rose-gold/40 pl-3">
                      <p className="font-medium text-gray-900">{entry.message}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {entry.timestamp ? formatDate(entry.timestamp) : ''} · {entry.status}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl border p-6">
              <h2 className="font-serif text-lg font-semibold mb-3">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(order.shippingCost)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{formatPrice(order.discount || 0)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span><span>{formatPrice(order.total)}</span>
                </div>
                <p className="text-gray-500 pt-2 capitalize">Method: {order.paymentMethod}</p>
                {order.trackingNumber && (
                  <p className="text-gray-500">Tracking: {order.trackingNumber}</p>
                )}
              </div>
            </div>

            {needsProof && (
              <div className="bg-[#fdf8f6] border border-rose-gold/30 rounded-2xl p-6 space-y-3">
                <h3 className="font-serif font-semibold">
                  {order.paymentStatus === 'rejected' ? 'Resubmit Payment Proof' : 'Complete Payment'}
                </h3>
                <p className="text-sm text-gray-600">
                  {order.paymentStatus === 'waiting_verification'
                    ? 'Your proof is awaiting admin verification.'
                    : 'Upload your JazzCash / Easypaisa transaction ID and screenshot.'}
                </p>
                {order.paymentProof?.rejectionReason && (
                  <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                    {order.paymentProof.rejectionReason}
                  </p>
                )}
                <Link href={`/account/orders/${order._id}/pay`}>
                  <Button className="w-full">
                    {order.paymentStatus === 'waiting_verification' ? 'Update Proof' : 'Submit Payment Proof'}
                  </Button>
                </Link>
              </div>
            )}

            {order.paymentStatus === 'paid' && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-sm text-green-800">
                Payment approved. Your order is confirmed.
              </div>
            )}

            <div className="bg-white rounded-2xl border p-6 text-sm">
              <h2 className="font-serif text-lg font-semibold mb-3">Shipping</h2>
              <p className="text-gray-800">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p className="text-gray-600 mt-1">
                {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-gray-600">{order.shippingAddress.phone}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

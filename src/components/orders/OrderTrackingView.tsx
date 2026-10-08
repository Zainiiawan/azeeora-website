'use client';

import Link from 'next/link';
import { Truck, CheckCircle, Clock, MapPin, ExternalLink } from 'lucide-react';
import { Order } from '@/lib/api/orderApi';
import { formatPrice, formatDate, getCourierTrackingUrl } from '@/lib/utils';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../shared';
import Button from '@/components/ui/Button';

export default function OrderTrackingView({ order }: { order: Order }) {
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-xl font-bold">{order.orderNumber}</p>
            <p className="text-sm text-gray-500 mt-1">
              Placed {order.createdAt ? formatDate(order.createdAt) : '—'}
            </p>
          </div>
          <span className="px-4 py-2 bg-rose-gold/10 text-rose-gold rounded-full font-medium text-sm">
            {statusLabel}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-500">Payment</p>
            <p className="font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</p>
          </div>
          <div>
            <p className="text-gray-500">Total</p>
            <p className="font-medium text-rose-gold">{formatPrice(order.total)}</p>
          </div>
          {order.estimatedDelivery && (
            <div>
              <p className="text-gray-500">Estimated Delivery</p>
              <p className="font-medium">{formatDate(order.estimatedDelivery)}</p>
            </div>
          )}
          {order.dispatchedAt && (
            <div>
              <p className="text-gray-500">Dispatched</p>
              <p className="font-medium">{formatDate(order.dispatchedAt)}</p>
            </div>
          )}
        </div>

        {(order.trackingNumber || order.courierName) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-rose-gold" />
              <h3 className="font-semibold">Shipping Details</h3>
            </div>
            {order.trackingNumber && (
              <p className="text-sm"><strong>Tracking ID:</strong> {order.trackingNumber}</p>
            )}
            {order.courierName && (
              <p className="text-sm"><strong>Courier:</strong> {order.courierName}</p>
            )}
            {(order.trackingUrl || getCourierTrackingUrl(order.courierName || '', order.trackingNumber || '')) && (
              <a
                href={order.trackingUrl || getCourierTrackingUrl(order.courierName || '', order.trackingNumber || '')!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-rose-gold hover:underline mt-2"
              >
                Track with courier <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <h3 className="font-semibold mb-3">Items</h3>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
              <span>{item.name} × {item.quantity}</span>
              <span className="font-medium">{formatPrice(item.total)}</span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Link href={`/account/orders/${order._id}`}>
            <Button variant="outline" className="w-full sm:w-auto">View Full Order Details</Button>
          </Link>
        </div>
      </div>

      {order.trackingHistory && order.trackingHistory.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-gold" />
            Shipping Timeline
          </h3>
          <div className="space-y-4">
            {[...order.trackingHistory].reverse().map((entry, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-rose-gold/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-rose-gold" />
                </div>
                <div>
                  <p className="font-medium capitalize">{entry.status.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-600">{entry.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(entry.timestamp)}
                    {entry.location && ` · ${entry.location}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.shippingAddress && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-gold" />
            Delivery Address
          </h3>
          <p className="text-sm text-gray-600">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
            {order.shippingAddress.street}<br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
            {order.shippingAddress.country}
          </p>
        </div>
      )}
    </div>
  );
}

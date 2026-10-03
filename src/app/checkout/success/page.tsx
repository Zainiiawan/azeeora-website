'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId') || '';
  const orderNumber = searchParams?.get('orderNumber') || '';
  const email = searchParams?.get('email') || '';
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const trackHref = isAuthenticated && orderId
    ? `/account/orders/${orderId}`
    : `/track-order?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500">Thank you for your purchase. Your order has been received and is being processed.</p>
        </div>

        {(orderNumber || orderId) && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Order Number</p>
            <p className="font-mono font-medium text-lg text-gray-900 break-all">{orderNumber || `#${orderId.slice(-6).toUpperCase()}`}</p>
          </div>
        )}

        <p className="text-sm text-gray-500">
          Please keep your order number. You can track your order any time with it and your email address.
        </p>

        <div className="pt-6 space-y-3">
          {(orderId || orderNumber) && (
            <Link href={trackHref} className="block w-full">
              <Button className="w-full" size="lg">
                <Package className="w-4 h-4 mr-2" /> Track Order
              </Button>
            </Link>
          )}
          <Link href="/shop" className="block w-full">
            <Button variant="outline" className="w-full" size="lg">
              <ArrowRight className="w-4 h-4 mr-2" /> Continue Shopping
            </Button>
          </Link>
          <Link href="/" className="block w-full text-center text-sm font-medium text-gray-500 hover:text-rose-gold transition-colors pt-2">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { RootState } from '@/store';
import { orderApi } from '@/lib/api/orderApi';
import { STORE_CONTACT } from '@/shared/constants';
import { formatDate, formatPrice } from '@/lib/utils';

const METHOD: Record<string, string> = { cod: 'Cash on delivery', jazzcash: 'JazzCash', easypaisa: 'Easypaisa', wallet: 'Azeeora wallet' };

/** Printable invoice / packing slip for an order (owner, admin or warehouse). */
export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { isAuthenticated, isHydrated } = useSelector((s: RootState) => s.auth);
  const { data: o, isLoading, isError } = useQuery({ queryKey: ['invoice', orderId], queryFn: () => orderApi.getById(orderId), enabled: isAuthenticated && !!orderId });

  if (isHydrated && !isAuthenticated)
    return (
      <div className="p-10 text-center">
        <Link href={`/login?redirect=/invoice/${orderId}`} className="underline">Sign in to see this invoice</Link>
      </div>
    );
  if (isLoading || !isHydrated) return <p className="p-10 text-center text-gray-500">Loading…</p>;
  if (isError || !o) return <p className="p-10 text-center text-gray-500">Invoice not found.</p>;

  const a = o.shippingAddress;
  const listSubtotal = o.items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  const discounts = listSubtotal - o.subtotal + (o.discount ?? 0) + (o.manualDiscount ?? 0) + (o.pointsDiscount ?? 0);

  return (
    <div className="bg-white min-h-screen text-[#1a1a1a]">
      <style>{`@media print { .no-print { display: none !important } @page { margin: 14mm } }`}</style>
      <div className="max-w-3xl mx-auto p-6 sm:p-10">
        <div className="no-print flex justify-end gap-3 mb-6">
          <button onClick={() => window.print()} className="px-5 py-2 rounded-full bg-black text-white text-sm">Print</button>
        </div>
        <div className="flex flex-wrap justify-between gap-6 border-b pb-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/azeeora-logo.svg" alt="Azeeora" className="h-9 w-auto" />
            <p className="mt-3 text-sm text-gray-600">{STORE_CONTACT.address}<br />{STORE_CONTACT.phone} · {STORE_CONTACT.email}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-light">Invoice</p>
            <p className="font-mono text-sm mt-1">{o.orderNumber}</p>
            <p className="text-sm text-gray-600">{o.createdAt ? formatDate(o.createdAt) : ''}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 py-6 border-b text-sm">
          <div>
            <p className="uppercase tracking-wide text-xs text-gray-500 mb-1">Bill to</p>
            <p className="font-medium">{o.customerName}</p>
            <p className="text-gray-600">{o.customerPhone}<br />{o.customerEmail}</p>
          </div>
          <div>
            <p className="uppercase tracking-wide text-xs text-gray-500 mb-1">{o.pickupPoint ? 'Pickup' : 'Deliver to'}</p>
            {o.pickupPoint ? (
              <p className="text-gray-600">{o.pickupPoint.name}<br />{o.pickupPoint.address}, {o.pickupPoint.city}</p>
            ) : (
              <p className="text-gray-600">{a.firstName} {a.lastName}<br />{a.street}<br />{a.city}, {a.state} {a.postalCode}<br />{a.phone}</p>
            )}
          </div>
        </div>

        <table className="w-full text-sm my-6">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 font-normal">Item</th>
              <th className="py-2 font-normal text-right">Qty</th>
              <th className="py-2 font-normal text-right">Price</th>
              <th className="py-2 font-normal text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i, n) => (
              <tr key={n} className="border-b">
                <td className="py-3">{i.name}{i.sku && <span className="block text-xs text-gray-400 font-mono">{i.sku}</span>}</td>
                <td className="py-3 text-right">{i.quantity}</td>
                <td className="py-3 text-right">{formatPrice(i.price)}</td>
                <td className="py-3 text-right">{formatPrice(i.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs text-sm space-y-1.5">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatPrice(listSubtotal)}</span></div>
          {discounts > 0 && <div className="flex justify-between"><span className="text-gray-600">Discounts</span><span>-{formatPrice(discounts)}</span></div>}
          <div className="flex justify-between"><span className="text-gray-600">Delivery</span><span>{o.shippingCost ? formatPrice(o.shippingCost) : 'Free'}</span></div>
          <div className="flex justify-between text-base font-semibold border-t pt-2"><span>Total</span><span>{formatPrice(o.total)}</span></div>
          {(o.walletUsed ?? 0) > 0 && <div className="flex justify-between"><span className="text-gray-600">Paid from wallet</span><span>-{formatPrice(o.walletUsed ?? 0)}</span></div>}
          <div className="flex justify-between"><span className="text-gray-600">Payment</span><span>{METHOD[o.paymentMethod] ?? o.paymentMethod} · {o.paymentStatus === 'paid' ? 'Paid' : `Due ${formatPrice(o.amountDue ?? o.total)}`}</span></div>
        </div>

        <p className="mt-12 text-xs text-gray-500 text-center">Thank you for shopping with Azeeora. Questions about this order? WhatsApp {STORE_CONTACT.phone}.</p>
      </div>
    </div>
  );
}

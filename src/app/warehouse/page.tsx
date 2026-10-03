'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RootState } from '@/store';
import { extrasApi, QueueOrder, StockRow } from '@/lib/api/extrasApi';
import { apiError } from '@/lib/api/memberApi';
import { formatDate, formatPrice } from '@/lib/utils';

const TABS = [
  ['to_pack', 'To pack'],
  ['packed', 'Packed, to dispatch'],
  ['shipped', 'Recently dispatched'],
  ['stock', 'Stock'],
] as const;
type Tab = (typeof TABS)[number][0];

export default function WarehousePage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useSelector((s: RootState) => s.auth);
  const allowed = !!user && (user.role === 'admin' || user.role === 'warehouse');
  const [tab, setTab] = useState<Tab>('to_pack');

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || !allowed)) router.replace(isAuthenticated ? '/' : '/login?redirect=/warehouse');
  }, [isHydrated, isAuthenticated, allowed, router]);

  if (!isHydrated || !allowed) return <div className="min-h-screen flex items-center justify-center text-gray-500">Checking access…</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Warehouse</h1>
          <p className="text-sm text-gray-500">Pack and dispatch orders, keep stock right</p>
        </div>
        <div className="flex gap-3 text-sm">
          {user?.role === 'admin' && <Link href="/admin" className="underline">Admin</Link>}
          <Link href="/" className="underline">Store</Link>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-sm border ${tab === k ? 'bg-black text-white border-black' : 'bg-white border-gray-200'}`}>
              {l}
            </button>
          ))}
        </div>
        {tab === 'stock' ? <Stock /> : <Queue stage={tab} />}
      </div>
    </div>
  );
}

function Queue({ stage }: { stage: Exclude<Tab, 'stock'> }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['wh-queue', stage], queryFn: () => extrasApi.warehouse.queue(stage), refetchInterval: 30000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['wh-queue'] });
  const pack = useMutation({ mutationFn: extrasApi.warehouse.pack, onSuccess: refresh });
  const dispatch = useMutation({
    mutationFn: (v: { id: string; courierName: string; trackingNumber: string }) => extrasApi.warehouse.dispatch(v.id, v),
    onSuccess: refresh,
  });
  const err = pack.error || dispatch.error;
  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  const orders = data?.orders ?? [];
  return (
    <div className="space-y-3">
      {err && <p className="text-sm text-red-600">{apiError(err)}</p>}
      {orders.length === 0 && <p className="bg-white rounded-xl p-8 text-center text-gray-500">Nothing here right now.</p>}
      {orders.map((o) => (
        <OrderCard key={o._id} o={o} stage={stage} onPack={() => pack.mutate(o._id)} onDispatch={(courierName, trackingNumber) => dispatch.mutate({ id: o._id, courierName, trackingNumber })} busy={pack.isPending || dispatch.isPending} />
      ))}
    </div>
  );
}

function OrderCard({ o, stage, onPack, onDispatch, busy }: { o: QueueOrder; stage: string; onPack: () => void; onDispatch: (c: string, t: string) => void; busy: boolean }) {
  const [courier, setCourier] = useState('TCS');
  const [tracking, setTracking] = useState('');
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 grid lg:grid-cols-[1.2fr_1fr_auto] gap-4">
      <div>
        <p className="font-semibold font-mono">{o.orderNumber}</p>
        <p className="text-sm text-gray-500">{formatDate(o.createdAt)} · {o.paymentMethod.toUpperCase()} {o.paymentStatus === 'paid' ? '(paid)' : `· collect ${formatPrice(o.amountDue)}`}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {o.items.map((i, n) => (
            <li key={n} className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 items-center justify-center rounded bg-gray-100 font-semibold">{i.quantity}</span>
              {i.name} {i.sku && <span className="text-gray-400 font-mono text-xs">{i.sku}</span>}
            </li>
          ))}
        </ul>
        {o.notes && <p className="mt-2 text-sm italic text-gray-600">Note: {o.notes}</p>}
      </div>
      <div className="text-sm">
        <p className="font-medium">{o.customerName} · {o.customerPhone}</p>
        {o.pickupPoint ? (
          <p className="text-gray-600">Pickup at {o.pickupPoint.name}, {o.pickupPoint.city}</p>
        ) : (
          <p className="text-gray-600">{o.shippingAddress?.street}, {o.shippingAddress?.city}, {o.shippingAddress?.state} {o.shippingAddress?.postalCode}</p>
        )}
        {o.fulfilment?.packedAt && <p className="mt-2 text-gray-500">Packed {formatDate(o.fulfilment.packedAt)} by {o.fulfilment.packedBy}</p>}
        {o.trackingNumber && <p className="mt-2 text-gray-500">{o.courierName} · {o.trackingNumber}</p>}
        <a href={`/invoice/${o._id}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 underline">Packing slip / invoice</a>
      </div>
      <div className="flex lg:flex-col gap-2 items-start lg:items-stretch lg:w-56">
        {stage === 'to_pack' && <button disabled={busy} onClick={onPack} className="px-4 py-2 rounded-lg bg-black text-white text-sm">Mark packed</button>}
        {stage === 'packed' && (
          <form
            className="flex flex-col gap-2 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              if (tracking.trim()) onDispatch(courier, tracking.trim());
            }}
          >
            <select value={courier} onChange={(e) => setCourier(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {['TCS', 'Leopards', 'M&P', 'Trax', 'PostEx', 'Pakistan Post', 'Own rider', 'Pickup'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="border rounded-lg px-3 py-2 text-sm" required />
            <button disabled={busy} className="px-4 py-2 rounded-lg bg-black text-white text-sm">Dispatch</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Stock() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['wh-stock'], queryFn: extrasApi.warehouse.stock });
  const [sel, setSel] = useState<StockRow | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('received');
  const [note, setNote] = useState('');
  const { data: moves = [] } = useQuery({ queryKey: ['wh-moves', sel?._id], queryFn: () => extrasApi.warehouse.movements(sel?._id) });
  const adjust = useMutation({
    mutationFn: () => extrasApi.warehouse.adjust(sel!._id, { delta: Number(delta), reason, note: note || undefined }),
    onSuccess: () => {
      setDelta('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['wh-stock'] });
      qc.invalidateQueries({ queryKey: ['wh-moves'] });
    },
  });
  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">In stock</th>
              <th className="px-4 py-3 font-medium text-right">Sold</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p._id} className={`border-t ${sel?._id === p._id ? 'bg-gray-50' : ''}`}>
                <td className="px-4 py-3">{p.name} {p.sku && <span className="text-gray-400 font-mono text-xs">{p.sku}</span>}{!p.isActive && <span className="text-gray-400"> · inactive</span>}</td>
                <td className={`px-4 py-3 text-right font-semibold ${p.stock <= p.lowStockThreshold ? 'text-red-600' : ''}`}>{p.stock}</td>
                <td className="px-4 py-3 text-right text-gray-500">{p.soldCount}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => setSel(p)} className="underline">Adjust</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-4">
        {sel ? (
          <form
            className="bg-white rounded-xl shadow-sm p-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              adjust.mutate();
            }}
          >
            <p className="font-semibold">{sel.name}</p>
            <p className="text-sm text-gray-500">Now {data.find((x) => x._id === sel._id)?.stock ?? sel.stock} in stock. Use a minus number to remove.</p>
            <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 24 or -2" className="w-full border rounded-lg px-3 py-2 text-sm" required />
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="received">Stock received</option>
              <option value="returned">Customer return</option>
              <option value="damaged">Damaged / expired</option>
              <option value="count_correction">Stock count correction</option>
              <option value="other">Other</option>
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            {adjust.isError && <p className="text-sm text-red-600">{apiError(adjust.error)}</p>}
            <button disabled={adjust.isPending} className="px-4 py-2 rounded-lg bg-black text-white text-sm">Save</button>
          </form>
        ) : (
          <p className="bg-white rounded-xl p-5 text-sm text-gray-500">Pick a product to adjust its stock.</p>
        )}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="font-semibold mb-2">{sel ? 'Movements' : 'Latest movements'}</p>
          <ul className="text-sm divide-y">
            {moves.length === 0 && <li className="py-2 text-gray-500">None yet.</li>}
            {moves.slice(0, 30).map((m) => (
              <li key={m._id} className="py-2 flex justify-between gap-3">
                <span>
                  {!sel && <span className="block">{m.productName}</span>}
                  <span className="text-gray-500">{formatDate(m.createdAt)} · {m.reason.replace('_', ' ')} · {m.by}</span>
                </span>
                <span className={m.delta < 0 ? 'text-red-600' : 'text-green-700'}>{m.delta > 0 ? '+' : ''}{m.delta} → {m.stockAfter}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

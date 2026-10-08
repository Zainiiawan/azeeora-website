'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { extrasApi, Campaign, Incentive, Training, PickupPoint, METRIC_LABEL, IncentiveMetric } from '@/lib/api/extrasApi';
import { productApi } from '@/lib/api/productApi';
import { apiError } from '@/lib/api/memberApi';
import { formatDate } from '@/lib/utils';

const TABS = [
  ['campaigns', 'Catalogue campaigns'],
  ['incentives', 'Incentives'],
  ['training', 'Training'],
  ['pickup', 'Pickup points'],
  ['reports', 'Reports'],
  ['blog', 'Blog posts'],
] as const;
type Tab = (typeof TABS)[number][0];

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';
const btn = 'px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50';
const btnLine = 'px-4 py-2 rounded-lg border border-gray-300 text-sm';
const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

function ContentAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.find(([k]) => k === params?.get('tab'))?.[0] ?? 'campaigns') as Tab;
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-black">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-black">Content & reports</h1>
          <p className="text-sm text-gray-500">Catalogue, partner incentives and training, pickup points, exports</p>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => router.replace(`/admin/content?tab=${k}`)} className={`px-4 py-2 rounded-full text-sm border ${tab === k ? 'bg-black text-white border-black' : 'bg-white border-gray-200'}`}>
              {l}
            </button>
          ))}
        </div>
        {tab === 'campaigns' && <Campaigns />}
        {tab === 'incentives' && <Incentives />}
        {tab === 'training' && <Trainings />}
        {tab === 'pickup' && <Pickup />}
        {tab === 'reports' && <Reports />}
        {tab === 'blog' && <BlogAdmin />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Campaigns() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['admin-campaigns'], queryFn: extrasApi.campaigns.list });
  const { data: products } = useQuery({ queryKey: ['admin-campaign-products'], queryFn: () => productApi.getAll({ limit: 100, sortBy: 'name_asc' }) });
  const blank = (): Partial<Campaign> => ({ name: '', description: '', image: '', discountPct: 10, productIds: [], startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), isActive: true });
  const [form, setForm] = useState<Partial<Campaign> | null>(null);
  const save = useMutation({
    mutationFn: (c: Partial<Campaign>) => {
      const body = { name: c.name, description: c.description || undefined, image: c.image || undefined, discountPct: Number(c.discountPct), productIds: c.productIds ?? [], startDate: c.startDate, endDate: c.endDate, isActive: c.isActive ?? true };
      return c._id ? extrasApi.campaigns.update(c._id, body) : extrasApi.campaigns.create(body);
    },
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
  });
  const remove = useMutation({ mutationFn: extrasApi.campaigns.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-campaigns'] }) });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 max-w-2xl">A campaign puts a % off on the products you pick for its dates, and shows them on the Catalogue page. It replaces any other offer those products have.</p>
        {!form && <button onClick={() => setForm(blank())} className={btn}>New campaign</button>}
      </div>
      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="bg-white rounded-xl p-6 shadow-sm grid md:grid-cols-2 gap-4"
        >
          <F label="Name"><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></F>
          <F label="Discount (%)"><input type="number" className={input} value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: Number(e.target.value) })} required /></F>
          <F label="Starts"><input type="date" className={input} value={day(form.startDate)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></F>
          <F label="Ends"><input type="date" className={input} value={day(form.endDate)} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></F>
          <F label="Description" className="md:col-span-2"><input className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></F>
          <F label="Banner image URL (optional)" className="md:col-span-2"><input className={input} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/blog/glow-serum.jpg or https://…" /></F>
          <div className="md:col-span-2">
            <span className="block text-sm font-medium mb-2">Products</span>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto border rounded-lg p-3">
              {(products?.products ?? []).map((p) => (
                <label key={p._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.productIds?.includes(p._id) ?? false}
                    onChange={(e) => setForm({ ...form, productIds: e.target.checked ? [...(form.productIds ?? []), p._id] : (form.productIds ?? []).filter((x) => x !== p._id) })}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          {save.isError && <p className="md:col-span-2 text-sm text-red-600">{apiError(save.error)}</p>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={save.isPending} className={btn}>{save.isPending ? 'Saving…' : 'Save campaign'}</button>
            <button type="button" onClick={() => setForm(null)} className={btnLine}>Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {data.length === 0 && <p className="p-6 text-gray-500 text-sm">No campaigns yet.</p>}
        {data.map((c) => (
          <div key={c._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{c.name} <span className="text-gray-500 font-normal">· {c.discountPct}% off · {c.productIds.length} products</span></p>
              <p className="text-sm text-gray-500">{formatDate(c.startDate)} to {formatDate(c.endDate)} {c.isActive ? '' : '· inactive'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setForm({ ...c, startDate: day(c.startDate), endDate: day(c.endDate) })} className={btnLine}>Edit</button>
              <button onClick={() => window.confirm(`Delete ${c.name}? Its offer is removed from the products.`) && remove.mutate(c._id)} className={`${btnLine} text-red-600`}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Incentives() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['admin-incentives'], queryFn: extrasApi.incentives.list });
  const [form, setForm] = useState<Partial<Incentive> | null>(null);
  const [leadersFor, setLeadersFor] = useState<string | null>(null);
  const { data: leaders } = useQuery({ queryKey: ['incentive-leaders', leadersFor], queryFn: () => extrasApi.incentives.leaders(leadersFor!), enabled: !!leadersFor });
  const save = useMutation({
    mutationFn: (i: Partial<Incentive>) => {
      const body = { title: i.title, description: i.description || undefined, image: i.image || undefined, metric: i.metric, target: Number(i.target), reward: i.reward, startDate: i.startDate, endDate: i.endDate, isActive: i.isActive ?? true };
      return i._id ? extrasApi.incentives.update(i._id, body) : extrasApi.incentives.create(body);
    },
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-incentives'] });
    },
  });
  const remove = useMutation({ mutationFn: extrasApi.incentives.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-incentives'] }) });
  const blank = (): Partial<Incentive> => ({ title: '', reward: '', metric: 'referral_sales', target: 50000, startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), isActive: true });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 max-w-2xl">Targets for Brand Partners, such as trips or bonuses. Partners see their progress on their dashboard; you see who qualifies.</p>
        {!form && <button onClick={() => setForm(blank())} className={btn}>New incentive</button>}
      </div>
      {form && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="bg-white rounded-xl p-6 shadow-sm grid md:grid-cols-2 gap-4">
          <F label="Title"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></F>
          <F label="Reward"><input className={input} value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder="e.g. Rs 10,000 bonus" required /></F>
          <F label="Measured by">
            <select className={input} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value as IncentiveMetric })}>
              {Object.entries(METRIC_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </F>
          <F label="Target"><input type="number" className={input} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} required /></F>
          <F label="Starts"><input type="date" className={input} value={day(form.startDate)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></F>
          <F label="Ends"><input type="date" className={input} value={day(form.endDate)} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></F>
          <F label="Description" className="md:col-span-2"><textarea className={input} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></F>
          <F label="Image URL (optional)" className="md:col-span-2"><input className={input} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></F>
          {save.isError && <p className="md:col-span-2 text-sm text-red-600">{apiError(save.error)}</p>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={save.isPending} className={btn}>Save</button>
            <button type="button" onClick={() => setForm(null)} className={btnLine}>Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {data.length === 0 && <p className="p-6 text-gray-500 text-sm">No incentives yet.</p>}
        {data.map((i) => (
          <div key={i._id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{i.title} <span className="text-gray-500 font-normal">· {i.reward}</span></p>
                <p className="text-sm text-gray-500">{METRIC_LABEL[i.metric]} ≥ {i.target.toLocaleString()} · {formatDate(i.startDate)} to {formatDate(i.endDate)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setLeadersFor(leadersFor === i._id ? null : i._id)} className={btnLine}>{leadersFor === i._id ? 'Hide' : 'Leaders'}</button>
                <button onClick={() => setForm({ ...i, startDate: day(i.startDate), endDate: day(i.endDate) })} className={btnLine}>Edit</button>
                <button onClick={() => window.confirm('Delete this incentive?') && remove.mutate(i._id)} className={`${btnLine} text-red-600`}>Delete</button>
              </div>
            </div>
            {leadersFor === i._id && (
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {(leaders ?? []).length === 0 && <tr><td className="py-2 text-gray-500">No progress yet.</td></tr>}
                  {(leaders ?? []).map((l, n) => (
                    <tr key={l._id} className="border-t">
                      <td className="py-2 w-8 text-gray-500">{n + 1}</td>
                      <td className="py-2">{l.name} <span className="text-gray-500 font-mono text-xs">{l.memberCode}</span></td>
                      <td className="py-2 text-right">{Math.round(l.progress).toLocaleString()}</td>
                      <td className="py-2 text-right">{l.qualified ? <span className="text-green-700">Qualified</span> : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Trainings() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['admin-trainings'], queryFn: extrasApi.trainings.list });
  const [form, setForm] = useState<Partial<Training> | null>(null);
  const save = useMutation({
    mutationFn: (t: Partial<Training>) => {
      const body = { title: t.title, category: t.category || undefined, summary: t.summary || undefined, body: t.body || undefined, videoUrl: t.videoUrl || undefined, order: t.order ? Number(t.order) : undefined, isActive: t.isActive ?? true };
      return t._id ? extrasApi.trainings.update(t._id, body) : extrasApi.trainings.create(body);
    },
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-trainings'] });
    },
  });
  const remove = useMutation({ mutationFn: extrasApi.trainings.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-trainings'] }) });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Guides and videos shown to Brand Partners on their dashboard.</p>
        {!form && <button onClick={() => setForm({ title: '', isActive: true })} className={btn}>New guide</button>}
      </div>
      {form && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="bg-white rounded-xl p-6 shadow-sm grid md:grid-cols-2 gap-4">
          <F label="Title"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></F>
          <F label="Category"><input className={input} value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Getting started" /></F>
          <F label="Summary" className="md:col-span-2"><input className={input} value={form.summary ?? ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></F>
          <F label="Video link (YouTube or other, optional)" className="md:col-span-2"><input className={input} value={form.videoUrl ?? ''} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} /></F>
          <F label="Text" className="md:col-span-2"><textarea className={input} rows={8} value={form.body ?? ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></F>
          <F label="Sort order"><input type="number" className={input} value={form.order ?? ''} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></F>
          <label className="flex items-center gap-2 text-sm self-end"><input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Visible to partners</label>
          {save.isError && <p className="md:col-span-2 text-sm text-red-600">{apiError(save.error)}</p>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={save.isPending} className={btn}>Save</button>
            <button type="button" onClick={() => setForm(null)} className={btnLine}>Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {data.length === 0 && <p className="p-6 text-gray-500 text-sm">No guides yet.</p>}
        {data.map((t) => (
          <div key={t._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{t.title}{!t.isActive && <span className="text-gray-500 font-normal"> · hidden</span>}</p>
              <p className="text-sm text-gray-500">{t.category}{t.videoUrl ? ' · video' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setForm(t)} className={btnLine}>Edit</button>
              <button onClick={() => window.confirm('Delete this guide?') && remove.mutate(t._id)} className={`${btnLine} text-red-600`}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Pickup() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['admin-pickup'], queryFn: extrasApi.pickupPoints.all });
  const [form, setForm] = useState<Partial<PickupPoint> | null>(null);
  const save = useMutation({
    mutationFn: (p: Partial<PickupPoint>) => {
      const body = { name: p.name, city: p.city, address: p.address, phone: p.phone || undefined, hours: p.hours || undefined, isActive: p.isActive ?? true };
      return p._id ? extrasApi.pickupPoints.update(p._id, body) : extrasApi.pickupPoints.create(body);
    },
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-pickup'] });
      qc.invalidateQueries({ queryKey: ['pickup-points'] });
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Places customers can collect orders from, free of delivery charge. They appear at checkout.</p>
        {!form && <button onClick={() => setForm({ name: '', city: '', address: '', isActive: true })} className={btn}>New pickup point</button>}
      </div>
      {form && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="bg-white rounded-xl p-6 shadow-sm grid md:grid-cols-2 gap-4">
          <F label="Name"><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></F>
          <F label="City"><input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></F>
          <F label="Address" className="md:col-span-2"><input className={input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></F>
          <F label="Phone"><input className={input} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
          <F label="Opening hours"><input className={input} value={form.hours ?? ''} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="Mon to Sat, 10am to 8pm" /></F>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          {save.isError && <p className="md:col-span-2 text-sm text-red-600">{apiError(save.error)}</p>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={save.isPending} className={btn}>Save</button>
            <button type="button" onClick={() => setForm(null)} className={btnLine}>Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {data.length === 0 && <p className="p-6 text-gray-500 text-sm">No pickup points yet. Checkout offers home delivery only until you add one.</p>}
        {data.map((p) => (
          <div key={p._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{p.name}, {p.city}{!p.isActive && <span className="text-gray-500 font-normal"> · disabled</span>}</p>
              <p className="text-sm text-gray-500">{p.address}{p.hours ? ` · ${p.hours}` : ''}</p>
            </div>
            <button onClick={() => setForm(p)} className={btnLine}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const get = async (kind: 'orders' | 'commissions' | 'members' | 'withdrawals') => {
    setError('');
    try {
      await extrasApi.downloadReport(kind, kind === 'orders' ? { ...(from ? { from } : {}), ...(to ? { to } : {}) } : undefined);
    } catch (e) {
      setError(apiError(e, 'Could not download the report'));
    }
  };
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold">Orders</h3>
        <div className="grid grid-cols-2 gap-3">
          <F label="From"><input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></F>
          <F label="To"><input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></F>
        </div>
        <button onClick={() => void get('orders')} className={`${btn} inline-flex items-center gap-2`}><Download className="w-4 h-4" /> Download orders CSV</button>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-3">
        <h3 className="font-semibold">Members and money</h3>
        {(
          [
            ['members', 'Partners and wholesale accounts'],
            ['commissions', 'Commissions'],
            ['withdrawals', 'Withdrawals'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => void get(k)} className={`${btnLine} w-full flex items-center justify-between`}>
            {l} <Download className="w-4 h-4" />
          </button>
        ))}
      </div>
      {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
import { blogApi, BlogPost } from '@/lib/api/analyticsApi';

function BlogAdmin() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['admin-blog'], queryFn: blogApi.adminAll });
  const [form, setForm] = useState<Partial<BlogPost> | null>(null);

  const save = useMutation({
    mutationFn: (p: Partial<BlogPost>) => p._id ? blogApi.update(p._id, p) : blogApi.create(p),
    onSuccess: () => { setForm(null); qc.invalidateQueries({ queryKey: ['admin-blog'] }); },
  });
  const remove = useMutation({
    mutationFn: blogApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-blog'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Write and manage beauty blog posts. Posts appear on the /blog page.</p>
        {!form && <button onClick={() => setForm({ title: '', isPublished: true, categories: ['Skincare'], publishDate: new Date().toISOString().slice(0, 10) })} className={btn}>New post</button>}
      </div>
      {form && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="bg-white rounded-xl p-6 shadow-sm grid md:grid-cols-2 gap-4">
          <F label="Title"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></F>
          <F label="URL Slug (optional)"><input className={input} value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Leave blank to auto-generate" /></F>
          <F label="Author"><input className={input} value={form.author ?? ''} onChange={(e) => setForm({ ...form, author: e.target.value })} /></F>
          <F label="Reading time"><input className={input} value={form.readingTime ?? ''} onChange={(e) => setForm({ ...form, readingTime: e.target.value })} placeholder="e.g. 5 min read" /></F>
          <F label="Excerpt" className="md:col-span-2"><input className={input} value={form.excerpt ?? ''} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} required /></F>
          <F label="Cover Image URL (optional)" className="md:col-span-2"><input className={input} value={form.featuredImage ?? ''} onChange={(e) => setForm({ ...form, featuredImage: e.target.value })} /></F>
          <F label="Content (HTML allowed)" className="md:col-span-2"><textarea className={input} rows={12} value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></F>
          <F label="Categories (comma separated)"><input className={input} value={(form.categories ?? []).join(', ')} onChange={(e) => setForm({ ...form, categories: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></F>
          <F label="Publish Date"><input type="date" className={input} value={form.publishDate ?? ''} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} /></F>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.isPublished ?? true} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published and visible on site</label>
          {save.isError && <p className="md:col-span-2 text-sm text-red-600">{apiError(save.error)}</p>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={save.isPending} className={btn}>Save post</button>
            <button type="button" onClick={() => setForm(null)} className={btnLine}>Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {data.length === 0 && <p className="p-6 text-gray-500 text-sm">No blog posts yet.</p>}
        {data.map((p) => (
          <div key={p._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{p.title}{!p.isPublished && <span className="text-amber-600 font-normal ml-2">· Draft</span>}</p>
              <p className="text-sm text-gray-500">{p.publishDate} · {p.author} · {(p.categories ?? []).join(', ')}</p>
            </div>
            <div className="flex gap-2">
              <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className={btnLine}>View</a>
              <button onClick={() => setForm(p)} className={btnLine}>Edit</button>
              <button onClick={() => window.confirm('Delete this post?') && remove.mutate(p._id)} className={`${btnLine} text-red-600`}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ContentAdmin />
    </Suspense>
  );
}

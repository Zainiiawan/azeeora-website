'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Users, Package, AlertTriangle, MapPin, BarChart2, Calendar } from 'lucide-react';
import { analyticsApi, AnalyticsSummary } from '@/lib/api/analyticsApi';
import { formatPrice } from '@/lib/utils';

// ─── SVG Bar Chart ───────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <p className="text-gray-400 text-sm py-8 text-center">No data</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600; const H = 160; const padL = 52; const padB = 28;
  const usableW = W - padL - 12;
  const barW = Math.max(4, usableW / data.length - 2);
  const scale = (v: number) => H - padB - ((v / max) * (H - padB - 10));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44 select-none">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 8} y1={scale(max * t)} y2={scale(max * t)} stroke="#f3f4f6" />
          <text x={padL - 4} y={scale(max * t) + 4} textAnchor="end" fontSize={9} fill="#9ca3af">
            {max * t >= 1000 ? `${Math.round((max * t) / 1000)}k` : Math.round(max * t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * (usableW / data.length) + 1;
        const y = scale(d.value); const bH = H - padB - y;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(0, bH)} rx={2} fill="#c9a96e" opacity={0.85} />
            {data.length <= 14 && (
              <text x={x + barW / 2} y={H - 2} textAnchor="middle" fontSize={7} fill="#9ca3af">{d.label.slice(-2)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ────────────────────────────────────────────────────────────
const COLORS = ['#c9a96e', '#1e3a5f', '#e8c882', '#6b7280', '#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];
function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  const r = 58; const cx = 75; const cy = 75;
  const slices = data.map((d, i) => {
    const a = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle); const y1 = cy + r * Math.sin(angle);
    angle += a;
    const x2 = cx + r * Math.cos(angle); const y2 = cy + r * Math.sin(angle);
    return { path: `M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2}Z`, color: COLORS[i % COLORS.length], label: d.label, value: d.value };
  });
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 150 150" className="w-32 h-32 flex-shrink-0">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={34} fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">Total</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={16} fontWeight="700" fill="#1f2937">{total}</text>
      </svg>
      <div className="flex flex-col gap-1.5 text-xs flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="capitalize text-gray-600 truncate">{s.label.replace(/_/g, ' ')}</span>
            <span className="ml-auto font-semibold text-gray-800">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const [from, setFrom] = useState(thisMonthStart);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ from: thisMonthStart, to: today });

  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary', applied.from, applied.to],
    queryFn: () => analyticsApi.getSummary({ from: applied.from, to: applied.to }),
  });

  const dailyChart = useMemo(
    () => (data?.dailyRevenue ?? []).map((d) => ({ label: d.day, value: d.revenue })),
    [data],
  );
  const statusChart = useMemo(
    () => Object.entries(data?.ordersByStatus ?? {}).map(([label, value]) => ({ label, value: value as number })),
    [data],
  );

  const setRange = (f: string, t: string) => { setFrom(f); setTo(t); setApplied({ from: f, to: t }); };
  const lastMonth = () => {
    const f = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const t = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    setRange(f, t);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-black transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-amber-500" /> Analytics
              </h1>
              <p className="text-sm text-gray-500">Revenue, orders, cities &amp; products</p>
            </div>
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
            <span className="text-gray-400 text-sm">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
            <button onClick={() => setApplied({ from, to })} className="px-4 py-1.5 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors">Apply</button>
            <button onClick={() => setRange(thisMonthStart, today)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">This month</button>
            <button onClick={lastMonth} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Last month</button>
            <button onClick={() => setRange(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), today)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">This year</button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-24 text-gray-400 text-lg">Loading…</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Revenue" value={data ? formatPrice(data.revenue) : '—'} sub={`${applied.from} → ${applied.to}`} color="bg-amber-500" />
              <StatCard icon={ShoppingCart} label="Paid Orders" value={data ? String(data.paidOrders) : '—'} sub="In date range" color="bg-blue-600" />
              <StatCard icon={Users} label="Customers" value={data ? String(data.customerCount) : '—'} sub="All time (registered)" color="bg-violet-600" />
              <StatCard icon={AlertTriangle} label="Low Stock" value={data ? String(data.lowStockCount) : '—'} sub="Products need restock" color="bg-rose-500" />
            </div>

            {/* Daily Revenue bar chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" /> Daily Revenue — last 30 days
              </h3>
              <p className="text-xs text-gray-400 mb-4">Each bar = one day's total orders revenue</p>
              <BarChart data={dailyChart} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Order status donut */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Orders by Status</h3>
                <DonutChart data={statusChart} />
              </div>

              {/* City breakdown */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" /> Top Cities (in date range)
                </h3>
                {(data?.cityBreakdown ?? []).length === 0 ? (
                  <p className="text-gray-400 text-sm">No city data for this period.</p>
                ) : (
                  <div className="space-y-3">
                    {(data?.cityBreakdown ?? []).map((c, i) => {
                      const maxO = Math.max(...(data?.cityBreakdown ?? []).map((x) => x.orders), 1);
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-4 text-gray-400 text-xs text-right font-medium">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium text-gray-800">{c.city}</span>
                              <span className="text-gray-400 text-xs">{c.orders} orders · {formatPrice(c.revenue)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-1.5 bg-amber-400 rounded-full transition-all" style={{ width: `${(c.orders / maxO) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Top 10 Products (by sold count, all time)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      {['#', 'Product', 'Sold', 'Reviews', 'Rating', 'Price'].map((h) => (
                        <th key={h} className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(data?.topProducts ?? []).map((p, i) => (
                      <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 pr-4 text-gray-400 font-medium">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium text-gray-800">{p.name}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{p.soldCount}</td>
                        <td className="py-2.5 pr-4 text-gray-500">{p.reviewCount}</td>
                        <td className="py-2.5 pr-4 text-amber-500 font-medium">{p.rating > 0 ? `★ ${p.rating.toFixed(1)}` : '—'}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-800">{formatPrice(p.basePrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


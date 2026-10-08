'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { memberApi, apiError } from '@/lib/api/memberApi';
import { extrasApi, METRIC_LABEL } from '@/lib/api/extrasApi';
import { useMember } from '@/lib/member/useMember';
import { CnicUploadField, CopyField, Field, Notice, SelectField, Stat, StatusBadge, money } from '@/components/member/ui';
import { cn, formatDate } from '@/lib/utils';

const TABS = [
  ['overview', 'Overview'],
  ['referrals', 'My referrals'],
  ['wallet', 'Wallet'],
  ['incentives', 'Incentives'],
  ['training', 'Training'],
  ['payout', 'Payout details'],
] as const;
type Tab = (typeof TABS)[number][0];

const METHOD: Record<string, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', bank: 'Bank' };

const ENTRY_LABEL: Record<string, string> = {
  commission: 'Referral commission',
  commission_reversal: 'Commission reversed',
  withdrawal: 'Withdrawal',
  withdrawal_reversal: 'Withdrawal returned',
  order_payment: 'Paid for an order',
  order_refund: 'Order refund',
  adjustment: 'Adjustment',
};

export default function PartnerDashboard() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isHydrated = useSelector((s: RootState) => s.auth.isHydrated);
  const { member, isLoading } = useMember();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.find(([k]) => k === params?.get('tab'))?.[0] ?? 'overview') as Tab;
  const setTab = (t: Tab) => router.replace(`/account/partner${t === 'overview' ? '' : `?tab=${t}`}`, { scroll: false });

  if (isHydrated && !isAuthenticated) {
    return (
      <Shell>
        <p className="text-gray-600 font-light">Please sign in to see your partner dashboard.</p>
        <Link href="/login?redirect=/account/partner" className="btn-ink mt-6">Sign in</Link>
      </Shell>
    );
  }
  if (!member) return <Shell>{isLoading || !isHydrated ? <p className="text-muted">Loading…</p> : null}</Shell>;

  if (member.accountType !== 'partner') {
    return (
      <Shell>
        {member.partner ? (
          <div className="space-y-4">
            <StatusBadge status={member.partner.status} />
            <p className="text-gray-600 font-light">
              {member.partner.status === 'pending'
                ? 'Your application is under review. We will notify you as soon as it is approved.'
                : member.partner.note || 'Your partner account is not active. Please contact us.'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 font-light">You are not a Brand Partner yet.</p>
            <Link href="/join" className="btn-ink mt-6">Become a Brand Partner</Link>
          </div>
        )}
      </Shell>
    );
  }

  return (
    <Shell code={member.memberCode}>
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-line mb-8">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn('px-4 py-3 text-[0.85rem] uppercase tracking-[0.05em] whitespace-nowrap border-b-2 -mb-px', tab === k ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'referrals' && <Referrals />}
      {tab === 'wallet' && <WalletTab onPayout={() => setTab('payout')} />}
      {tab === 'incentives' && <Incentives />}
      {tab === 'training' && <TrainingTab />}
      {tab === 'payout' && <Payout />}
    </Shell>
  );
}

function Shell({ children, code }: { children: React.ReactNode; code?: string | null }) {
  return (
    <div className="px-4 sm:px-6 lg:px-11 py-8 lg:py-12 max-w-6xl mx-auto">
      <nav className="text-[0.8rem] text-muted mb-4">
        <Link href="/account" className="hover:text-ink">My account</Link> / <span className="text-ink">Partner dashboard</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
        <h1 className="title text-[2.2rem] sm:text-[2.8rem] text-ink">Partner dashboard</h1>
        {code && <span className="px-4 py-2 rounded-full border border-line text-[0.85rem]">Member code <b>{code}</b></span>}
      </div>
      {children}
    </div>
  );
}

function Overview() {
  const { member } = useMember();
  if (!member) return null;
  const tiers = member.settings.partnerDiscountTiers;
  const next = member.nextTier;
  const progress = next ? Math.min(100, (member.monthlyBV / next.minBV) * 100) : 100;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat accent label="Wallet balance" value={money(member.wallet.available)} sub={member.wallet.pending > 0 ? `${money(member.wallet.pending)} on its way` : 'Ready to spend or withdraw'} />
        <Stat label="Total earned" value={money(member.wallet.earned)} sub={`${member.settings.referralCommissionPct}% direct, more from your team`} />
        <Stat label="Your discount" value={`${member.discountPct ?? 0}%`} sub="On your own orders this month" />
        <Stat label="Rank" value={member.rank} sub={`Group BV ${member.groupBV.toLocaleString()}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-line p-6">
          <h2 className="text-[1.3rem] font-light">Share and earn</h2>
          <p className="mt-2 text-[0.9rem] text-gray-600 font-light">
            Anyone who shops or signs up through your links is linked to you. You earn commission down {member.settings.levelCommissionPct.length} levels of your team, on every order once delivered.
          </p>
          <ul className="mt-4 divide-y divide-line text-[0.85rem]">
            {member.settings.levelCommissionPct.map((pct, i) => (
              <li key={i} className="flex justify-between py-2">
                <span className="font-light">Level {i + 1}{i === 0 ? ' (your direct team)' : ''}</span>
                <span>{pct}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-4">
            {member.links && <CopyField label="Your shop link" value={member.links.store} />}
            {member.links && <CopyField label="Invite a partner" value={member.links.join} />}
          </div>
        </div>
        <div className="border border-line p-6">
          <h2 className="text-[1.3rem] font-light">Discount progress</h2>
          {next ? (
            <>
              <p className="mt-2 text-[0.9rem] text-gray-600 font-light">
                {next.minBV - member.monthlyBV} more BV this month unlocks {next.pct}% off.
              </p>
              <div className="mt-4 h-2 bg-tile rounded-full overflow-hidden">
                <div className="h-full bg-rose" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-[0.9rem] text-gray-600 font-light">You are on the top discount this month.</p>
          )}
          <ul className="mt-5 divide-y divide-line text-[0.9rem]">
            {tiers.map((t, i) => (
              <li key={t.minBV} className={cn('flex justify-between py-2.5', member.discountPct === t.pct && 'font-medium')}>
                <span className="font-light">{tiers[i + 1] ? `${t.minBV} to ${tiers[i + 1].minBV - 1} BV` : `${t.minBV} BV and above`}</span>
                <span>{t.pct}%</span>
              </li>
            ))}
          </ul>
          <Link href="/shop" className="btn-line mt-5">Shop at your price</Link>
        </div>
      </div>

      <div className="border border-line p-6">
        <h2 className="text-[1.3rem] font-light">Rank: {member.rank}</h2>
        {member.nextRank ? (
          <>
            <p className="mt-2 text-[0.9rem] text-gray-600 font-light">
              {member.nextRank.remaining.toLocaleString()} more group BV (your team&apos;s combined points) unlocks <span className="font-medium">{member.nextRank.rank}</span> and a Rs. {member.nextRank.bonus.toLocaleString()} bonus.
            </p>
            <div className="mt-4 h-2 bg-tile rounded-full overflow-hidden">
              <div className="h-full bg-rose" style={{ width: `${Math.min(100, (member.groupBV / member.nextRank.minGroupBV) * 100)}%` }} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-[0.9rem] text-gray-600 font-light">You have reached the highest rank. 🎉</p>
        )}
        <ul className="mt-5 divide-y divide-line text-[0.9rem]">
          {member.settings.ranks.map((r) => (
            <li key={r.rank} className={cn('flex justify-between py-2.5', member.rank === r.rank && 'font-medium')}>
              <span className="font-light">{r.rank} — {r.minGroupBV.toLocaleString()} group BV</span>
              <span>Rs. {r.bonus.toLocaleString()} bonus</span>
            </li>
          ))}
        </ul>
      </div>
      {member.sponsor && <p className="text-[0.85rem] text-muted">Your sponsor: {member.sponsor.name} ({member.sponsor.memberCode})</p>}
    </div>
  );
}

function Referrals() {
  const { member } = useMember();
  const { data, isLoading } = useQuery({ queryKey: ['member-referrals'], queryFn: memberApi.referrals });
  const [viewMode, setViewMode] = useState<'tree' | 'levels' | 'direct'>('tree');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  if (isLoading) return <p className="text-muted">Loading network…</p>;

  const people = data?.people ?? [];
  const tree = data?.tree ?? [];
  const team = data?.team;
  const levelCommissions = data?.levelCommissions ?? [];
  const minActiveBV = member?.settings?.ranks ? 30 : 30; // standard override qualification
  const isOverrideQualified = (member?.monthlyBV ?? 0) >= minActiveBV;

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTree = tree.filter((node) => {
    const matchesLevel = selectedLevel === 'all' || node.level === selectedLevel;
    const matchesSearch =
      !search ||
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      (node.memberCode && node.memberCode.toLowerCase().includes(search.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const whatsappMessage = encodeURIComponent(
    `Join my Azeeora Brand Partner network! Shop luxury cosmetics or build your business with great discounts and commissions.\n\nSign up here: ${member?.links?.join ?? ''}\nMember Code: ${member?.memberCode ?? ''}`
  );

  return (
    <div className="space-y-8">
      {/* Network Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Direct team" value={people.length} sub="Level 1 members" />
        <Stat label="Total network" value={team?.totalMembers ?? people.length} sub="Across all levels" />
        <Stat label="Group BV" value={(team?.groupBV ?? member?.groupBV ?? 0).toLocaleString()} sub={`Rank: ${team?.rank ?? member?.rank}`} />
        <Stat accent label="Total commissions" value={money(people.reduce((s, p) => s + p.commission, 0) + (data?.guestOrders.commission ?? 0))} sub="From your network" />
      </div>

      {/* Share & Invite Section */}
      <div className="bg-tile border border-line p-5 rounded-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-[1.1rem] font-medium text-ink">Grow Your Network</h3>
            <p className="text-[0.85rem] text-muted font-light mt-0.5">
              Share your personal link or member code ({member?.memberCode}) to register new partners & earn down 5 levels.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://wa.me/?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-[0.85rem] font-medium rounded-full hover:opacity-90 transition-opacity"
            >
              Share on WhatsApp
            </a>
            {member?.links && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(member.links!.join);
                  alert('Partner invite link copied to clipboard!');
                }}
                className="btn-line text-[0.85rem] py-2 px-4"
              >
                Copy Invite Link
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Level Commission Structure & Performance */}
      <div className="border border-line p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[1.3rem] font-light">Multi-Level Commission Ladder</h2>
            <p className="text-[0.85rem] text-gray-600 font-light mt-0.5">
              Earn override commissions on every delivered order placed by your network down {member?.settings.levelCommissionPct.length ?? 5} levels.
            </p>
          </div>
          <div className={`px-3 py-1 text-xs rounded-full border ${isOverrideQualified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {isOverrideQualified ? '✓ Qualified for Level 2+ Overrides' : `Need ${Math.max(0, minActiveBV - (member?.monthlyBV ?? 0))} more monthly BV for Level 2+ Overrides`}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {(member?.settings.levelCommissionPct ?? [10, 5, 3, 2, 1]).map((pct, idx) => {
            const levelNum = idx + 1;
            const lvlData = levelCommissions.find((l) => l.level === levelNum);
            const levelCount = team?.perLevel.find((l) => l.level === levelNum)?.count ?? 0;
            return (
              <div key={levelNum} className="border border-line p-3.5 bg-tile rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted mb-1">
                    <span>Level {levelNum} {levelNum === 1 ? '(Direct)' : ''}</span>
                    <span className="font-semibold text-ink">{pct}%</span>
                  </div>
                  <p className="text-[1.1rem] font-medium text-ink mt-1">
                    {money(lvlData?.amount ?? (levelNum === 1 ? people.reduce((s, p) => s + p.commission, 0) : 0))}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-line text-[0.75rem] text-muted flex justify-between">
                  <span>{levelCount} members</span>
                  <span>{lvlData?.orders ?? (levelNum === 1 ? people.reduce((s, p) => s + p.orders, 0) : 0)} orders</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Switcher: Interactive Tree vs Level Explorer vs Direct List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex gap-2">
            {[
              ['tree', 'Genealogy Network Tree'],
              ['levels', 'Downline Explorer'],
              ['direct', 'Direct Referrals'],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setViewMode(k as any)}
                className={`px-4 py-2 text-[0.85rem] rounded-full border transition-colors ${
                  viewMode === k ? 'bg-ink text-white border-ink' : 'border-line text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {viewMode !== 'direct' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 text-xs border border-line bg-white w-48 focus:outline-none"
              />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-2 py-1.5 text-xs border border-line bg-white focus:outline-none"
              >
                <option value="all">All Levels</option>
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
                <option value={4}>Level 4</option>
                <option value={5}>Level 5</option>
              </select>
            </div>
          )}
        </div>

        {/* 1. INTERACTIVE GENEALOGY TREE VIEW */}
        {viewMode === 'tree' && (
          <div className="border border-line p-6 bg-white overflow-x-auto">
            <h3 className="text-lg font-light mb-4">Downline Genealogy Network</h3>
            
            {/* Top Root: You */}
            <div className="space-y-6">
              <div className="p-4 bg-blush border border-rose/30 max-w-md rounded-md shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-rose font-medium">Network Head (You)</span>
                  <span className="text-xs bg-white px-2 py-0.5 rounded text-ink font-medium">{member?.rank ?? 'Member'}</span>
                </div>
                <p className="font-medium text-ink mt-1 text-base">{member?.memberCode} · You</p>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-rose/20 text-xs text-gray-600">
                  <div>Personal BV: <b className="text-ink">{member?.monthlyBV ?? 0}</b></div>
                  <div>Group BV: <b className="text-ink">{(member?.groupBV ?? 0).toLocaleString()}</b></div>
                </div>
              </div>

              {/* Tree Branches */}
              {tree.length === 0 && people.length === 0 ? (
                <Notice>No downline members in your network yet. Invite team partners to build your tree.</Notice>
              ) : (
                <div className="space-y-4 pl-4 border-l-2 border-line">
                  {/* Level 1 Members */}
                  {(tree.filter((n) => n.level === 1).length > 0 ? tree.filter((n) => n.level === 1) : people.map((p) => ({
                    _id: p._id,
                    name: p.name,
                    memberCode: null,
                    level: 1,
                    sponsorId: '',
                    type: p.type as any,
                    rank: 'Member',
                    monthlyBV: 0,
                    groupBV: 0,
                    joinedAt: p.joinedAt,
                  }))).map((node) => {
                    const downlines = tree.filter((child) => child.sponsorId === node._id);
                    const isExpanded = expandedNodes[node._id] ?? true;

                    return (
                      <div key={node._id} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleNode(node._id)}
                            className="w-6 h-6 flex items-center justify-center rounded border border-line text-xs hover:bg-tile"
                          >
                            {downlines.length > 0 ? (isExpanded ? '−' : '+') : '•'}
                          </button>
                          <div className="p-3 bg-tile border border-line rounded flex-1 max-w-md flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 bg-ink text-white rounded font-mono">L1</span>
                                <span className="font-medium text-sm text-ink">{node.name}</span>
                                {node.memberCode && <span className="text-xs text-muted font-mono">{node.memberCode}</span>}
                              </div>
                              <p className="text-xs text-muted capitalize mt-0.5">
                                {node.type} · Joined {formatDate(node.joinedAt)}
                              </p>
                            </div>
                            <div className="text-right text-xs">
                              <span className="inline-block px-2 py-0.5 bg-white border border-line rounded font-medium text-ink mb-1">
                                {node.rank}
                              </span>
                              <div className="text-muted">BV: {node.monthlyBV} | Grp: {node.groupBV}</div>
                            </div>
                          </div>
                        </div>

                        {/* Level 2+ Nested Downline */}
                        {isExpanded && downlines.length > 0 && (
                          <div className="pl-9 space-y-2.5 border-l-2 border-line/60 ml-3">
                            {downlines.map((subNode) => {
                              const subDownlines = tree.filter((child) => child.sponsorId === subNode._id);
                              const isSubExpanded = expandedNodes[subNode._id] ?? false;

                              return (
                                <div key={subNode._id} className="space-y-2">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleNode(subNode._id)}
                                      className="w-5 h-5 flex items-center justify-center rounded border border-line text-[10px] hover:bg-tile"
                                    >
                                      {subDownlines.length > 0 ? (isSubExpanded ? '−' : '+') : '•'}
                                    </button>
                                    <div className="p-2.5 bg-white border border-line rounded flex-1 max-w-sm flex items-center justify-between text-xs">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] px-1.5 py-0.2 bg-gray-200 text-gray-800 rounded font-mono">L{subNode.level}</span>
                                          <span className="font-medium text-ink">{subNode.name}</span>
                                        </div>
                                        <span className="text-[11px] text-muted capitalize">{subNode.type}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[11px] font-medium text-ink">{subNode.rank}</span>
                                        <div className="text-[10px] text-muted">Grp: {subNode.groupBV}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {isSubExpanded && subDownlines.length > 0 && (
                                    <div className="pl-7 space-y-2 border-l border-line/40 ml-2.5">
                                      {subDownlines.map((deepNode) => (
                                        <div key={deepNode._id} className="p-2 bg-gray-50 border border-line rounded max-w-xs flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] px-1 py-0.2 bg-gray-200 text-gray-700 rounded font-mono">L{deepNode.level}</span>
                                            <span className="font-medium text-ink">{deepNode.name}</span>
                                          </div>
                                          <span className="text-[10px] text-muted">{deepNode.rank}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. DOWNLINE LEVEL EXPLORER VIEW */}
        {viewMode === 'levels' && (
          <div className="space-y-4">
            {filteredTree.length === 0 ? (
              <Notice>No downline members found matching your search or level filter.</Notice>
            ) : (
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-[0.9rem]">
                  <thead className="bg-tile text-left text-[0.75rem] uppercase tracking-[0.06em] text-muted">
                    <tr>
                      <th className="px-4 py-3 font-normal">Level</th>
                      <th className="px-4 py-3 font-normal">Member</th>
                      <th className="px-4 py-3 font-normal">Code</th>
                      <th className="px-4 py-3 font-normal">Rank</th>
                      <th className="px-4 py-3 font-normal text-right">Personal BV</th>
                      <th className="px-4 py-3 font-normal text-right">Group BV</th>
                      <th className="px-4 py-3 font-normal">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTree.map((node) => (
                      <tr key={node._id} className="border-t border-line">
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 text-xs bg-tile border border-line font-mono rounded">
                            Level {node.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">{node.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{node.memberCode ?? '—'}</td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{node.rank}</span></td>
                        <td className="px-4 py-3 text-right font-medium">{node.monthlyBV}</td>
                        <td className="px-4 py-3 text-right font-medium">{node.groupBV.toLocaleString()}</td>
                        <td className="px-4 py-3 font-light text-muted text-xs">{formatDate(node.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. DIRECT REFERRALS LIST VIEW */}
        {viewMode === 'direct' && (
          <div>
            {people.length === 0 ? (
              <Notice>Nobody is directly linked to you yet. Share your shop link from the Overview tab to get started.</Notice>
            ) : (
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-[0.9rem]">
                  <thead className="bg-tile text-left text-[0.75rem] uppercase tracking-[0.06em] text-muted">
                    <tr>
                      <th className="px-4 py-3 font-normal">Name</th>
                      <th className="px-4 py-3 font-normal">Joined</th>
                      <th className="px-4 py-3 font-normal">Type</th>
                      <th className="px-4 py-3 font-normal text-right">Orders</th>
                      <th className="px-4 py-3 font-normal text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p._id} className="border-t border-line">
                        <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                        <td className="px-4 py-3 font-light">{formatDate(p.joinedAt)}</td>
                        <td className="px-4 py-3 font-light capitalize">{p.type}</td>
                        <td className="px-4 py-3 text-right">{p.orders}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{money(p.commission)}</td>
                      </tr>
                    ))}
                    {data && data.guestOrders.orders > 0 && (
                      <tr className="border-t border-line bg-gray-50/50">
                        <td className="px-4 py-3 font-light" colSpan={3}>Guest orders through your referral link</td>
                        <td className="px-4 py-3 text-right">{data.guestOrders.orders}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{money(data.guestOrders.commission)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WalletTab({ onPayout }: { onPayout: () => void }) {
  const qc = useQueryClient();
  const { member } = useMember();
  const { data, isLoading } = useQuery({ queryKey: ['member-wallet'], queryFn: memberApi.wallet });
  const [amount, setAmount] = useState('');
  const withdraw = useMutation({
    mutationFn: () => memberApi.withdraw(Number(amount)),
    onSuccess: () => {
      setAmount('');
      qc.invalidateQueries({ queryKey: ['member-wallet'] });
      qc.invalidateQueries({ queryKey: ['member-me'] });
    },
  });
  if (isLoading || !data || !member) return <p className="text-muted">Loading…</p>;
  const verified = member.kyc?.status === 'approved';
  const open = data.withdrawals.find((w) => w.status === 'requested');
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat accent label="Available" value={money(data.summary.available)} />
        <Stat label="On its way" value={money(data.summary.pending)} sub="Released when orders are delivered" />
        <Stat label="Total earned" value={money(data.summary.earned)} />
        <Stat label="Withdrawn" value={money(data.summary.withdrawn)} />
      </div>

      <div className="border border-line p-6">
        <h2 className="text-[1.3rem] font-light">Withdraw</h2>
        {!verified ? (
          <div className="mt-3">
            <p className="text-gray-600 font-light text-[0.95rem]">
              {member.kyc?.status === 'pending' ? 'Your payout details are being verified.' : 'Add and verify your payout details to withdraw.'}
            </p>
            {member.kyc?.status !== 'pending' && <button onClick={onPayout} className="btn-line mt-4">Add payout details</button>}
          </div>
        ) : open ? (
          <p className="mt-3 text-gray-600 font-light">Your withdrawal of {money(open.amount)} is being processed.</p>
        ) : (
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              withdraw.mutate();
            }}
          >
            <Field
              label={`Amount (minimum ${money(member.settings.minWithdrawal)})`}
              type="number"
              min={member.settings.minWithdrawal}
              max={data.summary.available}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-60"
            />
            <button type="submit" disabled={withdraw.isPending || !amount} className="btn-ink">
              {withdraw.isPending ? 'Sending…' : 'Request withdrawal'}
            </button>
            <p className="w-full text-[0.85rem] text-muted">
              Paid to {member.kyc?.method === 'bank' ? member.kyc?.bankName : METHOD[member.kyc?.method ?? '']} {member.kyc?.accountNumber}
            </p>
          </form>
        )}
        {withdraw.isError && <div className="mt-3"><Notice tone="error">{apiError(withdraw.error)}</Notice></div>}
        {withdraw.isSuccess && <div className="mt-3"><Notice tone="success">Withdrawal requested. We will notify you when it is paid.</Notice></div>}
      </div>

      <div>
        <h2 className="text-[1.3rem] font-light mb-4">Activity</h2>
        {data.entries.length === 0 ? (
          <Notice>No wallet activity yet.</Notice>
        ) : (
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-[0.9rem]">
              <thead className="bg-tile text-left text-[0.75rem] uppercase tracking-[0.06em] text-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Date</th>
                  <th className="px-4 py-3 font-normal">What</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e._id} className="border-t border-line">
                    <td className="px-4 py-3 font-light whitespace-nowrap">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      {ENTRY_LABEL[e.type] ?? e.type}
                      {e.note && <span className="block text-[0.8rem] text-muted font-light">{e.note}</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} label={e.status === 'pending' ? 'On its way' : undefined} /></td>
                    <td className={cn('px-4 py-3 text-right whitespace-nowrap', e.amount < 0 ? 'text-ink' : 'text-[#2f7d4f]')}>
                      {e.amount < 0 ? '-' : '+'}
                      {money(Math.abs(e.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.withdrawals.length > 0 && (
        <div>
          <h2 className="text-[1.3rem] font-light mb-4">Withdrawals</h2>
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-[0.9rem]">
              <tbody>
                {data.withdrawals.map((w) => (
                  <tr key={w._id} className="border-t border-line first:border-t-0">
                    <td className="px-4 py-3 font-light">{formatDate(w.createdAt)}</td>
                    <td className="px-4 py-3">{money(w.amount)}</td>
                    <td className="px-4 py-3 font-light">{w.reference ? `Ref ${w.reference}` : w.note ?? ''}</td>
                    <td className="px-4 py-3 text-right"><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Payout() {
  const qc = useQueryClient();
  const { member } = useMember();
  const form = useForm<{
    cnic: string;
    fullNameOnCnic: string;
    fatherName: string;
    cnicFrontImage: string;
    cnicBackImage?: string;
    method: string;
    accountTitle: string;
    accountNumber: string;
    bankName?: string;
  }>({
    defaultValues: { method: 'jazzcash', cnicFrontImage: '' },
  });
  const method = form.watch('method');
  const submit = useMutation({
    mutationFn: (d: Record<string, unknown>) => memberApi.submitKyc(d),
    onSuccess: (data) => qc.setQueryData(['member-me'], data),
  });
  const kyc = member?.kyc;
  return (
    <div className="max-w-xl space-y-6">
      {kyc && (
        <div className="border border-line p-6 space-y-2">
          <div className="flex items-center gap-3">
            <StatusBadge status={kyc.status} label={kyc.status === 'approved' ? 'Verified' : undefined} />
          </div>
          <p className="text-[0.95rem]">
            {kyc.accountTitle}, {kyc.method === 'bank' ? kyc.bankName : METHOD[kyc.method]} {kyc.accountNumber}
          </p>
          {kyc.status === 'rejected' && kyc.note && <p className="text-[0.9rem] text-sale">{kyc.note}</p>}
        </div>
      )}
      {kyc?.status !== 'pending' && (
        <form onSubmit={form.handleSubmit((d) => submit.mutate(d))} className="grid gap-4">
          <p className="text-gray-600 font-light text-[0.95rem]">
            {kyc ? 'Update your payout details. They will be verified again before your next withdrawal.' : 'Where should we send your earnings? The account name must match your CNIC.'}
          </p>
          <SelectField label="Paid to" options={[['jazzcash', 'JazzCash'], ['easypaisa', 'Easypaisa'], ['bank', 'Bank account']]} {...form.register('method')} />
          {method === 'bank' && <Field label="Bank name" {...form.register('bankName', { required: method === 'bank' })} />}
          <Field label="Account title" {...form.register('accountTitle', { required: true })} />
          <Field label={method === 'bank' ? 'Account number or IBAN' : 'Mobile account number'} {...form.register('accountNumber', { required: true })} />
          <Field label="CNIC" placeholder="35202-1234567-1" hint="One CNIC can only be used for one account." error={form.formState.errors.cnic?.message} {...form.register('cnic', { required: true })} />
          <Field label="Full name as on CNIC" placeholder="e.g. Ali Ahmed" error={form.formState.errors.fullNameOnCnic?.message} {...form.register('fullNameOnCnic', { required: true })} />
          <Field label="Father's name" placeholder="e.g. Umer Ahmed" error={form.formState.errors.fatherName?.message} {...form.register('fatherName', { required: true })} />
          <input type="hidden" {...form.register('cnicFrontImage')} />
          <input type="hidden" {...form.register('cnicBackImage')} />
          <div className="grid grid-cols-2 gap-4">
            <CnicUploadField
              label="CNIC front photo (optional)"
              value={form.watch('cnicFrontImage')}
              onChange={(url) => form.setValue('cnicFrontImage', url)}
            />
            <CnicUploadField label="CNIC back photo (optional)" value={form.watch('cnicBackImage')} onChange={(url) => form.setValue('cnicBackImage', url)} />
          </div>
          {submit.isError && <Notice tone="error">{apiError(submit.error)}</Notice>}
          <button type="submit" disabled={submit.isPending} className="btn-ink justify-self-start">{submit.isPending ? 'Sending…' : 'Submit for verification'}</button>
        </form>
      )}
    </div>
  );
}

function Incentives() {
  const { data = [], isLoading } = useQuery({ queryKey: ['my-incentives'], queryFn: extrasApi.incentives.mine });
  if (isLoading) return <p className="text-muted">Loading…</p>;
  if (data.length === 0) return <Notice>No incentives are running right now. Check back soon.</Notice>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {data.map((i) => {
        const pct = Math.min(100, ((i.progress ?? 0) / i.target) * 100);
        const isMoney = i.metric !== 'new_referrals';
        const fmt = (n: number) => (isMoney ? money(n) : String(Math.round(n)));
        return (
          <div key={i._id} className="border border-line">
            {i.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.image} alt="" className="w-full h-44 object-cover" />
            )}
            <div className="p-6">
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">
                {formatDate(i.startDate)} to {formatDate(i.endDate)}
              </p>
              <h3 className="mt-2 text-[1.35rem] font-light">{i.title}</h3>
              <p className="mt-1 text-[0.95rem]">Reward: <b className="font-medium">{i.reward}</b></p>
              {i.description && <p className="mt-2 text-[0.9rem] text-gray-600 font-light">{i.description}</p>}
              <div className="mt-5 flex justify-between text-[0.85rem]">
                <span className="text-muted">{METRIC_LABEL[i.metric]}</span>
                <span>
                  {fmt(i.progress ?? 0)} / {fmt(i.target)}
                </span>
              </div>
              <div className="mt-2 h-2 bg-tile rounded-full overflow-hidden">
                <div className={cn('h-full', pct >= 100 ? 'bg-[#2f7d4f]' : 'bg-rose')} style={{ width: `${pct}%` }} />
              </div>
              {pct >= 100 ? (
                <p className="mt-3 text-[0.9rem] text-[#2f7d4f]">You have qualified. Well done!</p>
              ) : !i.started ? (
                <p className="mt-3 text-[0.85rem] text-muted">Starts {formatDate(i.startDate)}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrainingTab() {
  const { data = [], isLoading } = useQuery({ queryKey: ['my-training'], queryFn: extrasApi.trainings.mine });
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <p className="text-muted">Loading…</p>;
  if (data.length === 0) return <Notice>Training guides will appear here.</Notice>;
  const embed = (url: string) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  };
  return (
    <div className="border-t border-line">
      {data.map((t) => (
        <div key={t._id} className="border-b border-line">
          <button onClick={() => setOpen(open === t._id ? null : t._id)} className="w-full flex items-center justify-between gap-4 py-5 text-left">
            <span>
              {t.category && <span className="block text-[0.75rem] uppercase tracking-[0.08em] text-muted">{t.category}</span>}
              <span className="text-[1.1rem] font-light">{t.title}</span>
              {t.summary && <span className="block text-[0.9rem] text-gray-600 font-light">{t.summary}</span>}
            </span>
            <span className="text-[1.4rem] font-light">{open === t._id ? '−' : '+'}</span>
          </button>
          {open === t._id && (
            <div className="pb-6 space-y-4">
              {t.videoUrl && embed(t.videoUrl) && (
                <div className="aspect-video max-w-2xl">
                  <iframe src={embed(t.videoUrl)!} title={t.title} className="w-full h-full" allowFullScreen />
                </div>
              )}
              {t.videoUrl && !embed(t.videoUrl) && (
                <a href={t.videoUrl} target="_blank" rel="noopener noreferrer" className="underline">Watch the video</a>
              )}
              {t.body && <div className="text-gray-700 font-light leading-relaxed whitespace-pre-line max-w-2xl">{t.body}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

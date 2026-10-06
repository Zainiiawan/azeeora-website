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
  const { data, isLoading } = useQuery({ queryKey: ['member-referrals'], queryFn: memberApi.referrals });
  if (isLoading) return <p className="text-muted">Loading…</p>;
  const people = data?.people ?? [];
  const team = data?.team;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Direct team" value={people.length} />
        <Stat label="Their orders" value={people.reduce((s, p) => s + p.orders, 0) + (data?.guestOrders.orders ?? 0)} />
        <Stat accent label="Commission from them" value={money(people.reduce((s, p) => s + p.commission, 0) + (data?.guestOrders.commission ?? 0))} />
      </div>

      {team && team.perLevel.length > 0 && (
        <div className="border border-line p-6">
          <h2 className="text-[1.3rem] font-light">Your whole team, level by level</h2>
          <p className="mt-2 text-[0.9rem] text-gray-600 font-light">
            {team.totalMembers} people total across {team.perLevel.length} levels. Group BV: {team.groupBV.toLocaleString()} · Rank: {team.rank}
          </p>
          <ul className="mt-4 divide-y divide-line text-[0.9rem]">
            {team.perLevel.map((l) => (
              <li key={l.level} className="flex justify-between py-2.5">
                <span className="font-light">Level {l.level}{l.level === 1 ? ' (direct)' : ''}</span>
                <span>{l.count} people{l.partners ? ` · ${l.partners} partners` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {people.length === 0 ? (
        <Notice>Nobody is linked to you yet. Share your shop link from the Overview tab to get started.</Notice>
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
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 font-light">{formatDate(p.joinedAt)}</td>
                  <td className="px-4 py-3 font-light capitalize">{p.type}</td>
                  <td className="px-4 py-3 text-right">{p.orders}</td>
                  <td className="px-4 py-3 text-right">{money(p.commission)}</td>
                </tr>
              ))}
              {data && data.guestOrders.orders > 0 && (
                <tr className="border-t border-line">
                  <td className="px-4 py-3 font-light" colSpan={3}>Guest orders through your link</td>
                  <td className="px-4 py-3 text-right">{data.guestOrders.orders}</td>
                  <td className="px-4 py-3 text-right">{money(data.guestOrders.commission)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
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
          <input type="hidden" {...form.register('cnicFrontImage', { required: true })} />
          <input type="hidden" {...form.register('cnicBackImage')} />
          <div className="grid grid-cols-2 gap-4">
            <CnicUploadField
              label="CNIC front photo"
              value={form.watch('cnicFrontImage')}
              error={form.formState.errors.cnicFrontImage?.message}
              onChange={(url) => form.setValue('cnicFrontImage', url, { shouldValidate: true })}
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

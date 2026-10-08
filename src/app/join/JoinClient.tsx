'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Plus, Wallet, Percent, Gift, Users } from 'lucide-react';
import { RootState } from '@/store';
import { memberApi, apiError } from '@/lib/api/memberApi';
import { useMember } from '@/lib/member/useMember';
import { getRef } from '@/lib/member/referral';
import { Field, Notice, StatusBadge, money, CnicUploadField } from '@/components/member/ui';

type FormData = {
  phone: string;
  whatsapp?: string;
  cnic: string;
  fullNameOnCnic: string;
  fatherName: string;
  cnicFrontImage?: string;
  cnicBackImage?: string;
  city: string;
  address?: string;
  dateOfBirth?: string;
  experience?: string;
  refCode?: string;
  agreeTerms: boolean;
};

export default function JoinClient() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  const { member } = useMember();
  const qc = useQueryClient();
  const { data: programme } = useQuery({ queryKey: ['programme'], queryFn: memberApi.programme });

  const pct = programme?.referralCommissionPct ?? 10;
  const tiers = programme?.partnerDiscountTiers ?? [{ minBV: 0, pct: 20 }];
  const startPct = tiers[0]?.pct ?? 20;
  const topPct = tiers[tiers.length - 1]?.pct ?? startPct;

  // Earnings example
  const [friends, setFriends] = useState(10);
  const [basket, setBasket] = useState(2500);
  const [own, setOwn] = useState(3000);
  const monthly = useMemo(() => Math.round((friends * basket * pct) / 100), [friends, basket, pct]);
  const saving = Math.round((own * startPct) / 100);

  const form = useForm<FormData>({ defaultValues: { phone: '', cnic: '', fullNameOnCnic: '', fatherName: '', cnicFrontImage: '', city: '', agreeTerms: false } });
  const refCode = form.watch('refCode');
  useEffect(() => {
    const r = getRef();
    if (r && !form.getValues('refCode')) form.setValue('refCode', r);
    if (user?.phone && !form.getValues('phone')) form.setValue('phone', user.phone);
  }, [form, user?.phone]);
  const { data: sponsor } = useQuery({
    queryKey: ['ref', refCode],
    queryFn: () => memberApi.checkRef(refCode!),
    enabled: !!refCode && /^AZ-\d{6}$/i.test(refCode.trim()),
  });

  const apply = useMutation({
    mutationFn: (d: FormData) => memberApi.applyPartner({ ...d, refCode: d.refCode?.trim() || undefined }),
    onSuccess: (data) => qc.setQueryData(['member-me'], data),
  });

  const status = member?.partner?.status;

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="grid lg:grid-cols-2">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[560px] overflow-hidden bg-tile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blog/day-night-cream.jpg" alt="Azeeora skincare" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="bg-blush flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
          <p className="text-[0.8rem] uppercase tracking-[0.1em] text-ink/70 mb-4">Join us</p>
          <h1 className="font-light text-[2.3rem] sm:text-[3.2rem] leading-[1.08] text-ink">Become an Azeeora Brand Partner</h1>
          <p className="mt-5 text-[1.05rem] font-light text-ink/80 max-w-lg leading-relaxed">
            Share skincare you love and earn {pct}% on every order from the people you bring in. Save {startPct}%
            {topPct > startPct ? ` to ${topPct}%` : ''} on your own orders. Free to join, no stock to buy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#apply" className="btn-ink">Apply now</a>
            <a href="#how" className="btn-line">How it works</a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-5 sm:px-8 lg:px-11 py-16 lg:py-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 max-w-6xl mx-auto">
          {[
            [Percent, `${pct}% commission`, 'On every order from customers and partners you refer, for as long as they shop.'],
            [Gift, `Up to ${topPct}% off`, `Your partner discount starts at ${startPct}% and grows with your monthly points.`],
            [Wallet, 'Paid to your wallet', 'Spend it at checkout or withdraw to your bank, JazzCash or Easypaisa.'],
            [Users, 'Free to join', 'No joining fee, no targets to hit and no stock to buy up front.'],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Percent;
            return (
              <div key={title as string} className="flex flex-col items-center text-center">
                <span className="w-16 h-16 rounded-full bg-blush flex items-center justify-center mb-4">
                  <I className="w-7 h-7" strokeWidth={1.2} />
                </span>
                <p className="text-[1rem] uppercase tracking-[0.04em] text-ink">{title as string}</p>
                <p className="mt-2 text-[0.9rem] text-muted font-light max-w-[260px]">{body as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-tile px-5 sm:px-8 lg:px-11 py-16 lg:py-24 scroll-mt-28">
        <h2 className="title text-[2.1rem] sm:text-[2.8rem] text-ink text-center">How it works</h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            ['Apply', 'Create an account and send your application. We check it, usually within a day, and give you your member code.'],
            ['Share', 'Send your personal shop link to friends and family on WhatsApp or Instagram. Anyone who shops through it is linked to you.'],
            ['Earn', `You earn ${pct}% of every order they place. It lands in your wallet when the order is delivered.`],
          ].map(([t, b], i) => (
            <div key={t} className="bg-white p-8">
              <span className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center text-[0.95rem]">{i + 1}</span>
              <h3 className="mt-5 text-[1.4rem] font-light text-ink">{t}</h3>
              <p className="mt-3 text-[0.95rem] text-gray-600 font-light leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings example + discount tiers */}
      <section className="px-5 sm:px-8 lg:px-11 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 max-w-6xl mx-auto">
          <div>
            <h2 className="title text-[2rem] sm:text-[2.5rem] text-ink">What you could earn</h2>
            <p className="mt-3 text-muted font-light">An example only. Your earnings depend on what your referrals buy.</p>
            <div className="mt-8 space-y-7">
              {[
                ['People shopping through you each month', friends, setFriends, 1, 100, 1, (v: number) => String(v)],
                ['Their average order', basket, setBasket, 500, 10000, 100, money],
                ['Your own orders each month', own, setOwn, 0, 20000, 500, money],
              ].map(([label, value, set, min, max, step, fmt]) => (
                <label key={label as string} className="block">
                  <span className="flex justify-between text-[0.9rem] text-ink">
                    <span>{label as string}</span>
                    <span className="font-medium">{(fmt as (v: number) => string)(value as number)}</span>
                  </span>
                  <input
                    type="range"
                    min={min as number}
                    max={max as number}
                    step={step as number}
                    value={value as number}
                    onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </label>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="bg-blush p-5">
                <p className="text-[0.75rem] uppercase tracking-[0.08em] text-ink/70">Commission a month</p>
                <p className="mt-2 text-[1.9rem] font-light">{money(monthly)}</p>
              </div>
              <div className="bg-tile p-5">
                <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Saved on your orders</p>
                <p className="mt-2 text-[1.9rem] font-light">{money(saving)}</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="title text-[2rem] sm:text-[2.5rem] text-ink">Your partner discount</h2>
            <p className="mt-3 text-muted font-light">
              Every product carries points (BV). The more you order in a month, the bigger your discount the same month.
            </p>
            <table className="mt-8 w-full text-left">
              <thead>
                <tr className="border-b border-ink text-[0.8rem] uppercase tracking-[0.06em]">
                  <th className="py-3 font-normal">Your points this month</th>
                  <th className="py-3 font-normal text-right">Discount</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => (
                  <tr key={t.minBV} className="border-b border-line">
                    <td className="py-4 font-light">{tiers[i + 1] ? `${t.minBV} to ${tiers[i + 1].minBV - 1} BV` : `${t.minBV} BV and above`}</td>
                    <td className="py-4 text-right text-[1.2rem]">{t.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[0.85rem] text-muted">Points reset at the start of each month.</p>
          </div>
        </div>
      </section>

      {/* Application */}
      <section id="apply" className="bg-tile px-4 sm:px-8 lg:px-11 py-16 lg:py-24 scroll-mt-28">
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-10">
          <h2 className="title text-[2rem] sm:text-[2.4rem] text-ink">Apply to join</h2>

          {!isAuthenticated ? (
            <div className="mt-6">
              <p className="text-gray-600 font-light">Create a free Azeeora account first (or sign in), then come back here to send your application.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register?redirect=/join%23apply" className="btn-ink">Create account</Link>
                <Link href="/login?redirect=/join%23apply" className="btn-line">Sign in</Link>
              </div>
            </div>
          ) : member?.accountType === 'business' ? (
            <div className="mt-6"><Notice>Your account is a wholesale account, so it cannot also be a Brand Partner.</Notice></div>
          ) : status ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                {member?.memberCode && <span className="text-[0.9rem]">Member code <b>{member.memberCode}</b></span>}
              </div>
              {status === 'pending' && <p className="text-gray-600 font-light">Thank you. We are reviewing your application and will notify you here and by email.</p>}
              {status === 'approved' && (
                <Link href="/account/partner" className="btn-ink">Go to your partner dashboard</Link>
              )}
              {(status === 'rejected' || status === 'suspended') && (
                <p className="text-gray-600 font-light">{member?.partner?.note || 'Please contact us if you have any questions.'}</p>
              )}
            </div>
          ) : (
            <form onSubmit={form.handleSubmit((d) => apply.mutate(d))} className="mt-6 grid sm:grid-cols-2 gap-4">
              <Field label="Mobile number" placeholder="03XX XXXXXXX" {...form.register('phone', { required: true })} />
              <Field label="WhatsApp (optional)" placeholder="03XX XXXXXXX" {...form.register('whatsapp')} />
              <Field label="CNIC" placeholder="35202-1234567-1" hint="One CNIC can only be registered once. Already registered CNIC cannot be reused." error={form.formState.errors.cnic?.message} {...form.register('cnic', { required: true })} />
              <Field label="Full name as on CNIC" placeholder="e.g. Ali Ahmed" error={form.formState.errors.fullNameOnCnic?.message} {...form.register('fullNameOnCnic', { required: true })} />
              <Field label="Father's name" placeholder="e.g. Umer Ahmed" error={form.formState.errors.fatherName?.message} {...form.register('fatherName', { required: true })} />
              <input type="hidden" {...form.register('cnicFrontImage')} />
              <input type="hidden" {...form.register('cnicBackImage')} />
              <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                <CnicUploadField
                  label="CNIC front photo (optional)"
                  value={form.watch('cnicFrontImage')}
                  onChange={(url) => form.setValue('cnicFrontImage', url)}
                />
                <CnicUploadField label="CNIC back photo (optional)" value={form.watch('cnicBackImage')} onChange={(url) => form.setValue('cnicBackImage', url)} />
              </div>
              <Field label="City" {...form.register('city', { required: true })} />
              <Field className="sm:col-span-2" label="Address (optional)" {...form.register('address')} />
              <Field label="Date of birth (optional)" type="date" {...form.register('dateOfBirth')} />
              <Field
                label="Referral code (optional)"
                placeholder="AZ-123456"
                hint={sponsor?.valid ? `Referred by ${sponsor.name}` : refCode && sponsor && !sponsor.valid ? 'Code not found' : 'If a partner told you about us'}
                {...form.register('refCode')}
              />
              <label className="sm:col-span-2 block">
                <span className="block text-[0.85rem] text-ink mb-1.5">Tell us a little about yourself (optional)</span>
                <textarea {...form.register('experience')} rows={3} className="w-full px-4 py-3 border border-line focus:outline-none focus:border-ink" />
              </label>
              <label className="sm:col-span-2 flex items-start gap-3 text-[0.9rem] font-light">
                <input type="checkbox" className="mt-1" {...form.register('agreeTerms', { required: true })} />
                <span>
                  I agree to the <Link href="/partner-terms" className="underline">Brand Partner terms</Link>. I understand earnings come only from real product sales.
                </span>
              </label>
              {apply.isError && <div className="sm:col-span-2"><Notice tone="error">{apiError(apply.error)}</Notice></div>}
              <div className="sm:col-span-2">
                <button type="submit" disabled={apply.isPending} className="btn-ink w-full sm:w-auto">
                  {apply.isPending ? 'Sending…' : 'Send application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 sm:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="title text-[2rem] sm:text-[2.6rem] text-ink text-center mb-10">Questions</h2>
          <div className="border-t border-line">
            {[
              ['Does it cost anything to join?', 'No. Joining is free and there is nothing you have to buy.'],
              ['When do I get paid?', `Your ${pct}% commission is added to your wallet when the order is delivered. You can spend it at checkout or withdraw it once it reaches ${money(programme?.minWithdrawal ?? 1000)}.`],
              ['How are people linked to me?', 'Anyone who signs up or orders through your personal link, or enters your member code, is linked to you. Their future orders keep earning you commission.'],
              ['What if an order is cancelled or returned?', 'Commission is only earned on orders that are delivered and kept. If an order is cancelled or refunded, its commission is cancelled too.'],
              ['Can I run a shop or salon instead?', 'Yes, that is our wholesale programme for businesses buying in quantity.'],
            ].map(([q, a]) => (
              <details key={q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-6 cursor-pointer list-none">
                  <h3 className="text-[1.02rem] text-ink font-normal">{q}</h3>
                  <Plus className="w-5 h-5 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.3} />
                </summary>
                <p className="pb-6 -mt-1 text-gray-600 font-light leading-relaxed">
                  {a}
                  {q.startsWith('Can I run') && (
                    <>
                      {' '}
                      <Link href="/business" className="underline">See wholesale</Link>.
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

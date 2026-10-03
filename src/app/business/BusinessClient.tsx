'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Store, PackageCheck, BadgePercent, Truck } from 'lucide-react';
import { RootState } from '@/store';
import { memberApi, apiError } from '@/lib/api/memberApi';
import { useMember } from '@/lib/member/useMember';
import { Field, Notice, SelectField, StatusBadge } from '@/components/member/ui';

type FormData = {
  companyName: string;
  businessType: string;
  contactPhone: string;
  city: string;
  address: string;
  ntn?: string;
  monthlyVolume?: string;
  notes?: string;
};

const TYPES: [string, string][] = [
  ['salon', 'Salon or spa'],
  ['retail_shop', 'Cosmetics or retail shop'],
  ['pharmacy', 'Pharmacy'],
  ['distributor', 'Distributor'],
  ['online_store', 'Online store'],
  ['other', 'Other'],
];

export default function BusinessClient() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const { member } = useMember();
  const qc = useQueryClient();
  const { data: programme } = useQuery({ queryKey: ['programme'], queryFn: memberApi.programme });
  const form = useForm<FormData>({ defaultValues: { businessType: 'salon' } });
  const apply = useMutation({
    mutationFn: (d: FormData) => memberApi.applyBusiness(d),
    onSuccess: (data) => qc.setQueryData(['member-me'], data),
  });
  const status = member?.business?.status;

  return (
    <div className="bg-white">
      <section className="grid lg:grid-cols-2">
        <div className="bg-tile flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 order-2 lg:order-1">
          <p className="text-[0.8rem] uppercase tracking-[0.1em] text-muted mb-4">Azeeora for business</p>
          <h1 className="font-light text-[2.3rem] sm:text-[3.2rem] leading-[1.08] text-ink">Wholesale prices for your salon or shop</h1>
          <p className="mt-5 text-[1.05rem] font-light text-gray-600 max-w-lg leading-relaxed">
            Stock Azeeora at trade prices, around {programme?.wholesaleDefaultDiscountPct ?? 30}% below retail, with low minimum quantities and
            delivery across Pakistan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#apply" className="btn-ink">Apply for an account</a>
            {status === 'approved' && <Link href="/account/business" className="btn-line">Your price list</Link>}
          </div>
        </div>
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[520px] overflow-hidden order-1 lg:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blog/moisturizer-aloe.jpg" alt="Azeeora moisturiser" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-11 py-16 lg:py-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 max-w-6xl mx-auto">
          {[
            [BadgePercent, 'Trade prices', 'Set per product, shown to you once your account is approved.'],
            [PackageCheck, `From ${programme?.wholesaleDefaultMinQty ?? 6} units`, 'Low minimum quantities per product, mix and match across the range.'],
            [Truck, 'Nationwide delivery', 'Cash on delivery, JazzCash or Easypaisa. Free over the delivery threshold.'],
            [Store, 'Support for stockists', 'Product training, shelf images and help from our team.'],
          ].map(([Icon, t, b]) => {
            const I = Icon as typeof Store;
            return (
              <div key={t as string} className="flex flex-col items-center text-center">
                <span className="w-16 h-16 rounded-full bg-blush flex items-center justify-center mb-4">
                  <I className="w-7 h-7" strokeWidth={1.2} />
                </span>
                <p className="text-[1rem] uppercase tracking-[0.04em]">{t as string}</p>
                <p className="mt-2 text-[0.9rem] text-muted font-light max-w-[260px]">{b as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="apply" className="bg-tile px-4 sm:px-8 lg:px-11 py-16 lg:py-24 scroll-mt-28">
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-10">
          <h2 className="title text-[2rem] sm:text-[2.4rem] text-ink">Open a wholesale account</h2>
          {!isAuthenticated ? (
            <div className="mt-6">
              <p className="text-gray-600 font-light">Create an Azeeora account for your business first (or sign in), then send this form.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register?redirect=/business%23apply" className="btn-ink">Create account</Link>
                <Link href="/login?redirect=/business%23apply" className="btn-line">Sign in</Link>
              </div>
            </div>
          ) : member?.accountType === 'partner' ? (
            <div className="mt-6"><Notice>Your account is a Brand Partner account. Please use a separate account for your business.</Notice></div>
          ) : status ? (
            <div className="mt-6 space-y-4">
              <StatusBadge status={status} />
              {status === 'pending' && <p className="text-gray-600 font-light">Thank you. We are reviewing {member?.business?.companyName} and will be in touch shortly.</p>}
              {status === 'approved' && <Link href="/account/business" className="btn-ink">See your wholesale prices</Link>}
              {(status === 'rejected' || status === 'suspended') && <p className="text-gray-600 font-light">{member?.business?.note || 'Please contact us if you have any questions.'}</p>}
            </div>
          ) : (
            <form onSubmit={form.handleSubmit((d) => apply.mutate(d))} className="mt-6 grid sm:grid-cols-2 gap-4">
              <Field className="sm:col-span-2" label="Business name" {...form.register('companyName', { required: true })} />
              <SelectField label="Type of business" options={TYPES} {...form.register('businessType')} />
              <Field label="Contact number" placeholder="03XX XXXXXXX" {...form.register('contactPhone', { required: true })} />
              <Field label="City" {...form.register('city', { required: true })} />
              <Field label="NTN (optional)" {...form.register('ntn')} />
              <Field className="sm:col-span-2" label="Business address" {...form.register('address', { required: true })} />
              <Field className="sm:col-span-2" label="Expected monthly order (optional)" placeholder="e.g. PKR 50,000" {...form.register('monthlyVolume')} />
              <label className="sm:col-span-2 block">
                <span className="block text-[0.85rem] text-ink mb-1.5">Anything else (optional)</span>
                <textarea {...form.register('notes')} rows={3} className="w-full px-4 py-3 border border-line focus:outline-none focus:border-ink" />
              </label>
              {apply.isError && <div className="sm:col-span-2"><Notice tone="error">{apiError(apply.error)}</Notice></div>}
              <div className="sm:col-span-2">
                <button type="submit" disabled={apply.isPending} className="btn-ink w-full sm:w-auto">{apply.isPending ? 'Sending…' : 'Send application'}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

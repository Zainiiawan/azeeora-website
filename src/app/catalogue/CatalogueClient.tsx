'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { extrasApi } from '@/lib/api/extrasApi';
import { productApi } from '@/lib/api/productApi';
import ProductCard from '@/components/products/ProductCard';
import { useMember } from '@/lib/member/useMember';
import { CopyField } from '@/components/member/ui';
import { formatDate } from '@/lib/utils';

export default function CatalogueClient() {
  const { member } = useMember();
  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['campaigns-active'], queryFn: extrasApi.activeCampaigns });
  const { data: all } = useQuery({ queryKey: ['catalogue-all'], queryFn: () => productApi.getAll({ limit: 48, sortBy: 'name_asc' }) });
  const products = all?.products ?? [];
  const inCampaign = new Set(campaigns.flatMap((c) => c.productIds));
  const rest = products.filter((p) => !inCampaign.has(p._id));

  return (
    <div className="bg-white">
      <section className="bg-blush px-5 sm:px-8 lg:px-11 py-12 lg:py-16">
        <p className="text-[0.8rem] uppercase tracking-[0.1em] text-ink/70">Catalogue</p>
        <h1 className="mt-3 font-light text-[2.4rem] sm:text-[3.4rem] leading-tight text-ink">
          {campaigns[0]?.name ?? 'The Azeeora catalogue'}
        </h1>
        <p className="mt-3 text-ink/80 font-light max-w-2xl">
          {campaigns[0]
            ? `${campaigns[0].description ?? 'Offers for a limited time.'} Until ${formatDate(campaigns[0].endDate)}.`
            : 'Every product and price in one place.'}
        </p>
        {member?.accountType === 'partner' && member.links && (
          <div className="mt-6 max-w-xl">
            <CopyField label="Share this catalogue (your link)" value={member.links.store.replace('/?ref=', '/catalogue?ref=')} />
          </div>
        )}
      </section>

      {isLoading && <p className="p-10 text-muted">Loading…</p>}

      {campaigns.map((c) => (
        <section key={c._id} className="px-4 sm:px-6 lg:px-11 pt-12">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="title text-[1.8rem] sm:text-[2.4rem] text-ink">{c.name}</h2>
              <p className="text-muted font-light">
                {c.discountPct}% off · {formatDate(c.startDate)} to {formatDate(c.endDate)}
              </p>
            </div>
          </div>
          {c.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image} alt={c.name} className="w-full max-h-[420px] object-cover mb-8" />
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-4">
            {(c.products ?? []).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      ))}

      <section className="px-4 sm:px-6 lg:px-11 py-12">
        <h2 className="title text-[1.8rem] sm:text-[2.4rem] text-ink mb-6">{campaigns.length ? 'Also in the catalogue' : 'All products'}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-4">
          {rest.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
        {rest.length === 0 && !campaigns.length && <p className="text-muted">No products yet.</p>}
        <div className="mt-6">
          <Link href="/shop" className="btn-line">Shop all</Link>
        </div>
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { addItem as addToCart } from '@/store/slices/cartSlice';
import { cartApi } from '@/lib/api/cartApi';
import { memberApi } from '@/lib/api/memberApi';
import { useMember } from '@/lib/member/useMember';
import { Notice, Stat, StatusBadge, money } from '@/components/member/ui';

export default function BusinessAccountPage() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const { member, isLoading } = useMember();
  const dispatch = useDispatch();
  const [added, setAdded] = useState<string | null>(null);
  const approved = member?.accountType === 'business';
  const { data: prices = [] } = useQuery({ queryKey: ['wholesale-prices'], queryFn: memberApi.wholesalePrices, enabled: approved });

  const add = async (p: (typeof prices)[number]) => {
    dispatch(
      addToCart({
        product: { _id: p.productId, name: p.name, slug: p.slug, images: p.image ? [{ url: p.image, alt: p.name }] : [], basePrice: p.retailPrice },
        quantity: p.minQty,
        price: p.price,
        total: p.price * p.minQty,
      })
    );
    try {
      await cartApi.addItem({ productId: p.productId, quantity: p.minQty });
    } catch {
      // the local bag still has it
    }
    setAdded(p.productId);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-11 py-8 lg:py-12 max-w-6xl mx-auto">
      <nav className="text-[0.8rem] text-muted mb-4">
        <Link href="/account" className="hover:text-ink">My account</Link> / <span className="text-ink">Wholesale</span>
      </nav>
      <h1 className="title text-[2.2rem] sm:text-[2.8rem] text-ink mb-8">Wholesale account</h1>

      {!isAuthenticated ? (
        <Link href="/login?redirect=/account/business" className="btn-ink">Sign in</Link>
      ) : isLoading || !member ? (
        <p className="text-muted">Loading…</p>
      ) : !approved ? (
        member.business ? (
          <div className="space-y-4">
            <StatusBadge status={member.business.status} />
            <p className="text-gray-600 font-light">
              {member.business.status === 'pending'
                ? `We are reviewing ${member.business.companyName}. You will see your trade prices here once approved.`
                : member.business.note || 'Your wholesale account is not active. Please contact us.'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 font-light">You do not have a wholesale account yet.</p>
            <Link href="/business" className="btn-ink mt-6">Apply for wholesale</Link>
          </div>
        )
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat accent label="Business" value={<span className="text-[1.3rem]">{member.business?.companyName}</span>} sub={member.memberCode ?? undefined} />
            <Stat label="Wallet" value={money(member.wallet.available)} sub="Usable at checkout" />
            <Stat label="Products" value={prices.length} sub="At trade prices" />
          </div>
          <Notice>Trade prices apply automatically at checkout when a line meets its minimum quantity. Smaller quantities are charged at retail.</Notice>
          <div className="overflow-x-auto border border-line">
            <table className="w-full text-[0.9rem]">
              <thead className="bg-tile text-left text-[0.75rem] uppercase tracking-[0.06em] text-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Product</th>
                  <th className="px-4 py-3 font-normal text-right">Retail</th>
                  <th className="px-4 py-3 font-normal text-right">Your price</th>
                  <th className="px-4 py-3 font-normal text-right">Minimum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.productId} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.slug}`} className="flex items-center gap-3 hover:underline">
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="w-12 h-12 object-cover bg-tile" />
                        )}
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-muted line-through font-light">{money(p.retailPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium">{money(p.price)}</td>
                    <td className="px-4 py-3 text-right">{p.minQty}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => void add(p)} disabled={p.stock < p.minQty} className="h-9 px-4 rounded-full bg-ink text-white text-[0.75rem] uppercase tracking-[0.05em] disabled:opacity-40">
                        {added === p.productId ? 'Added' : p.stock < p.minQty ? 'Low stock' : `Add ${p.minQty}`}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/cart" className="btn-line">Go to bag</Link>
        </div>
      )}
    </div>
  );
}

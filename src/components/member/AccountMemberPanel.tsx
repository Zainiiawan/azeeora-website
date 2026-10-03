'use client';

import Link from 'next/link';
import { useMember } from '@/lib/member/useMember';
import { StatusBadge, money } from './ui';

/** Member summary on My Account: partner/wholesale status, wallet and loyalty points. */
export default function AccountMemberPanel() {
  const { member } = useMember();
  if (!member) return null;
  const partner = member.partner;
  const business = member.business;
  return (
    <div className="grid sm:grid-cols-3 gap-3 mb-8">
      <div className="bg-blush p-5">
        <p className="text-[0.75rem] uppercase tracking-[0.08em] text-ink/70">Loyalty points</p>
        <p className="mt-2 text-[1.6rem] font-light">{member.loyaltyPoints}</p>
        <p className="mt-1 text-[0.8rem] text-ink/70">
          Worth {money(member.loyaltyPoints * member.settings.pointValueRs)}. Use from {member.settings.minRedeemPoints} points at checkout.
        </p>
      </div>
      <div className="bg-tile p-5">
        <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Wallet</p>
        <p className="mt-2 text-[1.6rem] font-light">{money(member.wallet.available)}</p>
        <p className="mt-1 text-[0.8rem] text-muted">Usable at checkout{member.wallet.pending > 0 ? `, ${money(member.wallet.pending)} on its way` : ''}</p>
      </div>
      <div className="bg-tile p-5 flex flex-col">
        {member.accountType === 'partner' ? (
          <>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Brand Partner · {member.memberCode}</p>
            <p className="mt-2 text-[1.1rem] font-light">{member.discountPct}% off your orders</p>
            <Link href="/account/partner" className="mt-auto pt-3 text-[0.85rem] underline underline-offset-4">Partner dashboard</Link>
          </>
        ) : member.accountType === 'business' ? (
          <>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Wholesale · {member.memberCode}</p>
            <p className="mt-2 text-[1.1rem] font-light">{business?.companyName}</p>
            <Link href="/account/business" className="mt-auto pt-3 text-[0.85rem] underline underline-offset-4">Your price list</Link>
          </>
        ) : partner || business ? (
          <>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">{partner ? 'Brand Partner' : 'Wholesale'} application</p>
            <div className="mt-2"><StatusBadge status={(partner ?? business)!.status} /></div>
            <Link href={partner ? '/account/partner' : '/account/business'} className="mt-auto pt-3 text-[0.85rem] underline underline-offset-4">Details</Link>
          </>
        ) : (
          <>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Earn with Azeeora</p>
            <p className="mt-2 text-[0.95rem] font-light">Become a Brand Partner, or open a wholesale account for your business.</p>
            <div className="mt-auto pt-3 flex gap-4 text-[0.85rem]">
              <Link href="/join" className="underline underline-offset-4">Join us</Link>
              <Link href="/business" className="underline underline-offset-4">Wholesale</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

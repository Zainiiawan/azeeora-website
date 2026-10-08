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
    <div className={`grid gap-3 mb-8 ${member.accountType === 'partner' ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
      <div className="bg-blush p-5 rounded-sm">
        <p className="text-[0.75rem] uppercase tracking-[0.08em] text-ink/70">Loyalty points</p>
        <p className="mt-2 text-[1.6rem] font-light">{member.loyaltyPoints}</p>
        <p className="mt-1 text-[0.8rem] text-ink/70">
          Worth {money(member.loyaltyPoints * member.settings.pointValueRs)}. Use from {member.settings.minRedeemPoints} pts.
        </p>
      </div>
      <div className="bg-tile p-5 rounded-sm">
        <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Wallet</p>
        <p className="mt-2 text-[1.6rem] font-light">{money(member.wallet.available)}</p>
        <p className="mt-1 text-[0.8rem] text-muted">Usable at checkout{member.wallet.pending > 0 ? `, ${money(member.wallet.pending)} pending` : ''}</p>
      </div>

      {member.accountType === 'partner' && (
        <div className="bg-tile p-5 rounded-sm flex flex-col justify-between">
          <div>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Volume (BV / BP)</p>
            <p className="mt-2 text-[1.6rem] font-light">{member.monthlyBV} <span className="text-xs text-muted">personal</span></p>
            <p className="mt-1 text-[0.8rem] text-muted">Group: {member.groupBV.toLocaleString()} BV</p>
          </div>
          <Link href="/account/partner?tab=referrals" className="pt-2 text-[0.82rem] text-rose underline underline-offset-4">Genealogy tree</Link>
        </div>
      )}

      <div className="bg-tile p-5 rounded-sm flex flex-col justify-between">
        {member.accountType === 'partner' ? (
          <>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Rank: {member.rank}</p>
                <span className="text-[0.75rem] font-mono text-muted">{member.memberCode}</span>
              </div>
              <p className="mt-2 text-[1.2rem] font-light">{member.discountPct}% partner discount</p>
            </div>
            <Link href="/account/partner" className="pt-2 text-[0.85rem] underline underline-offset-4">Partner dashboard</Link>
          </>
        ) : member.accountType === 'business' ? (
          <>
            <div>
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Wholesale · {member.memberCode}</p>
              <p className="mt-2 text-[1.1rem] font-light">{business?.companyName}</p>
            </div>
            <Link href="/account/business" className="mt-auto pt-3 text-[0.85rem] underline underline-offset-4">Your price list</Link>
          </>
        ) : partner || business ? (
          <>
            <div>
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">{partner ? 'Brand Partner' : 'Wholesale'} application</p>
              <div className="mt-2"><StatusBadge status={(partner ?? business)!.status} /></div>
            </div>
            <Link href={partner ? '/account/partner' : '/account/business'} className="mt-auto pt-3 text-[0.85rem] underline underline-offset-4">Details</Link>
          </>
        ) : (
          <>
            <div>
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">Earn with Azeeora</p>
              <p className="mt-2 text-[0.95rem] font-light">Become a Brand Partner, or open a wholesale account.</p>
            </div>
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

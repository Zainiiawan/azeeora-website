'use client';

import { useQuery } from '@tanstack/react-query';
import { memberApi } from '@/lib/api/memberApi';
import { useMember } from './useMember';

/** The signed-in partner's or wholesale buyer's price for a product, or null for regular shoppers. */
export function useMemberPrice(productId: string, retailPrice: number): { label: string; price: number; minQty?: number } | null {
  const { member } = useMember();
  const isBusiness = member?.accountType === 'business';
  const { data: wholesale } = useQuery({
    queryKey: ['wholesale-prices'],
    queryFn: memberApi.wholesalePrices,
    enabled: isBusiness,
    staleTime: 5 * 60_000,
  });
  if (!member) return null;
  if (member.accountType === 'partner' && member.discountPct) {
    return { label: `Your partner price (${member.discountPct}% off)`, price: Math.round(retailPrice * (1 - member.discountPct / 100)) };
  }
  if (isBusiness) {
    const w = wholesale?.find((x) => x.productId === productId);
    if (w && w.price < retailPrice) return { label: `Trade price from ${w.minQty} units`, price: w.price, minQty: w.minQty };
  }
  return null;
}

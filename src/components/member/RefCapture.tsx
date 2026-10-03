'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { rememberRef } from '@/lib/member/referral';

/** Remembers ?ref=CODE from a partner's link on any page. */
export default function RefCapture() {
  const params = useSearchParams();
  const ref = params?.get('ref');
  useEffect(() => {
    rememberRef(ref);
  }, [ref]);
  return null;
}

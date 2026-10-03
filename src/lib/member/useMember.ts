'use client';

import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { memberApi } from '@/lib/api/memberApi';

/** The signed-in shopper's member profile (partner / wholesale / customer), or null. */
export function useMember() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const q = useQuery({
    queryKey: ['member-me'],
    queryFn: memberApi.me,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  return { member: isAuthenticated ? q.data ?? null : null, ...q };
}

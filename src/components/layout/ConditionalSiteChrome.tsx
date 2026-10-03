'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export function ConditionalSiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    // Remove any leftover snap classes if they existed previously to ensure clean state
    document.documentElement.classList.remove('md:snap-y', 'md:snap-mandatory');
  }, [pathname]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="maison bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col w-full">
      <Header />
      <main className={pathname === '/' ? 'flex-1' : 'flex-1 pt-[104px]'}>{children}</main>
      <Footer />
    </div>
  );
}

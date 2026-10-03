'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Menu } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import NotificationBell from '@/components/notifications/NotificationBell';
import Wordmark from '@/components/brand/Wordmark';
import { RootState, AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { categoryApi } from '@/lib/api/categoryApi';
import { cn, displayName } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

const secondary = [
  { name: 'Our story', href: '/about' },
  { name: 'Journal', href: '/blog' },
  { name: 'Track an order', href: '/track-order' },
  { name: 'Client care', href: '/contact' },
  { name: 'Help', href: '/help' },
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);
  const bagCount = useSelector((s: RootState) => s.cart.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useSelector((s: RootState) => s.wishlist.items.length);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.getAll, staleTime: 5 * 60 * 1000 });

  const isHome = pathname === '/';
  // Over the homepage campaign image the bar is transparent with white type
  const overImage = false;

  useEffect(() => {
    // on the homepage the giant wordmark opens the page; the header logo appears once it scrolls away
    const onScroll = () => setScrolled(window.scrollY > (window.innerWidth >= 1024 ? 260 : 120));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Close overlays after navigating (state adjusted during render, as React recommends)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  const signOut = async () => {
    try {
      await dispatch(logout()).unwrap();
    } finally {
      setMenuOpen(false);
      router.push('/');
    }
  };

  const nav = [
    { name: 'Shop all', href: '/shop' },
    ...categories.slice(0, 5).map((c) => ({ name: displayName(c.name), href: `/categories/${c.slug}` })),
    { name: 'Offers', href: '/offers' },
    { name: 'Journal', href: '/blog' },
  ];

  const ink = overImage ? 'text-white' : 'text-ink';

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Service line */}
      <div className="h-8 bg-tile text-ink flex items-center justify-center px-4">
        <p className="caps-sm text-center truncate">Complimentary delivery across Pakistan on orders over PKR 5,000</p>
      </div>

      <div
        className={cn(
          'transition-colors duration-500',
          overImage ? 'bg-transparent' : 'bg-white border-b border-line'
        )}
      >
        {/* Main bar */}
        <div className="h-[60px] lg:h-[72px] px-4 sm:px-6 lg:px-10 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className={cn('flex items-center gap-5 lg:gap-7', ink)}>
            <button onClick={() => setMenuOpen(true)} className="flex items-center gap-2.5 caps" aria-label="Open menu">
              <Menu className="w-[18px] h-[18px]" strokeWidth={1.2} />
              <span className="hidden lg:inline">Menu</span>
            </button>
            <button onClick={() => setSearchOpen((v) => !v)} className="flex items-center gap-2.5 caps" aria-label="Search">
              <Search className="w-[17px] h-[17px]" strokeWidth={1.2} />
              <span className="hidden lg:inline">Search</span>
            </button>
          </div>

          <Link
            href="/"
            aria-label="Azeeora home"
            className={cn(
              'transition-all duration-500',
              ink,
              // on the homepage the giant hero logo takes this role until you scroll
              isHome && !scrolled && !menuOpen && !searchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <Wordmark className="text-[19px] lg:text-[25px]" showSubline={false} priority />
          </Link>

          <div className={cn('flex items-center justify-end gap-5 lg:gap-7', ink)}>
            <Link href={isAuthenticated ? '/account' : '/login'} className="hidden lg:inline caps u-hover">
              {isAuthenticated && user ? user.firstName : 'Sign in'}
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Link href="/admin" className="hidden lg:inline caps u-hover">
                Admin
              </Link>
            )}
            <Link href="/wishlist" className="hidden lg:inline caps u-hover">
              Wishlist{wishCount > 0 ? ` (${wishCount})` : ''}
            </Link>
            {isAuthenticated && (
              <span className="hidden lg:inline-flex">
                <NotificationBell />
              </span>
            )}
            <Link href="/cart" className="caps u-hover" aria-label={`Bag, ${bagCount} items`}>
              Bag ({bagCount})
            </Link>
          </div>
        </div>

        {/* Category row (desktop) */}
        <nav
          className={cn(
            'hidden lg:flex h-11 items-center justify-center gap-10 transition-colors duration-500',
            overImage ? 'text-white' : 'text-ink'
          )}
          aria-label="Collections"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn('caps u-hover', pathname === item.href && 'u-link')}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Search panel */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="bg-white border-b border-line"
          >
            <form action="/shop" method="get" className="max-w-3xl mx-auto px-6 py-10 flex items-center gap-4">
              <Search className="w-5 h-5 text-ink shrink-0" strokeWidth={1.2} />
              <input
                name="search"
                autoFocus
                placeholder="Search Azeeora"
                className="flex-1 border-0 border-b border-ink py-3 text-2xl font-light tracking-wide focus:outline-none focus:ring-0"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X className="w-5 h-5" strokeWidth={1.2} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/25 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.55, ease }}
              className="fixed inset-y-0 left-0 z-50 w-full sm:w-[440px] bg-white flex flex-col"
              aria-label="Menu"
            >
              <div className="h-[92px] lg:h-[104px] px-6 sm:px-10 flex items-end pb-5 justify-between border-b border-line">
                <Wordmark className="text-[20px]" showSubline={false} />
                <button onClick={() => setMenuOpen(false)} className="caps flex items-center gap-2" aria-label="Close menu">
                  Close <X className="w-4 h-4" strokeWidth={1.2} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-6 sm:px-10 py-8">
                <ul className="space-y-1">
                  {nav.map((item, i) => (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04, duration: 0.45, ease }}
                    >
                      <Link href={item.href} className="block py-2.5 title text-[1.65rem] text-ink hover:text-muted transition-colors">
                        {item.name}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
                <ul className="mt-10 pt-8 border-t border-line space-y-3">
                  {secondary.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="caps text-muted hover:text-ink transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="px-6 sm:px-10 py-6 border-t border-line flex items-center justify-between">
                {isAuthenticated && user ? (
                  <>
                    <Link href="/account" className="caps u-hover">My account</Link>
                    <button onClick={() => void signOut()} className="caps text-muted hover:text-ink">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="caps u-hover">Sign in</Link>
                    <Link href="/register" className="caps text-muted hover:text-ink">Create account</Link>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;

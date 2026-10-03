'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Menu, User, Heart, ShoppingBag } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import NotificationBell from '@/components/notifications/NotificationBell';
import Wordmark from '@/components/brand/Wordmark';
import { RootState, AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { categoryApi } from '@/lib/api/categoryApi';
import { cn, displayName } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

const STRIP = [
  'Free delivery across Pakistan on orders over Rs 5,000',
  'Cash on delivery · JazzCash · Easypaisa',
  'Become a Brand Partner and earn on every order',
];

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
  const [shopOpen, setShopOpen] = useState(false);
  const [strip, setStrip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStrip((n) => (n + 1) % STRIP.length), 5000);
    return () => clearInterval(t);
  }, []);

  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);
  const bagCount = useSelector((s: RootState) => s.cart.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useSelector((s: RootState) => s.wishlist.items.length);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.getAll, staleTime: 5 * 60 * 1000 });

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
    setShopOpen(false);
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
    { name: 'Catalogue', href: '/catalogue' },
    { name: 'Offers', href: '/offers' },
    { name: 'Join us', href: '/join' },
    { name: 'Wholesale', href: '/business' },
    { name: 'Journal', href: '/blog' },
  ];

  const topLinks = [
    { name: 'Catalogue', href: '/catalogue' },
    { name: 'Join us', href: '/join' },
    { name: 'Journal', href: '/blog' },
  ];

  const iconCls = 'w-[21px] h-[21px]';

  return (
    <header className="fixed inset-x-0 top-0 z-50" onMouseLeave={() => setShopOpen(false)}>
      {/* Brand strip: a few messages that fade in turn */}
      <div className="h-8 bg-ink text-white flex items-center justify-center px-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={strip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5 }}
            className="text-[0.7rem] tracking-[0.16em] uppercase text-center truncate"
          >
            {STRIP[strip]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="bg-white border-b border-line">
        <div className="h-[60px] lg:h-[80px] px-4 sm:px-6 lg:px-11 grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Left: menu + logo on phones, text navigation on desktop */}
          <div className="flex items-center gap-4">
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-ink -ml-1 p-1" aria-label="Open menu">
              <Menu className="w-6 h-6" strokeWidth={1.3} />
            </button>
            <nav className="hidden lg:flex items-center gap-10 text-ink" aria-label="Main">
              <button
                type="button"
                onMouseEnter={() => setShopOpen(true)}
                onClick={() => setShopOpen((v) => !v)}
                className={cn('nav-link', shopOpen && 'nav-link-active')}
                aria-expanded={shopOpen}
              >
                Shop
              </button>
              {topLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onMouseEnter={() => setShopOpen(false)}
                  className={cn('nav-link', pathname.startsWith(l.href) && 'nav-link-active')}
                >
                  {l.name}
                </Link>
              ))}
            </nav>
          </div>

          <Link href="/" aria-label="Azeeora home" className="justify-self-start lg:justify-self-center">
            <Wordmark className="text-[21px] lg:text-[27px]" showSubline={false} priority />
          </Link>

          {/* Right: icons */}
          <div className="flex items-center justify-end gap-3.5 sm:gap-5 lg:gap-7 text-ink">
            {isAuthenticated && user?.role === 'admin' && (
              <Link href="/admin" className="hidden lg:inline nav-link">
                Admin
              </Link>
            )}
            <button onClick={() => setSearchOpen((v) => !v)} aria-label="Search" className="p-1">
              <Search className={iconCls} strokeWidth={1.3} />
            </button>
            {isAuthenticated && (
              <span className="hidden lg:inline-flex">
                <NotificationBell />
              </span>
            )}
            <Link href={isAuthenticated ? '/account' : '/login'} aria-label={isAuthenticated ? 'My account' : 'Sign in'} className="p-1">
              <User className={iconCls} strokeWidth={1.3} />
            </Link>
            <Link href="/wishlist" aria-label={`Wishlist, ${wishCount} items`} className="relative p-1 hidden sm:inline-flex">
              <Heart className={iconCls} strokeWidth={1.3} />
              {wishCount > 0 && <span className="count-dot">{wishCount}</span>}
            </Link>
            <Link href="/cart" aria-label={`Bag, ${bagCount} items`} className="relative p-1">
              <ShoppingBag className={iconCls} strokeWidth={1.3} />
              {bagCount > 0 && <span className="count-dot">{bagCount}</span>}
            </Link>
          </div>
        </div>
      </div>

      {/* Shop panel (desktop) */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease }}
            className="hidden lg:block bg-white border-b border-line shadow-[0_12px_24px_-16px_rgba(0,0,0,0.18)]"
          >
            <div className="px-11 py-10 grid grid-cols-[220px_1fr] gap-12">
              <ul className="space-y-3.5">
                <li>
                  <Link href="/shop" className="text-[0.95rem] text-ink hover:underline underline-offset-4">Shop all</Link>
                </li>
                <li>
                  <Link href="/shop?sort=new" className="text-[0.95rem] text-ink hover:underline underline-offset-4">New arrivals</Link>
                </li>
                <li>
                  <Link href="/offers" className="text-[0.95rem] text-sale hover:underline underline-offset-4">Offers</Link>
                </li>
                <li>
                  <Link href="/categories" className="text-[0.95rem] text-ink hover:underline underline-offset-4">All categories</Link>
                </li>
                <li className="pt-3 border-t border-line">
                  <Link href="/join" className="text-[0.95rem] text-ink hover:underline underline-offset-4">Become a Brand Partner</Link>
                </li>
                <li>
                  <Link href="/business" className="text-[0.95rem] text-ink hover:underline underline-offset-4">Wholesale for business</Link>
                </li>
              </ul>
              <div className="flex gap-10">
                {categories.slice(0, 6).map((c) => (
                  <Link key={c._id} href={`/categories/${c.slug}`} className="group flex flex-col items-center gap-3 w-[132px]">
                    <span className="w-[120px] h-[120px] rounded-full bg-tile overflow-hidden">
                      {c.image?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image.url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </span>
                    <span className="caps-sm text-ink text-center">{displayName(c.name)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <ul>
                  {nav.map((item, i) => (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04, duration: 0.45, ease }}
                    >
                      <Link href={item.href} className="block py-3 text-[1.35rem] font-light text-ink border-b border-line hover:text-rose transition-colors">
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

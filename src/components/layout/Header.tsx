'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, Heart, User, Menu, X, LogOut, Shield } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { cn } from '@/lib/utils';

const primaryNav = [
  { name: 'Shop', href: '/shop' },
  { name: 'Collections', href: '/categories' },
  { name: 'Offers', href: '/offers' },
  { name: 'Journal', href: '/blog' },
];

const secondaryNav = [
  { name: 'Maison', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Track Order', href: '/track-order' },
  { name: 'Help', href: '/help' },
];

const announcements = [
  'Complimentary delivery on orders over PKR 5,000',
  'Cash on delivery across Pakistan',
  'Each order hand-finished with signature gift wrapping',
  'Authentic formulas, crafted in Pakistan',
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cartItemCount = useSelector((state: RootState) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const wishlistItemCount = useSelector((state: RootState) => state.wishlist.items.length);

  // On the homepage the header floats over the campaign image until you scroll
  const overHero = pathname === '/' && !scrolled && !isMobileMenuOpen && !isSearchOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Close menus after navigating (adjusting state during render, as React recommends)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await dispatch(logout()).unwrap();
    } catch {
      // still leave the account area
    } finally {
      router.push('/');
      setIsLoggingOut(false);
      setIsMobileMenuOpen(false);
    }
  };

  const tone = overHero ? 'text-white' : 'text-[#1c1714]';
  const iconBtn = cn(
    'relative w-10 h-10 flex items-center justify-center transition-colors duration-500 hover:text-rose-gold shrink-0',
    tone
  );
  const badge =
    'absolute top-0.5 right-0 min-w-[16px] h-4 px-1 rounded-full bg-rose-gold text-[10px] leading-4 text-white text-center font-medium';

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50">
      {/* Announcement ribbon */}
      <div className="h-8 bg-[#1c1714] text-[#e9dccb] overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...announcements, ...announcements].map((text, i) => (
            <span key={i} className="eyebrow !text-[0.6rem] !tracking-[0.3em] px-10 flex items-center gap-10">
              {text}
              <span aria-hidden className="text-rose-gold">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* Frosted bar */}
      <div
        className={cn(
          'transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
          overHero ? 'bg-transparent border-b border-white/15' : 'glass-strong !border-x-0 !border-t-0 !border-b-black/5'
        )}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 h-[72px] grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left: nav (desktop) / menu (mobile) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className={cn(iconBtn, 'lg:hidden -ml-2')}
              aria-label="Menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.25} /> : <Menu className="w-5 h-5" strokeWidth={1.25} />}
            </button>
            <nav className="hidden lg:flex items-center gap-9">
              {primaryNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn('eyebrow link-underline pb-1 transition-colors duration-500 hover:text-rose-gold', tone)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: wordmark */}
          <Link href="/" className={cn('flex flex-col items-center leading-none transition-colors duration-500', tone)}>
            <span className="font-serif text-[1.65rem] sm:text-[2rem] tracking-[0.42em] pl-[0.42em]">AYEZA</span>
            <span className="eyebrow !text-[0.5rem] !tracking-[0.55em] pl-[0.55em] mt-1 opacity-80">Cosmetics</span>
          </Link>

          {/* Right: actions */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <nav className="hidden xl:flex items-center gap-8 mr-6">
              {secondaryNav.slice(0, 2).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn('eyebrow link-underline pb-1 transition-colors duration-500 hover:text-rose-gold', tone)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <button onClick={() => setIsSearchOpen((v) => !v)} className={iconBtn} aria-label="Search">
              <Search className="w-[18px] h-[18px]" strokeWidth={1.25} />
            </button>
            <Link href="/wishlist" className={cn(iconBtn, 'hidden sm:flex')} aria-label="Wishlist">
              <Heart className="w-[18px] h-[18px]" strokeWidth={1.25} />
              {wishlistItemCount > 0 && <span className={badge}>{wishlistItemCount > 99 ? '99+' : wishlistItemCount}</span>}
            </Link>
            <div className={cn('hidden lg:flex shrink-0 items-center', tone)}>
              <NotificationBell />
            </div>
            {isAuthenticated && user ? (
              <>
                {user.role === 'admin' && (
                  <Link href="/admin" className={cn(iconBtn, 'hidden lg:flex')} aria-label="Admin Panel" title="Admin Panel">
                    <Shield className="w-[18px] h-[18px]" strokeWidth={1.25} />
                  </Link>
                )}
                <Link href="/account" className={cn(iconBtn, 'hidden lg:flex')} aria-label="My account" title={user.firstName}>
                  <User className="w-[18px] h-[18px]" strokeWidth={1.25} />
                </Link>
              </>
            ) : (
              <Link href="/login" className={cn(iconBtn, 'hidden lg:flex')} aria-label="Sign in">
                <User className="w-[18px] h-[18px]" strokeWidth={1.25} />
              </Link>
            )}
            <Link href="/cart" className={iconBtn} aria-label="Shopping bag">
              <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.25} />
              {cartItemCount > 0 && <span className={badge}>{cartItemCount > 99 ? '99+' : cartItemCount}</span>}
            </Link>
          </div>
        </div>

        {/* Search drawer */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-black/5"
            >
              <div className="mx-auto max-w-3xl px-4 sm:px-8 py-8">
                <form action="/shop" method="get" className="relative">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" strokeWidth={1.25} />
                  <input
                    type="text"
                    name="search"
                    placeholder="Search the Maison: serums, fragrances, rituals"
                    className="w-full pl-9 pr-4 py-3 !bg-transparent border-0 border-b border-black/20 font-serif text-2xl text-[#1c1714] placeholder:text-gray-400 focus:border-rose-gold focus:outline-none focus:ring-0"
                    autoFocus
                  />
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-[104px] bg-[#1c1714]/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              id="mobile-menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-[104px] bottom-0 w-[86%] max-w-sm glass-strong z-50 overflow-y-auto overscroll-contain lg:hidden"
            >
              <nav className="px-8 py-10 flex flex-col">
                {[...primaryNav, ...secondaryNav].map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.04, duration: 0.5 }}
                  >
                    <Link
                      href={item.href}
                      className="block py-3 font-serif text-3xl text-[#1c1714] hover:text-rose-gold transition-colors"
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
                <div className="hairline my-8" />
                <Link href="/wishlist" className="eyebrow py-2 text-[#1c1714]">
                  Wishlist {wishlistItemCount > 0 && `(${wishlistItemCount})`}
                </Link>
                {isAuthenticated && user ? (
                  <>
                    <Link href="/account" className="eyebrow py-2 text-[#1c1714]">
                      My Account · {user.firstName}
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin" className="eyebrow py-2 text-[#1c1714]">
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => void handleLogout()}
                      disabled={isLoggingOut}
                      className="eyebrow py-2 text-left text-gray-500 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" /> {isLoggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="btn-lux bg-[#1c1714] text-[#f7f3ee] mt-6">
                    Sign in
                  </Link>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;

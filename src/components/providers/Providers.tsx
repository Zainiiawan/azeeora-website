'use client';

import { Provider, useDispatch } from 'react-redux';
import { store, AppDispatch } from '@/store';
import { QueryProvider } from '@/lib/api/queryClient';
import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { fetchCurrentUser, setHydrated } from '@/store/slices/authSlice';
import { cartApi } from '@/lib/api/cartApi';
import { wishlistApi } from '@/lib/api/wishlistApi';
import { setCartItems, setCouponCode, setDiscount } from '@/store/slices/cartSlice';
import { setWishlistItems } from '@/store/slices/wishlistSlice';
import { mapApiCartToReduxItems } from '@/lib/cartUtils';
import { Product } from '@/lib/api/productApi';
import { LazyMotion, domAnimation } from 'framer-motion';

const GUEST_KEY = 'azr_guest_bag';

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  // Save the bag and wishlist whenever they change (after the first load)
  useEffect(() => {
    let last = '';
    return store.subscribe(() => {
      const st = store.getState();
      if (!st.auth.isHydrated) return;
      const next = JSON.stringify({ items: st.cart.items, couponCode: st.cart.couponCode, wishlist: st.wishlist.items });
      if (next === last) return;
      last = next;
      try {
        localStorage.setItem(GUEST_KEY, next);
      } catch {
        // storage full or blocked
      }
    });
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      // Guests keep their bag and wishlist on this device between visits
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
        if (saved?.items?.length) dispatch(setCartItems(saved.items));
        if (saved?.couponCode) dispatch(setCouponCode(saved.couponCode));
        if (saved?.wishlist?.length) dispatch(setWishlistItems(saved.wishlist));
      } catch {
        // storage unavailable
      }
      dispatch(setHydrated());
      return;
    }

    dispatch(fetchCurrentUser())
      .unwrap()
      .then(async () => {
        try {
          const [cart, wishlist] = await Promise.all([
            cartApi.get(),
            wishlistApi.getAll(),
          ]);
          dispatch(setCartItems(mapApiCartToReduxItems(cart)));
          dispatch(setDiscount(cart.couponDiscount ?? 0));
          dispatch(setCouponCode(cart.couponCode ?? null));
          dispatch(
            setWishlistItems(
              wishlist.map((p: Product) => ({
                _id: p._id,
                name: p.name,
                slug: p.slug,
                images: p.images ?? [],
                basePrice: p.basePrice,
                compareAtPrice: p.compareAtPrice,
                rating: p.rating ?? 0,
                reviewCount: p.reviewCount ?? 0,
              }))
            )
          );
        } catch {
          // Cart/wishlist sync is best-effort on hydrate
        }
      })
      .catch(() => {
        // fetchCurrentUser rejection handled in authSlice
      })
      .finally(() => {
        dispatch(setHydrated());
      });
  }, [dispatch]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
        <QueryProvider>
          <AuthHydrator>
            <LazyMotion features={domAnimation}>
              {children}
            </LazyMotion>
          </AuthHydrator>
        </QueryProvider>
      </ThemeProvider>
    </Provider>
  );
}

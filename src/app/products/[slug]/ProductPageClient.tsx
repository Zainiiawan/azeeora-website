'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { m as motion } from 'framer-motion';
import { Heart, Share2, Check, Star, Truck, Banknote, RotateCcw } from 'lucide-react';
import { cn, displayName, formatPrice, optimizeCloudinaryUrl } from '@/lib/utils';
import { getDiscountDisplay, getEffectivePrice } from '@/lib/productUtils';
import Button from '@/components/ui/Button';
import ProductReviews from '@/components/products/ProductReviews';
import { productApi } from '@/lib/api/productApi';
import { useDispatch, useSelector } from 'react-redux';
import { addItem as addToCart } from '@/store/slices/cartSlice';
import { addItem as addToWishlist, removeItem as removeFromWishlist } from '@/store/slices/wishlistSlice';
import { RootState } from '@/store';
import { cartApi } from '@/lib/api/cartApi';
import { wishlistApi } from '@/lib/api/wishlistApi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Minus, Plus } from 'lucide-react';
import ProductSeoContent from '@/components/products/ProductSeoContent';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f4f4f4'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%23111111'%3EAZEEORA%3C/text%3E%3C/svg%3E";

export default function ProductPageClient({ initialProductData }: { initialProductData?: any }) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.getBySlug(slug),
    initialData: initialProductData,
    enabled: !!slug,
  });

  const isWishlisted = useSelector((state: RootState) =>
    product ? state.wishlist.items.some((item) => item._id === product._id) : false
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading product...</div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Product not found</p>
        <Link href="/shop">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const effectivePrice = getEffectivePrice(product);
  const discountDisplay = getDiscountDisplay(product);
  const brandName = typeof product.brand === 'object' ? product.brand?.name : product.brand;
  const images = product.images?.length ? product.images : [{ url: PLACEHOLDER, alt: product.name, isMain: true }];

  const handleAddToCart = async () => {
    dispatch(
      addToCart({
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          images: product.images ?? [],
          basePrice: product.basePrice,
        },
        quantity,
        price: effectivePrice,
        total: effectivePrice * quantity,
      })
    );
    if (isAuthenticated) {
      try {
        await cartApi.addItem({ productId: product._id, quantity });
      } catch {
        // optimistic UI
      }
    }
    setIsAddedToCart(true);
    setTimeout(() => setIsAddedToCart(false), 2000);
  };

  const handleWishlist = async () => {
    if (isWishlisted) {
      dispatch(removeFromWishlist(product._id));
      if (isAuthenticated) {
        try {
          await wishlistApi.remove(product._id);
        } catch {
          // best-effort
        }
      }
    } else {
      dispatch(
        addToWishlist({
          _id: product._id,
          name: product.name,
          slug: product.slug,
          images: product.images ?? [],
          basePrice: product.basePrice,
          compareAtPrice: product.compareAtPrice,
          rating: product.rating,
          reviewCount: product.reviewCount,
        })
      );
      if (isAuthenticated) {
        try {
          await wishlistApi.add(product._id);
        } catch {
          // best-effort
        }
      }
    }
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const shareData = {
      title: `${product?.name} | AZEEORA COSMETICS`,
      text: product?.shortDescription || 'Check out this product from AZEEORA COSMETICS!',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const inStock = product.stock > 0;
  const categoryName = typeof product.category === 'object' ? displayName(product.category?.name) : undefined;
  const categorySlug = typeof product.category === 'object' ? product.category?.slug : undefined;
  const lowStock = inStock && product.stock <= (product.lowStockThreshold ?? 5);

  const onSale = product.basePrice > effectivePrice;
  const rating = Number(product.rating) || 0;
  const media: { type: 'video' | 'image'; url: string; alt?: string }[] = [
    ...images.map((img: { url?: string; alt?: string }) => ({ type: 'image' as const, url: img.url || PLACEHOLDER, alt: img.alt })),
    ...(product.video ? [{ type: 'video' as const, url: product.video.url }] : []),
  ];
  const current = media[Math.min(activeIndex, media.length - 1)];

  return (
    <div className="bg-white">
      <div className="px-4 sm:px-6 lg:px-11 pt-5 lg:pt-7 pb-14 lg:pb-20">
        <nav className="text-[0.8rem] text-muted flex flex-wrap gap-2 mb-5 lg:mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-ink">Shop</Link>
          {categoryName && categorySlug && (
            <>
              <span>/</span>
              <Link href={`/categories/${categorySlug}`} className="hover:text-ink">{categoryName}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 lg:gap-14 xl:gap-20">
          {/* Gallery: thumbnails + main tile */}
          <div className="flex flex-col-reverse lg:flex-row gap-3 lg:gap-4 lg:self-start lg:sticky lg:top-[136px]">
            {media.length > 1 && (
              <div className="flex lg:flex-col gap-2.5 overflow-x-auto no-scrollbar">
                {media.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Show ${m.type} ${i + 1}`}
                    className={cn('shrink-0 w-[68px] h-[68px] lg:w-[84px] lg:h-[84px] bg-tile overflow-hidden border-2 transition-colors', i === activeIndex ? 'border-ink' : 'border-transparent')}
                  >
                    {m.type === 'image' ? (
                      <img src={optimizeCloudinaryUrl(m.url, 200)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[0.7rem] uppercase">Video</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 bg-tile aspect-square overflow-hidden">
              {current?.type === 'video' ? (
                <video src={current.url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <motion.img
                  key={current?.url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  src={current?.url ? optimizeCloudinaryUrl(current.url, 1600) : PLACEHOLDER}
                  alt={current?.alt || product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER;
                  }}
                />
              )}
              {(discountDisplay || product.isComingSoon) && (
                <span className={cn('absolute top-4 left-4 bg-white px-3 py-1.5 text-[0.75rem] font-medium uppercase', product.isComingSoon ? 'text-ink' : 'text-sale')}>
                  {product.isComingSoon ? 'Coming soon' : discountDisplay}
                </span>
              )}
              <button onClick={handleWishlist} className="icon-btn absolute top-4 right-4" aria-pressed={isWishlisted} aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}>
                <Heart className={cn('w-[19px] h-[19px]', isWishlisted && 'fill-current text-sale')} strokeWidth={1.4} />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="lg:pt-2">
            {(brandName || categoryName) && <p className="caps-sm text-muted mb-2">{brandName || categoryName}</p>}
            <h1 className="font-light text-[1.8rem] sm:text-[2.3rem] leading-tight text-ink">{product.name}</h1>

            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-[0.85rem] text-ink">
              <span className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn('w-4 h-4', n <= Math.round(rating) ? 'fill-current' : 'text-gray-300')} strokeWidth={1} />
                ))}
              </span>
              <span className="underline underline-offset-4">
                {product.reviewCount > 0 ? `${product.reviewCount} review${product.reviewCount === 1 ? '' : 's'}` : 'Write a review'}
              </span>
            </a>

            <p className="mt-6 flex items-baseline gap-3">
              <span className={cn('text-[1.7rem] font-medium', onSale ? 'text-sale' : 'text-ink')}>{formatPrice(effectivePrice)}</span>
              {onSale && <span className="text-[1.05rem] text-muted line-through font-light">{formatPrice(product.basePrice)}</span>}
            </p>

            {product.shortDescription && <p className="mt-5 text-[0.98rem] text-gray-600 font-light leading-relaxed">{product.shortDescription}</p>}

            <div className="mt-8">
              {product.isComingSoon ? (
                <>
                  <button disabled className="btn-ink w-full">Coming soon</button>
                  {product.launchDate && (
                    <p className="mt-3 text-center text-[0.85rem] text-muted">
                      Expected {new Date(product.launchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="flex items-center justify-between h-12 w-[130px] shrink-0 rounded-full border border-line px-2">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-tile">
                        <Minus className="w-4 h-4" strokeWidth={1.4} />
                      </button>
                      <span className="text-[0.95rem]" aria-live="polite">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} aria-label="Increase quantity" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-tile">
                        <Plus className="w-4 h-4" strokeWidth={1.4} />
                      </button>
                    </div>
                    <button onClick={handleAddToCart} disabled={!inStock} className="btn-ink flex-1">
                      {isAddedToCart ? (
                        <>
                          <Check className="w-4 h-4" strokeWidth={1.6} /> Added to bag
                        </>
                      ) : inStock ? (
                        'Add to bag'
                      ) : (
                        'Out of stock'
                      )}
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/checkout?buyNow=true&productId=${product._id}&quantity=${quantity}`);
                    }}
                    disabled={!inStock}
                    className="btn-line w-full mt-3"
                  >
                    Buy now
                  </button>
                  <p className={cn('mt-4 text-[0.85rem] flex items-center gap-2', inStock ? 'text-[#2f7d4f]' : 'text-sale')}>
                    <span className={cn('w-2 h-2 rounded-full', inStock ? 'bg-[#2f7d4f]' : 'bg-sale')} />
                    {lowStock ? `Only ${product.stock} left` : inStock ? 'In stock, ships in 1-2 days' : 'Currently unavailable'}
                  </p>
                </>
              )}
            </div>

            <ul className="mt-8 grid grid-cols-3 gap-2 border-y border-line py-5 text-center">
              {[
                [Truck, 'Free delivery over PKR 5,000'],
                [Banknote, 'Cash on delivery'],
                [RotateCcw, '14-day returns'],
              ].map(([Icon, text]) => {
                const I = Icon as typeof Truck;
                return (
                  <li key={text as string} className="flex flex-col items-center gap-2 text-[0.78rem] text-ink font-light leading-snug">
                    <I className="w-6 h-6" strokeWidth={1.2} />
                    {text as string}
                  </li>
                );
              })}
            </ul>

            <div className="mt-2">
              <details className="group border-b border-line" open>
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none text-[0.95rem] uppercase tracking-[0.04em]">
                  Description
                  <Plus className="w-4 h-4 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.3} />
                </summary>
                <p className="pb-6 text-[0.95rem] text-gray-600 font-light leading-relaxed whitespace-pre-line">
                  {product.description || 'Skincare made for you.'}
                </p>
              </details>
              <details className="group border-b border-line">
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none text-[0.95rem] uppercase tracking-[0.04em]">
                  Delivery & returns
                  <Plus className="w-4 h-4 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.3} />
                </summary>
                <ul className="pb-6 space-y-2 text-[0.95rem] text-gray-600 font-light leading-relaxed">
                  <li>Delivered in 3-5 working days across Pakistan. Free over PKR 5,000.</li>
                  <li>Cash on delivery, JazzCash or Easypaisa.</li>
                  <li>
                    Returns accepted within 14 days.{' '}
                    <Link href="/refunds" className="underline underline-offset-4 text-ink">Read the policy</Link>
                  </li>
                </ul>
              </details>
            </div>

            <button onClick={handleShare} className="mt-6 inline-flex items-center gap-2 text-[0.85rem] text-ink underline underline-offset-4">
              <Share2 className="w-4 h-4" strokeWidth={1.3} /> Share
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-8">
        {product.seoContent && (
          <article
            className="mt-20 max-w-3xl mx-auto text-gray-600 leading-relaxed [&>h2]:title [&>h2]:text-2xl [&>h2]:text-ink [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:title [&>h3]:text-lg [&>h3]:text-ink [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>li]:mb-2 [&>strong]:text-ink"
            dangerouslySetInnerHTML={{ __html: product.seoContent }}
          />
        )}

        <ProductSeoContent slug={product.slug} />

        <div id="reviews" className="scroll-mt-40 max-w-5xl mx-auto">
          <ProductReviews productId={product._id} />
        </div>
      </div>
    </div>
  );
}

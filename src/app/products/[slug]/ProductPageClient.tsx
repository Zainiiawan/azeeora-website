'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { m as motion } from 'framer-motion';
import { Heart, Share2, Check } from 'lucide-react';
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
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f3f2ef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%23111111'%3EAYEZA%3C/text%3E%3C/svg%3E";

export default function ProductPageClient({ initialProductData }: { initialProductData?: any }) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
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
      title: `${product?.name} | AYEZA COSMETICS`,
      text: product?.shortDescription || 'Check out this product from AYEZA COSMETICS!',
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

  return (
    <div className="bg-white">
      <div className="grid lg:grid-cols-12 border-b border-line">
        {/* Gallery: stacked full-height images on desktop, swipeable on mobile */}
        <div className="lg:col-span-7 xl:col-span-8 bg-tile">
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible snap-x snap-mandatory lg:snap-none">
            {product.video && (
              <div className="relative shrink-0 w-full aspect-[3/4] lg:aspect-[4/5] snap-start">
                <video src={product.video.url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
              </div>
            )}
            {images.map((image: { url?: string; alt?: string }, index: number) => (
              <div key={index} className="relative shrink-0 w-full aspect-[3/4] lg:aspect-[4/5] snap-start">
                <img
                  src={image.url ? optimizeCloudinaryUrl(image.url, 1800) : PLACEHOLDER}
                  alt={image.alt || product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER;
                  }}
                />
              </div>
            ))}
          </div>
          {images.length + (product.video ? 1 : 0) > 1 && (
            <p className="lg:hidden caps-sm text-muted text-center py-3 bg-white">Swipe for more</p>
          )}
        </div>

        {/* Details */}
        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-[148px] px-5 sm:px-8 lg:px-10 xl:px-12 py-10 lg:py-14">
            <nav className="caps-sm text-muted flex flex-wrap gap-2 mb-10" aria-label="Breadcrumb">
              <Link href="/shop" className="hover:text-ink">Shop</Link>
              {categoryName && categorySlug && (
                <>
                  <span>/</span>
                  <Link href={`/categories/${categorySlug}`} className="hover:text-ink">{categoryName}</Link>
                </>
              )}
            </nav>

            {(brandName || categoryName) && <p className="caps text-muted mb-3">{brandName || categoryName}</p>}
            <h1 className="title text-[1.9rem] sm:text-[2.2rem] text-ink">{product.name}</h1>

            <p className="mt-4 text-base tracking-wide text-ink">
              {formatPrice(effectivePrice)}
              {product.basePrice > effectivePrice && (
                <span className="ml-3 text-muted line-through">{formatPrice(product.basePrice)}</span>
              )}
              {discountDisplay && !product.isComingSoon && <span className="ml-3 caps-sm text-muted">{discountDisplay}</span>}
            </p>

            {product.reviewCount > 0 && (
              <a href="#reviews" className="mt-3 inline-block text-[0.8rem] text-muted u-hover">
                ★ {Number(product.rating).toFixed(1)} · {product.reviewCount} review{product.reviewCount === 1 ? '' : 's'}
              </a>
            )}

            {product.shortDescription && <p className="mt-8 text-[0.95rem] text-gray-600 leading-relaxed">{product.shortDescription}</p>}

            <div className="mt-10">
              {product.isComingSoon ? (
                <>
                  <button disabled className="btn-ink w-full">Coming soon</button>
                  {product.launchDate && (
                    <p className="mt-3 text-center caps-sm text-muted">
                      Expected {new Date(product.launchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between border-y border-line py-3 mb-4">
                    <span className="caps text-muted">Quantity</span>
                    <div className="flex items-center gap-5">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity" className="p-1">
                        <Minus className="w-3.5 h-3.5" strokeWidth={1.2} />
                      </button>
                      <span className="w-6 text-center text-sm" aria-live="polite">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} aria-label="Increase quantity" className="p-1">
                        <Plus className="w-3.5 h-3.5" strokeWidth={1.2} />
                      </button>
                    </div>
                  </div>
                  <button onClick={handleAddToCart} disabled={!inStock} className="btn-ink w-full">
                    {isAddedToCart ? (
                      <>
                        <Check className="w-4 h-4" strokeWidth={1.4} /> Added to bag
                      </>
                    ) : inStock ? (
                      'Add to bag'
                    ) : (
                      'Out of stock'
                    )}
                  </button>
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
                  <p className="mt-4 caps-sm text-muted text-center">
                    {lowStock ? `Only ${product.stock} left` : inStock ? 'In stock · Ships in 1-2 days' : 'Currently unavailable'}
                  </p>
                </>
              )}
            </div>

            <div className="mt-8 flex justify-center gap-10">
              <button onClick={handleWishlist} className="caps flex items-center gap-2 u-hover" aria-pressed={isWishlisted}>
                <Heart className={cn('w-3.5 h-3.5', isWishlisted && 'fill-current')} strokeWidth={1.2} />
                {isWishlisted ? 'Saved' : 'Save'}
              </button>
              <button onClick={handleShare} className="caps flex items-center gap-2 u-hover">
                <Share2 className="w-3.5 h-3.5" strokeWidth={1.2} /> Share
              </button>
            </div>

            <div className="mt-10 border-t border-line">
              <details className="group border-b border-line" open>
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none caps">
                  Description
                  <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.2} />
                </summary>
                <p className="pb-6 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description || 'Luxury cosmetics crafted for you.'}
                </p>
              </details>
              <details className="group border-b border-line">
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none caps">
                  Delivery & returns
                  <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.2} />
                </summary>
                <ul className="pb-6 space-y-2 text-sm text-gray-600 leading-relaxed">
                  <li>Delivered in 3-5 working days across Pakistan. Complimentary over PKR 5,000.</li>
                  <li>Cash on delivery, JazzCash or Easypaisa.</li>
                  <li>
                    Returns accepted within 14 days.{' '}
                    <Link href="/refunds" className="u-link text-ink">Read the policy</Link>
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </aside>
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

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { m as motion } from 'framer-motion';
import { ShoppingBag, Heart, Star, Share2, Truck, Shield, RefreshCw, Check, Play } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
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
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f4efe8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%23a8875a'%3EAYEZA%3C/text%3E%3C/svg%3E";

export default function ProductPageClient({ initialProductData }: { initialProductData?: any }) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
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
  const categoryName = typeof product.category === 'object' ? product.category?.name : undefined;
  const categorySlug = typeof product.category === 'object' ? product.category?.slug : undefined;

  return (
    <div className="min-h-screen maison-backdrop">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-8 pb-24">
        <nav className="flex items-center gap-3 eyebrow !text-[0.6rem] text-gray-500 mb-10 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#1c1714] transition-colors">Maison</Link>
          <span className="text-rose-gold">/</span>
          <Link href="/shop" className="hover:text-[#1c1714] transition-colors">Shop</Link>
          {categoryName && categorySlug && (
            <>
              <span className="text-rose-gold">/</span>
              <Link href={`/categories/${categorySlug}`} className="hover:text-[#1c1714] transition-colors">{categoryName}</Link>
            </>
          )}
          <span className="text-rose-gold">/</span>
          <span className="text-[#1c1714] truncate">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4"
          >
            {(images.length > 1 || product.video) && (
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible md:w-20 shrink-0">
                {product.video && (
                  <button
                    onClick={() => setSelectedImage(-1)}
                    aria-label="Play product video"
                    className={cn(
                      'relative min-w-16 w-16 md:w-20 aspect-[4/5] bg-[#efe7dc] flex items-center justify-center transition-all duration-500',
                      selectedImage === -1 ? 'ring-1 ring-[#1c1714]' : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    <Play className="w-6 h-6 text-[#1c1714]" strokeWidth={1.25} />
                  </button>
                )}
                {images.map((image: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                    className={cn(
                      'relative min-w-16 w-16 md:w-20 aspect-[4/5] overflow-hidden bg-[#f4efe8] transition-all duration-500',
                      selectedImage === index ? 'ring-1 ring-[#1c1714]' : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    <img src={image.url || PLACEHOLDER} alt={image.alt || ''} className="w-full h-full object-cover mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 aspect-[4/5] bg-[#f4efe8] overflow-hidden">
              {product.video && selectedImage === -1 ? (
                <video src={product.video.url} className="w-full h-full object-cover" controls autoPlay muted playsInline />
              ) : (
                <img
                  key={selectedImage}
                  src={images[selectedImage]?.url || PLACEHOLDER}
                  alt={images[selectedImage]?.alt || product.name}
                  className="w-full h-full object-cover mix-blend-multiply animate-fade-in"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER;
                  }}
                />
              )}
              {product.isComingSoon ? (
                <span className="absolute top-5 left-5 eyebrow !text-[0.6rem] glass px-4 py-2 text-[#1c1714]">Coming soon</span>
              ) : discountDisplay ? (
                <span className="absolute top-5 left-5 eyebrow !text-[0.6rem] bg-[#1c1714] text-[#f7f3ee] px-4 py-2">{discountDisplay}</span>
              ) : null}
            </div>
          </motion.div>

          {/* Purchase panel */}
          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 lg:sticky lg:top-[128px]"
          >
            <div className="glass-strong p-7 sm:p-10">
              {(brandName || categoryName) && (
                <p className="eyebrow !text-[0.6rem] text-rose-gold-dark mb-4">{brandName || categoryName}</p>
              )}
              <h1 className="display text-4xl sm:text-5xl text-[#1c1714]">{product.name}</h1>

              {product.reviewCount > 0 && (
                <a href="#reviews" className="mt-5 inline-flex items-center gap-2 group">
                  <span className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn('w-3.5 h-3.5', i < Math.round(product.rating) ? 'fill-rose-gold text-rose-gold' : 'text-gray-300')}
                        strokeWidth={1}
                      />
                    ))}
                  </span>
                  <span className="text-xs text-gray-500 link-underline">
                    {product.rating?.toFixed?.(1) ?? product.rating} · {product.reviewCount} review{product.reviewCount === 1 ? '' : 's'}
                  </span>
                </a>
              )}

              <div className="flex items-baseline gap-4 mt-8">
                <span className="text-2xl tracking-[0.08em] text-[#1c1714]">{formatPrice(effectivePrice)}</span>
                {product.basePrice > effectivePrice && (
                  <span className="text-base text-gray-400 line-through">{formatPrice(product.basePrice)}</span>
                )}
              </div>

              {product.shortDescription && (
                <p className="mt-6 text-gray-600 leading-relaxed">{product.shortDescription}</p>
              )}

              <div className="hairline my-8" />

              {product.isComingSoon ? (
                <div className="space-y-4">
                  <div className="btn-lux w-full bg-black/5 text-gray-500 cursor-not-allowed">Launching soon</div>
                  {product.launchDate && (
                    <p className="text-center text-sm text-rose-gold-dark">
                      Expected {new Date(product.launchDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow !text-[0.6rem] text-gray-500">Quantity</span>
                    <div className="flex items-center border border-black/15">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-11 h-11 flex items-center justify-center hover:bg-black/5 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" strokeWidth={1.25} />
                      </button>
                      <span className="w-10 text-center text-sm" aria-live="polite">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-11 h-11 flex items-center justify-center hover:bg-black/5 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={1.25} />
                      </button>
                    </div>
                  </div>
                  <p className={cn('text-xs', inStock ? 'text-gray-500' : 'text-red-700')}>
                    {inStock ? (product.stock <= (product.lowStockThreshold ?? 5) ? `Only ${product.stock} left` : 'In stock, ready to ship') : 'Currently unavailable'}
                  </p>

                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="btn-lux w-full bg-[#1c1714] text-[#f7f3ee] hover:bg-rose-gold-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isAddedToCart ? (
                      <>
                        <Check className="w-4 h-4" strokeWidth={1.5} /> Added to bag
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" strokeWidth={1.25} /> Add to bag
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/checkout?buyNow=true&productId=${product._id}&quantity=${quantity}`);
                    }}
                    disabled={!inStock}
                    className="btn-lux w-full border border-[#1c1714] text-[#1c1714] hover:bg-[#1c1714] hover:text-[#f7f3ee] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Buy now
                  </button>
                </div>
              )}

              <div className="flex justify-center gap-10 mt-7">
                <button
                  onClick={handleWishlist}
                  className="eyebrow !text-[0.6rem] text-[#1c1714] flex items-center gap-2 hover:text-rose-gold-dark transition-colors"
                  aria-pressed={isWishlisted}
                >
                  <Heart className={cn('w-3.5 h-3.5', isWishlisted && 'fill-current text-rose-gold-dark')} strokeWidth={1.25} />
                  {isWishlisted ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleShare}
                  className="eyebrow !text-[0.6rem] text-[#1c1714] flex items-center gap-2 hover:text-rose-gold-dark transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" strokeWidth={1.25} /> Share
                </button>
              </div>

              <div className="mt-8 border-t border-black/10">
                <details className="group border-b border-black/10" open>
                  <summary className="flex items-center justify-between py-5 cursor-pointer list-none eyebrow !text-[0.62rem] text-[#1c1714]">
                    Description
                    <Plus className="w-3.5 h-3.5 transition-transform duration-500 group-open:rotate-45" strokeWidth={1.25} />
                  </summary>
                  <p className="pb-6 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {product.description || 'Luxury cosmetics crafted for you.'}
                  </p>
                </details>
                <details className="group border-b border-black/10">
                  <summary className="flex items-center justify-between py-5 cursor-pointer list-none eyebrow !text-[0.62rem] text-[#1c1714]">
                    Delivery & returns
                    <Plus className="w-3.5 h-3.5 transition-transform duration-500 group-open:rotate-45" strokeWidth={1.25} />
                  </summary>
                  <ul className="pb-6 space-y-3 text-sm text-gray-600">
                    <li className="flex gap-3"><Truck className="w-4 h-4 text-rose-gold shrink-0" strokeWidth={1.25} /> Delivered in 3-5 working days across Pakistan, complimentary over PKR 5,000.</li>
                    <li className="flex gap-3"><Shield className="w-4 h-4 text-rose-gold shrink-0" strokeWidth={1.25} /> Cash on delivery, JazzCash or Easypaisa.</li>
                    <li className="flex gap-3"><RefreshCw className="w-4 h-4 text-rose-gold shrink-0" strokeWidth={1.25} /> Returns accepted within 14 days. <Link href="/refunds" className="underline underline-offset-4">Read the policy</Link></li>
                  </ul>
                </details>
              </div>
            </div>
          </motion.aside>
        </div>

        {product.seoContent && (
          <article
            className="mt-24 max-w-3xl mx-auto text-gray-700 [&>h2]:font-serif [&>h2]:text-3xl [&>h2]:text-[#1c1714] [&>h2]:mt-12 [&>h2]:mb-5 [&>h3]:font-serif [&>h3]:text-2xl [&>h3]:text-[#1c1714] [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:mb-5 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-5 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-5 [&>li]:mb-2 [&>strong]:text-[#1c1714]"
            dangerouslySetInnerHTML={{ __html: product.seoContent }}
          />
        )}

        <ProductSeoContent slug={product.slug} />

        <div id="reviews" className="scroll-mt-32">
          <ProductReviews productId={product._id} />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { m as motion } from 'framer-motion';
import { ShoppingBag, Heart, Star } from 'lucide-react';
import { cn, formatPrice, optimizeCloudinaryUrl, getCloudinarySrcSet } from '@/lib/utils';
import { getDiscountPercentage, getEffectivePrice, getDiscountDisplay } from '@/lib/productUtils';
import { useDispatch, useSelector } from 'react-redux';
import { addItem as addToCart } from '@/store/slices/cartSlice';
import { addItem as addToWishlist, removeItem as removeFromWishlist } from '@/store/slices/wishlistSlice';
import { RootState } from '@/store';
import { cartApi } from '@/lib/api/cartApi';
import { wishlistApi } from '@/lib/api/wishlistApi';
import { Product } from '@/lib/api/productApi';

interface ProductCardProps {
  product: Pick<
    Product,
    '_id' | 'name' | 'slug' | 'images' | 'basePrice' | 'rating' | 'reviewCount'
  > &
    Partial<Pick<Product, 'compareAtPrice' | 'isFeatured' | 'discount' | 'isComingSoon' | 'launchDate'>>;
  className?: string;
  priority?: boolean;
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f4efe8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='22' letter-spacing='8' fill='%23a8875a'%3EAYEZA%3C/text%3E%3C/svg%3E";

const ProductCard = ({ product, className, priority = false }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const isWishlisted = useSelector((state: RootState) =>
    state.wishlist.items.some((item) => item._id === product._id)
  );

  const mainImage = product.images?.find((img) => img.isMain) || product.images?.[0];
  const effectivePrice = getEffectivePrice(product);
  const discountDisplay = getDiscountDisplay(product);
  const imageSrc = mainImage?.url ? optimizeCloudinaryUrl(mainImage.url, 600, true) : PLACEHOLDER;
  const imageSrcSet = mainImage?.url ? getCloudinarySrcSet(mainImage.url, undefined, true) : '';

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
        quantity: 1,
        price: effectivePrice,
        total: effectivePrice,
      })
    );
    if (isAuthenticated) {
      try {
        await cartApi.addItem({ productId: product._id, quantity: 1 });
      } catch {
        // Redux state remains as optimistic UI
      }
    }
  };

  const handleWishlistToggle = async () => {
    if (isWishlisted) {
      dispatch(removeFromWishlist(product._id));
      if (isAuthenticated) {
        try {
          await wishlistApi.remove(product._id);
        } catch {
          // best-effort sync
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
          // best-effort sync
        }
      }
    }
  };

  return (
    <motion.div
      className={cn('group h-full flex flex-col', className)}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden glass-sheen bg-[#f4efe8] flex-1">
        {/* Labels */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {product.isComingSoon ? (
            <span className="eyebrow !text-[0.55rem] glass px-3 py-1.5 text-[#1c1714]">Coming soon</span>
          ) : discountDisplay ? (
            <span className="eyebrow !text-[0.55rem] bg-[#1c1714] text-[#f7f3ee] px-3 py-1.5">{discountDisplay}</span>
          ) : null}
          {product.isFeatured && !product.isComingSoon && (
            <span className="eyebrow !text-[0.55rem] glass px-3 py-1.5 text-[#1c1714]">Signature</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlistToggle}
          className={cn(
            'absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500',
            isWishlisted ? 'text-rose-gold-dark' : 'text-[#1c1714]/70 hover:text-[#1c1714]'
          )}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
        >
          <Heart className={cn('w-[18px] h-[18px]', isWishlisted ? 'fill-current' : 'fill-none')} strokeWidth={1.25} />
        </button>

        <Link href={`/products/${product.slug}`} className="block aspect-[4/5] overflow-hidden" aria-label={product.name}>
          <img
            src={imageSrc}
            {...(imageSrcSet ? { srcSet: imageSrcSet, sizes: '(max-width: 768px) 50vw, 25vw' } : {})}
            alt={mainImage?.alt || product.name}
            className={cn(
              'w-full h-full object-cover transition-transform duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] mix-blend-multiply',
              isHovered ? 'scale-[1.06]' : 'scale-100'
            )}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </Link>

        {/* Glass action bar: always visible on touch, slides up on hover for desktop */}
        <div className="absolute inset-x-3 bottom-3 z-10 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-y-[calc(100%+12px)] md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          {product.isComingSoon ? (
            <div className="glass eyebrow !text-[0.6rem] text-center py-3 text-[#1c1714]">Launching soon</div>
          ) : (
            <div className="glass flex">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 eyebrow !text-[0.6rem] py-3 text-[#1c1714] hover:bg-white/50 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.5} />
                Add to bag
              </button>
              <span className="w-px bg-black/10" aria-hidden />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/checkout?buyNow=true&productId=${product._id}`);
                }}
                className="flex-1 eyebrow !text-[0.6rem] py-3 bg-[#1c1714]/90 text-[#f7f3ee] hover:bg-rose-gold-dark transition-colors"
              >
                Buy now
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-5 pb-2 text-center">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-serif text-[1.15rem] leading-snug text-[#1c1714] line-clamp-2 transition-colors duration-500 hover:text-rose-gold-dark">
            {product.name}
          </h3>
        </Link>

        {product.reviewCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2" aria-label={`Rated ${product.rating} out of 5`}>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn('w-3 h-3', i < Math.round(product.rating) ? 'fill-rose-gold text-rose-gold' : 'text-gray-300')}
                  strokeWidth={1}
                />
              ))}
            </div>
            <span className="text-[0.7rem] text-gray-500">({product.reviewCount})</span>
          </div>
        )}

        <div className="flex items-baseline justify-center gap-3 mt-2">
          <span className="text-sm tracking-[0.12em] text-[#1c1714]">{formatPrice(effectivePrice)}</span>
          {product.basePrice > effectivePrice && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.basePrice)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;

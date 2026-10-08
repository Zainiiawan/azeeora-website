'use client';

import { useState } from 'react';
import Link from 'next/link';
import { m as motion } from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { cn, displayName, formatPrice, optimizeCloudinaryUrl, getCloudinarySrcSet } from '@/lib/utils';
import { getEffectivePrice, getDiscountDisplay } from '@/lib/productUtils';
import { useDispatch, useSelector } from 'react-redux';
import { addItem as addToCart } from '@/store/slices/cartSlice';
import { addItem as addToWishlist, removeItem as removeFromWishlist } from '@/store/slices/wishlistSlice';
import { RootState } from '@/store';
import { cartApi } from '@/lib/api/cartApi';
import { wishlistApi } from '@/lib/api/wishlistApi';
import { Product } from '@/lib/api/productApi';
import { useMemberPrice } from '@/lib/member/useMemberPrice';

interface ProductCardProps {
  product: Pick<
    Product,
    '_id' | 'name' | 'slug' | 'images' | 'basePrice' | 'rating' | 'reviewCount'
  > &
    Partial<Pick<Product, 'compareAtPrice' | 'isFeatured' | 'discount' | 'isComingSoon' | 'launchDate' | 'bv'>>;
  className?: string;
  priority?: boolean;
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f4f4f4'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' letter-spacing='8' fill='%231a1a1a'%3EAZEEORA%3C/text%3E%3C/svg%3E";

const ProductCard = ({ product, className, priority = false }: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const dispatch = useDispatch();
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

  const category = (product as { category?: unknown }).category;
  const label =
    category && typeof category === 'object' && 'name' in (category as object)
      ? displayName((category as { name: string }).name)
      : product.isComingSoon
        ? 'Coming soon'
        : '';

  const onSale = product.basePrice > effectivePrice;
  const memberPrice = useMemberPrice(product._id, effectivePrice);
  const badge = product.isComingSoon ? 'Coming soon' : discountDisplay || (product.isFeatured ? 'Bestseller' : '');
  const rating = Number(product.rating) || 0;

  return (
    <motion.article
      className={cn('group flex flex-col', className)}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="relative bg-tile overflow-hidden">
        <Link href={`/products/${product.slug}`} className="block aspect-[20/21]" aria-label={product.name}>
          <img
            src={imageSrc}
            {...(imageSrcSet ? { srcSet: imageSrcSet, sizes: '(max-width: 768px) 50vw, 25vw' } : {})}
            alt={mainImage?.alt || product.name}
            className={cn('w-full h-full object-cover reveal-img', isHovered ? 'scale-[1.04]' : 'scale-100')}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </Link>

        {badge && (
          <span
            className={cn(
              'absolute top-3 left-3 sm:top-4 sm:left-4 bg-white px-2.5 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.04em]',
              discountDisplay && !product.isComingSoon ? 'text-sale' : 'text-ink'
            )}
          >
            {badge}
          </span>
        )}

        <div className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleWishlistToggle}
            className="icon-btn"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={cn('w-[19px] h-[19px]', isWishlisted && 'fill-current text-sale')} strokeWidth={1.4} />
          </button>
          {!product.isComingSoon && (
            <button type="button" onClick={handleAddToCart} className="icon-btn" aria-label="Add to bag">
              <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.4} />
            </button>
          )}
        </div>
      </div>

      <div className="pt-3.5 pb-8">
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 mb-2" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
            <span className="flex text-ink">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('w-[15px] h-[15px]', n <= Math.round(rating) ? 'fill-current' : 'text-gray-300')} strokeWidth={1} />
              ))}
            </span>
            <span className="text-[0.75rem] text-ink">({product.reviewCount})</span>
          </div>
        )}
        {label && <p className="caps-sm text-muted mb-1 truncate">{label}</p>}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-serif text-[1.2rem] text-ink leading-snug line-clamp-2 hover:underline underline-offset-4 decoration-1">{product.name}</h3>
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[0.95rem]">
            <span className={cn('font-medium', onSale ? 'text-sale' : 'text-ink')}>{formatPrice(effectivePrice)}</span>
            {onSale && <span className="ml-2 text-muted line-through font-light text-xs">{formatPrice(product.basePrice)}</span>}
          </p>
          <span className="text-[0.7rem] tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#fcf5f7] text-rose border border-rose/30">
            {typeof product.bv === 'number' && product.bv >= 0 ? product.bv : Math.max(1, Math.round(effectivePrice / 100))} BP
          </span>
        </div>
        {memberPrice && (
          <p className="mt-1 text-[0.8rem] text-rose font-medium">
            {memberPrice.label}: {formatPrice(memberPrice.price)}
          </p>
        )}
      </div>
    </motion.article>
  );
};

export default ProductCard;

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { m as motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn, displayName, formatPrice, optimizeCloudinaryUrl, getCloudinarySrcSet } from '@/lib/utils';
import { getEffectivePrice, getDiscountDisplay } from '@/lib/productUtils';
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
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f3f2ef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='22' letter-spacing='8' fill='%23111111'%3EAYEZA%3C/text%3E%3C/svg%3E";

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

  return (
    <motion.article
      className={cn('group flex flex-col', className)}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="relative bg-tile overflow-hidden">
        <Link href={`/products/${product.slug}`} className="block aspect-[3/4]" aria-label={product.name}>
          <img
            src={imageSrc}
            {...(imageSrcSet ? { srcSet: imageSrcSet, sizes: '(max-width: 768px) 50vw, 25vw' } : {})}
            alt={mainImage?.alt || product.name}
            className={cn('w-full h-full object-cover reveal-img', isHovered ? 'scale-[1.03]' : 'scale-100')}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </Link>

        {(discountDisplay || product.isComingSoon) && (
          <span className="absolute top-3 left-3 caps-sm bg-white text-ink px-2 py-1">
            {product.isComingSoon ? 'Coming soon' : discountDisplay}
          </span>
        )}

        {!product.isComingSoon && (
          <button
            type="button"
            onClick={handleAddToCart}
            className="absolute inset-x-3 bottom-3 frost caps py-3 text-ink transition-all duration-500 lg:opacity-0 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-y-0 hover:bg-white"
          >
            Add to bag
          </button>
        )}
      </div>

      <div className="pt-3.5 pb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label && <p className="caps-sm text-muted mb-1 truncate">{label}</p>}
          <Link href={`/products/${product.slug}`}>
            <h3 className="caps !text-[0.76rem] text-ink leading-snug line-clamp-2">{product.name}</h3>
          </Link>
          <p className="mt-1.5 text-[0.8rem] tracking-wide text-ink">
            {formatPrice(effectivePrice)}
            {product.basePrice > effectivePrice && (
              <span className="ml-2 text-muted line-through">{formatPrice(product.basePrice)}</span>
            )}
          </p>
          {product.reviewCount > 0 && (
            <p className="mt-1 text-[0.72rem] text-muted">
              ★ {Number(product.rating).toFixed(1)} · {product.reviewCount} review{product.reviewCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleWishlistToggle}
          className="shrink-0 -mt-0.5 p-1 text-ink"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
        >
          <Heart className={cn('w-4 h-4', isWishlisted && 'fill-current')} strokeWidth={1.2} />
        </button>
      </div>
    </motion.article>
  );
};

export default ProductCard;

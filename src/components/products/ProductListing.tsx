'use client';

import { useState } from 'react';
import Link from 'next/link';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { Product, ProductPagination } from '@/lib/api/productApi';
import { cn, optimizeCloudinaryUrl } from '@/lib/utils';

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'New in' },
  { value: 'price-low', label: 'Price, low to high' },
  { value: 'price-high', label: 'Price, high to low' },
  { value: 'rating', label: 'Highest rated' },
];

export const SORT_MAP: Record<string, 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestselling' | undefined> = {
  featured: 'bestselling',
  'price-low': 'price_asc',
  'price-high': 'price_desc',
  rating: 'rating',
  newest: 'newest',
};

export const PRICE_MAX = 50000;

type FilterOption = { value: string; label: string; count?: number };

interface Props {
  title: string;
  description?: string;
  image?: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  products: Product[];
  pagination?: ProductPagination;
  isLoading?: boolean;
  isError?: boolean;
  // filters
  search: string;
  onSearch: (v: string) => void;
  sortBy: string;
  onSort: (v: string) => void;
  priceRange: number[];
  onPrice: (v: number[]) => void;
  categories?: FilterOption[];
  selectedCategory?: string | null;
  onCategory?: (v: string | null) => void;
  onClear: () => void;
  onPage: (page: number) => void;
}

export default function ProductListing(props: Props) {
  const {
    title,
    description,
    image,
    breadcrumb,
    products,
    pagination,
    isLoading,
    isError,
    search,
    onSearch,
    sortBy,
    onSort,
    priceRange,
    onPrice,
    categories,
    selectedCategory,
    onCategory,
    onClear,
    onPage,
  } = props;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const total = pagination?.total ?? products.length;
  const activeFilters =
    (search ? 1 : 0) + (selectedCategory ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < PRICE_MAX ? 1 : 0);

  return (
    <div className="bg-white">
      {/* Header: title left, image right (falls back to a text-only header) */}
      <section className={cn('grid border-b border-line', image ? 'lg:grid-cols-2' : '')}>
        <div className={cn("px-5 sm:px-8 lg:px-10 py-12 flex flex-col justify-center", image ? "lg:py-0 lg:min-h-[440px]" : "lg:py-16")}>
          {breadcrumb && (
            <nav className="caps-sm text-muted mb-8 flex flex-wrap gap-2" aria-label="Breadcrumb">
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex gap-2">
                  {b.href ? (
                    <Link href={b.href} className="hover:text-ink transition-colors">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-ink">{b.label}</span>
                  )}
                  {i < breadcrumb.length - 1 && <span>/</span>}
                </span>
              ))}
            </nav>
          )}
          <h1 className="title text-[2.6rem] sm:text-6xl text-ink">
            {title}
            <sup className="text-[0.32em] ml-1.5 align-super tracking-normal">({total})</sup>
          </h1>
          {description && <p className="mt-6 max-w-lg text-[0.95rem] leading-relaxed text-gray-600">{description}</p>}
        </div>
        {image && (
          <div className="hidden lg:block relative bg-tile">
            <img src={optimizeCloudinaryUrl(image, 1400)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}
      </section>

      {/* Filter / sort bar */}
      <div className="sticky top-[92px] lg:top-[148px] z-30 bg-white border-b border-line">
        <div className="h-12 px-5 sm:px-8 lg:px-10 flex items-center justify-between gap-4">
          <button onClick={() => setFiltersOpen(true)} className="caps flex items-center gap-2 text-ink">
            Filters{activeFilters > 0 && ` (${activeFilters})`}
          </button>
          <label className="flex items-center gap-3">
            <span className="caps text-muted hidden sm:inline">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => onSort(e.target.value)}
              className="caps !bg-transparent border-0 pr-7 py-1 focus:outline-none focus:ring-0 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Grid */}
      <section className="px-0 sm:px-0">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-2 sm:p-3">
                <div className="aspect-[3/4] bg-tile animate-pulse" />
                <div className="h-3 w-2/3 bg-tile mt-4" />
                <div className="h-3 w-1/3 bg-tile mt-2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="py-32 text-center caps text-muted">We could not load the collection. Please try again.</p>
        ) : products.length === 0 ? (
          <div className="py-32 text-center">
            <p className="title text-2xl text-ink">Nothing matches yet</p>
            <p className="mt-3 text-muted">Try removing a filter.</p>
            <button onClick={onClear} className="btn-line mt-8">
              Clear filters
            </button>
          </div>
        ) : (
          <div className={cn("grid grid-cols-2 gap-x-2 sm:gap-x-3 px-2 sm:px-3 pt-2 sm:pt-3", products.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {products.map((p, i) => (
              <ProductCard key={p._id} product={p} priority={i < 4} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-8 py-16">
            <button disabled={!pagination.hasPrev} onClick={() => onPage(pagination.page - 1)} className="caps u-hover disabled:opacity-30">
              Previous
            </button>
            <span className="caps text-muted">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)} className="caps u-hover disabled:opacity-30">
              Next
            </button>
          </div>
        )}
      </section>

      {/* Filters drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/25 z-[60]"
              onClick={() => setFiltersOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-[70] w-full sm:w-[420px] bg-white flex flex-col"
              aria-label="Filters"
            >
              <div className="h-16 px-6 flex items-center justify-between border-b border-line">
                <span className="caps">Filters</span>
                <button onClick={() => setFiltersOpen(false)} className="caps flex items-center gap-2">
                  Close <X className="w-4 h-4" strokeWidth={1.2} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10">
                <div>
                  <p className="caps text-muted mb-3">Search</p>
                  <input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Product name"
                    className="w-full border-0 border-b border-ink px-0 py-2 text-base focus:outline-none focus:ring-0"
                  />
                </div>

                {categories && onCategory && (
                  <div>
                    <p className="caps text-muted mb-3">Category</p>
                    <ul className="space-y-1">
                      {[{ value: '', label: 'All' }, ...categories].map((c) => {
                        const active = (selectedCategory ?? '') === c.value;
                        return (
                          <li key={c.value || 'all'}>
                            <button
                              onClick={() => onCategory(c.value || null)}
                              className={cn('caps py-1.5 flex gap-2', active ? 'text-ink u-link' : 'text-muted hover:text-ink')}
                            >
                              {c.label}
                              {typeof c.count === 'number' && <span className="text-muted">({c.count})</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="caps text-muted mb-3">Price</p>
                  <input
                    type="range"
                    min={0}
                    max={PRICE_MAX}
                    step={500}
                    value={priceRange[1]}
                    onChange={(e) => onPrice([priceRange[0], Number(e.target.value)])}
                    className="w-full"
                    aria-label="Maximum price"
                  />
                  <div className="flex justify-between caps-sm text-muted mt-2">
                    <span>PKR 0</span>
                    <span>Up to PKR {priceRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-line grid grid-cols-2 gap-3">
                <button onClick={onClear} className="btn-line">
                  Clear
                </button>
                <button onClick={() => setFiltersOpen(false)} className="btn-ink">
                  View {total}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

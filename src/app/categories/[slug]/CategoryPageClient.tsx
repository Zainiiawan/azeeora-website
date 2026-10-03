'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { m as motion } from 'framer-motion';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { categoryApi } from '@/lib/api/categoryApi';
import { productApi } from '@/lib/api/productApi';
import CategorySeoContent from '@/components/categories/CategorySeoContent';
import { displayName } from '@/lib/utils';

const SORT_MAP: Record<string, 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestselling' | undefined> = {
  featured: 'bestselling',
  'price-low': 'price_asc',
  'price-high': 'price_desc',
  rating: 'rating',
  newest: 'newest',
};

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
];

interface CategoryPageClientProps {
  initialCategoryData?: any;
  initialProductsData?: any;
}

export default function CategoryPageClient({ initialCategoryData, initialProductsData }: CategoryPageClientProps) {
  const params = useParams();
  const slug = params?.slug as string;

  const { data: categoryData } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoryApi.getBySlug(slug),
    enabled: !!slug,
    initialData: initialCategoryData,
    staleTime: 60 * 1000,
  });

  const category = categoryData?.category;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // If user hasn't changed filters, we can safely use the server-rendered initial products.
  const isDefaultFilters = 
    searchQuery === '' && 
    sortBy === 'featured' && 
    priceRange[0] === 0 && 
    priceRange[1] === 50000 && 
    page === 1;

  const { data, isLoading } = useQuery({
    queryKey: ['category-products', category?._id, searchQuery, sortBy, priceRange, page],
    queryFn: () =>
      productApi.getAll({
        category: category!._id,
        search: searchQuery || undefined,
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < 50000 ? priceRange[1] : undefined,
        sortBy: SORT_MAP[sortBy],
        page,
        limit: 12,
      }),
    enabled: !!category?._id,
    initialData: isDefaultFilters ? initialProductsData : undefined,
    staleTime: 60 * 1000,
  });

  const products = data?.products ?? [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen maison-backdrop">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-sm text-gray-500 flex items-center gap-2">
            <Link href="/" className="hover:text-rose-gold transition-colors">Home</Link>
            <span>/</span>
            <Link href="/categories" className="hover:text-rose-gold transition-colors">Categories</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{category?.name ?? slug}</span>
          </nav>
        </div>
      </div>

      <div className="border-b border-black/5">
        <div className="container mx-auto px-4 pt-10 pb-14 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="eyebrow text-rose-gold-dark mb-5">Collection</p>
            <h1 className="display text-5xl md:text-7xl text-[#1c1714] mb-5">
              {displayName(category?.name) || 'Category'}
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {category?.description ?? 'Browse our collection'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif font-bold text-black">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="lg:hidden text-gray-500 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20"
                  />
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Price Range</h3>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="500"
                  value={priceRange[1]}
                  onChange={(e) => {
                    setPriceRange([priceRange[0], parseInt(e.target.value)]);
                    setPage(1);
                  }}
                  className="w-full accent-rose-gold"
                />
                <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                  <span>PKR 0</span>
                  <span>PKR {priceRange[1].toLocaleString()}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchQuery('');
                  setPriceRange([0, 50000]);
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </aside>

          <div className="flex-1">
            <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Showing <strong>{products.length}</strong> products in{' '}
                <strong>{category?.name ?? 'Category'}</strong>
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 text-sm text-gray-600 hover:text-black"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-rose-gold focus:ring-2 focus:ring-rose-gold focus:ring-opacity-20"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl aspect-square animate-pulse" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product: any, index: number) => (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <ProductCard product={product} priority={index < 4} />
                    </motion.div>
                  ))}
                </div>
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button variant="outline" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button variant="outline" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">No products found in this category</p>
                <Link href="/shop">
                  <Button>Browse All Products</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {category?.seoContent && (
          <article 
            className="mt-16 mb-12 max-w-4xl mx-auto text-gray-700 bg-white p-8 rounded-2xl shadow-sm luxury-border [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-8 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-800 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>li]:mb-2 [&>strong]:text-gray-900"
            dangerouslySetInnerHTML={{ __html: category.seoContent }}
          />
        )}
        
        <CategorySeoContent slug={slug} />
      </div>
    </div>
  );
}

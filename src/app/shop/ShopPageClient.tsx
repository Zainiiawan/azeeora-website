'use client';

import { displayName } from '@/lib/utils';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { m as motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import Button from '@/components/ui/Button';
import { productApi } from '@/lib/api/productApi';
import { categoryApi, brandApi } from '@/lib/api/categoryApi';

const SORT_MAP: Record<string, 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestselling' | undefined> = {
  featured: 'bestselling',
  'price-low': 'price_asc',
  'price-high': 'price_desc',
  rating: 'rating',
  newest: 'newest',
  bestselling: 'bestselling',
};

interface ShopPageClientProps {
  initialProductsData?: any;
}

export default function ShopPage({ initialProductsData }: ShopPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(1);

  const isDefaultFilters = 
    searchQuery === '' && 
    selectedCategory === null &&
    selectedBrand === null &&
    sortBy === 'featured' && 
    priceRange[0] === 0 && 
    priceRange[1] === 50000 && 
    page === 1;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: brandApi.getAll,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, selectedBrand, priceRange, sortBy, page],
    queryFn: () =>
      productApi.getAll({
        search: searchQuery || undefined,
        category: selectedCategory ?? undefined,
        brand: selectedBrand ?? undefined,
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < 50000 ? priceRange[1] : undefined,
        sortBy: SORT_MAP[sortBy],
        page,
        limit: 12,
      }),
    initialData: isDefaultFilters ? initialProductsData : undefined,
    staleTime: 0,
    refetchOnMount: true,
  });

  const products = data?.products ?? [];
  const pagination = data?.pagination;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedBrand(null);
    setPriceRange([0, 50000]);
    setPage(1);
  };

  return (
    <div className="min-h-screen maison-backdrop">
      <div className="border-b border-black/5">
        <div className="container mx-auto px-4 pt-16 pb-14 text-center">
          <p className="eyebrow text-rose-gold-dark mb-5">The collection</p>
          <h1 className="display text-5xl md:text-7xl text-[#1c1714]">Shop all</h1>
          <p className="text-gray-600 mt-5">Every Ayeza creation, in one place.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="glass p-6 sticky top-32">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-serif font-bold text-black">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden text-gray-500 hover:text-black"
                >
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
                <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === null}
                      onChange={() => {
                        setSelectedCategory(null);
                        setPage(1);
                      }}
                      className="w-4 h-4 text-rose-gold border-gray-300 focus:ring-rose-gold"
                    />
                    <span className="ml-2 text-sm text-gray-600">All Products</span>
                  </label>
                  {categories.map((category) => (
                    <label key={category._id} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === category._id}
                        onChange={() => {
                          setSelectedCategory(category._id);
                          setPage(1);
                        }}
                        className="w-4 h-4 text-rose-gold border-gray-300 focus:ring-rose-gold"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {displayName(category.name)}
                        {category.productCount != null && (
                          <span className="text-gray-400 ml-1">({category.productCount})</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Brands</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {brands.map((brand) => (
                    <label key={brand._id} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="brand"
                        checked={selectedBrand === brand._id}
                        onChange={() => {
                          setSelectedBrand(selectedBrand === brand._id ? null : brand._id);
                          setPage(1);
                        }}
                        className="w-4 h-4 text-rose-gold border-gray-300 focus:ring-rose-gold"
                      />
                      <span className="ml-2 text-sm text-gray-600">{brand.name}</span>
                    </label>
                  ))}
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
                  <span>PKR {priceRange[0].toLocaleString()}</span>
                  <span>PKR {priceRange[1].toLocaleString()}</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </aside>

          <div className="flex-1">
            <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                {isLoading
                  ? 'Loading products...'
                  : `Showing ${products.length} of ${pagination?.total ?? products.length} products`}
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
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:border-rose-gold focus:ring-2 focus:ring-rose-gold/30 focus:outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="bestselling">Best Selling</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest</option>
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
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Failed to load products. Please try again.</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : (
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

                {products.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No products found matching your criteria</p>
                    <Button onClick={clearFilters}>Clear Filters</Button>
                  </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={!pagination.hasPrev}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={!pagination.hasNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

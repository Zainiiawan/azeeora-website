'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ProductListing, { PRICE_MAX, SORT_MAP } from '@/components/products/ProductListing';
import { productApi } from '@/lib/api/productApi';
import { categoryApi } from '@/lib/api/categoryApi';
import { displayName } from '@/lib/utils';

// Footer and older links use ?sort=new|popular|sale
const URL_SORT: Record<string, string> = { new: 'newest', popular: 'featured', sale: 'featured' };

interface ShopPageClientProps {
  initialProductsData?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function ShopPage({ initialProductsData }: ShopPageClientProps) {
  const params = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.get('search') ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, PRICE_MAX]);
  const [sortBy, setSortBy] = useState(URL_SORT[params.get('sort') ?? ''] ?? 'featured');
  const [page, setPage] = useState(1);

  const isDefaultFilters =
    searchQuery === '' && selectedCategory === null && sortBy === 'featured' && priceRange[0] === 0 && priceRange[1] === PRICE_MAX && page === 1;

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoryApi.getAll });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, priceRange, sortBy, page],
    queryFn: () =>
      productApi.getAll({
        search: searchQuery || undefined,
        category: selectedCategory ?? undefined,
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < PRICE_MAX ? priceRange[1] : undefined,
        sortBy: SORT_MAP[sortBy],
        page,
        limit: 12,
      }),
    initialData: isDefaultFilters ? initialProductsData : undefined,
    staleTime: 0,
    refetchOnMount: true,
  });

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <ProductListing
      title={searchQuery ? `“${searchQuery}”` : 'Shop all'}
      description={searchQuery ? undefined : 'Skincare and beauty composed in Pakistan, from cleansing rituals to night creams.'}
      breadcrumb={[{ label: 'Azeeora', href: '/' }, { label: 'Shop all' }]}
      products={data?.products ?? []}
      pagination={data?.pagination}
      isLoading={isLoading}
      isError={isError}
      search={searchQuery}
      onSearch={reset(setSearchQuery)}
      sortBy={sortBy}
      onSort={reset(setSortBy)}
      priceRange={priceRange}
      onPrice={reset(setPriceRange)}
      categories={categories.map((c) => ({ value: c._id, label: displayName(c.name), count: c.productCount }))}
      selectedCategory={selectedCategory}
      onCategory={reset(setSelectedCategory)}
      onClear={() => {
        setSearchQuery('');
        setSelectedCategory(null);
        setPriceRange([0, PRICE_MAX]);
        setSortBy('featured');
        setPage(1);
      }}
      onPage={setPage}
    />
  );
}

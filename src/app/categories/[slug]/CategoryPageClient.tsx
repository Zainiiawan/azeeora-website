'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ProductListing, { PRICE_MAX, SORT_MAP } from '@/components/products/ProductListing';
import CategorySeoContent from '@/components/categories/CategorySeoContent';
import { categoryApi } from '@/lib/api/categoryApi';
import { productApi } from '@/lib/api/productApi';
import { displayName } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const [priceRange, setPriceRange] = useState([0, PRICE_MAX]);
  const [page, setPage] = useState(1);

  const isDefaultFilters =
    searchQuery === '' && sortBy === 'featured' && priceRange[0] === 0 && priceRange[1] === PRICE_MAX && page === 1;

  const { data, isLoading } = useQuery({
    queryKey: ['category-products', category?._id, searchQuery, sortBy, priceRange, page],
    queryFn: () =>
      productApi.getAll({
        category: category!._id,
        search: searchQuery || undefined,
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < PRICE_MAX ? priceRange[1] : undefined,
        sortBy: SORT_MAP[sortBy],
        page,
        limit: 12,
      }),
    enabled: !!category?._id,
    initialData: isDefaultFilters ? initialProductsData : undefined,
    staleTime: 60 * 1000,
  });

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const name = displayName(category?.name) || 'Collection';

  return (
    <>
      <ProductListing
        title={name}
        description={category?.description}
        image={category?.image?.url}
        breadcrumb={[{ label: 'Azeeora', href: '/' }, { label: 'Collections', href: '/categories' }, { label: name }]}
        products={data?.products ?? []}
        pagination={data?.pagination}
        isLoading={isLoading && !data}
        search={searchQuery}
        onSearch={reset(setSearchQuery)}
        sortBy={sortBy}
        onSort={reset(setSortBy)}
        priceRange={priceRange}
        onPrice={reset(setPriceRange)}
        onClear={() => {
          setSearchQuery('');
          setPriceRange([0, PRICE_MAX]);
          setSortBy('featured');
          setPage(1);
        }}
        onPage={setPage}
      />

      <div className="px-5 sm:px-8">
        {category?.seoContent && (
          <article
            className="mt-20 mb-12 max-w-3xl mx-auto text-gray-600 leading-relaxed [&>h2]:title [&>h2]:text-2xl [&>h2]:text-ink [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:title [&>h3]:text-lg [&>h3]:text-ink [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>li]:mb-2 [&>strong]:text-ink"
            dangerouslySetInnerHTML={{ __html: category.seoContent }}
          />
        )}
        <CategorySeoContent slug={slug} />
      </div>
    </>
  );
}

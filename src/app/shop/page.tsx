import { serverFetch } from '@/lib/serverFetch';
import { Metadata } from 'next';
import ShopPageClient from './ShopPageClient';
import { config } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Shop All Products | AYEZA COSMETICS',
  description: 'Discover our complete collection of luxury cosmetics. Shop skincare, makeup, fragrances, and more at AYEZA COSMETICS.',
  alternates: {
    canonical: '/shop',
  },
  openGraph: {
    title: 'Shop All Products | AYEZA COSMETICS',
    description: 'Discover our complete collection of luxury cosmetics. Shop skincare, makeup, fragrances, and more.',
    url: '/shop',
    type: 'website',
  },
};

export default async function ShopPageServer() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ayeza Cosmetics Product Catalog',
    description: 'Browse all premium luxury cosmetics products from AYEZA COSMETICS.',
    url: `${config.getBaseUrl()}/shop`,
    itemListElement: [], // Could be populated on client or just kept as a top-level descriptor
  };

  // Pre-fetch initial products for SSR
  let initialProductsData = null;
  try {
    // Default: page 1, limit 12, sortBy bestselling
    const productsRes = await serverFetch(
      `/products?page=1&limit=12&sortBy=bestselling`,
      {
        next: { revalidate: 3600, tags: ['products'] },
      }
    );
    if (productsRes.ok) {
      const productsJson = await productsRes.json();
      initialProductsData = productsJson.data;
    }
  } catch (error) {
    console.error('Error fetching initial shop products:', error);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShopPageClient initialProductsData={initialProductsData} />
    </>
  );
}

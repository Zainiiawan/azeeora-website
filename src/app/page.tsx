import { serverFetch } from '@/lib/serverFetch';
import { Category } from '@/lib/api/categoryApi';
import { Product } from '@/lib/api/productApi';
import HomeClient from './HomeClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Azeeora Cosmetics | Premium Skincare & Beauty Products in Pakistan',
  description:
    'Discover Azeeora Cosmetics. Shop premium skincare, beauty creams, and face washes designed for radiant, healthy skin. Fast delivery across Pakistan.',
};

// Cached and revalidated hourly (admin edits also revalidate on save)
export const revalidate = 3600;

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await serverFetch(path);
    if (!res.ok) return fallback;
    const json = await res.json();
    return (json.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const [categories, productData] = await Promise.all([
    getJson<Category[]>('/categories', []),
    getJson<{ products: Product[] }>('/products?page=1&limit=8&sortBy=bestselling', { products: [] }),
  ]);
  return <HomeClient initialCategories={categories} bestsellers={productData.products ?? []} />;
}

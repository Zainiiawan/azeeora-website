import { serverFetch } from '@/lib/serverFetch';
import { Category } from '@/lib/api/categoryApi';
import { Product } from '@/lib/api/productApi';
import { Review } from '@/lib/api/reviewApi';
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
  const bestsellers = productData.products ?? [];
  // A few real customer reviews for the homepage
  const reviewLists = await Promise.all(
    bestsellers.slice(0, 4).map(async (p) =>
      (await getJson<Review[]>(`/reviews/${p._id}`, [])).map((r) => ({
        _id: r._id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        name: r.user ? `${r.user.firstName} ${String(r.user.lastName ?? '').slice(0, 1)}.` : (r.guestName ?? 'Customer'),
        product: p.name,
        slug: p.slug,
      }))
    )
  );
  const testimonials = reviewLists
    .flat()
    .filter((r) => r.rating >= 4 && r.body && r.body.length > 30)
    .sort((a, b) => b.body.length - a.body.length)
    .slice(0, 6);
  return <HomeClient initialCategories={categories} bestsellers={bestsellers} testimonials={testimonials} />;
}

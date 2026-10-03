import { serverFetch } from '@/lib/serverFetch';
import type { MetadataRoute } from 'next';
import { config, getBaseUrl } from '@/lib/config';
import { blogPosts } from '@/lib/data/blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date();

  const staticPages = [
    '',
    '/shop',
    '/categories',
    '/offers',
    '/blog',
    '/about',
    '/contact',
    '/help',
    '/track-order',
    '/terms',
    '/privacy',
    '/shipping',
    '/refunds',
    '/compare',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));

  blogPosts.forEach((post) => {
    sitemapEntries.push({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.publishDate),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  try {
    // Fetch products (Paginated to respect 100 limit)
    let page = 1;
    let hasNext = true;
    while (hasNext) {
      const productsRes = await serverFetch(`/products?limit=100&page=${page}`, { next: { revalidate: 3600 } });
      if (productsRes.ok) {
        const { data: { products, pagination } } = await productsRes.json();
        if (Array.isArray(products)) {
          products.forEach((product: any) => {
            sitemapEntries.push({
              url: `${base}/products/${product.slug}`,
              lastModified: new Date(product.updatedAt || now),
              changeFrequency: 'weekly',
              priority: 0.9,
            });
          });
        }
        hasNext = pagination?.hasNext || false;
        page++;
      } else {
        hasNext = false;
      }
    }

    // Fetch categories
    const categoriesRes = await serverFetch(`/categories`, { next: { revalidate: 3600 } });
    if (categoriesRes.ok) {
      const { data } = await categoriesRes.json();
      if (Array.isArray(data)) {
        data.forEach((category: any) => {
          sitemapEntries.push({
            url: `${base}/categories/${category.slug}`,
            lastModified: new Date(category.updatedAt || now),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        });
      }
    }
  } catch (error) {
    console.error('Error fetching dynamic sitemap entries:', error);
  }

  return sitemapEntries;
}

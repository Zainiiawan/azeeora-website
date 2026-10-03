import { serverFetch } from '@/lib/serverFetch';
import { Metadata } from 'next';
import CategoryPageClient from './CategoryPageClient';
import { config } from '@/lib/config';

async function getCategoryBySlug(slug: string) {
  try {
    const res = await serverFetch(`/categories/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('Error fetching category for SEO:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryBySlug(slug);
  const category = data?.category;

  if (!category) {
    const fallbackName = slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Category';
    return {
      title: `${fallbackName} | AYEZA COSMETICS`,
      description: `Browse our premium collection of ${fallbackName} at AYEZA COSMETICS.`,
    };
  }

  const title = `${category.name} | AYEZA COSMETICS`;
  const description = category.description || `Browse our premium collection of ${category.name} at AYEZA COSMETICS.`;
  const canonicalPath = `/categories/${category.slug}`;
  const canonicalUrl = new URL(canonicalPath, config.getBaseUrl()).toString();

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: category.image ? [{ url: category.image.url }] : [{ url: '/logo.png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: category.image ? [category.image.url] : ['/logo.png'],
    },
  };
}

export default async function CategoryPageServer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCategoryBySlug(slug);
  const category = data?.category;

  let jsonLdArray: any[] = [];
  if (category) {
    const categoryJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: category.name,
      description: category.description,
      url: `${config.getBaseUrl()}/categories/${category.slug}`,
    };

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${config.getBaseUrl()}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Categories',
          item: `${config.getBaseUrl()}/categories`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: category.name,
          item: `${config.getBaseUrl()}/categories/${category.slug}`,
        },
      ],
    };

    jsonLdArray = [categoryJsonLd, breadcrumbJsonLd];
  }

  // Pre-fetch initial products for SSR
  let initialProductsData = null;
  if (category?._id) {
    try {
      // Default: page 1, limit 12, sortBy bestselling
      const productsRes = await serverFetch(
        `/products?category=${category._id}&page=1&limit=12&sortBy=bestselling`,
        {
          next: { revalidate: 3600, tags: ['products'] },
        }
      );
      if (productsRes.ok) {
        const productsJson = await productsRes.json();
        initialProductsData = productsJson.data;
      }
    } catch (error) {
      console.error('Error fetching initial category products:', error);
    }
  }

  return (
    <>
      {jsonLdArray.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArray) }}
        />
      )}
      <CategoryPageClient 
        initialCategoryData={data} 
        initialProductsData={initialProductsData} 
      />
    </>
  );
}

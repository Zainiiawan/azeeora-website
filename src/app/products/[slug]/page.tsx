import { serverFetch } from '@/lib/serverFetch';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductPageClient from './ProductPageClient';
import { config } from '@/lib/config';
import { getEffectivePrice } from '@/lib/productUtils';

async function getProductBySlug(slug: string) {
  try {
    const res = await serverFetch(`/products/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('Error fetching product for SEO:', error);
    return null;
  }
}

async function getReviewsByProductId(productId: string) {
  try {
    const res = await serverFetch(`/reviews/${productId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching reviews for SEO:', error);
    return [];
  }
}

async function getStoreSettings() {
  try {
    const res = await serverFetch(`/settings`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('Error fetching settings for SEO:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    const fallbackName = slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Product';
    return {
      title: `${fallbackName} | AZEEORA COSMETICS`,
      description: `Shop ${fallbackName} at AZEEORA COSMETICS. Premium luxury cosmetics curated for the modern woman.`,
    };
  }

  let title = product.seo?.metaTitle || `${product.name} | AZEEORA COSMETICS`;
  let description =
    product.seo?.metaDescription ||
    product.shortDescription ||
    product.description?.slice(0, 155) ||
    'Premium luxury cosmetics curated for the modern woman.';
  
  if (product.name === 'Azeeora Beauty Cream' || product.slug === 'azeeora-beauty-cream') {
    title = 'Azeeora Beauty Cream - Whitening Cream in Pakistan | Azeeora Cosmetics';
    description = 'Buy Azeeora Beauty Cream online in Pakistan. Premium skincare designed for brighter, healthier-looking skin with fast nationwide delivery from Azeeora Cosmetics.';
  }
  
  const images = product.images?.map((img: any) => img.url) || ['/logo.png'];
  const canonicalPath = product.seo?.canonicalUrl || `/products/${product.slug}`;
  const canonicalUrl = canonicalPath.startsWith('http') ? canonicalPath : new URL(canonicalPath, config.getBaseUrl()).toString();

  return {
    title,
    description,
    keywords: product.seo?.metaKeywords || product.tags,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: images.map((url: string) => ({ url })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
    robots: {
      index: product.isActive !== false,
      follow: product.isActive !== false,
    },
  };
}

export default async function ProductPageServer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  let jsonLdArray: any[] = [];
  if (product) {
    const settings = await getStoreSettings();
    const defaultShippingCost = settings?.defaultShippingCost ?? 200;

    const effectivePrice = getEffectivePrice(product);

    const productJsonLd: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || product.shortDescription,
      image: product.images?.map((img: any) => (img.url?.startsWith("/") ? `${config.getBaseUrl()}${img.url}` : img.url)),
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: typeof product.brand === 'object' ? product.brand?.name : (product.brand || 'AZEEORA COSMETICS'),
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'PKR',
        price: effectivePrice,
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: `${config.getBaseUrl()}/products/${product.slug}`,
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'PK',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 14,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility'
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'PK'
          },
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: defaultShippingCost,
            currency: 'PKR'
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 2,
              unitCode: 'DAY'
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 3,
              maxValue: 5,
              unitCode: 'DAY'
            }
          }
        }
      },
    };

    if (product.reviewCount > 0) {
      const allFetchedReviews = await getReviewsByProductId(product._id);
      const genuineReviews = allFetchedReviews.filter((r: any) => r.isApproved !== false);
      
      if (genuineReviews && genuineReviews.length > 0) {
        const actualReviewCount = genuineReviews.length;
        const actualRatingValue = genuineReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / actualReviewCount;

        productJsonLd.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: String(actualRatingValue.toFixed(1)),
          reviewCount: String(actualReviewCount),
        };

        productJsonLd.review = genuineReviews.map((r: any) => ({
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: r.user ? `${r.user.firstName} ${r.user.lastName?.[0] || ''}`.trim() : (r.guestName || 'Anonymous'),
          },
          datePublished: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : undefined,
          reviewBody: r.body,
          reviewRating: {
            '@type': 'Rating',
            ratingValue: String(r.rating),
            bestRating: '5',
            worstRating: '1',
          }
        }));
      }
    }

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
          name: 'Products',
          item: `${config.getBaseUrl()}/shop`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.name,
          item: `${config.getBaseUrl()}/products/${product.slug}`,
        },
      ],
    };

    jsonLdArray = [productJsonLd, breadcrumbJsonLd];
  }

  return (
    <>
      {jsonLdArray.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArray) }}
        />
      )}
      <ProductPageClient initialProductData={product} />
    </>
  );
}

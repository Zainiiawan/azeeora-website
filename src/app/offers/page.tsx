import { serverFetch } from '@/lib/serverFetch';
import { Metadata } from 'next';
import ProductCard from '@/components/products/ProductCard';
import { getEffectivePrice } from '@/lib/productUtils';
import { Product } from '@/lib/api/productApi';

export const metadata: Metadata = {
  title: 'Special Offers | AZEEORA COSMETICS',
  description: 'Exclusive deals on luxury beauty — limited time only.',
  alternates: {
    canonical: '/offers',
  },
};

export default async function OffersPage() {
  let products: Product[] = [];

  try {
    const res = await serverFetch(`/products?limit=100`, {
      next: { tags: ['products'], revalidate: 3600 },
    });
    
    if (res.ok) {
      const data = await res.json();
      const allProducts: Product[] = data.data?.products || [];
      
      // Filter for active offers
      products = allProducts.filter((p) => {
        const effective = getEffectivePrice(p);
        return (p.discount && p.discount.value > 0) || (p.compareAtPrice && p.compareAtPrice > effective);
      });
    }
  } catch (error) {
    console.error('Failed to fetch offers:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-rose-gold text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-serif font-bold mb-4">Special Offers</h1>
          <p className="text-white/90">Exclusive deals on luxury beauty — limited time only</p>
        </div>
      </section>
      <div className="container mx-auto px-4 py-10">
        {products.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No active offers right now. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

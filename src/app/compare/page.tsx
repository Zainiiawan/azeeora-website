'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scale, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { productApi, Product } from '@/lib/api/productApi';
import { formatPrice } from '@/lib/utils';

const COMPARE_KEY = 'azeeora_compare';

export default function ComparePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const slugs: string[] = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');
        if (!slugs.length) {
          setProducts([]);
          return;
        }
        const fetched = await Promise.all(
          slugs.map((slug) => productApi.getBySlug(slug).catch(() => null))
        );
        setProducts(fetched.filter(Boolean) as Product[]);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleRemove = (slug: string) => {
    const slugs: string[] = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');
    const updated = slugs.filter((s) => s !== slug);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(updated));
    setProducts((prev) => prev.filter((p) => p.slug !== slug));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Scale className="w-12 h-12 text-rose-gold mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-2">No products to compare</h2>
          <p className="text-gray-600 mb-6">Add products from the shop to compare them side by side.</p>
          <Link href="/shop"><Button>Browse Products</Button></Link>
        </div>
      </div>
    );
  }

  const specKeys = ['Brand', 'Category', 'Price', 'Rating', 'Stock', 'SKU'];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-serif font-bold mb-8">Compare Products</h1>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm min-w-[600px]">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left text-sm text-gray-500 w-32">Feature</th>
                {products.map((p) => (
                  <th key={p._id} className="p-4 text-center min-w-[180px]">
                    <button onClick={() => handleRemove(p.slug)} className="float-right text-gray-400 hover:text-red-500" aria-label="Remove">
                      <X className="w-4 h-4" />
                    </button>
                    <img src={p.images?.[0]?.url} alt={p.name} className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                    <p className="font-medium text-sm">{p.name}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specKeys.map((key) => (
                <tr key={key} className="border-b">
                  <td className="p-4 text-sm font-medium text-gray-600">{key}</td>
                  {products.map((p) => (
                    <td key={p._id} className="p-4 text-center text-sm">
                      {key === 'Brand' && (typeof p.brand === 'object' ? p.brand?.name : p.brand || '—')}
                      {key === 'Category' && (typeof p.category === 'object' ? p.category?.name : p.category || '—')}
                      {key === 'Price' && formatPrice(p.basePrice)}
                      {key === 'Rating' && `${p.rating} (${p.reviewCount} reviews)`}
                      {key === 'Stock' && (p.stock > 0 ? `${p.stock} in stock` : 'Out of stock')}
                      {key === 'SKU' && (p.sku || '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

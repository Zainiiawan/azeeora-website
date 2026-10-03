'use client';

import { displayName } from '@/lib/utils';
import { m as motion } from 'framer-motion';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { categoryApi } from '@/lib/api/categoryApi';

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });

  return (
    <div className="min-h-screen maison-backdrop">
      <div className="border-b border-black/5">
        <div className="container mx-auto px-4 pt-16 pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="eyebrow text-rose-gold-dark mb-5">Our collections</p>
            <h1 className="display text-5xl md:text-7xl text-[#1c1714] mb-5">Shop by ritual</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore our carefully curated categories designed to enhance your natural beauty
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, index) => (
              <motion.div
                key={category._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/categories/${category.slug}`} className="block group">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-luxury transition-all duration-300">
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                      {category.image?.url ? (
                        <img
                          src={category.image.url}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-gray-400 text-lg">Category Image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-rose-gold/0 group-hover:bg-rose-gold/10 transition-colors" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-serif font-bold text-black mb-2 group-hover:text-rose-gold transition-colors">
                        {displayName(category.name)}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {category.description ?? 'Explore our collection'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {category.productCount ?? 0} Products
                        </span>
                        <span className="inline-flex items-center text-rose-gold font-medium group-hover:gap-2 transition-all">
                          Explore
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { displayName, optimizeCloudinaryUrl } from '@/lib/utils';
import { m as motion } from 'framer-motion';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '@/lib/api/categoryApi';

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });

  return (
    <div className="bg-white">
      <section className="px-5 sm:px-8 lg:px-10 pt-14 pb-12 border-b border-line">
        <nav className="caps-sm text-muted mb-8 flex gap-2" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">Ayeza</Link>
          <span>/</span>
          <span className="text-ink">Collections</span>
        </nav>
        <h1 className="title text-[2.6rem] sm:text-6xl text-ink">
          Collections<sup className="text-[0.32em] ml-1.5 align-super tracking-normal">({categories.length})</sup>
        </h1>
        <p className="mt-6 max-w-lg text-[0.95rem] text-gray-600 leading-relaxed">
          Each collection answers one step of a considered daily ritual.
        </p>
      </section>

      <section className="p-2 sm:p-3">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-2 sm:gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-tile animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-2 sm:gap-3 ${categories.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {categories.map((category, index) => (
              <motion.div
                key={category._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.08, duration: 0.8 }}
              >
                <Link href={`/categories/${category.slug}`} className="group block">
                  <div className="relative aspect-[4/5] bg-tile overflow-hidden">
                    {category.image?.url && (
                      <img
                        src={optimizeCloudinaryUrl(category.image.url, 1400)}
                        alt={displayName(category.name)}
                        className="absolute inset-0 w-full h-full object-cover reveal-img group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="pt-4 pb-8 px-1 flex items-start justify-between gap-6">
                    <div>
                      <h2 className="title text-xl text-ink">{displayName(category.name)}</h2>
                      {category.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2 max-w-md">{category.description}</p>
                      )}
                    </div>
                    <span className="caps text-muted shrink-0">{category.productCount ?? 0} items</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

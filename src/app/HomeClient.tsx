'use client';

import Link from 'next/link';
import { m as motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { categoryApi, Category } from '@/lib/api/categoryApi';
import { Product } from '@/lib/api/productApi';
import ProductCard from '@/components/products/ProductCard';
import Wordmark from '@/components/brand/Wordmark';
import { displayName, optimizeCloudinaryUrl } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 1, ease },
};

const services = [
  { title: 'Complimentary delivery', body: 'On every order over PKR 5,000, anywhere in Pakistan.' },
  { title: 'Cash on delivery', body: 'Or pay by JazzCash and Easypaisa.' },
  { title: 'Gift wrapping', body: 'Every order is wrapped by hand.' },
  { title: 'Client care', body: 'Monday to Saturday, 10am to 8pm.' },
];

const faqs = [
  {
    q: 'Are Azeeora Cosmetics products safe for sensitive skin?',
    a: 'Yes, our products are formulated with gentle, skin-loving ingredients. However, we always recommend patch-testing any new product before full application.',
  },
  {
    q: 'How long does shipping take within Pakistan?',
    a: 'Standard shipping typically takes 3-5 business days across Pakistan. We offer free shipping on all orders over PKR 5,000.',
  },
  {
    q: 'Are your products cruelty-free?',
    a: 'Absolutely! Azeeora Cosmetics is 100% cruelty-free. We never test our formulations or ingredients on animals.',
  },
];

const mainImage = (p?: Product) => (p?.images?.find((i) => i.isMain) ?? p?.images?.[0])?.url ?? '';

export default function HomeClient({
  initialCategories,
  bestsellers,
}: {
  initialCategories: Category[];
  bestsellers: Product[];
}) {
  const { data: categories = initialCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
    initialData: initialCategories,
    staleTime: 0,
    refetchOnMount: true,
  });

  const hero = bestsellers.find((p) => p.images?.length);
  const editorial = bestsellers.find((p) => p._id !== hero?._id && p.images?.length) ?? hero;
  const heroSrc = hero ? optimizeCloudinaryUrl(mainImage(hero), 2400) : '';

  return (
    <div className="bg-white">
      {/* ── Wordmark opening ────────────────────────────────── */}
      <section className="px-3 sm:px-6 pt-8 lg:pt-12 pb-10 lg:pb-14 flex justify-center overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, ease }}>
          <Wordmark className="text-[14vw] lg:text-[10.5vw]" subline="Cosmetics · Pakistan" sublineSize="max(0.08em, 9px)" priority />
        </motion.div>
      </section>

      {/* ── Campaign ─────────────────────────────────────────── */}
      {hero && (
        <section>
          <Link href={`/products/${hero.slug}`} className="block relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] overflow-hidden bg-tile">
            <motion.img
              src={heroSrc}
              alt={hero.name}
              fetchPriority="high"
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.8, delay: 0.2, ease }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </Link>
          <div className="px-5 sm:px-8 lg:px-10 pt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div>
              <p className="caps text-muted mb-2">The signature</p>
              <h1 className="title text-2xl sm:text-4xl text-ink">{hero.name}</h1>
            </div>
            <div className="flex gap-8 pb-1">
              <Link href={`/products/${hero.slug}`} className="caps u-link">
                Discover
              </Link>
              <Link href="/shop" className="caps u-link">
                Shop all
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Introduction ─────────────────────────────────────── */}
      <section className="px-6 py-24 lg:py-36">
        <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
          <p className="caps text-muted mb-8">Azeeora · Pakistan</p>
          <p className="editorial text-[1.9rem] sm:text-[2.6rem] text-ink">
            Considered skincare, made to be used every day and kept for the way it makes you feel.
          </p>
        </motion.div>
      </section>

      {/* ── Collections ──────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="px-2 sm:px-3">
          <div className={`grid gap-2 sm:gap-3 ${categories.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {categories.slice(0, 3).map((c, i) => (
              <motion.div key={c._id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }}>
                <Link href={`/categories/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-tile">
                  {c.image?.url && (
                    <img
                      src={optimizeCloudinaryUrl(c.image.url, 1400)}
                      alt={displayName(c.name)}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover reveal-img group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/45 to-transparent" />
                  <div className="absolute left-5 bottom-5 sm:left-7 sm:bottom-7 text-white">
                    <h2 className="title !text-white text-2xl sm:text-3xl">{displayName(c.name)}</h2>
                    <span className="caps u-link mt-3 inline-block">Discover</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bestsellers ──────────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="pt-24 lg:pt-32">
          <div className="px-5 sm:px-8 lg:px-10 flex items-end justify-between mb-8">
            <h2 className="title text-2xl sm:text-3xl text-ink">Bestsellers</h2>
            <Link href="/shop" className="caps u-hover">
              View all
            </Link>
          </div>
          <div
            className={`grid grid-cols-2 gap-x-2 sm:gap-x-3 px-2 sm:px-3 ${
              bestsellers.length >= 4 ? 'lg:grid-cols-4' : bestsellers.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
            }`}
          >
            {bestsellers.slice(0, 8).map((p, i) => (
              <ProductCard key={p._id} product={p} priority={i < 2} />
            ))}
          </div>
        </section>
      )}

      {/* ── Editorial ────────────────────────────────────────── */}
      {editorial && (
        <section className="mt-20 lg:mt-28 grid lg:grid-cols-2 border-y border-line">
          <div className="relative aspect-square lg:aspect-auto lg:min-h-[720px] bg-tile overflow-hidden">
            <img
              src={optimizeCloudinaryUrl(mainImage(editorial), 1600)}
              alt={editorial.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <motion.div {...fadeUp} className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-16 lg:py-0">
            <p className="caps text-muted mb-6">The ritual</p>
            <h2 className="editorial text-[2.2rem] sm:text-5xl text-ink max-w-md">Cleanse in the morning. Restore by night.</h2>
            <p className="mt-6 text-gray-600 leading-relaxed max-w-md">
              Two steps, chosen with care. {editorial.name} is formulated for skin that looks rested, even and quietly
              luminous.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href={`/products/${editorial.slug}`} className="btn-ink">
                Discover
              </Link>
              <Link href="/categories" className="btn-line">
                All collections
              </Link>
            </div>
          </motion.div>
        </section>
      )}

      {/* ── Services ─────────────────────────────────────────── */}
      <section className="bg-tile mt-20 lg:mt-28">
        <div className="px-5 sm:px-8 lg:px-10 py-14 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {services.map((s) => (
            <div key={s.title}>
              <p className="caps text-ink mb-2">{s.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-24 lg:py-32">
        <div className="max-w-3xl mx-auto">
          <h2 className="title text-2xl sm:text-3xl text-ink text-center mb-12">Questions</h2>
          <div className="border-t border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-6 cursor-pointer list-none">
                  <h3 className="text-[0.95rem] text-ink font-normal tracking-wide">{f.q}</h3>
                  <Plus className="w-4 h-4 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.2} />
                </summary>
                <p className="pb-6 -mt-1 text-gray-600 leading-relaxed text-[0.95rem]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            }),
          }}
        />
      </section>
    </div>
  );
}

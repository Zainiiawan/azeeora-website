'use client';

import { m as motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Plus } from 'lucide-react';
import { categoryApi, Category } from '@/lib/api/categoryApi';
import { Product } from '@/lib/api/productApi';
import ProductCard from '@/components/products/ProductCard';
import { displayName, formatPrice, optimizeCloudinaryUrl } from '@/lib/utils';
import { getEffectivePrice } from '@/lib/productUtils';

const ease = [0.22, 1, 0.36, 1] as const;

const reveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 1.1, ease },
};

const promises = [
  { title: 'Crafted with intention', body: 'Gentle, skin-loving formulas chosen for results you can see and feel.' },
  { title: 'Never tested on animals', body: 'Every Ayeza formula is cruelty-free, from the first trial to the last bottle.' },
  { title: 'Delivered to your door', body: 'Complimentary delivery across Pakistan on orders over PKR 5,000.' },
];

const faqs = [
  {
    q: 'Are Ayeza Cosmetics products safe for sensitive skin?',
    a: 'Yes, our products are formulated with gentle, skin-loving ingredients. However, we always recommend patch-testing any new product before full application.',
  },
  {
    q: 'How long does shipping take within Pakistan?',
    a: 'Standard shipping typically takes 3-5 business days across Pakistan. We offer free shipping on all orders over PKR 5,000.',
  },
  {
    q: 'Are your products cruelty-free?',
    a: 'Absolutely! Ayeza Cosmetics is 100% cruelty-free. We never test our formulations or ingredients on animals.',
  },
];

const imageOf = (c?: Category, w = 1600) => (c?.image?.url ? optimizeCloudinaryUrl(c.image.url, w) : '');

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

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const heroFade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const heroProduct = bestsellers.find((p) => p.images?.length);
  const heroImage = heroProduct
    ? optimizeCloudinaryUrl((heroProduct.images.find((i) => i.isMain) ?? heroProduct.images[0]).url, 1200)
    : imageOf(categories.find((c) => c.image?.url), 1200);

  const [lead, ...rest] = categories;
  const ritual = categories.slice(0, 3);

  return (
    <div className="flex flex-col bg-[var(--background)]">
      {/* ================= HERO ================= */}
      <section ref={heroRef} className="relative min-h-[100svh] overflow-hidden bg-[#1c1714] text-white">
        <div className="absolute -top-40 -left-40 w-[620px] h-[620px] rounded-full bg-rose-gold/25 blur-[140px]" aria-hidden />
        <div className="absolute bottom-[-200px] right-[-120px] w-[560px] h-[560px] rounded-full bg-[#ead7d1]/15 blur-[130px]" aria-hidden />

        <div className="relative z-10 max-w-[1440px] mx-auto px-6 sm:px-10 pt-[136px] pb-16 lg:pb-0 min-h-[100svh] grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <motion.div style={{ opacity: heroFade }} className="lg:col-span-6 xl:col-span-6 order-2 lg:order-1 text-center lg:text-left">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease }}
              className="eyebrow text-[#e9dccb] mb-8"
            >
              Maison Ayeza · Haute Skincare
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.35, ease }}
              className="display !text-[#f7f3ee] text-[3.3rem] sm:text-7xl xl:text-[6.6rem]"
            >
              The Art of
              <br />
              <em className="italic text-[#e9dccb]">Radiance</em>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6, ease }}
              className="mt-8 max-w-md mx-auto lg:mx-0 text-base sm:text-lg text-white/70 font-light leading-relaxed"
            >
              Premium skincare, beauty creams and face washes, composed for luminous, healthy skin. Made for the women of
              Pakistan.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.8, ease }}
              className="mt-12 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/shop" className="btn-lux bg-[#f7f3ee] text-[#1c1714] hover:bg-rose-gold hover:text-white">
                Discover the collection
              </Link>
              <Link href="/categories" className="btn-lux glass-dark hover:bg-white/15">
                Explore rituals
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            style={{ y: heroY }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, delay: 0.2, ease }}
            className="lg:col-span-6 order-1 lg:order-2 relative mx-auto w-full max-w-[300px] sm:max-w-[400px] xl:max-w-[460px]"
          >
            {/* Arched frame */}
            <div className="relative aspect-[3/4] rounded-t-[999px] overflow-hidden bg-[#2a221d] ring-1 ring-white/10">
              {heroImage ? (
                <img src={heroImage} alt={heroProduct?.name ?? ''} className="w-full h-full object-cover animate-slow-zoom" fetchPriority="high" />
              ) : (
                <div className="w-full h-full maison-backdrop" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1714]/50 via-transparent to-transparent" />
            </div>
            {/* thin outline arch offset behind */}
            <div className="absolute -inset-4 sm:-inset-6 rounded-t-[999px] border border-[#e9dccb]/25 -z-10" aria-hidden />

            {heroProduct && (
              <Link
                href={`/products/${heroProduct.slug}`}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:-right-10 w-[88%] sm:w-auto sm:min-w-[260px] glass-dark glass-sheen px-6 py-5 group"
              >
                <p className="eyebrow !text-[0.55rem] text-[#e9dccb] mb-1.5">The icon</p>
                <p className="font-serif text-xl text-white">{heroProduct.name}</p>
                <p className="mt-1 text-xs tracking-[0.14em] text-white/70 flex items-center gap-2">
                  {formatPrice(getEffectivePrice(heroProduct))}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={1.25} />
                </p>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* ================= MANIFESTO ================= */}
      <section className="py-28 sm:py-40 px-6">
        <motion.div {...reveal} className="max-w-4xl mx-auto text-center">
          <p className="eyebrow text-rose-gold-dark mb-10">The Maison</p>
          <h2 className="display text-[2.2rem] sm:text-5xl lg:text-6xl text-[#1c1714]">
            Beauty is not added. It is <em className="italic text-rose-gold-dark">revealed</em>, one quiet ritual at a time.
          </h2>
          <div className="hairline w-40 mx-auto mt-14" />
        </motion.div>
      </section>

      {/* ================= COLLECTIONS ================= */}
      {categories.length > 0 && (
        <section className="px-4 sm:px-8 pb-28 sm:pb-36">
          <div className="max-w-[1440px] mx-auto">
            <motion.div {...reveal} className="flex items-end justify-between mb-12 sm:mb-16 gap-6">
              <div>
                <p className="eyebrow text-rose-gold-dark mb-4">Collections</p>
                <h2 className="display text-4xl sm:text-6xl text-[#1c1714]">Shop by ritual</h2>
              </div>
              <Link href="/categories" className="hidden sm:inline-flex eyebrow link-underline pb-1 text-[#1c1714] items-center gap-2">
                All collections <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.25} />
              </Link>
            </motion.div>

            {categories.length < 3 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {categories.map((c) => (
                  <CategoryTile key={c._id} category={c} className="aspect-[4/5]" large />
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
              {lead && (
                <CategoryTile category={lead} className="md:col-span-7 md:row-span-2 aspect-[4/5] md:aspect-auto md:min-h-[760px]" large />
              )}
              {rest.slice(0, 2).map((c) => (
                <CategoryTile key={c._id} category={c} className="md:col-span-5 aspect-[4/3] md:aspect-auto md:min-h-[368px]" />
              ))}
              {rest.slice(2).map((c) => (
                <CategoryTile key={c._id} category={c} className="md:col-span-4 aspect-[4/5]" />
              ))}
            </div>
            )}
          </div>
        </section>
      )}

      {/* ================= BESTSELLERS ================= */}
      {bestsellers.length > 0 && (
        <section className="maison-backdrop py-28 sm:py-36 px-4 sm:px-8">
          <div className="max-w-[1440px] mx-auto">
            <motion.div {...reveal} className="text-center mb-16">
              <p className="eyebrow text-rose-gold-dark mb-4">Most coveted</p>
              <h2 className="display text-4xl sm:text-6xl text-[#1c1714]">The icons</h2>
            </motion.div>
            <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-12">
              {bestsellers.slice(0, 8).map((p, i) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  priority={i < 4}
                  className="w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] max-w-[420px]"
                />
              ))}
            </div>
            <div className="text-center mt-16">
              <Link href="/shop" className="btn-lux border border-[#1c1714] text-[#1c1714] hover:bg-[#1c1714] hover:text-[#f7f3ee]">
                View all products
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================= THE RITUAL ================= */}
      {ritual.length > 0 && (
        <section className="py-28 sm:py-40 px-4 sm:px-8">
          <div className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            <motion.div {...reveal} className="relative aspect-[4/5] overflow-hidden bg-[#efe7dc]">
              {imageOf(ritual[ritual.length - 1] ?? ritual[0], 1400) && (
                <img
                  src={imageOf(ritual[ritual.length - 1] ?? ritual[0], 1400)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute left-6 right-6 bottom-6 glass p-6 sm:p-8">
                <p className="eyebrow text-rose-gold-dark mb-2">The Ayeza ritual</p>
                <p className="font-serif text-2xl sm:text-3xl text-[#1c1714]">A quiet ritual for a luminous complexion.</p>
              </div>
            </motion.div>

            <div>
              <motion.p {...reveal} className="eyebrow text-rose-gold-dark mb-6">
                Daily ritual
              </motion.p>
              <motion.h2 {...reveal} className="display text-4xl sm:text-6xl text-[#1c1714] mb-14">
                Cleanse, treat, <em className="italic">glow</em>.
              </motion.h2>
              <ol className="space-y-0">
                {ritual.map((c, i) => (
                  <motion.li key={c._id} {...reveal} transition={{ ...reveal.transition, delay: i * 0.12 }}>
                    <Link
                      href={`/categories/${c.slug}`}
                      className="group flex items-baseline gap-6 sm:gap-10 py-8 border-t border-black/10 last:border-b"
                    >
                      <span className="font-serif italic text-rose-gold text-2xl w-10">0{i + 1}</span>
                      <span className="flex-1">
                        <span className="block font-serif text-2xl sm:text-3xl text-[#1c1714] transition-colors duration-500 group-hover:text-rose-gold-dark">
                          {displayName(c.name)}
                        </span>
                        {c.description && (
                          <span className="block mt-2 text-sm text-gray-500 line-clamp-2 max-w-md">{c.description}</span>
                        )}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-[#1c1714] transition-transform duration-500 group-hover:translate-x-2"
                        strokeWidth={1.25}
                      />
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* ================= PROMISES ================= */}
      <section className="relative overflow-hidden bg-[#1c1714] py-28 sm:py-36 px-4 sm:px-8">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-rose-gold/25 blur-[120px]" aria-hidden />
        <div className="absolute -bottom-40 -right-20 w-[480px] h-[480px] rounded-full bg-[#ead7d1]/20 blur-[120px]" aria-hidden />
        <div className="relative max-w-[1240px] mx-auto">
          <motion.div {...reveal} className="text-center mb-16">
            <p className="eyebrow text-[#e9dccb] mb-4">Our promise</p>
            <h2 className="display !text-[#f7f3ee] text-4xl sm:text-6xl">Why Ayeza</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {promises.map((p, i) => (
              <motion.div
                key={p.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.12 }}
                className="glass-dark glass-sheen p-10 text-center"
              >
                <span className="font-serif italic text-rose-gold text-3xl">0{i + 1}</span>
                <h3 className="font-serif !text-[#f7f3ee] text-2xl mt-6 mb-4">{p.title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-28 sm:py-36 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div {...reveal} className="text-center mb-14">
            <p className="eyebrow text-rose-gold-dark mb-4">Questions</p>
            <h2 className="display text-4xl sm:text-5xl text-[#1c1714]">Frequently asked</h2>
          </motion.div>
          <div className="border-t border-black/10">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-black/10">
                <summary className="flex items-center justify-between gap-6 py-7 cursor-pointer list-none">
                  <h3 className="font-serif text-xl sm:text-2xl text-[#1c1714]">{f.q}</h3>
                  <Plus
                    className="w-4 h-4 shrink-0 text-rose-gold-dark transition-transform duration-500 group-open:rotate-45"
                    strokeWidth={1.25}
                  />
                </summary>
                <p className="pb-8 -mt-2 text-gray-600 leading-relaxed max-w-2xl">{f.a}</p>
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
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }),
          }}
        />
      </section>
    </div>
  );
}

function CategoryTile({ category, className, large }: { category: Category; className?: string; large?: boolean }) {
  const src = imageOf(category, large ? 1600 : 1000);
  return (
    <motion.div {...reveal} className={`relative overflow-hidden group bg-[#efe7dc] ${className ?? ''}`}>
      <Link href={`/categories/${category.slug}`} className="absolute inset-0">
        {src ? (
          <img
            src={src}
            alt={displayName(category.name)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 maison-backdrop" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1714]/45 via-transparent to-transparent" />
        <div className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-auto sm:bottom-6 glass glass-sheen px-6 py-5 sm:min-w-[280px]">
          <p className="eyebrow !text-[0.6rem] text-rose-gold-dark mb-1">
            {typeof category.productCount === 'number' && category.productCount > 0
              ? `${category.productCount} creations`
              : 'Collection'}
          </p>
          <div className="flex items-center justify-between gap-6">
            <h3 className={`font-serif text-[#1c1714] ${large ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{displayName(category.name)}</h3>
            <ArrowRight
              className="w-4 h-4 text-[#1c1714] transition-transform duration-500 group-hover:translate-x-1.5"
              strokeWidth={1.25}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

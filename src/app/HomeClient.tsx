'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { m as motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Plus, Truck, Banknote, Leaf, Gift } from 'lucide-react';
import { categoryApi, Category } from '@/lib/api/categoryApi';
import { Product } from '@/lib/api/productApi';
import ProductCard from '@/components/products/ProductCard';
import { blogPosts } from '@/lib/data/blog';
import { cn, displayName, optimizeCloudinaryUrl } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, ease },
};

const benefits = [
  { Icon: Truck, title: 'Free delivery', body: 'On orders over PKR 5,000 across Pakistan' },
  { Icon: Banknote, title: 'Cash on delivery', body: 'Or pay with JazzCash and Easypaisa' },
  { Icon: Leaf, title: 'Cruelty-free', body: 'Never tested on animals' },
  { Icon: Gift, title: 'Gift-ready', body: 'Every order wrapped with care' },
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-[0.85rem] uppercase tracking-[0.08em] text-muted">{children}</p>;
}

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

  const [tab, setTab] = useState<'best' | 'new'>('best');
  const newArrivals = useMemo(
    () =>
      [...bestsellers].sort(
        (a, b) =>
          new Date((b as { createdAt?: string }).createdAt ?? 0).getTime() -
          new Date((a as { createdAt?: string }).createdAt ?? 0).getTime()
      ),
    [bestsellers]
  );
  const shown = (tab === 'best' ? bestsellers : newArrivals).slice(0, 8);

  // Second hero panel features a real product (the cream if present)
  const featured = bestsellers.find((p) => /cream/i.test(p.name) && p.images?.length) ?? bestsellers.find((p) => p.images?.length);

  const circles = [
    ...categories.slice(0, 4).map((c) => ({
      name: displayName(c.name),
      href: `/categories/${c.slug}`,
      img: c.image?.url ? optimizeCloudinaryUrl(c.image.url, 400) : '',
    })),
    { name: 'All products', href: '/shop', img: '/blog/moisturizer-aloe.jpg' },
    { name: 'Offers', href: '/offers', img: '/blog/vitamin-c.jpg' },
    { name: 'Beauty tips', href: '/blog', img: '/blog/niacinamide.jpg' },
  ];

  const stories = blogPosts.slice(0, 3);

  return (
    <div className="bg-white">
      {/* ── Split hero ───────────────────────────────────────── */}
      <section className="grid lg:grid-cols-2 gap-1.5">
        <Link href="/shop" className="group relative block overflow-hidden aspect-[390/335] lg:aspect-auto lg:h-[min(calc(100vh-112px),820px)] lg:min-h-[540px]">
          <motion.img
            src="/blog/glow-serum.jpg"
            alt="Azeeora radiance serum on marble"
            fetchPriority="high"
            initial={{ scale: 1.04, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease }}
            className="absolute inset-0 w-full h-full object-cover object-[45%_center] transition-transform duration-[1.4s] group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-7 lg:bottom-14 text-center px-6">
            <h1 className="text-white font-light text-[1.9rem] sm:text-[2.6rem] lg:text-[3rem] leading-tight">Glow, beautifully simple</h1>
          </div>
        </Link>

        {featured && (
          <Link
            href={`/products/${featured.slug}`}
            className="group relative block overflow-hidden aspect-[390/335] lg:aspect-auto lg:h-[min(calc(100vh-112px),820px)] lg:min-h-[540px] bg-tile"
          >
            <motion.img
              src={optimizeCloudinaryUrl(mainImage(featured), 1600)}
              alt={featured.name}
              initial={{ scale: 1.04, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.15, ease }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.4s] group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-6 lg:bottom-12 flex justify-center px-6">
              <span className="btn-white w-full max-w-[500px] shadow-sm">Shop now</span>
            </div>
          </Link>
        )}
      </section>

      {/* ── Shop categories ──────────────────────────────────── */}
      <section className="pt-16 lg:pt-24 pb-4">
        <SectionLabel>Shop categories</SectionLabel>
        <div className="mt-9 flex gap-6 sm:gap-10 lg:gap-14 overflow-x-auto px-5 sm:px-8 lg:justify-center no-scrollbar">
          {circles.map((c) => (
            <Link key={c.href + c.name} href={c.href} className="group shrink-0 flex flex-col items-center gap-3.5 w-[92px] sm:w-[130px]">
              <span className="block w-[92px] h-[92px] sm:w-[130px] sm:h-[130px] rounded-full bg-tile overflow-hidden">
                {c.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.img} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
              </span>
              <span className="caps-sm text-ink text-center leading-snug">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bestsellers / New arrivals ───────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="pt-16 lg:pt-24">
          <div className="flex justify-center px-5" role="tablist">
            {(
              [
                ['best', 'Bestsellers'],
                ['new', 'New arrivals'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'w-[150px] sm:w-[260px] pb-3 text-[1rem] sm:text-[1.2rem] uppercase font-light border-b-2 transition-colors',
                  tab === key ? 'border-ink text-ink' : 'border-line text-muted hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-10 px-4 sm:px-5">
            {/* phones: swipeable row with a peek of the next card; desktop: up to four across, centred */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar lg:overflow-visible lg:flex-wrap lg:justify-center">
              {shown.map((p, i) => (
                <div key={p._id} className="snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-[calc(25%-12px)]">
                  <ProductCard product={p} priority={i < 2} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <Link href="/shop" className="btn-line">
              View all
            </Link>
          </div>
        </section>
      )}

      {/* ── Offers ───────────────────────────────────────────── */}
      <section className="px-4 sm:px-5 lg:px-10 pt-20 lg:pt-28">
        <motion.h2 {...fadeUp} className="title text-[2.1rem] sm:text-[2.8rem] lg:text-[3.4rem] text-ink mb-8 lg:mb-12">
          Don&rsquo;t miss these offers
        </motion.h2>
        <div className="grid lg:grid-cols-3 gap-4">
          <Link href="/blog/night-vs-day-skincare-routine" className="group relative block lg:col-span-2 aspect-[16/10] lg:aspect-auto lg:h-[520px] overflow-hidden bg-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/blog/day-night-cream.jpg" alt="Azeeora day and night creams" loading="lazy" className="absolute inset-0 w-full h-full object-cover reveal-img group-hover:scale-[1.03]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute left-6 bottom-6 lg:left-10 lg:bottom-10 text-white">
              <p className="text-[0.8rem] uppercase tracking-[0.1em] mb-2 opacity-90">The routine</p>
              <h3 className="text-white font-light text-[1.7rem] lg:text-[2.3rem] leading-tight">Day and night, sorted</h3>
              <span className="mt-4 inline-block text-[0.85rem] uppercase tracking-[0.06em] underline underline-offset-4">Read more</span>
            </div>
          </Link>

          <div className="bg-blush flex flex-col justify-between p-8 lg:p-10 min-h-[300px] lg:h-[520px]">
            <div>
              <p className="text-[0.8rem] uppercase tracking-[0.1em] text-ink/70 mb-4">Always on</p>
              <h3 className="font-light text-[1.9rem] lg:text-[2.4rem] text-ink leading-tight">Free delivery on orders over PKR 5,000</h3>
              <p className="mt-4 text-ink/80 font-light leading-relaxed">Cash on delivery anywhere in Pakistan. Every order gift-wrapped by hand.</p>
            </div>
            <div className="mt-8">
              <Link href="/shop" className="btn-ink">
                Shop now
              </Link>
            </div>
          </div>
        </div>

        {/* Brand banner */}
        <div className="mt-4 grid lg:grid-cols-2 bg-tile">
          <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[460px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/blog/moisturizer-aloe.jpg" alt="Azeeora moisturiser with aloe vera" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <motion.div {...fadeUp} className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
            <p className="text-[0.8rem] uppercase tracking-[0.1em] text-muted mb-4">Azeeora · Pakistan</p>
            <h3 className="font-light text-[1.9rem] lg:text-[2.6rem] text-ink leading-tight max-w-md">Skincare made for every day</h3>
            <p className="mt-5 text-gray-600 font-light leading-relaxed max-w-md">
              Gentle formulas with niacinamide, aloe vera and vitamin C, made for skin in our climate and priced for everyday use.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about" className="btn-ink">
                Our story
              </Link>
              <Link href="/categories" className="btn-line">
                Categories
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 lg:px-10 py-16 lg:py-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 max-w-6xl mx-auto">
          {benefits.map(({ Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <span className="w-16 h-16 rounded-full bg-blush flex items-center justify-center text-ink mb-4">
                <Icon className="w-7 h-7" strokeWidth={1.2} />
              </span>
              <p className="text-[0.95rem] text-ink uppercase tracking-[0.04em]">{title}</p>
              <p className="mt-1 text-[0.85rem] text-muted font-light">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Beauty tips ──────────────────────────────────────── */}
      <section className="px-4 sm:px-5 lg:px-10 pb-6">
        <div className="flex items-end justify-between mb-8 lg:mb-10">
          <h2 className="title text-[2.1rem] sm:text-[2.8rem] lg:text-[3.4rem] text-ink">Beauty tips</h2>
          <Link href="/blog" className="hidden sm:inline-flex btn-line">
            All articles
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10">
          {stories.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
              <div className="aspect-[16/10] overflow-hidden bg-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.featuredImage.url} alt={post.featuredImage.alt} loading="lazy" className="w-full h-full object-cover reveal-img group-hover:scale-[1.04]" />
              </div>
              <p className="mt-4 caps-sm text-muted">{post.categories[0] ?? 'Skincare'} · {post.readingTime}</p>
              <h3 className="mt-2 text-[1.2rem] font-light text-ink leading-snug group-hover:underline underline-offset-4">{post.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="title text-[2rem] sm:text-[2.6rem] text-ink text-center mb-10">Questions</h2>
          <div className="border-t border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-6 cursor-pointer list-none">
                  <h3 className="text-[1.02rem] text-ink font-normal">{f.q}</h3>
                  <Plus className="w-5 h-5 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.3} />
                </summary>
                <p className="pb-6 -mt-1 text-gray-600 font-light leading-relaxed">{f.a}</p>
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

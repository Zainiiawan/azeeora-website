'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Plus, Truck, Banknote, Leaf, Gift, ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { categoryApi, Category } from '@/lib/api/categoryApi';
import { Product } from '@/lib/api/productApi';
import ProductCard from '@/components/products/ProductCard';
import { blogPosts } from '@/lib/data/blog';
import { cn, displayName, optimizeCloudinaryUrl } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 1, ease },
};

export type Testimonial = { _id: string; rating: number; title: string; body: string; name: string; product: string; slug: string };

const slides = [
  {
    image: '/blog/glow-serum.jpg',
    position: 'center 40%',
    eyebrow: 'The new season',
    title: ['Radiance,', 'beautifully simple'],
    body: 'Considered skincare for every day, made for skin in our climate.',
    cta: { label: 'Shop now', href: '/shop' },
    cta2: { label: 'The catalogue', href: '/catalogue' },
  },
  {
    image: '/blog/day-night-cream.jpg',
    position: 'center',
    eyebrow: 'The ritual',
    title: ['Morning glow,', 'overnight repair'],
    body: 'Two steps, chosen with care, for skin that looks rested and quietly luminous.',
    cta: { label: 'Shop skincare', href: '/shop' },
    cta2: { label: 'Read the ritual', href: '/blog/night-vs-day-skincare-routine' },
  },
  {
    image: '/blog/vitamin-c.jpg',
    position: 'center 45%',
    eyebrow: 'Join Azeeora',
    title: ['Share what you love,', 'earn as you do'],
    body: 'Become a Brand Partner. Free to join, with earnings on every order you bring in.',
    cta: { label: 'Join us', href: '/join' },
    cta2: { label: 'How it works', href: '/join#how' },
  },
];

const promises = ['Cruelty-free', 'Free delivery over Rs 5,000', 'Cash on delivery nationwide', 'Wrapped by hand', 'Loyalty points on every order', 'Become a Brand Partner'];

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

function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), 7000);
    return () => clearTimeout(t);
  }, [i, paused]);
  const s = slides[i];

  return (
    <section
      className="relative h-[82svh] min-h-[560px] lg:h-[min(calc(100svh-112px),900px)] lg:min-h-[620px] overflow-hidden bg-[#1a1a1a]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={s.image}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease }}
        >
          <motion.img
            src={s.image}
            alt=""
            fetchPriority={i === 0 ? 'high' : 'auto'}
            initial={{ scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: 8, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: s.position }}
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/5 lg:bg-gradient-to-r lg:from-black/65 lg:via-black/25 lg:to-transparent" />

      <div className="relative h-full flex items-end lg:items-center px-6 sm:px-10 lg:px-20 pb-24 lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            className="max-w-xl text-white"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.9, ease, delay: 0.2 }}
          >
            <p className="eyebrow text-white/80">{s.eyebrow}</p>
            <h1 className="display mt-5 text-[2.9rem] sm:text-[4rem] lg:text-[5.2rem] text-white">
              {s.title[0]}
              <br />
              <em className="italic font-normal">{s.title[1]}</em>
            </h1>
            <p className="mt-6 text-[1.02rem] sm:text-[1.1rem] font-light text-white/85 max-w-md leading-relaxed">{s.body}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={s.cta.href} className="btn-white">{s.cta.label}</Link>
              <Link href={s.cta2.href} className="inline-flex items-center gap-2 min-h-[3rem] px-6 rounded-full border border-white/60 text-white text-[0.8rem] font-medium uppercase tracking-[0.06em] hover:bg-white/10 transition-colors">
                {s.cta2.label} <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute left-6 sm:left-10 lg:left-20 bottom-8 flex items-center gap-5 text-white">
        <span className="text-[0.8rem] tracking-[0.2em] tabular-nums">{String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
        <div className="flex gap-2">
          {slides.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} className="relative w-10 sm:w-14 h-[2px] bg-white/30 overflow-hidden">
              {n === i && (
                <motion.span
                  key={`${i}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-white"
                  initial={{ width: paused ? '100%' : '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: paused ? 0 : 7, ease: 'linear' }}
                />
              )}
              {n < i && <span className="absolute inset-0 bg-white/70" />}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute right-6 sm:right-10 bottom-6 hidden sm:flex gap-2">
        <button onClick={() => setI((i - 1 + slides.length) % slides.length)} aria-label="Previous slide" className="w-11 h-11 rounded-full border border-white/50 text-white flex items-center justify-center hover:bg-white hover:text-ink transition-colors">
          <ChevronLeft className="w-5 h-5" strokeWidth={1.3} />
        </button>
        <button onClick={() => setI((i + 1) % slides.length)} aria-label="Next slide" className="w-11 h-11 rounded-full border border-white/50 text-white flex items-center justify-center hover:bg-white hover:text-ink transition-colors">
          <ChevronRight className="w-5 h-5" strokeWidth={1.3} />
        </button>
      </div>
    </section>
  );
}

function Marquee() {
  const row = [...promises, ...promises];
  return (
    <div className="bg-blush overflow-hidden border-y border-[#e3cfc8]" aria-hidden>
      <div className="flex w-max animate-[marquee_38s_linear_infinite] py-4">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0">
            {row.map((p, n) => (
              <span key={`${k}-${n}`} className="flex items-center font-serif italic text-[1.25rem] sm:text-[1.4rem] text-ink px-7">
                {p}
                <span className="ml-14 text-rose not-italic text-[0.9rem]">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, children, center }: { eyebrow?: string; title: React.ReactNode; children?: React.ReactNode; center?: boolean }) {
  return (
    <motion.div {...fadeUp} className={cn('mb-10 lg:mb-14', center && 'text-center')}>
      {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
      <h2 className="title mt-3 text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] text-ink">{title}</h2>
      {children}
    </motion.div>
  );
}

export default function HomeClient({
  initialCategories,
  bestsellers,
  testimonials = [],
}: {
  initialCategories: Category[];
  bestsellers: Product[];
  testimonials?: Testimonial[];
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

  const wash = bestsellers.find((p) => /wash|cleans/i.test(p.name) && p.images?.length);
  const cream = bestsellers.find((p) => /cream/i.test(p.name) && p.images?.length);

  const circles = [
    ...categories.slice(0, 4).map((c) => ({
      name: displayName(c.name),
      href: `/categories/${c.slug}`,
      img: c.image?.url ? optimizeCloudinaryUrl(c.image.url, 400) : '',
    })),
    { name: 'All products', href: '/shop', img: '/blog/moisturizer-aloe.jpg' },
    { name: 'Catalogue', href: '/catalogue', img: '/blog/vitamin-c.jpg' },
    { name: 'Beauty tips', href: '/blog', img: '/blog/niacinamide.jpg' },
  ];

  const ritual = [
    { n: '01', title: 'Cleanse', body: 'A gentle, foaming wash that clears the day without stripping.', img: wash ? optimizeCloudinaryUrl(mainImage(wash), 900) : '/blog/niacinamide.jpg', href: wash ? `/products/${wash.slug}` : '/shop' },
    { n: '02', title: 'Treat', body: 'Targeted care with vitamin C and niacinamide for an even, bright tone.', img: '/blog/glow-serum.jpg', href: '/blog/achieve-glass-skin-with-glow-serum' },
    { n: '03', title: 'Nourish', body: 'Seal in moisture morning and night for skin that feels soft and rested.', img: cream ? optimizeCloudinaryUrl(mainImage(cream), 900) : '/blog/day-night-cream.jpg', href: cream ? `/products/${cream.slug}` : '/shop' },
  ];

  const [q, setQ] = useState(0);
  useEffect(() => {
    if (testimonials.length < 2) return;
    const t = setTimeout(() => setQ((n) => (n + 1) % testimonials.length), 8000);
    return () => clearTimeout(t);
  }, [q, testimonials.length]);

  const stories = blogPosts.slice(0, 3);

  return (
    <div className="bg-white">
      <Hero />
      <Marquee />

      {/* ── Shop categories ──────────────────────────────────── */}
      <section className="pt-20 lg:pt-28 pb-4">
        <motion.div {...fadeUp} className="text-center px-5">
          <p className="eyebrow text-muted">Explore</p>
          <h2 className="title mt-3 text-[2.2rem] sm:text-[2.8rem] text-ink">Shop by category</h2>
        </motion.div>
        <div className="mt-10 flex gap-6 sm:gap-10 lg:gap-14 overflow-x-auto px-5 sm:px-8 lg:justify-center no-scrollbar">
          {circles.map((c, n) => (
            <motion.div key={c.href + c.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: n * 0.06, ease }}>
              <Link href={c.href} className="group shrink-0 flex flex-col items-center gap-4 w-[96px] sm:w-[140px]">
                <span className="block w-[96px] h-[96px] sm:w-[140px] sm:h-[140px] rounded-full bg-tile overflow-hidden ring-1 ring-line ring-offset-4 ring-offset-white transition-all duration-500 group-hover:ring-ink">
                  {c.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.img} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  )}
                </span>
                <span className="caps-sm text-ink text-center leading-snug">{c.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bestsellers / New arrivals ───────────────────────── */}
      {bestsellers.length > 0 && (
        <section className="pt-20 lg:pt-28">
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
                  'w-[150px] sm:w-[260px] pb-3 font-serif text-[1.4rem] sm:text-[1.8rem] border-b transition-colors',
                  tab === key ? 'border-ink text-ink' : 'border-line text-muted hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-12 px-4 sm:px-5">
            <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar lg:overflow-visible lg:flex-wrap lg:justify-center">
              {shown.map((p, i) => (
                <div key={p._id} className="snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-[calc(25%-12px)]">
                  <ProductCard product={p} priority={i < 2} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <Link href="/shop" className="btn-line">View all</Link>
          </div>
        </section>
      )}

      {/* ── The ritual ───────────────────────────────────────── */}
      <section className="mt-24 lg:mt-32 bg-tile px-4 sm:px-6 lg:px-11 py-20 lg:py-28">
        <SectionHead eyebrow="The Azeeora ritual" title={<>Three steps to <em className="italic">luminous</em> skin</>} center />
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {ritual.map((r, n) => (
            <motion.div key={r.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.9, delay: n * 0.12, ease }}>
              <Link href={r.href} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt={r.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.4s] group-hover:scale-[1.05]" />
                </div>
                <div className="pt-6 flex items-baseline gap-5">
                  <span className="font-serif italic text-[2.6rem] leading-none text-rose">{r.n}</span>
                  <div>
                    <h3 className="font-serif text-[1.9rem] text-ink leading-none">{r.title}</h3>
                    <p className="mt-3 text-[0.95rem] text-gray-600 font-light leading-relaxed max-w-xs">{r.body}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[0.8rem] uppercase tracking-[0.12em] text-ink border-b border-ink pb-1 group-hover:gap-3 transition-all">
                      Discover <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Offers ───────────────────────────────────────────── */}
      <section className="px-4 sm:px-5 lg:px-10 pt-24 lg:pt-32">
        <SectionHead eyebrow="Limited time" title={<>Don&rsquo;t miss these <em className="italic">offers</em></>} />
        <div className="grid lg:grid-cols-3 gap-4">
          <Link href="/catalogue" className="group relative block lg:col-span-2 aspect-[16/10] lg:aspect-auto lg:h-[560px] overflow-hidden bg-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/blog/day-night-cream.jpg" alt="Azeeora day and night creams" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.4s] group-hover:scale-[1.04]" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute left-6 bottom-6 lg:left-12 lg:bottom-12 text-white">
              <p className="eyebrow text-white/80">The catalogue</p>
              <h3 className="display mt-3 text-white text-[2.2rem] lg:text-[3.2rem]">This season&rsquo;s <em className="italic">favourites</em></h3>
              <span className="mt-5 inline-flex items-center gap-2 text-[0.8rem] uppercase tracking-[0.12em] border-b border-white pb-1">
                Browse the catalogue <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </span>
            </div>
          </Link>

          <div className="bg-blush flex flex-col justify-between p-8 lg:p-12 min-h-[320px] lg:h-[560px]">
            <div>
              <p className="eyebrow text-ink/60">Always on</p>
              <h3 className="font-serif text-[2.2rem] lg:text-[2.8rem] text-ink leading-[1.05] mt-4">
                Free delivery on orders over <em className="italic">Rs 5,000</em>
              </h3>
              <p className="mt-5 text-ink/75 font-light leading-relaxed">Cash on delivery anywhere in Pakistan. Every order gift-wrapped by hand.</p>
            </div>
            <div className="mt-8">
              <Link href="/shop" className="btn-ink">Shop now</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="px-6 sm:px-10 pt-24 lg:pt-32">
          <div className="max-w-4xl mx-auto text-center">
            <p className="eyebrow text-muted">In their words</p>
            <div className="mt-8 flex justify-center gap-1 text-ink" aria-label={`${testimonials[q].rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('w-4 h-4', n <= testimonials[q].rating ? 'fill-current' : 'text-gray-300')} strokeWidth={1} />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.blockquote key={testimonials[q]._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.7, ease }}>
                <p className="editorial mt-6 text-[1.7rem] sm:text-[2.3rem] lg:text-[2.6rem] text-ink">
                  &ldquo;{testimonials[q].body.length > 220 ? testimonials[q].body.slice(0, 217).trimEnd() + '…' : testimonials[q].body}&rdquo;
                </p>
                <footer className="mt-8 text-[0.85rem] uppercase tracking-[0.14em] text-muted">
                  {testimonials[q].name} ·{' '}
                  <Link href={`/products/${testimonials[q].slug}`} className="underline underline-offset-4 hover:text-ink">
                    {testimonials[q].product}
                  </Link>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
            {testimonials.length > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {testimonials.map((t, n) => (
                  <button key={t._id} onClick={() => setQ(n)} aria-label={`Review ${n + 1}`} className={cn('h-[2px] transition-all', n === q ? 'w-10 bg-ink' : 'w-5 bg-line')} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Brand Partner banner ─────────────────────────────── */}
      <section className="px-4 sm:px-5 lg:px-10 pt-24 lg:pt-32">
        <div className="relative overflow-hidden min-h-[480px] lg:min-h-[560px] flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/blog/moisturizer-aloe.jpg" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
          <motion.div {...fadeUp} className="relative px-8 sm:px-14 lg:px-20 py-14 max-w-2xl text-white">
            <p className="eyebrow text-white/75">Brand Partners</p>
            <h2 className="display mt-4 text-white text-[2.6rem] sm:text-[3.6rem] lg:text-[4.2rem]">
              Beauty that <em className="italic">pays you back</em>
            </h2>
            <p className="mt-6 text-white/85 font-light text-[1.05rem] leading-relaxed max-w-lg">
              Share Azeeora with friends and family, earn on every order they place and enjoy partner prices on your own. Free to join.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/join" className="btn-white">Become a partner</Link>
              <Link href="/business" className="inline-flex items-center min-h-[3rem] px-6 rounded-full border border-white/60 text-white text-[0.8rem] font-medium uppercase tracking-[0.06em] hover:bg-white/10 transition-colors">
                Wholesale for business
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 lg:px-10 py-20 lg:py-28">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 max-w-6xl mx-auto">
          {benefits.map(({ Icon, title, body }, n) => (
            <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: n * 0.08, ease }} className="flex flex-col items-center text-center">
              <span className="w-16 h-16 rounded-full border border-line flex items-center justify-center text-ink mb-5">
                <Icon className="w-6 h-6" strokeWidth={1.1} />
              </span>
              <p className="font-serif text-[1.35rem] text-ink">{title}</p>
              <p className="mt-1 text-[0.85rem] text-muted font-light">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Beauty tips ──────────────────────────────────────── */}
      <section className="px-4 sm:px-5 lg:px-10 pb-6">
        <div className="flex items-end justify-between">
          <SectionHead eyebrow="The journal" title={<>Beauty <em className="italic">notes</em></>} />
          <Link href="/blog" className="hidden sm:inline-flex btn-line mb-14">All articles</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-12">
          {stories.map((post, n) => (
            <motion.div key={post.slug} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: n * 0.1, ease }}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.featuredImage.url} alt={post.featuredImage.alt} loading="lazy" className="w-full h-full object-cover transition-transform duration-[1.4s] group-hover:scale-[1.05]" />
                </div>
                <p className="mt-5 caps-sm text-muted">{post.categories[0] ?? 'Skincare'} · {post.readingTime}</p>
                <h3 className="mt-2 font-serif text-[1.6rem] text-ink leading-tight group-hover:underline underline-offset-4 decoration-1">{post.title}</h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-24 lg:py-32">
        <div className="max-w-3xl mx-auto">
          <SectionHead eyebrow="Client care" title="Questions" center />
          <div className="border-t border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-7 cursor-pointer list-none">
                  <h3 className="font-serif text-[1.35rem] text-ink font-normal">{f.q}</h3>
                  <Plus className="w-5 h-5 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.2} />
                </summary>
                <p className="pb-7 -mt-1 text-gray-600 font-light leading-relaxed">{f.a}</p>
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

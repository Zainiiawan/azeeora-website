import type { Metadata } from 'next';
import { config } from '@/lib/config';
import Link from 'next/link';
import { Sparkles, Heart, Shield, Leaf } from 'lucide-react';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'About Us | AZEEORA COSMETICS',
  description: 'Discover the story behind AZEEORA COSMETICS — luxury beauty crafted for the modern woman in Pakistan.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Us | AZEEORA COSMETICS',
    description: 'Discover the story behind AZEEORA COSMETICS — luxury beauty crafted for the modern woman in Pakistan.',
    url: '/about',
    type: 'website',
  },
};

const values = [
  { icon: Sparkles, title: 'Luxury Quality', desc: 'Premium formulations and curated collections for every skin type.' },
  { icon: Heart, title: 'Customer First', desc: 'Your beauty journey matters — we deliver care with every order.' },
  { icon: Shield, title: 'Authentic Products', desc: 'Genuine cosmetics with transparent sourcing and quality assurance.' },
  { icon: Leaf, title: 'Clean Beauty', desc: 'Thoughtfully selected ingredients for radiant, healthy skin.' },
];

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About AZEEORA COSMETICS',
    description: 'Discover the story behind AZEEORA COSMETICS — luxury beauty crafted for the modern woman in Pakistan.',
    url: `${config.getBaseUrl()}/about`,
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="bg-black text-white py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <p className="text-rose-gold uppercase tracking-widest text-sm mb-4">Our Story</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            AZEEORA <span className="text-rose-gold">COSMETICS</span>
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Born from a passion for luxury beauty, AZEEORA COSMETICS brings world-class skincare, makeup, and fragrances to Pakistan — making premium self-care accessible, elegant, and unforgettable.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            To empower every woman to feel confident and beautiful through premium cosmetics that celebrate individuality, quality, and authenticity.
          </p>
          <h2 className="text-3xl font-serif font-bold mb-4 mt-8">Our Vision</h2>
          <p className="text-gray-600 leading-relaxed">
            To become Pakistan&apos;s most trusted luxury beauty destination — known for exceptional products, seamless shopping, and outstanding customer care.
          </p>
        </div>
        <div className="bg-rose-gold/10 rounded-2xl p-10">
          <h3 className="text-2xl font-serif font-bold mb-6">Why Choose Us?</h3>
          <ul className="space-y-4 text-gray-700">
            <li>✦ Curated luxury collections</li>
            <li>✦ Secure payments — COD, JazzCash & Easypaisa</li>
            <li>✦ Fast delivery across Pakistan</li>
            <li>✦ Dedicated customer support</li>
            <li>✦ Verified authentic products</li>
          </ul>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-serif font-bold text-center mb-12">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="w-14 h-14 bg-rose-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <v.icon className="w-7 h-7 text-rose-gold" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-serif font-bold mb-4">Experience Luxury Beauty</h2>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Explore our collection of premium skincare, makeup, and fragrances — crafted for you.
        </p>
        <Link href="/shop"><Button size="lg">Shop Now</Button></Link>
      </section>
    </div>
  );
}

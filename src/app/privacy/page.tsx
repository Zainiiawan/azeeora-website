import type { Metadata } from 'next';
import { config } from '@/lib/config';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | AZEEORA COSMETICS',
  description: 'Our Privacy Policy explains how we collect, use, and protect your personal information at AZEEORA COSMETICS.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | AZEEORA COSMETICS',
    description: 'Our Privacy Policy explains how we collect, use, and protect your personal information at AZEEORA COSMETICS.',
    url: '/privacy',
    type: 'website',
  },
};

export default function PrivacyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy - AZEEORA COSMETICS',
    description: 'Our Privacy Policy explains how we collect, use, and protect your personal information at AZEEORA COSMETICS.',
    url: `${config.getBaseUrl()}/privacy`,
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-serif font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-gray space-y-4 text-gray-600">
        <p>AZEEORA COSMETICS (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains how we collect, use, and protect your personal information.</p>
        <h2 className="text-xl font-semibold text-black mt-8">Information We Collect</h2>
        <p>Name, email, phone, shipping address, order history, and payment-related information necessary to fulfil orders.</p>
        <h2 className="text-xl font-semibold text-black mt-8">How We Use It</h2>
        <p>To process orders, send confirmations, provide customer support, improve our services, and comply with legal obligations.</p>
        <h2 className="text-xl font-semibold text-black mt-8">Data Security</h2>
        <p>We use industry-standard encryption, secure passwords, and JWT authentication. Payment proofs are stored securely.</p>
        <h2 className="text-xl font-semibold text-black mt-8">Contact</h2>
        <p>Questions? Email <a href="mailto:azeeoracosmetics@gmail.com" className="text-rose-gold">azeeoracosmetics@gmail.com</a> or visit our <Link href="/contact" className="text-rose-gold">Contact page</Link>.</p>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { config } from '@/lib/config';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | AZEEORA COSMETICS',
  description: 'Read the Terms of Service for AZEEORA COSMETICS. Understand our policies on orders, payments, accounts, and liability.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | AZEEORA COSMETICS',
    description: 'Read the Terms of Service for AZEEORA COSMETICS.',
    url: '/terms',
    type: 'website',
  },
};

export default function TermsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Service - AZEEORA COSMETICS',
    description: 'Read the Terms of Service for AZEEORA COSMETICS.',
    url: `${config.getBaseUrl()}/terms`,
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-serif font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-gray space-y-4 text-gray-600">
        <p>By using AZEEORA COSMETICS website and services, you agree to these terms.</p>
        <h2 className="text-xl font-semibold text-black mt-8">Orders & Payments</h2>
        <p>All orders are subject to availability. We accept COD, JazzCash, and Easypaisa. Prices are in PKR and include applicable taxes unless stated otherwise.</p>
        <h2 className="text-xl font-semibold text-black mt-8">Account</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>
        <h2 className="text-xl font-semibold text-black mt-8">Limitation of Liability</h2>
        <p>AZEEORA COSMETICS is not liable for indirect damages arising from use of our products or website beyond the purchase price of affected items.</p>
        <p>See also our <Link href="/help#returns" className="text-rose-gold">Return Policy</Link> and <Link href="/privacy" className="text-rose-gold">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}

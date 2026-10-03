import { Metadata } from 'next';
import { config } from '@/lib/config';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact Us | AZEEORA COSMETICS',
  description: 'Get in touch with AZEEORA COSMETICS for orders, product advice, or partnership enquiries. We are here to help.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Us | AZEEORA COSMETICS',
    description: 'Get in touch with AZEEORA COSMETICS for orders, product advice, or partnership enquiries.',
    url: '/contact',
    type: 'website',
  },
};

export default function ContactPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact AZEEORA COSMETICS',
    description: 'Get in touch with AZEEORA COSMETICS for orders, product advice, or partnership enquiries.',
    url: `${config.getBaseUrl()}/contact`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContactPageClient />
    </>
  );
}

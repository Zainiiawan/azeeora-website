import type { Metadata } from 'next';
import { config } from '@/lib/config';
import Link from 'next/link';
import { Truck, Clock, ShieldCheck, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Shipping Policy | AZEEORA COSMETICS',
  description: 'Learn about our shipping and delivery processes across Pakistan.',
  alternates: {
    canonical: '/shipping',
  },
  openGraph: {
    title: 'Shipping Policy | AZEEORA COSMETICS',
    description: 'Learn about our shipping and delivery processes across Pakistan.',
    url: '/shipping',
    type: 'website',
  },
};

export default function ShippingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Shipping Policy - AZEEORA COSMETICS',
    description: 'Learn about our shipping and delivery processes across Pakistan.',
    url: `${config.getBaseUrl()}/shipping`,
  };

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-black mb-4">Shipping Policy</h1>
          <p className="text-gray-600 text-lg">Fast, reliable, and secure delivery straight to your doorstep.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* Standard Shipping */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6 text-rose-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">Standard Delivery</h3>
                  <p className="text-gray-600 mb-2">Our standard delivery takes <strong className="text-black">3-5 business days</strong> depending on your city.</p>
                  <p className="text-rose-gold font-medium">Free on orders over PKR 5,000</p>
                </div>
              </div>

              {/* Express Shipping */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-rose-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">Order Processing</h3>
                  <p className="text-gray-600">All orders are processed within <strong className="text-black">24-48 hours</strong> (excluding weekends and public holidays).</p>
                </div>
              </div>

              {/* Coverage */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-rose-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">Nationwide Coverage</h3>
                  <p className="text-gray-600">We deliver across all major cities and towns in Pakistan using premium courier partners.</p>
                </div>
              </div>

              {/* Secure Packaging */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-rose-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">Secure Packaging</h3>
                  <p className="text-gray-600">Luxury cosmetics require care. Every order is bubble-wrapped and packed securely to prevent transit damage.</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10 prose prose-gray max-w-none text-gray-600">
          <h2 className="text-2xl font-serif font-bold text-black mb-4">Important Notes</h2>
          <ul className="space-y-3">
            <li><strong>Tracking:</strong> Once your order is dispatched, you will receive an SMS and email with your tracking number. You can also <Link href="/track-order" className="text-rose-gold font-medium">Track your order here</Link>.</li>
            <li><strong>Delays:</strong> Weather conditions, public holidays, or unforeseen courier delays may occasionally affect delivery times.</li>
            <li><strong>Incomplete Address:</strong> Please ensure your delivery address and active phone number are correct to avoid delays. If the courier cannot reach you, the parcel may be returned.</li>
          </ul>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <p>Need help with your delivery? Contact our support team at <a href="mailto:azeeoracosmetics@gmail.com" className="text-rose-gold font-medium">azeeoracosmetics@gmail.com</a> or call <a href="tel:+923060466911" className="text-rose-gold font-medium">+92 306 0466911</a>.</p>
          </div>
        </div>

      </div>
    </div>
  );
}

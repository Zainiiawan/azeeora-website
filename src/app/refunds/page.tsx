import type { Metadata } from 'next';
import { config } from '@/lib/config';
import Link from 'next/link';
import { RefreshCcw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Returns | AZEEORA COSMETICS',
  description: 'Our hassle-free 14-day refund and return policy.',
  alternates: {
    canonical: '/refunds',
  },
  openGraph: {
    title: 'Refund & Returns | AZEEORA COSMETICS',
    description: 'Our hassle-free 14-day refund and return policy.',
    url: '/refunds',
    type: 'website',
  },
};

export default function RefundsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Refund & Returns - AZEEORA COSMETICS',
    description: 'Our hassle-free 14-day refund and return policy.',
    url: `${config.getBaseUrl()}/refunds`,
  };

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-black mb-4">Refund & Returns</h1>
          <p className="text-gray-600 text-lg">Your satisfaction is our priority. Shop with confidence.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* 14-Day Return */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <RefreshCcw className="w-6 h-6 text-rose-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">14-Day Return Policy</h3>
                  <p className="text-gray-600">You have 14 days after receiving your item to request a return if you are not completely satisfied.</p>
                </div>
              </div>

              {/* Eligibility */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">Eligibility Criteria</h3>
                  <p className="text-gray-600">Items must be <strong className="text-black">unused, unopened</strong>, and in their original packaging with all seals intact.</p>
                </div>
              </div>

              {/* Damaged Items */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">Damaged Products</h3>
                  <p className="text-gray-600">If you receive a defective or damaged item, please contact us immediately with photographic evidence for a free replacement.</p>
                </div>
              </div>

              {/* Non-Returnable */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2">Non-Returnable Items</h3>
                  <p className="text-gray-600">For hygiene reasons, opened makeup, skincare products, or items missing their protective seals cannot be returned.</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10 prose prose-gray max-w-none text-gray-600">
          <h2 className="text-2xl font-serif font-bold text-black mb-4">How to Start a Return</h2>
          <ol className="space-y-4 list-decimal pl-4">
            <li><strong>Contact Us:</strong> Email us at <a href="mailto:azeeoracosmetics@gmail.com" className="text-rose-gold font-medium">azeeoracosmetics@gmail.com</a> or reach out via WhatsApp with your Order ID and reason for return.</li>
            <li><strong>Approval:</strong> Our team will review your request. If approved, we will provide you with the return shipping address.</li>
            <li><strong>Dispatch:</strong> Securely pack the items and send them back to us. <span className="italic text-sm text-gray-500">(Note: Return shipping costs are the customer's responsibility unless the item was damaged upon arrival).</span></li>
            <li><strong>Refund/Exchange:</strong> Once we receive and inspect the item, we will process your refund via Bank Transfer/Easypaisa within 5-7 business days, or dispatch your exchange.</li>
          </ol>
        </div>

      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  HelpCircle, MessageCircle, Mail, Phone, Clock, Truck, RotateCcw, CreditCard, Package, ChevronDown,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Help Center | AZEEORA COSMETICS',
  description: 'FAQs, shipping, returns, refunds, and customer support for AZEEORA COSMETICS.',
};

const CONTACT = {
  phone: '+92 306 0466911',
  whatsapp: '923060466911',
  email: 'azeeoracosmetics@gmail.com',
  hours: 'Mon – Sat: 10:00 AM – 8:00 PM (PKT)',
};

const faqs = [
  {
    q: 'How do I place an order?',
    a: 'Browse our shop, add items to cart, proceed to checkout, enter your shipping details, and choose COD, JazzCash, or Easypaisa.',
  },
  {
    q: 'How can I track my order?',
    a: 'Visit the Track Order page with your order number and email, or sign in to view all your orders with live tracking updates.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Cash on Delivery (COD), JazzCash, and Easypaisa across Pakistan.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery is 3–7 business days within Pakistan. You will receive tracking details once your order ships.',
  },
  {
    q: 'Are your products authentic?',
    a: 'Yes. AZEEORA COSMETICS sells 100% genuine luxury beauty products sourced from trusted suppliers.',
  },
  {
    q: 'How do I verify my account?',
    a: 'After registration, enter the 6-digit OTP sent to your email on the verification page. Check spam if you do not see it.',
  },
];

export default function HelpPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-black text-white py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <HelpCircle className="w-12 h-12 text-rose-gold mx-auto mb-4" />
          <h1 className="text-4xl font-serif font-bold mb-4">Help Center</h1>
          <p className="text-gray-300">Everything you need to shop, pay, track, and get support</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-12">
        {/* Quick links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: '#faq', label: 'FAQs', icon: HelpCircle },
            { href: '#shipping', label: 'Shipping', icon: Truck },
            { href: '#returns', label: 'Returns', icon: RotateCcw },
            { href: '#tracking', label: 'Track Order', icon: Package },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 hover:border-rose-gold border border-transparent transition-colors"
            >
              <item.icon className="w-5 h-5 text-rose-gold" />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </div>

        {/* Contact Support */}
        <section id="contact" className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-serif font-bold mb-6">Contact Support</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-rose-gold/5">
              <Phone className="w-6 h-6 text-rose-gold" />
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-gray-600 text-sm">{CONTACT.phone}</p>
              </div>
            </a>
            <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-rose-gold/5">
              <MessageCircle className="w-6 h-6 text-rose-gold" />
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-gray-600 text-sm">Chat with us</p>
              </div>
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-rose-gold/5">
              <Mail className="w-6 h-6 text-rose-gold" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-gray-600 text-sm">{CONTACT.email}</p>
              </div>
            </a>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Clock className="w-6 h-6 text-rose-gold" />
              <div>
                <p className="font-medium">Support Hours</p>
                <p className="text-gray-600 text-sm">{CONTACT.hours}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact"><Button variant="outline">Contact Form</Button></Link>
            <Link href="/track-order"><Button>Track Order</Button></Link>
          </div>
        </section>

        {/* FAQs */}
        <section id="faq" className="bg-white rounded-xl p-8 shadow-sm scroll-mt-24">
          <h2 className="text-2xl font-serif font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group border border-gray-100 rounded-lg">
                <summary className="flex items-center justify-between cursor-pointer p-4 font-medium list-none">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="px-4 pb-4 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Shipping */}
        <section id="shipping" className="bg-white rounded-xl p-8 shadow-sm scroll-mt-24">
          <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
            <Truck className="w-6 h-6 text-rose-gold" />
            Shipping Policy
          </h2>
          <div className="prose prose-sm text-gray-600 space-y-3 max-w-none">
            <p>We deliver across Pakistan via trusted courier partners (TCS, Leopards, and others).</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Standard delivery: 3–7 business days</li>
              <li>Free shipping on orders over PKR 5,000</li>
              <li>Shipping fee of PKR 200 applies below the free threshold</li>
              <li>Tracking number shared via email once order is dispatched</li>
              <li>Orders are processed after payment verification (COD orders after admin confirmation)</li>
            </ul>
          </div>
        </section>

        {/* Returns */}
        <section id="returns" className="bg-white rounded-xl p-8 shadow-sm scroll-mt-24">
          <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-rose-gold" />
            Return Policy
          </h2>
          <div className="prose prose-sm text-gray-600 space-y-3 max-w-none">
            <p>We want you to love your purchase. If something isn&apos;t right, we&apos;re here to help.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Returns accepted within 7 days of delivery for unopened, unused products</li>
              <li>Product must be in original packaging with seal intact</li>
              <li>Contact us at {CONTACT.phone} or {CONTACT.email} to initiate a return</li>
              <li>Return shipping may apply unless item is defective or incorrect</li>
            </ul>
          </div>
        </section>

        {/* Refunds */}
        <section id="refunds" className="bg-white rounded-xl p-8 shadow-sm scroll-mt-24">
          <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-gold" />
            Refund Policy
          </h2>
          <div className="prose prose-sm text-gray-600 space-y-3 max-w-none">
            <ul className="list-disc pl-5 space-y-1">
              <li>Approved refunds processed within 5–10 business days</li>
              <li>COD refunds via bank transfer or JazzCash/Easypaisa</li>
              <li>Online payment refunds returned to original payment method where possible</li>
              <li>Partial refunds may apply for opened products per inspection</li>
            </ul>
          </div>
        </section>

        {/* Tracking */}
        <section id="tracking" className="bg-white rounded-xl p-8 shadow-sm scroll-mt-24">
          <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
            <Package className="w-6 h-6 text-rose-gold" />
            Order Tracking
          </h2>
          <p className="text-gray-600 mb-4">
            Track your order using your order number and email, or sign in to see all orders with live status, courier details, and delivery timeline.
          </p>
          <Link href="/track-order"><Button>Go to Track Order</Button></Link>
        </section>
      </div>
    </div>
  );
}

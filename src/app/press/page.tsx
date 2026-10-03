import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Press & Media | AZEEORA COSMETICS',
};

export default function PressPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl min-h-[60vh]">
      <h1 className="text-3xl font-serif font-bold mb-8">Press & Media</h1>
      <div className="prose prose-gray space-y-4 text-gray-600">
        <p>Welcome to the AZEEORA COSMETICS press room. Here you'll find our latest news, media kits, and brand assets.</p>
        
        <h2 className="text-xl font-semibold text-black mt-8">Media Inquiries</h2>
        <p>For all press and media related inquiries, interviews, or product samples for review, please reach out to our PR team.</p>
        <p>
          <strong>Email:</strong> <a href="mailto:azeeoracosmetics@gmail.com" className="text-rose-gold">azeeoracosmetics@gmail.com</a>
        </p>

        <h2 className="text-xl font-semibold text-black mt-8">Brand Assets</h2>
        <p>If you are writing an article about AZEEORA COSMETICS and need high-resolution logos, product images, or brand guidelines, please contact us for access to our media kit.</p>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-black mb-2">Are you an Influencer?</h3>
          <p className="mb-4">We are always looking to collaborate with passionate beauty creators. If you'd like to work with us, please send us an email with your social media handles and media kit.</p>
          <Link href="/contact" className="inline-block px-6 py-2 bg-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}

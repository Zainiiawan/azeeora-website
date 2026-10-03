import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Careers | AZEEORA COSMETICS',
};

export default function CareersPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl min-h-[60vh]">
      <h1 className="text-3xl font-serif font-bold mb-8">Careers at AZEEORA COSMETICS</h1>
      <div className="prose prose-gray space-y-4 text-gray-600">
        <p>Join us in our mission to redefine luxury beauty and cosmetics in Pakistan and beyond. At AZEEORA COSMETICS, we are always looking for passionate, creative, and driven individuals to join our growing team.</p>
        
        <h2 className="text-xl font-semibold text-black mt-8">Why Work With Us?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Innovation:</strong> Be part of a forward-thinking beauty brand.</li>
          <li><strong>Growth:</strong> We invest in our team's professional development.</li>
          <li><strong>Culture:</strong> An inclusive, creative, and supportive work environment.</li>
          <li><strong>Impact:</strong> Help shape the future of the cosmetics industry.</li>
        </ul>

        <h2 className="text-xl font-semibold text-black mt-8">Current Openings</h2>
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-100 mt-4">
          <h3 className="text-lg font-medium text-black mb-2">No open positions right now</h3>
          <p className="text-sm text-gray-500">We do not have any open positions at the moment, but we are always eager to meet talented professionals.</p>
        </div>

        <h2 className="text-xl font-semibold text-black mt-8">Speculative Applications</h2>
        <p>If you don't see a role that fits your experience but would love to work with us, please send your resume and a cover letter to <a href="mailto:azeeoracosmetics@gmail.com" className="text-rose-gold">azeeoracosmetics@gmail.com</a>.</p>
      </div>
    </div>
  );
}

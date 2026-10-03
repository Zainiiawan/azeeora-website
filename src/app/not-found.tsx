import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | Azeeora Cosmetics',
  description: 'The page you requested could not be found.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h2 className="text-6xl font-serif text-black mb-4">404</h2>
          <h3 className="text-2xl font-serif text-gray-900 mb-2">Page Not Found</h3>
          <p className="text-gray-600 mb-8">
            The page you requested could not be found. It might have been moved or deleted.
          </p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-900 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

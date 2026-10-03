import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy | AZEEORA COSMETICS',
};

export default function CookiesPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-serif font-bold mb-8">Cookie Policy</h1>
      <div className="prose prose-gray space-y-4 text-gray-600">
        <p>This Cookie Policy explains how AZEEORA COSMETICS uses cookies and similar technologies to recognize you when you visit our website.</p>
        
        <h2 className="text-xl font-semibold text-black mt-8">What are cookies?</h2>
        <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
        
        <h2 className="text-xl font-semibold text-black mt-8">Why do we use cookies?</h2>
        <p>We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our website to operate, and we refer to these as "essential" or "strictly necessary" cookies. For example, they allow us to remember the items in your shopping cart and keep you logged in.</p>
        <p>Other cookies enable us to track and target the interests of our users to enhance the experience on our online properties. Third parties serve cookies through our website for analytics and performance monitoring.</p>
        
        <h2 className="text-xl font-semibold text-black mt-8">Types of cookies we use</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Essential Cookies:</strong> Necessary for the website to function (e.g., authentication, security, cart management).</li>
          <li><strong>Performance and Analytics Cookies:</strong> Allow us to recognize and count the number of visitors and see how visitors move around our website when they are using it.</li>
          <li><strong>Functionality Cookies:</strong> Used to recognize you when you return to our website, enabling us to personalize content and remember your preferences.</li>
        </ul>

        <h2 className="text-xl font-semibold text-black mt-8">How can I control cookies?</h2>
        <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in the Cookie Consent Manager. You can also set or amend your web browser controls to accept or refuse cookies.</p>
        
        <h2 className="text-xl font-semibold text-black mt-8">Contact Us</h2>
        <p>If you have any questions about our use of cookies, please contact us at <a href="mailto:azeeoracosmetics@gmail.com" className="text-rose-gold">azeeoracosmetics@gmail.com</a>.</p>
      </div>
    </div>
  );
}

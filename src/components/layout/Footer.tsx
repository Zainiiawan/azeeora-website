import Link from 'next/link';
import NewsletterForm from './NewsletterForm';
import Wordmark from '@/components/brand/Wordmark';
import { STORE_CONTACT } from '@/shared/constants';

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const columns = [
  {
    title: 'Shop',
    links: [
      { name: 'Shop all', href: '/shop' },
      { name: 'New in', href: '/shop?sort=new' },
      { name: 'Collections', href: '/categories' },
      { name: 'Offers', href: '/offers' },
    ],
  },
  {
    title: 'Azeeora',
    links: [
      { name: 'Our story', href: '/about' },
      { name: 'Journal', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Client care',
    links: [
      { name: 'Contact us', href: '/contact' },
      { name: 'Track your order', href: '/track-order' },
      { name: 'Help & FAQ', href: '/help' },
      { name: 'Shipping', href: '/shipping' },
    ],
  },
];

const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com/ayezacosmetics.store?igsh=eTF3dnZkbHUwZmph', Icon: InstagramIcon },
  { label: 'Facebook', href: 'https://www.facebook.com/share/1JMakEmR81/', Icon: FacebookIcon },
  { label: 'TikTok', href: 'https://www.tiktok.com/@ayezacosmetics.store?_r=1&_t=ZN-98aOm1iZDQF', Icon: TikTokIcon },
  { label: 'WhatsApp', href: `https://wa.me/${STORE_CONTACT.whatsapp}`, Icon: WhatsAppIcon },
];

const Footer = ({ className }: { className?: string }) => {
  const year = new Date().getFullYear();

  return (
    <footer className={`bg-tile text-ink ${className || ''}`}>
      <div className="px-5 sm:px-8 lg:px-10 pt-16 pb-12 grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-12">
        <div className="col-span-2 lg:col-span-6">
          <p className="caps mb-3">Stay in the know</p>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">New launches, rituals and private offers, a few times a season.</p>
          <NewsletterForm />
          <div className="flex gap-5 mt-10">
            {socials.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-ink hover:text-muted transition-colors">
                <Icon className="w-[18px] h-[18px]" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title} className="lg:col-span-2 lg:col-start-auto">
            <p className="caps text-muted mb-5">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="caps u-hover">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="px-5 sm:px-8 lg:px-10 pb-8 flex flex-wrap gap-x-8 gap-y-2 caps-sm text-muted">
        <span>{STORE_CONTACT.address}</span>
        <a href="tel:+923060466911" className="hover:text-ink">{STORE_CONTACT.phone}</a>
        <a href={`mailto:${STORE_CONTACT.email}`} className="hover:text-ink normal-case tracking-normal text-[0.72rem]">{STORE_CONTACT.email}</a>
        <span>{STORE_CONTACT.businessHours}</span>
      </div>

      {/* Wordmark across the foot of every page */}
      <div className="px-4 sm:px-8 lg:px-10 pt-6 pb-4 border-t border-line flex justify-center overflow-hidden">
        <Wordmark className="text-[14.5vw] lg:text-[12vw] text-ink" showSubline={false} opsz={96} />
      </div>

      <div className="px-5 sm:px-8 lg:px-10 py-5 border-t border-line flex flex-col md:flex-row justify-between items-center gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="caps-sm text-muted">© {year} Azeeora Cosmetics</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {[
            ['Privacy', '/privacy'],
            ['Terms', '/terms'],
            ['Shipping', '/shipping'],
            ['Returns', '/refunds'],
            ['Cookies', '/cookies'],
          ].map(([name, href]) => (
            <Link key={href} href={href} className="caps-sm text-muted hover:text-ink transition-colors">
              {name}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

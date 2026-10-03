import Link from 'next/link';
import NewsletterForm from './NewsletterForm';
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
      { name: 'Wholesale', href: '/business' },
    ],
  },
  {
    title: 'Azeeora',
    links: [
      { name: 'Our story', href: '/about' },
      { name: 'Join us', href: '/join' },
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
    <footer className={`bg-[#1a1a1a] text-white mt-10 ${className || ''}`}>
      <div className="px-5 sm:px-8 lg:px-10 pt-16 pb-12 grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-12">
        <div className="col-span-2 lg:col-span-6">
          <p className="font-serif text-[2rem] mb-3">Stay in the <em className="italic">know</em></p>
          <p className="text-sm text-white/70 font-light mb-6 max-w-sm">New launches, rituals and private offers, a few times a season.</p>
          <NewsletterForm />
          <div className="flex gap-3 mt-10">
            {socials.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-ink transition-colors">
                <Icon className="w-[18px] h-[18px]" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title} className="lg:col-span-2 lg:col-start-auto">
            <p className="text-[0.95rem] uppercase tracking-[0.06em] text-white mb-5">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-[0.92rem] font-light text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="px-5 sm:px-8 lg:px-10 pb-10 flex flex-wrap gap-x-8 gap-y-2 text-[0.85rem] font-light text-white/60">
        <span>{STORE_CONTACT.address}</span>
        <a href="tel:+923060466911" className="hover:text-white">{STORE_CONTACT.phone}</a>
        <a href={`mailto:${STORE_CONTACT.email}`} className="hover:text-white">{STORE_CONTACT.email}</a>
        <span>{STORE_CONTACT.businessHours}</span>
      </div>

      {/* Wordmark across the foot of every page */}
      <div className="px-5 sm:px-8 lg:px-10 py-8 border-t border-white/15 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/azeeora-logo-white.svg" alt="Azeeora" width={1114} height={218} className="h-9 lg:h-11 w-auto" />
      </div>

      <div className="px-5 sm:px-8 lg:px-10 py-5 border-t border-white/15 flex flex-col md:flex-row justify-between items-center gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="text-[0.8rem] font-light text-white/60">© {year} Azeeora Cosmetics</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {[
            ['Privacy', '/privacy'],
            ['Terms', '/terms'],
            ['Shipping', '/shipping'],
            ['Returns', '/refunds'],
            ['Cookies', '/cookies'],
          ].map(([name, href]) => (
            <Link key={href} href={href} className="text-[0.8rem] font-light text-white/60 hover:text-white transition-colors">
              {name}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

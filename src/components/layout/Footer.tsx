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
      { name: 'All products', href: '/shop' },
      { name: 'New arrivals', href: '/shop?sort=new' },
      { name: 'Best sellers', href: '/shop?sort=popular' },
      { name: 'Offers', href: '/offers' },
    ],
  },
  {
    title: 'Collections',
    links: [
      { name: 'Skincare', href: '/categories/skincare' },
      { name: 'Makeup', href: '/categories/makeup' },
      { name: 'Fragrances', href: '/categories/fragrances' },
      { name: 'Hair care', href: '/categories/hair-care' },
    ],
  },
  {
    title: 'The Maison',
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
    <footer className={`relative overflow-hidden bg-[#1c1714] text-[#f7f3ee] ${className || ''}`}>
      <div className="absolute -top-48 right-0 w-[560px] h-[560px] rounded-full bg-rose-gold/15 blur-[140px]" aria-hidden />

      {/* Newsletter */}
      <div className="relative border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-20 sm:py-24 grid lg:grid-cols-2 gap-10 items-end">
          <div>
            <p className="eyebrow text-rose-gold mb-5">The Ayeza letter</p>
            <h3 className="display !text-[#f7f3ee] text-4xl sm:text-5xl">
              Private previews, rituals <em className="italic text-[#e9dccb]">& first access</em>.
            </h3>
          </div>
          <div className="lg:justify-self-end w-full lg:max-w-md">
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="relative max-w-[1440px] mx-auto px-6 sm:px-10 py-16 sm:py-20 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10">
        <div className="col-span-2">
          <Link href="/" className="inline-flex flex-col leading-none">
            <span className="font-serif text-3xl tracking-[0.42em]">AYEZA</span>
            <span className="eyebrow !text-[0.5rem] !tracking-[0.55em] mt-2 text-white/60">Cosmetics</span>
          </Link>
          <p className="mt-8 text-sm text-white/55 leading-relaxed max-w-xs">
            Luxury beauty curated for the modern woman. Composed in {STORE_CONTACT.city}, delivered across{' '}
            {STORE_CONTACT.country}.
          </p>
          <div className="flex gap-3 mt-8">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-[#1c1714] hover:bg-[#e9dccb] hover:border-[#e9dccb] transition-all duration-500"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="eyebrow !text-[0.6rem] !text-rose-gold mb-6">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-white/65 hover:text-white transition-colors duration-500 link-underline">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact strip */}
      <div className="relative max-w-[1440px] mx-auto px-6 sm:px-10 pb-12 flex flex-wrap gap-x-10 gap-y-3 text-xs tracking-wide text-white/50">
        <span>{STORE_CONTACT.address}</span>
        <a href="tel:+923060466911" className="hover:text-white transition-colors">
          {STORE_CONTACT.phone}
        </a>
        <a href={`mailto:${STORE_CONTACT.email}`} className="hover:text-white transition-colors">
          {STORE_CONTACT.email}
        </a>
        <span>{STORE_CONTACT.businessHours}</span>
      </div>

      {/* Legal */}
      <div className="relative border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="eyebrow !text-[0.55rem] text-white/40">© {year} Ayeza Cosmetics. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              ['Privacy', '/privacy'],
              ['Terms', '/terms'],
              ['Shipping', '/shipping'],
              ['Returns', '/refunds'],
              ['Cookies', '/cookies'],
            ].map(([name, href]) => (
              <Link key={href} href={href} className="eyebrow !text-[0.55rem] text-white/40 hover:text-white transition-colors">
                {name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

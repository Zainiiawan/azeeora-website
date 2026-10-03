import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Brand Partner terms | Azeeora' };

const sections: [string, string[]][] = [
  ['Joining', ['Joining is free. There is no fee and no product you must buy to join or to stay active.', 'You must be 18 or older and give accurate details, including your CNIC, so we can pay you.', 'Azeeora reviews every application and may decline or close an account that breaks these terms.']],
  ['How you earn', ['You earn a referral commission on orders from customers and partners you refer through your link or member code, at the rate shown on the Join us page.', 'Commission is only earned on real product sales. It is never paid for recruiting people.', 'Commission is held until the order is delivered. If an order is cancelled, refunded or returned, its commission is cancelled or taken back.']],
  ['Your discount', ['Partners buy at a discount that depends on their points (BV) in the calendar month. Points reset at the start of each month.', 'Products bought at the partner discount are for your own use or resale to customers at no more than the retail price.']],
  ['Wallet and withdrawals', ['Earnings are added to your Azeeora wallet. You can use the balance at checkout or withdraw it once it reaches the minimum.', 'Withdrawals are paid to a verified bank, JazzCash or Easypaisa account in your own name.', 'We may hold or reverse payments linked to fraud, fake orders or abuse of the programme.']],
  ['Conduct', ['Do not make medical claims about products, or promise people earnings.', 'Do not use Azeeora’s name in paid ads, or sell on marketplaces, without written permission.']],
  ['Changes', ['Azeeora may update commission rates, discounts and these terms. Changes apply from the date they are published and never to commission already earned.']],
];

export default function PartnerTermsPage() {
  return (
    <div className="px-5 sm:px-8 py-12 lg:py-16 max-w-3xl mx-auto">
      <h1 className="title text-[2.2rem] sm:text-[2.8rem] text-ink">Brand Partner terms</h1>
      <p className="mt-3 text-muted font-light">Last updated October 2026</p>
      {sections.map(([title, items]) => (
        <section key={title} className="mt-10">
          <h2 className="text-[1.3rem] font-light text-ink">{title}</h2>
          <ul className="mt-3 space-y-2 list-disc pl-5 text-gray-700 font-light leading-relaxed">
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-12 text-[0.9rem] text-muted">
        Questions? <Link href="/contact" className="underline">Contact us</Link>.
      </p>
    </div>
  );
}

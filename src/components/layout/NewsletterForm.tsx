'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/** Front-end only, as before: there is no newsletter list behind it yet. */
export default function NewsletterForm() {
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="font-serif italic text-xl text-[#e9dccb]">Thank you. Welcome to the Maison.</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="flex items-center border-b border-white/30 focus-within:border-rose-gold transition-colors max-w-md w-full"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="Your email address"
        className="flex-1 !bg-transparent !text-white placeholder:!text-white/45 border-0 py-4 text-sm tracking-wide focus:outline-none focus:ring-0"
      />
      <button type="submit" className="eyebrow !text-[0.6rem] text-white hover:text-rose-gold transition-colors flex items-center gap-2 py-4">
        Subscribe <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.25} />
      </button>
    </form>
  );
}

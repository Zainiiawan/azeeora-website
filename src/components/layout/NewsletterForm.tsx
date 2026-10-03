'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/** Front-end only, as before: there is no newsletter list behind it yet. */
export default function NewsletterForm() {
  const [done, setDone] = useState(false);

  if (done) return <p className="text-sm text-ink">Thank you. You are on the list.</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="flex items-center border-b border-ink max-w-md w-full"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="Email address"
        className="flex-1 !bg-transparent border-0 px-0 py-3 text-sm focus:outline-none focus:ring-0"
      />
      <button type="submit" aria-label="Subscribe" className="p-2 -mr-2">
        <ArrowRight className="w-4 h-4" strokeWidth={1.2} />
      </button>
    </form>
  );
}

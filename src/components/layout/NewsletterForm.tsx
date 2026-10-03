'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/** Front-end only, as before: there is no newsletter list behind it yet. */
export default function NewsletterForm() {
  const [done, setDone] = useState(false);

  if (done) return <p className="text-sm text-white">Thank you. You are on the list.</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="flex items-center gap-2 max-w-md w-full"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="Email address"
        className="flex-1 min-w-0 h-12 !rounded-full border-0 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-rose"
      />
      <button type="submit" aria-label="Subscribe" className="h-12 w-12 shrink-0 rounded-full bg-rose text-white flex items-center justify-center hover:opacity-90">
        <ArrowRight className="w-5 h-5" strokeWidth={1.4} />
      </button>
    </form>
  );
}

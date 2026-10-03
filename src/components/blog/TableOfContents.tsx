'use client';

import { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';

interface Heading {
  id: string;
  text: string;
  level: number;
}

const TableOfContents = () => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Select all h2 elements in the article
    const elements = Array.from(document.querySelectorAll('article h2'));
    const parsedHeadings: Heading[] = elements.map((elem, index) => {
      // Add an ID to the element if it doesn't have one
      if (!elem.id) {
        elem.id = `heading-\${index}`;
      }
      return {
        id: elem.id,
        text: elem.textContent || '',
        level: 2,
      };
    });

    setHeadings(parsedHeadings);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0% 0% -80% 0%' }
    );

    elements.forEach((elem) => observer.observe(elem));

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm luxury-border sticky top-24">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
        Table of Contents
      </h3>
      <nav className="flex flex-col gap-3">
        {headings.map((heading, i) => (
          <button
            key={`${heading.id}-${i}`}
            onClick={() => {
              const element = document.getElementById(heading.id);
              if (element) {
                // Offset for sticky header
                const top = element.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top, behavior: 'smooth' });
              }
            }}
            className={`text-left text-sm transition-colors relative pl-4 \${
              activeId === heading.id
                ? 'text-rose-gold font-medium'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {activeId === heading.id && (
              <motion.div
                layoutId="active-toc"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-rose-gold"
              />
            )}
            {heading.text}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TableOfContents;

'use client';

import { forwardRef } from 'react';
import { cn, formatPrice } from '@/lib/utils';

export const money = (n: number | null | undefined) => formatPrice(Math.round(Number(n ?? 0)));

const STATUS: Record<string, [string, string]> = {
  pending: ['Under review', 'bg-amber-50 text-amber-800 border-amber-200'],
  requested: ['Requested', 'bg-amber-50 text-amber-800 border-amber-200'],
  approved: ['Active', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
  available: ['Available', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
  paid: ['Paid', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
  rejected: ['Not approved', 'bg-red-50 text-red-700 border-red-200'],
  cancelled: ['Cancelled', 'bg-gray-100 text-gray-600 border-gray-200'],
  suspended: ['Suspended', 'bg-red-50 text-red-700 border-red-200'],
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const [text, cls] = STATUS[status] ?? [status, 'bg-gray-100 text-gray-700 border-gray-200'];
  return <span className={cn('inline-flex items-center px-2.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.04em] border rounded-full', cls)}>{label ?? text}</span>;
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, className, ...rest }, ref) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-[0.85rem] text-ink mb-1.5">{label}</span>
      <input
        ref={ref}
        {...rest}
        className="w-full h-12 px-4 border border-line bg-white text-[0.95rem] focus:outline-none focus:border-ink transition-colors"
      />
      {error ? <span className="block mt-1 text-[0.8rem] text-sale">{error}</span> : hint ? <span className="block mt-1 text-[0.8rem] text-muted">{hint}</span> : null}
    </label>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: [string, string][] };

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField({ label, options, className, ...rest }, ref) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-[0.85rem] text-ink mb-1.5">{label}</span>
      <select ref={ref} {...rest} className="w-full h-12 px-4 border border-line bg-white text-[0.95rem] focus:outline-none focus:border-ink">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
});

export function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn('p-5 sm:p-6', accent ? 'bg-blush' : 'bg-tile')}>
      <p className="text-[0.75rem] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 text-[1.6rem] sm:text-[1.9rem] font-light text-ink leading-none">{value}</p>
      {sub && <p className="mt-2 text-[0.8rem] text-muted">{sub}</p>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const cls = tone === 'error' ? 'bg-red-50 text-red-800 border-red-200' : tone === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-tile text-ink border-line';
  return <div className={cn('px-4 py-3 border text-[0.9rem]', cls)}>{children}</div>;
}

export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.85rem] text-ink mb-1.5">{label}</p>
      <div className="flex">
        <input readOnly value={value} className="flex-1 min-w-0 h-11 px-3 border border-line bg-tile text-[0.85rem]" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
          }}
          className="h-11 px-4 bg-ink text-white text-[0.75rem] uppercase tracking-[0.06em] hover:bg-black"
        >
          Copy
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(value)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 px-4 border border-l-0 border-line text-[0.75rem] uppercase tracking-[0.06em] flex items-center hover:bg-tile"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}

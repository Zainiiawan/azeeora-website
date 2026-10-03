import { cn } from '@/lib/utils';

/**
 * The AZEEORA logo (vector, /brand/azeeora-logo.svg). It is sized by the
 * font-size of its container, so existing `text-[..]` classes keep working:
 * the mark is drawn 1.15em tall.
 */
export default function Wordmark({
  className,
  subline = 'Pakistan',
  showSubline = true,
  sublineSize = 'max(0.2em, 7px)',
  priority = false,
}: {
  className?: string;
  subline?: string;
  showSubline?: boolean;
  /** kept for older call sites; the logo is a fixed drawing */
  opsz?: number;
  /** CSS font-size for the sub-line, relative to the logo (em) */
  sublineSize?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none select-none', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/azeeora-logo.svg"
        alt="Azeeora"
        width={1114}
        height={218}
        draggable={false}
        fetchPriority={priority ? 'high' : undefined}
        style={{ height: '1.15em', width: 'auto', display: 'block' }}
      />
      {showSubline && (
        <span
          aria-hidden
          className="font-sans font-normal uppercase whitespace-nowrap"
          style={{
            fontSize: sublineSize,
            letterSpacing: '0.6em',
            marginRight: '-0.6em',
            marginTop: '0.7em',
          }}
        >
          {subline}
        </span>
      )}
    </span>
  );
}

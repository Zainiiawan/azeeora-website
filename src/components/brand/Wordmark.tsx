import { cn } from '@/lib/utils';

/**
 * The AYEZA wordmark in Bodoni Moda. `opsz` picks the optical size: low values
 * give sturdier hairlines for small sizes (header), 96 gives the finest
 * contrast for very large settings on white (homepage, footer).
 */
export default function Wordmark({
  className,
  subline = 'Pakistan',
  showSubline = true,
  opsz = 24,
  sublineSize = 'max(0.2em, 7px)',
}: {
  className?: string;
  subline?: string;
  showSubline?: boolean;
  opsz?: number;
  /** CSS font-size for the sub-line, relative to the wordmark (em) */
  sublineSize?: string;
}) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none select-none', className)} aria-label="Ayeza">
      <span
        aria-hidden
        className="font-serif font-normal"
        style={{ fontVariationSettings: `"opsz" ${opsz}`, letterSpacing: '0.14em', marginRight: '-0.14em', lineHeight: 0.78 }}
      >
        AYEZA
      </span>
      {showSubline && (
        <span
          aria-hidden
          className="font-sans font-normal uppercase whitespace-nowrap"
          style={{
            fontSize: sublineSize,
            letterSpacing: '0.6em',
            marginRight: '-0.6em',
            marginTop: '0.75em',
          }}
        >
          {subline}
        </span>
      )}
    </span>
  );
}

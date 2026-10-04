/**
 * Linje-M foran ordmærket "Mahoje" i Brygada 1918, som på mahoje.dk.
 * Symbolet er aria-hidden og følger tekstfarven via currentColor.
 */
export function MahojeWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display inline-flex items-center gap-[0.2em] leading-none ${className}`}
      style={{ fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1 }}
    >
      <svg
        viewBox="0 0 512 512"
        width="1em"
        height="1em"
        aria-hidden="true"
        focusable="false"
        className="relative -top-[0.025em] shrink-0"
      >
        <polyline
          points="62,400 182,168 262,284 342,118 452,400"
          fill="none"
          stroke="currentColor"
          strokeWidth="46"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Mahoje
    </span>
  );
}

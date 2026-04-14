import { cn } from "@/lib/cn";

interface LogoProps {
  /** Render the full wordmark next to the mark. Defaults to true. */
  wordmark?: boolean;
  /** Pixel size of the mark. Defaults to 28. */
  size?: number;
  className?: string;
}

/**
 * PactSafe AI logo — a gradient shield tile with a checkmark inside.
 * Identical vector shape to the favicon so the brand reads consistently
 * from the tab strip through the page header.
 */
export default function Logo({
  wordmark = true,
  size = 28,
  className,
}: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight",
        className,
      )}
      style={{ fontSize: Math.max(14, Math.round(size * 0.54)) }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shadow-glow rounded-lg"
        style={{ borderRadius: Math.round(size * 0.24) }}
      >
        <defs>
          <linearGradient id="pactsafe-logo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c5cfc" />
            <stop offset="1" stopColor="#5b3fe0" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#pactsafe-logo-bg)" />
        <path
          d="M32 14 L47 20 V32 C47 41 40.5 48.5 32 51 C23.5 48.5 17 41 17 32 V20 Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25 32 L30 37 L40 26"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {wordmark && (
        <span className="text-foreground">
          PactSafe<span className="text-accent"> AI</span>
        </span>
      )}
    </span>
  );
}

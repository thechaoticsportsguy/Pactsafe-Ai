/**
 * LogoMark — shared solid-square brand mark + wordmark.
 *
 * The editorial marketing site and the dark analysis workspace share
 * the same visual brand mark: a solid square with the letter "P",
 * followed by the "PactSafe" wordmark. Only the palette swaps.
 *
 * Previously inlined in TopNav. Extracted so Footer (and any future
 * editorial surface) can render the same mark without TopNav's nav
 * chrome.
 *
 * The legacy `components/Logo.tsx` (gradient shield + checkmark) is
 * unused after this primitive lands; keep it in the tree for now in
 * case any out-of-tree import points at it, but prefer this mark for
 * new surfaces.
 */

import Link from "next/link";
import { cn } from "@/lib/cn";

export type LogoMarkVariant = "editorial" | "workspace";

interface LogoMarkProps {
  variant?: LogoMarkVariant;
  /** Mark size in px (square). Wordmark scales with it. Default 28. */
  size?: number;
  /** Render the "PactSafe" wordmark alongside the mark. Default true. */
  wordmark?: boolean;
  /** Override the href; default is "/". */
  href?: string;
  className?: string;
}

const palette: Record<
  LogoMarkVariant,
  { mark: string; letter: string; word: string }
> = {
  editorial: {
    mark: "bg-ink-800",
    letter: "text-beige-100",
    word: "text-ink-800",
  },
  workspace: {
    mark: "bg-accent-500",
    letter: "text-white",
    word: "text-zinc-100",
  },
};

export function LogoMark({
  variant = "editorial",
  size = 28,
  wordmark = true,
  href = "/",
  className,
}: LogoMarkProps) {
  const p = palette[variant];
  // Letter sizing keeps the "P" visually centered at any mark size.
  const letterPx = Math.max(12, Math.round(size * 0.5));
  const wordPx = Math.max(14, Math.round(size * 0.54));

  return (
    <Link
      href={href}
      aria-label="PactSafe AI home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center font-medium",
          p.mark,
          p.letter,
        )}
        style={{
          width: size,
          height: size,
          fontSize: letterPx,
          lineHeight: 1,
        }}
      >
        P
      </span>
      {wordmark && (
        <span
          className={cn("font-medium tracking-[-0.01em]", p.word)}
          style={{ fontSize: wordPx }}
        >
          PactSafe
        </span>
      )}
    </Link>
  );
}

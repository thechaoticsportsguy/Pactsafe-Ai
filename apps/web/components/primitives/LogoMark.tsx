"use client";

/**
 * LogoMark — PactSafe brand mark.
 *
 * A geometric negative-space "P" cut out of a solid square. Drawn as a
 * single <svg> with two polygon subpaths filled with fillRule="evenodd",
 * so the inner bowl is carved from the solid square. No curves, no
 * gradients, no shadows — matches the Phase 1 sharp-corners rule.
 *
 * The P silhouette at 40-unit viewBox:
 *   • Outer bound: (8,8) → (32,32), with a step at y=22 → x=20 so the
 *     stem drops down the left side and the bowl sits on top.
 *   • Inner hole: simple rectangle (12,12) → (28,18) — the closed bowl
 *     counter. Tuned from the original spec (which had an L-shaped
 *     hole extending into the stem, producing a visible slit at y=22–28)
 *     to a clean rectangle so the stem reads as a single solid block.
 *
 * Four palettes, each keyed to the surface the mark sits on:
 *   • editorial   — black square, beige P (ink-800 on beige-100 pages)
 *   • workspace   — white square, dark P (surface-0 cutout on dark
 *                   accent workspace pages: /compare, /analysis/[id])
 *   • mono-light  — black square, pure white P (mono workspace pages
 *                   /analyze + /history after Phase 4-C purple strip;
 *                   square nearly recedes into the dark surface, white
 *                   P floats)
 *   • mono-dark   — white square, black P (reserved for inverse
 *                   contexts, e.g. the mark on a white card inside a
 *                   dark surface)
 *
 * This primitive renders the MARK ONLY. The wordmark ("PactSafe") and
 * the link wrapper live in the calling surface (TopNav, Footer) so
 * those can own their own typography and href per context.
 */

import * as React from "react";

export type LogoMarkVariant =
  | "editorial"
  | "workspace"
  | "mono-light"
  | "mono-dark";

export interface LogoMarkProps {
  /** Mark size in px (square). Default 28. */
  size?: number;
  /** Palette. Default "editorial". */
  variant?: LogoMarkVariant;
  /** Accessible label. Default "PactSafe". */
  ariaLabel?: string;
  className?: string;
}

const PALETTE: Record<
  LogoMarkVariant,
  { square: string; cutout: string }
> = {
  editorial: { square: "#111111", cutout: "#EFE9DD" },
  workspace: { square: "#FFFFFF", cutout: "#0a0a0f" },
  "mono-light": { square: "#111111", cutout: "#FFFFFF" },
  "mono-dark": { square: "#FFFFFF", cutout: "#111111" },
};

// Path data is split for readability; rendered as one <path> with
// fillRule="evenodd" so the bowl counter is carved from the P silhouette.
const OUTER_P =
  "M 8 8 L 32 8 L 32 22 L 20 22 L 20 32 L 8 32 Z";
const BOWL_COUNTER = "M 12 12 L 28 12 L 28 18 L 12 18 Z";

export function LogoMark({
  size = 28,
  variant = "editorial",
  ariaLabel = "PactSafe",
  className,
}: LogoMarkProps) {
  const palette = PALETTE[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width="40" height="40" fill={palette.square} />
      <path
        d={`${OUTER_P} ${BOWL_COUNTER}`}
        fill={palette.cutout}
        fillRule="evenodd"
      />
    </svg>
  );
}

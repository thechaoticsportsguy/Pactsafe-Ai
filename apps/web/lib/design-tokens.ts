/**
 * PactSafe AI — design tokens (runtime).
 *
 * Mirrors the static values in tailwind.config.ts so non-Tailwind
 * contexts (Framer Motion variants, inline styles, canvas/SVG) can
 * reference the same source of truth. If a value changes here, change
 * it in the Tailwind config too — and vice-versa.
 *
 * Organized by concern: MOTION (durations/easings/stagger), SEVERITY
 * (the full per-level palette — bg/border/text/accent). Additional
 * token groups (SPACING, TYPE) live in the Tailwind config and don't
 * need runtime mirrors yet.
 */

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * Motion primitives. `ease` arrays are Framer Motion cubic-bezier
 * tuples — they match tailwind.config.ts `transitionTimingFunction`
 * entries of the same name.
 */
export const MOTION = {
  duration: {
    swift: 0.15, // micro-interactions (hover, press)
    base: 0.24, // default transitions
    slow: 0.4, // deliberate reveals
    entrance: 0.6, // first-paint/hero entrances
  },
  ease: {
    smooth: [0.32, 0.72, 0, 1] as const, // default
    swift: [0.4, 0, 0.2, 1] as const, // micro-interactions
    emphatic: [0.2, 0.8, 0.2, 1] as const, // reveals
  },
  stagger: {
    tight: 0.04,
    base: 0.08,
    loose: 0.15,
  },
} as const;

// ---------------------------------------------------------------------------
// Severity palette
// ---------------------------------------------------------------------------

/**
 * Full severity palette, mirrored from tailwind.config.ts `severity.*`.
 * Sub-keys: `bg` (dark surface), `border` (dark border), `text` (on-dark
 * label), `accent` (saturated identity — used for risk gauges, solid
 * pills on light backgrounds).
 *
 * Legacy single-value access — `severity.{level}` — is preserved in the
 * Tailwind config via a DEFAULT sub-key, so class names like
 * `text-severity-critical` still resolve.
 */
export const SEVERITY_COLORS = {
  critical: {
    bg: "#2a0f0f",
    border: "#6b2020",
    text: "#ff6b6b",
    accent: "#dc2626",
  },
  high: {
    bg: "#2a1a0a",
    border: "#6b3c15",
    text: "#fbbf24",
    accent: "#d97706",
  },
  medium: {
    bg: "#2a2410",
    border: "#5c512a",
    text: "#fde047",
    accent: "#ca8a04",
  },
  low: {
    bg: "#0f2a18",
    border: "#1f5c3a",
    text: "#4ade80",
    accent: "#16a34a",
  },
} as const;

export type SeverityKey = keyof typeof SEVERITY_COLORS;

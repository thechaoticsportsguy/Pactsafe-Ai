import type { Config } from "tailwindcss";

/**
 * PactSafe AI — unified design system tokens.
 *
 * Single source of truth for colors, typography, spacing, motion,
 * and elevation. Drives every page: the editorial marketing site
 * (beige/ink palette) and the dark analysis workspace (surface/
 * severity palette).
 *
 * Migration note: tokens added in the design-system foundation are
 * additive. Legacy keys (surface-1…4, accent.DEFAULT/hover/soft,
 * severity.{level} as flat hex, border.DEFAULT/subtle/strong,
 * foreground.DEFAULT/muted/subtle) are preserved at their existing
 * values so components in flight continue to render identically.
 * Phase 2+ will finish the migration.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------
        // Base surfaces — warmer, deeper, layered
        // (Legacy — kept for visual parity across the workspace.)
        // ---------------------------------------------------------
        background: "#07080c",
        "bg-elevated": "#0c0e14",
        "surface-hi": "#161926", // kept for backwards compat

        // ---------------------------------------------------------
        // Surface palette — dark analysis workspace
        // Legacy keys DEFAULT/1/2/3/4 retain their pre-migration
        // hex so existing analysis UI renders identically. The new
        // `0` key is a deeper page background used by redesigned
        // workspace shells.
        // ---------------------------------------------------------
        surface: {
          DEFAULT: "#10121b",
          0: "#0a0a0f", // NEW — page bg (redesign)
          1: "#10121b", // legacy — primary card
          2: "#161926", // legacy — elevated card
          3: "#1c2030", // legacy — highest elevation
          4: "#242838", // legacy — kept for parity
        },

        // ---------------------------------------------------------
        // Borders & foreground (legacy — kept)
        // ---------------------------------------------------------
        border: {
          DEFAULT: "#242838",
          subtle: "#1a1d2a",
          strong: "#323650",
        },
        foreground: {
          DEFAULT: "#ecedf5",
          muted: "#8b8fa6",
          subtle: "#5b5f77",
        },
        muted: "#8b8fa6", // legacy backcompat

        // ---------------------------------------------------------
        // Accent — CTAs, focus rings, brand
        // DEFAULT/hover/soft/ring/glow preserved so Button, focus
        // rings, glows, etc. keep rendering. 50–700 scale added per
        // design system spec.
        // ---------------------------------------------------------
        accent: {
          DEFAULT: "#7c5cfc", // legacy — bg-accent etc.
          hover: "#6b4be8", // legacy — bg-accent-hover
          soft: "rgba(124, 92, 252, 0.12)",
          ring: "rgba(124, 92, 252, 0.38)",
          glow: "rgba(124, 92, 252, 0.55)",
          // NEW — spec scale
          50: "#f4f3ff",
          100: "#ebeafe",
          200: "#d8d5fd",
          400: "#8b84f5",
          500: "#6b62ec",
          600: "#4d42d6",
          700: "#3a31a8",
        },

        // ---------------------------------------------------------
        // Semantic (status) — legacy flat tokens
        // ---------------------------------------------------------
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",

        // ---------------------------------------------------------
        // Severity palette — red-flag gauge + flag list
        // DEFAULT sub-key preserves text-severity-{level},
        // bg-severity-{level}/10, etc. which are referenced all
        // over lib/severity.ts, FlagList, RiskGauge. New nested
        // sub-tokens (bg/border/text/accent) are spec additions for
        // redesign: dark-surface flag cards will pull
        // bg-severity-critical-bg, border-severity-critical-border,
        // text-severity-critical-text.
        // ---------------------------------------------------------
        severity: {
          critical: {
            DEFAULT: "#ef4444", // legacy — text-severity-critical
            bg: "#2a0f0f",
            border: "#6b2020",
            text: "#ff6b6b",
            accent: "#dc2626",
          },
          high: {
            DEFAULT: "#f97316", // legacy
            bg: "#2a1a0a",
            border: "#6b3c15",
            text: "#fbbf24",
            accent: "#d97706",
          },
          medium: {
            DEFAULT: "#eab308", // legacy
            bg: "#2a2410",
            border: "#5c512a",
            text: "#fde047",
            accent: "#ca8a04",
          },
          low: {
            DEFAULT: "#10b981", // legacy
            bg: "#0f2a18",
            border: "#1f5c3a",
            text: "#4ade80",
            accent: "#16a34a",
          },
        },

        // ---------------------------------------------------------
        // Editorial palette — marketing site (beige/ink)
        // Harvey.ai / Legly-inspired. Beige for backgrounds, ink
        // for type and borders. Sharp corners, zero translucency.
        // ---------------------------------------------------------
        beige: {
          50: "#F7F3EB",
          100: "#EFE9DD", // hero background
          200: "#E4DCC9",
          300: "#D4C8AC",
        },
        ink: {
          400: "#6b6b6b",
          500: "#4a4a4a", // muted body
          600: "#2a2a2a",
          700: "#1a1a1a", // body
          800: "#111111", // headlines
          900: "#000000", // absolute black — borders, CTAs
        },
      },

      // -----------------------------------------------------------
      // Typography
      // font-sans / font-mono read the CSS variables set by
      // next/font in app/layout.tsx. font-display aliases sans so
      // any legacy `font-display` utility continues to work.
      // -----------------------------------------------------------
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "JetBrains Mono",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        tighter: "-0.025em",
        tightest: "-0.04em",
      },
      // Documented type scale — design system spec. Existing Tailwind
      // defaults (text-xs … text-9xl) remain available; these add
      // semantic names aligned to the visual hierarchy.
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // legacy
        eyebrow: [
          "11px",
          { lineHeight: "1", letterSpacing: "0.15em", fontWeight: "500" },
        ],
        caption: ["12px", { lineHeight: "1.4", letterSpacing: "0.02em" }],
        "body-sm": ["13px", { lineHeight: "1.5" }],
        body: ["15px", { lineHeight: "1.55" }],
        "body-lg": ["17px", { lineHeight: "1.5" }],
        h4: [
          "20px",
          { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "500" },
        ],
        h3: [
          "28px",
          { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "500" },
        ],
        h2: [
          "40px",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "500" },
        ],
        h1: [
          "64px",
          { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "500" },
        ],
        display: [
          "84px",
          { lineHeight: "0.95", letterSpacing: "-0.035em", fontWeight: "500" },
        ],
      },

      // -----------------------------------------------------------
      // Radius — mostly sharp with escape hatches.
      // Existing overrides for xl/2xl/3xl preserved so legacy cards
      // (surface-card, ui/card.tsx, etc.) render unchanged. NEW
      // semantic keys: xs (2px) for subtle softening of inline
      // elements, explicit `full` for status dots.
      // -----------------------------------------------------------
      borderRadius: {
        xs: "2px", // NEW — inline softening
        xl: "0.875rem", // legacy override
        "2xl": "1.125rem", // legacy override
        "3xl": "1.5rem", // legacy
      },

      // -----------------------------------------------------------
      // Elevation — glow/card tokens kept; panel/elevated/glow-*
      // added for redesign.
      // -----------------------------------------------------------
      boxShadow: {
        // Legacy
        glow: "0 0 0 1px rgba(124, 92, 252, 0.35), 0 10px 30px -10px rgba(124, 92, 252, 0.45)",
        "glow-lg":
          "0 0 0 1px rgba(124, 92, 252, 0.4), 0 20px 60px -20px rgba(124, 92, 252, 0.55)",
        card: "0 1px 2px rgba(0,0,0,0.4), 0 4px 14px rgba(0,0,0,0.25)",
        "card-lg":
          "0 1px 2px rgba(0,0,0,0.45), 0 24px 48px -16px rgba(0,0,0,0.55)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.04)",
        // NEW — design system
        panel:
          "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.08)",
        elevated:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px -4px rgba(0,0,0,0.4)",
        "glow-accent": "0 0 32px -8px rgba(107, 98, 236, 0.4)",
        "glow-critical": "0 0 24px -8px rgba(220, 38, 38, 0.3)",
      },

      // -----------------------------------------------------------
      // Motion — mirrored in lib/design-tokens.ts MOTION.ease so
      // Framer Motion variants read identical curves.
      // -----------------------------------------------------------
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.32, 0.72, 0, 1)", // default motion
        swift: "cubic-bezier(0.4, 0, 0.2, 1)", // micro-interactions
        emphatic: "cubic-bezier(0.2, 0.8, 0.2, 1)", // entrances
      },

      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },

      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "75%, 100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "scan-sweep": {
          "0%": { top: "-10%" },
          "100%": { top: "110%" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "ping-slow": "ping-slow 2.4s cubic-bezier(0, 0, 0.2, 1) infinite",
        "scan-sweep": "scan-sweep 5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

/**
 * PactSafe AI — design tokens
 *
 * Premium legal-tech dark theme. Layered surfaces, subtle borders,
 * a single violet accent, and a parallel neutral palette for long-form
 * reading surfaces (contracts, analysis output).
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
        // Base surfaces — warmer, deeper, layered
        background: "#07080c",
        "bg-elevated": "#0c0e14",
        surface: {
          DEFAULT: "#10121b",
          1: "#10121b",
          2: "#161926",
          3: "#1c2030",
          4: "#242838",
        },
        "surface-hi": "#161926", // kept for backwards compat
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
        muted: "#8b8fa6", // kept for backwards compat
        accent: {
          DEFAULT: "#7c5cfc",
          hover: "#6b4be8",
          soft: "rgba(124, 92, 252, 0.12)",
          ring: "rgba(124, 92, 252, 0.38)",
          glow: "rgba(124, 92, 252, 0.55)",
        },
        // Semantic
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        // Severity palette (used in flag list, risk gauge)
        severity: {
          low: "#10b981",
          medium: "#eab308",
          high: "#f97316",
          critical: "#ef4444",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
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
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124, 92, 252, 0.35), 0 10px 30px -10px rgba(124, 92, 252, 0.45)",
        "glow-lg":
          "0 0 0 1px rgba(124, 92, 252, 0.4), 0 20px 60px -20px rgba(124, 92, 252, 0.55)",
        card: "0 1px 2px rgba(0,0,0,0.4), 0 4px 14px rgba(0,0,0,0.25)",
        "card-lg":
          "0 1px 2px rgba(0,0,0,0.45), 0 24px 48px -16px rgba(0,0,0,0.55)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.04)",
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
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

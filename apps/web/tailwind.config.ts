import type { Config } from "tailwindcss";

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
        // Theme ported from original index.html
        background: "#0a0a0f",
        surface: "#12121a",
        "surface-hi": "#1a1a24",
        border: "#2a2a38",
        accent: {
          DEFAULT: "#7c5cfc",
          hover: "#6b4be8",
          soft: "rgba(124, 92, 252, 0.12)",
        },
        foreground: "#eaeaf2",
        muted: "#8a8a9a",
        // Severity palette (same thresholds as risk bar)
        severity: {
          low: "#22c55e",
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
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124, 92, 252, 0.35), 0 10px 30px -10px rgba(124, 92, 252, 0.45)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

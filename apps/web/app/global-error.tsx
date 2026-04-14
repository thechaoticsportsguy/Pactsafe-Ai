"use client";

import { useEffect } from "react";

/**
 * Absolute last-resort error boundary. Runs when the root layout itself
 * errors, so we can't use TopNav/Footer or any shared chrome here —
 * everything must be self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#07080c",
          color: "#ecedf5",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "32rem" }}>
          <div
            style={{
              display: "inline-flex",
              width: 64,
              height: 64,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              marginBottom: "1.5rem",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              margin: "0 0 1rem",
            }}
          >
            Something broke at the root.
          </h1>
          <p
            style={{
              color: "#8b8fa6",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              margin: "0 0 1.5rem",
            }}
          >
            A critical error prevented the app from rendering. Try reloading
            — if it keeps happening, email us and we&rsquo;ll dig in.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.75rem",
                color: "#5b5f77",
                margin: "0 0 1.5rem",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#7c5cfc",
              color: "#fff",
              border: "none",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow:
                "0 0 0 1px rgba(124, 92, 252, 0.35), 0 10px 30px -10px rgba(124, 92, 252, 0.45)",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

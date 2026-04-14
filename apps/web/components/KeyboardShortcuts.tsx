"use client";

import * as React from "react";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Shortcut {
  keys: string[];
  label: string;
  context?: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    keys: ["⌘", "Enter"],
    label: "Run analysis on the current text",
    context: "On the landing or analyze page",
  },
  { keys: ["⌘", "K"], label: "Focus search", context: "History page" },
  { keys: ["G", "H"], label: "Go to history" },
  { keys: ["G", "A"], label: "Go to analyze" },
  { keys: ["G", "P"], label: "Go to pricing" },
  { keys: ["?"], label: "Show this help" },
  { keys: ["Esc"], label: "Dismiss dialogs" },
];

/**
 * Global keyboard shortcuts helper. Press `?` to open, `Esc` or click to
 * close. Also handles the `g <letter>` two-key navigation sequences.
 *
 * Must be mounted once near the root of the app.
 */
export default function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let waitingForG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const inEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const handler = (e: KeyboardEvent) => {
      // Never intercept when the user is typing in a field.
      if (inEditable(e.target)) return;

      // Open help with "?" (shift + /)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      // Two-key navigation: `g` then a letter
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        waitingForG = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          waitingForG = false;
        }, 1000);
        return;
      }
      if (waitingForG) {
        waitingForG = false;
        if (gTimer) clearTimeout(gTimer);
        switch (e.key.toLowerCase()) {
          case "h":
            window.location.assign("/history");
            return;
          case "a":
            window.location.assign("/analyze");
            return;
          case "p":
            window.location.assign("/pricing");
            return;
          case "/":
          case "home":
            window.location.assign("/");
            return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-background/75 backdrop-blur-sm animate-fade-in"
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-2xl border border-white/10 bg-bg-elevated/95 shadow-card-lg backdrop-blur-xl ring-1 ring-accent/20",
          "animate-fade-in-up",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
              <Keyboard className="h-3.5 w-3.5" />
            </span>
            <h2
              id="kbd-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Keyboard shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <ul className="divide-y divide-border/50">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-start justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground">{s.label}</p>
                {s.context && (
                  <p className="mt-0.5 text-xs text-foreground-subtle">
                    {s.context}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {s.keys.map((k, i) => (
                  <React.Fragment key={k}>
                    <kbd>{k}</kbd>
                    {i < s.keys.length - 1 && (
                      <span className="text-foreground-subtle text-[10px]">
                        +
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-border/60">
          <p className="text-[11px] text-foreground-subtle">
            Press <kbd>?</kbd> anywhere to open this help. Press{" "}
            <kbd>Esc</kbd> to close.
          </p>
        </div>
      </div>
    </div>
  );
}

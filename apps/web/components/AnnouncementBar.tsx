"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, X, ArrowRight } from "lucide-react";

const STORAGE_KEY = "pactsafe_announcement_v1_dismissed";

interface AnnouncementBarProps {
  text: string;
  ctaLabel: string;
  href: string;
}

/**
 * Thin marketing strip that sits above the TopNav. Dismissable, and
 * remembers the user's choice via localStorage so it doesn't nag.
 * Completely removed from the DOM when dismissed, so it doesn't
 * occupy layout space or trap focus.
 */
export default function AnnouncementBar({
  text,
  ctaLabel,
  href,
}: AnnouncementBarProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      setVisible(dismissed !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div className="relative z-40 w-full border-b border-border-subtle/60 bg-gradient-to-r from-accent/[0.08] via-bg-elevated to-accent/[0.06]">
      <div className="container-app flex h-10 items-center gap-3 text-xs md:text-sm">
        <Sparkles
          className="h-3.5 w-3.5 text-accent flex-shrink-0"
          aria-hidden
        />
        <p className="flex-1 min-w-0 truncate text-foreground-muted">
          <span className="font-medium text-foreground">{text}</span>
          <Link
            href={href}
            className="ml-2 inline-flex items-center gap-1 text-accent hover:underline underline-offset-2"
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

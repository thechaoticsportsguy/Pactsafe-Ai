"use client";

/**
 * AnnouncementBar — thin strip above TopNav for shipped-feature pings.
 *
 * Dismissable; remembers the user's choice via localStorage so it
 * doesn't nag. Completely removed from the DOM when dismissed, so it
 * doesn't occupy layout space or trap focus.
 *
 * Two variants mirror TopNav so the stack of chrome reads as one
 * surface:
 *   editorial  — beige-200 / ink-800 text / ink-800 hairline
 *   workspace  — surface-1 / zinc-300 text / white/5 hairline
 *
 * The Sparkles icon was removed in the Phase 2 restyle; it read as
 * promotional noise against the editorial palette. A static eyebrow
 * prefix ("New:") does the same job in plain type.
 */

import * as React from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "pactsafe_announcement_v1_dismissed";

type Variant = "editorial" | "workspace";

interface AnnouncementBarProps {
  text: string;
  ctaLabel: string;
  href: string;
  variant?: Variant;
}

const palette: Record<
  Variant,
  { shell: string; text: string; link: string; dismiss: string }
> = {
  editorial: {
    shell: "bg-beige-200 border-b border-ink-800",
    text: "text-ink-800",
    link: "text-ink-800 hover:text-ink-500",
    dismiss: "text-ink-800 hover:bg-ink-800/10",
  },
  workspace: {
    shell: "bg-surface-1 border-b border-white/5",
    text: "text-zinc-300",
    link: "text-zinc-100 hover:text-white",
    dismiss: "text-zinc-400 hover:bg-white/5 hover:text-white",
  },
};

export default function AnnouncementBar({
  text,
  ctaLabel,
  href,
  variant = "editorial",
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

  const p = palette[variant];

  return (
    <div className={cn("relative z-40 w-full", p.shell)}>
      <div className="mx-auto flex h-10 max-w-[1200px] items-center gap-3 px-8 text-[13px] md:px-12">
        <p className={cn("min-w-0 flex-1 truncate", p.text)}>
          <span className="font-medium">{text}</span>
          <Link
            href={href}
            className={cn(
              "ml-2 inline-flex items-center gap-1 underline underline-offset-2",
              p.link,
            )}
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className={cn(
            "flex h-6 w-6 flex-shrink-0 items-center justify-center transition-colors",
            p.dismiss,
          )}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

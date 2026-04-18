"use client";

/**
 * TopNav — unified site header.
 *
 * Two visual variants sharing identical structure (height, padding,
 * link spacing, layout). Only color tokens differ — so the nav reads
 * as ONE navigation system even when the editorial marketing site and
 * the dark analysis workspace look distinct side-by-side.
 *
 *   editorial  — beige pages (landing, pricing, changelog, legal)
 *                 bg-beige-100, ink-800 text, ink-800 CTA
 *   workspace  — dark analysis surfaces (/analyze, /history, …)
 *                 bg-surface-0, zinc-100 text, accent-500 CTA
 *
 * The variant is always set explicitly by the page (or its layout).
 * No auto-detection, no pathname heuristic — palette is a property of
 * the page, passed in so `grep TopNav` tells you exactly what each
 * surface uses. See Phase 2 spec for the rationale.
 *
 * Default is `editorial` (the marketing surface) since that's the
 * larger category of pages.
 */

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { LogoMark, type LogoMarkVariant } from "@/components/primitives/LogoMark";

export type TopNavVariant = "editorial" | "workspace";

interface TopNavProps {
  variant?: TopNavVariant;
  className?: string;
}

// Link sets are decoupled from visual variant — each variant just
// picks one of these. Route strings are the ONE thing that must not
// change during the Phase 2 restyle.
const NAV_LINKS_EDITORIAL = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/demo", label: "Sample report" },
  { href: "/pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
];

const NAV_LINKS_WORKSPACE = [
  { href: "/analyze", label: "Analyze" },
  { href: "/history", label: "History" },
  { href: "/compare", label: "Compare" },
];

// ---------------------------------------------------------------------------
// Palette — single table of every variant-dependent class. Anything
// not here (structural: heights, gaps, flex) is shared across both.
// Logo colors live in the LogoMark primitive so Footer renders the
// same mark.
// ---------------------------------------------------------------------------
const palette: Record<
  TopNavVariant,
  {
    shell: string;
    link: string;
    secondaryCta: string;
    primaryCta: string;
    hamburger: string;
    mobilePanel: string;
    mobileLink: string;
    mobileDivider: string;
    mobilePrimaryCta: string;
  }
> = {
  editorial: {
    shell: "bg-beige-100 border-b border-ink-800 text-ink-800",
    link: "text-ink-800 hover:text-ink-500",
    secondaryCta:
      "text-ink-800 hover:text-ink-500 transition-colors px-2 py-1",
    primaryCta:
      "inline-flex items-center bg-ink-800 px-5 py-2.5 text-[13px] font-medium text-beige-100 transition-colors hover:bg-ink-700",
    hamburger: "text-ink-800 hover:bg-ink-800/5",
    mobilePanel: "bg-beige-100 border-t border-ink-800 text-ink-800",
    mobileLink: "text-ink-800 hover:bg-ink-800/5",
    mobileDivider: "border-t border-ink-800/40",
    mobilePrimaryCta: "bg-ink-800 text-beige-100 hover:bg-ink-700",
  },
  workspace: {
    shell: "bg-surface-0 border-b border-white/5 text-zinc-100",
    link: "text-zinc-300 hover:text-white",
    secondaryCta:
      "text-zinc-400 hover:text-white transition-colors px-2 py-1",
    primaryCta:
      "inline-flex items-center rounded-md bg-accent-500 px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-accent-600 hover:shadow-glow-accent",
    hamburger: "text-zinc-100 hover:bg-white/5",
    mobilePanel: "bg-surface-0 border-t border-white/5 text-zinc-100",
    mobileLink: "text-zinc-300 hover:bg-white/5 hover:text-white",
    mobileDivider: "border-t border-white/10",
    mobilePrimaryCta: "bg-accent-500 text-white hover:bg-accent-600",
  },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TopNav({
  variant = "editorial",
  className,
}: TopNavProps) {
  const [open, setOpen] = React.useState(false);
  const p = palette[variant];
  const links =
    variant === "editorial" ? NAV_LINKS_EDITORIAL : NAV_LINKS_WORKSPACE;

  // LogoMark palette tracks the TopNav variant 1:1. Editorial pages get
  // the ink-on-beige mark; workspace pages (/compare, /analysis/[id])
  // get the accent-matched white-square mark. /analyze and /history
  // used to be a third "mono-light" variant carved out of workspace,
  // but Phase-4-D collapsed them onto editorial, so the mono branch is
  // gone.
  const logoVariant: LogoMarkVariant =
    variant === "editorial" ? "editorial" : "workspace";

  // Wordmark color follows the TopNav variant (not the logoVariant
  // sub-split) — the "PactSafe" text reads consistently across every
  // workspace page regardless of which mark flavor sits next to it.
  const wordmarkClass =
    variant === "editorial" ? "text-ink-800" : "text-zinc-100";

  return (
    <header
      className={cn("sticky top-0 z-40 w-full", p.shell, className)}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center px-8 md:px-12">
        <Link
          href="/"
          aria-label="PactSafe home"
          className="inline-flex items-center gap-2.5"
        >
          <LogoMark variant={logoVariant} size={28} />
          <span
            className={cn(
              "text-[15px] font-medium tracking-[-0.01em]",
              wordmarkClass,
            )}
          >
            PactSafe
          </span>
        </Link>

        <nav
          className="ml-10 hidden items-center gap-8 md:flex"
          aria-label="Primary"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-[13px] font-normal transition-colors",
                p.link,
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden items-center gap-6 md:flex">
          {variant === "editorial" ? (
            <>
              <Link
                href="/history"
                className={cn("text-[13px] font-normal", p.secondaryCta)}
              >
                Sign in
              </Link>
              <Link href="/analyze" className={p.primaryCta}>
                Analyze a contract
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className={cn("text-[13px] font-normal", p.secondaryCta)}
              >
                Home
              </Link>
              <Link href="/analyze" className={p.primaryCta}>
                New analysis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center transition-colors md:hidden",
            p.hamburger,
          )}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className={cn("md:hidden", p.mobilePanel)}>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-8 py-4 md:px-12">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-2.5 text-[13px] font-normal transition-colors",
                  p.mobileLink,
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className={cn("mt-2 flex flex-col gap-2 pt-3", p.mobileDivider)}>
              <Link
                href="/analyze"
                onClick={() => setOpen(false)}
                className={cn(
                  "inline-flex h-10 items-center justify-center px-5 text-[13px] font-medium transition-colors",
                  p.mobilePrimaryCta,
                )}
              >
                {variant === "editorial" ? "Analyze a contract" : "New analysis"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

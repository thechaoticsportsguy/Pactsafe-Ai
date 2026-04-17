"use client";

/**
 * Section primitives for the editorial marketing surface.
 *
 *   <SectionEditorial>   — bg tone + padding + divider + optional reveal
 *   <SectionHeader>      — eyebrow / title / body block above the content
 *
 * The primitives exist so every marketing section reads from one place
 * for spacing, divider color, tone alternation, and headline typography.
 * If we tune the rhythm later (e.g. looser padding, different divider
 * opacity), we change these two files.
 *
 * Palette:
 *   tone="cream"     — bg-beige-100 (default)
 *   tone="warm"      — bg-beige-200 (alternating rhythm)
 *   tone="inverted"  — bg-ink-800 (FinalCTA-style)
 *
 * Motion:
 *   reveal={true} wraps the inner container in <Reveal> from the
 *   Motion primitive (scroll-triggered fade + rise). For finer control
 *   (staggered children, custom delays), drop reveal and compose
 *   motion inside the children directly.
 */

import * as React from "react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Motion";

// ---------------------------------------------------------------------------
// <SectionEditorial>
// ---------------------------------------------------------------------------

type Tone = "cream" | "warm" | "inverted";
type Divider = "top" | "bottom" | "both" | "none";
type Pad = "md" | "lg" | "xl";

export interface SectionEditorialProps
  extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone;
  divider?: Divider;
  /** Wrap the container in a scroll-triggered Reveal. Default true. */
  reveal?: boolean;
  /** Vertical padding scale. Default "xl" (80-112px). */
  pad?: Pad;
  /** Container layout. "app" uses max-w-[1200px]; "none" opts out. */
  container?: "app" | "none";
}

const toneStyles: Record<Tone, string> = {
  cream: "bg-beige-100 text-ink-800",
  warm: "bg-beige-200 text-ink-800",
  inverted: "bg-ink-800 text-beige-50",
};

const padStyles: Record<Pad, string> = {
  md: "py-12 md:py-16",
  lg: "py-16 md:py-24",
  xl: "py-20 md:py-28",
};

// Divider colors track tone so the 1px rule reads consistently against
// both beige and inverted backgrounds without needing inline overrides.
function dividerClass(divider: Divider, tone: Tone): string {
  if (divider === "none") return "";
  const color = tone === "inverted" ? "border-beige-50/10" : "border-ink-800/10";
  return (
    {
      top: `border-t ${color}`,
      bottom: `border-b ${color}`,
      both: `border-y ${color}`,
      none: "",
    }[divider] ?? ""
  );
}

export function SectionEditorial({
  tone = "cream",
  divider = "none",
  reveal = true,
  pad = "xl",
  container = "app",
  className,
  children,
  ...props
}: SectionEditorialProps) {
  const inner =
    container === "app" ? (
      <div className="container-app">{children}</div>
    ) : (
      children
    );

  const body = reveal ? <Reveal>{inner}</Reveal> : inner;

  return (
    <section
      className={cn(
        "relative",
        toneStyles[tone],
        padStyles[pad],
        dividerClass(divider, tone),
        className,
      )}
      {...props}
    >
      {body}
    </section>
  );
}

// ---------------------------------------------------------------------------
// <SectionHeader>
// ---------------------------------------------------------------------------

type HeaderAlign = "left" | "center";
type HeaderSize = "default" | "large";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  align?: HeaderAlign;
  /** On an inverted-tone section, flips text colors to the light palette. */
  inverted?: boolean;
  /** "large" scales the headline to h1 size for page hero headers. */
  size?: HeaderSize;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  body,
  align = "left",
  inverted = false,
  size = "default",
  className,
}: SectionHeaderProps) {
  // Palette swap for inverted (ink-800 bg) sections.
  const eyebrowClass = inverted ? "text-beige-300" : "text-ink-500";
  const titleClass = inverted ? "text-beige-50" : "text-ink-800";
  const bodyClass = inverted ? "text-beige-200" : "text-ink-600";

  // Size maps to the Phase 1 typography tokens (text-h1 / text-h2, both
  // weight 500). Mobile drops to text-3xl so the 64px/40px desktop sizes
  // don't blow out narrow viewports.
  const titleSize =
    size === "large"
      ? "text-3xl md:text-h1 tracking-tightest"
      : "text-3xl md:text-h2 tracking-tight";

  const alignClass = align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl";

  return (
    <div className={cn(alignClass, className)}>
      {eyebrow && (
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.15em]",
            eyebrowClass,
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2 className={cn("mt-4 font-medium", titleSize, titleClass)}>
        {title}
      </h2>
      {body && (
        <p
          className={cn(
            "mt-5 max-w-2xl text-base md:text-body-lg leading-relaxed",
            align === "center" && "mx-auto",
            bodyClass,
          )}
        >
          {body}
        </p>
      )}
    </div>
  );
}

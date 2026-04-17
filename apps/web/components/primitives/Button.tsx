"use client";

/**
 * Button — canonical primitive for the redesign.
 *
 * Two palette contexts supported:
 *  • editorial (beige pages): solid ink on beige; border ink on beige
 *  • workspace (dark pages):  solid accent on surface; border on surface
 *
 * Sharp corners by default (editorial default). Use `radius="md"` to
 * opt into a softer 8px radius for the dark analysis workspace where
 * cards carry rounded corners.
 *
 * The legacy button at components/ui/button.tsx remains for in-flight
 * callers. New code should import this primitive.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Palette = "editorial" | "workspace";
type Size = "sm" | "md" | "lg";
type Radius = "none" | "md";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  palette?: Palette;
  size?: Size;
  radius?: Radius;
  loading?: boolean;
}

// Variant × palette matrix. Keeping the switch explicit (vs. generated)
// so a11y states (hover/active/disabled/focus) are auditable at a glance.
const styles: Record<Palette, Record<Variant, string>> = {
  editorial: {
    primary:
      "bg-ink-800 text-beige-50 hover:bg-ink-700 active:translate-y-px disabled:opacity-40",
    secondary:
      "border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-beige-50 disabled:opacity-40",
    ghost:
      "text-ink-800 hover:bg-ink-900/5 disabled:opacity-40",
  },
  workspace: {
    primary:
      "bg-accent-500 text-white hover:bg-accent-600 active:translate-y-px disabled:opacity-40",
    secondary:
      "border border-border bg-surface-1/60 text-foreground hover:bg-surface-2 hover:border-border-strong disabled:opacity-40",
    ghost:
      "text-foreground/80 hover:bg-surface-2/60 hover:text-foreground disabled:opacity-40",
  },
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-[15px] gap-2",
};

const radii: Record<Radius, string> = {
  none: "rounded-none",
  md: "rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      palette = "editorial",
      size = "md",
      radius = "none",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 ease-swift",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed",
          styles[palette][variant],
          sizes[size],
          radii[radius],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
          />
        ) : null}
        {children}
      </button>
    );
  },
);

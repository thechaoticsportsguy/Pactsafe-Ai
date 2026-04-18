"use client";

/**
 * TextArea — canonical multiline input primitive for the redesign.
 *
 * Two palette contexts supported, matching Button:
 *  • workspace (dark pages): surface-2 fill, white/10 border, zinc-100 text
 *  • editorial (beige pages): beige fill, ink border, ink text
 *
 * Sharp corners by default match the workspace card aesthetic. The
 * `radius` prop opts into "md" softening when the TextArea lives
 * inside a rounded panel.
 *
 * The legacy TextArea at components/ui/input.tsx remains for the
 * editorial /contact page and any external call sites. New workspace
 * code should import this primitive.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type Palette = "workspace" | "editorial";
type Size = "sm" | "md" | "lg";
type Radius = "none" | "md";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  palette?: Palette;
  size?: Size;
  radius?: Radius;
}

// Palette matrix — explicit rather than generated so a11y focus states
// remain auditable alongside the base styles.
const styles: Record<Palette, string> = {
  workspace: cn(
    "border border-white/10 bg-surface-2 text-zinc-100",
    "placeholder:text-zinc-500",
    "focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ),
  editorial: cn(
    "border border-ink-900/30 bg-beige-50 text-ink-900",
    "placeholder:text-ink-500",
    "focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ),
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-2 text-xs leading-relaxed min-h-[80px]",
  md: "px-3.5 py-3 text-sm leading-relaxed min-h-[120px]",
  lg: "px-4 py-3.5 text-[15px] leading-relaxed min-h-[160px]",
};

const radii: Record<Radius, string> = {
  none: "rounded-none",
  md: "rounded-md",
};

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      className,
      palette = "workspace",
      size = "md",
      radius = "md",
      ...props
    },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full transition-colors duration-150 ease-swift resize-y",
          styles[palette],
          sizes[size],
          radii[radius],
          className,
        )}
        {...props}
      />
    );
  },
);

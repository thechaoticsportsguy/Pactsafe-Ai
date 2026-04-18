import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "subtle"
  | "danger";
type Size = "xs" | "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-glow-accent hover:bg-accent-hover active:translate-y-px disabled:opacity-50 disabled:shadow-none",
  secondary:
    "bg-white text-[#0b0d14] hover:bg-white/90 active:translate-y-px disabled:opacity-60",
  outline:
    "border border-border bg-surface/40 text-foreground hover:bg-surface-2 hover:border-border-strong disabled:opacity-50",
  ghost:
    "text-foreground/80 hover:bg-surface/60 hover:text-foreground disabled:opacity-50",
  subtle:
    "bg-surface-2 text-foreground hover:bg-surface-3 disabled:opacity-50",
  danger:
    "bg-severity-critical/90 text-white hover:bg-severity-critical disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs rounded-md gap-1",
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-11 px-5 text-sm rounded-lg gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
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
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

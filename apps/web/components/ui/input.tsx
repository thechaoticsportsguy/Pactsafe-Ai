import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface/80 px-3.5 text-sm text-foreground",
        "placeholder:text-foreground-muted",
        "focus:border-accent/70 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "transition-colors",
        className,
      )}
      {...props}
    />
  );
});

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface/80 px-3.5 py-3 text-sm text-foreground leading-relaxed",
        "placeholder:text-foreground-muted",
        "focus:border-accent/70 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "transition-colors resize-y min-h-[120px]",
        className,
      )}
      {...props}
    />
  );
});

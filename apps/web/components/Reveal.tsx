"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Delay before the transition starts, in ms. Useful for staggered lists. */
  delay?: number;
  /** How far to translate on the y-axis while hidden, in px. */
  distance?: number;
  /** Trigger only once, then stop observing. Defaults to true. */
  once?: boolean;
  /** Margin around the viewport when computing intersection. */
  rootMargin?: string;
  children: React.ReactNode;
}

/**
 * Scroll-reveal wrapper. Starts invisible + translated, fades in when it
 * enters the viewport. Respects `prefers-reduced-motion`: users with
 * reduced motion get the content immediately visible with no transition.
 */
export default function Reveal({
  delay = 0,
  distance = 18,
  once = true,
  rootMargin = "0px 0px -10% 0px",
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const listener = () => setReduced(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setVisible(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { rootMargin, threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin, reduced]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-[700ms] ease-[cubic-bezier(0.22,0.9,0.22,1)] will-change-transform",
        visible ? "opacity-100 translate-y-0" : "opacity-0",
        className,
      )}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
        transform: visible ? undefined : `translateY(${distance}px)`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

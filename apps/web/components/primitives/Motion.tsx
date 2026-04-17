"use client";

/**
 * Canonical Framer Motion primitives.
 *
 * Every motion in the redesign should route through these variants
 * (fadeInUp / scaleIn / staggerChildren) or the <Reveal> wrapper.
 * That way one file owns timing and easing, and designers can tune
 * the whole site by editing MOTION in lib/design-tokens.ts.
 *
 * Do NOT hand-roll transitions inline with new bezier curves — add a
 * new variant here if a unique motion is genuinely needed.
 */

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { MOTION } from "@/lib/design-tokens";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION.duration.base,
      ease: MOTION.ease.emphatic,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION.duration.base,
      ease: MOTION.ease.swift,
    },
  },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: MOTION.stagger.base },
  },
};

// ---------------------------------------------------------------------------
// <Reveal> — scroll-triggered entrance
//
// Thin wrapper around Framer Motion's whileInView. Mounts hidden,
// animates to visible when the viewport crosses the element once,
// then unobserves. `delay` staggers siblings without a parent
// stagger controller.
//
// A simpler IntersectionObserver-based Reveal already lives at
// components/Reveal.tsx — that one is retained for backwards compat
// with existing landing-page sections. New code should import this
// one from @/components/primitives/Motion.
// ---------------------------------------------------------------------------

interface RevealProps {
  children: React.ReactNode;
  /** Delay (in seconds) before the animation starts. */
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeInUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

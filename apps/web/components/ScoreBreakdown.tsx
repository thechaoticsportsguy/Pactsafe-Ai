"use client";

import * as React from "react";
import {
  Scale,
  Eye,
  Shield,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { SubScores } from "@/lib/schemas";
import { cn } from "@/lib/cn";

interface ScoreBreakdownProps {
  scores: SubScores;
}

interface Dimension {
  key: keyof SubScores;
  label: string;
  icon: LucideIcon;
  hint: string;
}

const DIMENSIONS: Dimension[] = [
  {
    key: "fairness",
    label: "Fairness",
    icon: Scale,
    hint: "How balanced the obligations are between parties.",
  },
  {
    key: "clarity",
    label: "Clarity",
    icon: Eye,
    hint: "How unambiguous the scope and deliverables are.",
  },
  {
    key: "protection",
    label: "Protection",
    icon: Shield,
    hint: "How well the contract shields you from downside risk.",
  },
  {
    key: "payment_safety",
    label: "Payment safety",
    icon: CreditCard,
    hint: "Payment terms, deposits, and late-fee coverage.",
  },
];

function bandColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function bandLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Weak";
  return "Poor";
}

export default function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <div className="rounded-lg border border-ink-800/10 bg-beige-50 p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600">
          Contract health breakdown
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-500">
          Higher is better
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {DIMENSIONS.map((d) => {
          const raw = scores[d.key];
          const value = Math.max(0, Math.min(100, Math.round(raw)));
          const color = bandColor(value);
          const label = bandLabel(value);
          return (
            <div key={d.key} className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `${color}1a`,
                    color,
                  }}
                >
                  <d.icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <p className="text-sm font-medium text-ink-800">
                  {d.label}
                </p>
                <span
                  className="ml-auto text-[10px] font-semibold uppercase tracking-[0.12em] tabular-nums"
                  style={{ color }}
                >
                  {label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-ink-800">
                  {value}
                </span>
              </div>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-800/5"
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${d.label} score ${value} of 100`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700 ease-out",
                  )}
                  style={{
                    width: `${value}%`,
                    background: `linear-gradient(90deg, ${color}aa, ${color})`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs leading-snug text-ink-600">
                {d.hint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

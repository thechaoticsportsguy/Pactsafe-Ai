"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { riskBand } from "@/lib/severity";
import { Badge, type SeverityLevel } from "@/components/primitives/Badge";

interface RiskGaugeProps {
  score: number; // 0..100
  className?: string;
}

export default function RiskGauge({ score, className }: RiskGaugeProps) {
  const clamped = Math.min(95, Math.max(0, Math.round(score)));
  const band = riskBand(clamped);
  const [displayed, setDisplayed] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const to = clamped;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const toneMap: Record<string, SeverityLevel> = {
    "#10b981": "low",
    "#eab308": "medium",
    "#f97316": "high",
    "#ef4444": "critical",
  };
  const tone: SeverityLevel = toneMap[band.color] ?? "low";

  return (
    <div
      className={cn(
        "relative rounded-lg border border-ink-800/10 bg-beige-50 p-6 overflow-hidden",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(60% 80% at 0% 100%, ${band.color}1a 0%, transparent 55%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-600">
            Overall risk score
          </p>
          <Badge variant="severity" level={tone}>
            {band.label}
          </Badge>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-5xl font-semibold tracking-tightest tabular-nums text-ink-800">
            {displayed}
          </span>
          <span className="text-lg text-ink-600 tabular-nums">
            / 100
          </span>
        </div>

        <div
          className="mt-6 relative h-2.5 w-full overflow-hidden rounded-full bg-ink-800/5"
          aria-label={`Risk score ${clamped} of 100`}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* band marker background */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(90deg, #10b981 0%, #10b981 30%, #eab308 30%, #eab308 60%, #f97316 60%, #f97316 80%, #ef4444 80%)",
            }}
          />
          <div
            className="relative h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${displayed}%`,
              background: `linear-gradient(90deg, ${band.color}aa, ${band.color})`,
            }}
          />
        </div>

        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-ink-600 tabular-nums">
          <span>0 · Safe</span>
          <span>30</span>
          <span>60</span>
          <span>80</span>
          <span>100 · Critical</span>
        </div>
      </div>
    </div>
  );
}

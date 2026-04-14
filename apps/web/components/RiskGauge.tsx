"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { riskBand } from "@/lib/severity";

interface RiskGaugeProps {
  score: number; // 0..100
  className?: string;
}

export default function RiskGauge({ score, className }: RiskGaugeProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const band = riskBand(clamped);

  const [displayed, setDisplayed] = React.useState(0);

  React.useEffect(() => {
    // animate from 0 up to the clamped score
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

  return (
    <div className={cn("rounded-xl border border-border bg-surface/70 p-5", className)}>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Overall risk
          </p>
          <p className="text-3xl font-semibold tabular-nums mt-1">
            {displayed}
            <span className="text-base font-normal text-muted"> / 100</span>
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
          style={{
            color: band.color,
            borderColor: band.color,
            backgroundColor: `${band.color}1f`, // ~12% alpha
          }}
        >
          {band.label}
        </span>
      </div>

      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-surface-hi"
        aria-label={`Risk score ${clamped} of 100`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${displayed}%`,
            backgroundColor: band.color,
            boxShadow: `0 0 18px ${band.color}8c`,
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-muted">
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface NegotiationComposerProps {
  suggestions: string[];
  contractType?: string;
  className?: string;
}

const INTROS: Record<string, string> = {
  friendly: "Hi team,\n\nThanks for sending this over. I reviewed the draft and wanted to share a few thoughts before we proceed.",
  formal: "Dear Counsel,\n\nThank you for circulating the draft agreement. After review, I would like to propose the following revisions prior to execution.",
  firm: "Hi,\n\nBefore we can move forward on this agreement, the following points need to be addressed.",
};

type Tone = keyof typeof INTROS;

export default function NegotiationComposer({
  suggestions,
  contractType,
  className,
}: NegotiationComposerProps) {
  const [tone, setTone] = React.useState<Tone>("friendly");
  const [selected, setSelected] = React.useState<Set<number>>(
    () => new Set(suggestions.map((_, i) => i)),
  );
  const [copied, setCopied] = React.useState(false);

  const draft = React.useMemo(() => {
    const lines: string[] = [];
    lines.push(INTROS[tone]);
    if (contractType) {
      lines.push(`\nRe: ${contractType}\n`);
    } else {
      lines.push("");
    }
    const picks = suggestions.filter((_, i) => selected.has(i));
    if (picks.length > 0) {
      lines.push("Proposed revisions:");
      picks.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    }
    lines.push(
      "\nHappy to discuss any of these on a quick call. Looking forward to getting this across the line.",
    );
    lines.push("\nBest,");
    return lines.join("\n");
  }, [tone, selected, suggestions, contractType]);

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface/70 p-8 text-center text-sm text-muted">
        No negotiation suggestions were generated.
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface/70 p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">Draft negotiation email</h3>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs">
          {(["friendly", "formal", "firm"] as Tone[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={cn(
                "px-2 py-1 rounded capitalize",
                tone === t
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">
          Include points
        </p>
        <ul className="space-y-1">
          {suggestions.map((s, i) => (
            <li key={i}>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 accent-accent"
                />
                <span>{s}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <TextArea value={draft} readOnly rows={14} className="font-mono text-xs" />

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="subtle" onClick={copyToClipboard}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

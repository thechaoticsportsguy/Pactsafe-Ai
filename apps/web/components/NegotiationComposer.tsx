"use client";

import * as React from "react";
import { Copy, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/cn";

interface NegotiationComposerProps {
  /**
   * Accepts `undefined` / `null` so this component is safe to mount
   * directly against a half-populated AnalysisResult from a rate-
   * limited or truncated model response. Treated as an empty list.
   */
  suggestions?: string[] | null;
  contractType?: string;
  className?: string;
}

const INTROS: Record<string, string> = {
  friendly:
    "Hi team,\n\nThanks for sending this over. I reviewed the draft and wanted to share a few thoughts before we proceed.",
  formal:
    "Dear Counsel,\n\nThank you for circulating the draft agreement. After review, I would like to propose the following revisions prior to execution.",
  firm: "Hi,\n\nBefore we can move forward on this agreement, the following points need to be addressed.",
};

type Tone = keyof typeof INTROS;

const TONE_DESCRIPTION: Record<Tone, string> = {
  friendly: "Warm, collaborative, keeps the tone light.",
  formal: "Professional, polished, for legal counterparts.",
  firm: "Direct, non-negotiable — use sparingly.",
};

export default function NegotiationComposer({
  suggestions,
  contractType,
  className,
}: NegotiationComposerProps) {
  const { toast } = useToast();
  const safeSuggestions = React.useMemo<string[]>(
    () =>
      Array.isArray(suggestions)
        ? suggestions.filter((s): s is string => typeof s === "string" && s.length > 0)
        : [],
    [suggestions],
  );
  const [tone, setTone] = React.useState<Tone>("friendly");
  const [selected, setSelected] = React.useState<Set<number>>(
    () => new Set(safeSuggestions.map((_, i) => i)),
  );
  const [copied, setCopied] = React.useState(false);

  // Keep the "selected" set aligned with the current suggestions list so
  // a late-arriving normalized payload doesn't leave stale indices
  // pointing past the end of the array.
  React.useEffect(() => {
    setSelected(new Set(safeSuggestions.map((_, i) => i)));
  }, [safeSuggestions]);

  const draft = React.useMemo(() => {
    const lines: string[] = [];
    lines.push(INTROS[tone]);
    if (contractType) {
      lines.push(`\nRe: ${contractType}\n`);
    } else {
      lines.push("");
    }
    const picks = safeSuggestions.filter((_, i) => selected.has(i));
    if (picks.length > 0) {
      lines.push("Proposed revisions:");
      picks.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    }
    lines.push(
      "\nHappy to discuss any of these on a quick call. Looking forward to getting this across the line.",
    );
    lines.push("\nBest,");
    return lines.join("\n");
  }, [tone, selected, safeSuggestions, contractType]);

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
      toast({
        tone: "success",
        message: "Email copied to clipboard",
        description: "Paste it into Gmail, Superhuman, or your client thread.",
      });
    } catch {
      toast({
        tone: "error",
        message: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
      });
    }
  }

  if (safeSuggestions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface/70 p-8 text-center text-sm text-foreground-muted">
        No negotiation suggestions were generated.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface/70 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/70">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-accent" />
            Draft negotiation email
          </p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {TONE_DESCRIPTION[tone]}
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          {(["friendly", "formal", "firm"] as Tone[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors",
                tone === t
                  ? "bg-accent text-white shadow-glow"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Include points
          </p>
          <ul className="mt-3 space-y-2">
            {safeSuggestions.map((s, i) => (
              <li key={i}>
                <label className="flex items-start gap-2.5 text-xs cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-0.5 accent-accent"
                  />
                  <span className="text-foreground/85 group-hover:text-foreground leading-relaxed">
                    {s}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <TextArea
            value={draft}
            readOnly
            rows={14}
            className="font-mono text-xs bg-bg-elevated/60"
          />
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" size="sm" onClick={copyToClipboard}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

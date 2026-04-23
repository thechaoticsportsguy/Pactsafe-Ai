"use client";

import { useEffect } from "react";
import { FileText, X } from "lucide-react";

/**
 * NotAContractModal — Pass 0 rejection surface.
 *
 * Rendered as a centered modal overlay on top of the /analyze upload
 * form when the backend's contract-validity gate refuses the document.
 * The user's upload context (dropzone or paste box) stays visible
 * underneath; dismissing the modal returns them to that context.
 *
 * Dismissal routes:
 *   • backdrop click  → onDismiss
 *   • X button        → onDismiss
 *   • Escape key      → onDismiss
 *   • "Try a different document" CTA → onTryAnother (caller clears
 *     rejectedJob AND resets the upload form for a fresh attempt)
 *
 * Body scroll is locked while open so the modal feels like a true
 * overlay and background scroll-jacking can't occur.
 */
type NotAContractModalProps = {
  open: boolean;
  detectedAs?: string | null;
  reason?: string | null;
  onDismiss: () => void;
  onTryAnother: () => void;
};

export function NotAContractModal({
  open,
  detectedAs,
  reason,
  onDismiss,
  onTryAnother,
}: NotAContractModalProps) {
  // Lock body scroll + wire Escape-to-close while the modal is open.
  // Guards on `open` so the handlers are only installed when visible —
  // no wasted listeners on the upload page's idle state.
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="not-a-contract-title"
    >
      {/* Backdrop — button so keyboard users can dismiss without
          relying on the X or Escape. Subtle ink darkening rather than
          a harsh black scrim to match the editorial palette. */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onDismiss}
        className="absolute inset-0 bg-ink-800/35 cursor-default"
      />

      {/* Modal card — beige surface with a 3px ink left accent, the
          same editorial treatment used on the Summary card and the
          "Not legal advice" callout on the report. Sharp corners
          throughout; no rounded anything. */}
      <div
        className="relative bg-beige-100 border border-ink-800/15 border-l-[3px] border-l-ink-800 max-w-[460px] w-full p-10 pr-11"
        style={{ boxShadow: "0 20px 48px -12px rgba(0, 0, 0, 0.18)" }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onDismiss}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-ink-800 hover:bg-ink-800/5 transition-colors"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <div className="w-[42px] h-[42px] bg-ink-800/[0.08] border border-ink-800/15 flex items-center justify-center mb-6">
          <FileText className="w-[18px] h-[18px] text-ink-800" strokeWidth={1.8} />
        </div>

        <div className="text-caption uppercase tracking-widest text-ink-600 font-medium mb-2.5">
          Not a contract
        </div>

        <h2
          id="not-a-contract-title"
          className="text-h3 font-medium text-ink-800 leading-[1.25] tracking-[-0.01em] mb-3"
        >
          This doesn&rsquo;t look like a contract.
        </h2>

        <p className="text-body-sm text-ink-700 leading-[1.6] mb-1">
          PactSafe only analyzes legal agreements. Paste a contract, NDA, or
          terms of service — we won&rsquo;t produce findings on general text.
        </p>

        {detectedAs ? (
          <p className="text-body-sm text-ink-600 leading-[1.55] mb-7">
            We detected this as{" "}
            <span className="text-ink-800 font-medium">{detectedAs}</span>.
            {reason ? ` ${reason}` : ""}
          </p>
        ) : (
          <div className="mb-7" />
        )}

        <button
          type="button"
          onClick={onTryAnother}
          className="bg-ink-800 text-beige-100 hover:bg-ink-700 px-6 py-3 text-body-sm font-medium transition-colors"
        >
          Try a different document
        </button>
      </div>
    </div>
  );
}

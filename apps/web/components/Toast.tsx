"use client";

import * as React from "react";
import { CheckCircle2, AlertOctagon, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

interface ToastRecord {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: {
    tone?: ToastTone;
    message: string;
    description?: string;
    durationMs?: number;
  }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Lightweight app-wide toast provider. Renders a stacked column of toasts
 * in the corner and exposes a `toast(...)` function via `useToast()`.
 * Zero dependencies beyond React + lucide.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const idRef = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ tone = "success", message, description, durationMs = 3200 }) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message, description }]);
      if (durationMs > 0) {
        window.setTimeout(() => remove(id), durationMs);
      }
    },
    [remove],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end md:px-0"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: () => void;
}) {
  const toneMap: Record<
    ToastTone,
    { icon: React.ElementType; ring: string; iconColor: string }
  > = {
    success: {
      icon: CheckCircle2,
      ring: "ring-success/30",
      iconColor: "text-success",
    },
    error: {
      icon: AlertOctagon,
      ring: "ring-severity-critical/30",
      iconColor: "text-severity-critical",
    },
    info: {
      icon: Info,
      ring: "ring-accent/30",
      iconColor: "text-accent",
    },
  };
  const t = toneMap[toast.tone];
  const Icon = t.icon;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto w-full md:w-[360px] rounded-xl border border-white/10 bg-bg-elevated/95 p-3.5 shadow-card-lg backdrop-blur-xl ring-1",
        t.ring,
        "animate-fade-in-up",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn("h-4 w-4 mt-0.5 flex-shrink-0", t.iconColor)}
          strokeWidth={2.25}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{toast.message}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs text-foreground-muted leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-2 hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // No-op fallback so callers don't crash if rendered outside provider
    // (e.g. during SSR before hydration).
    return {
      toast: () => {
        /* no-op */
      },
    };
  }
  return ctx;
}

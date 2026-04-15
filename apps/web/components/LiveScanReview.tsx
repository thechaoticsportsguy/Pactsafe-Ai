"use client";

/**
 * LiveScanReview — cinematic "watch the AI scan your contract" view.
 *
 * Adapted from the Claude-authored `pactsafe-live-pdf-analyzer.jsx`
 * mock, hooked up to the real `HighlightItem[]` pipeline instead of
 * the hardcoded demo sections.
 *
 * Phases:
 *   idle     — ready screen with a Start button
 *   scanning — scan beam sweeps, findings reveal one-by-one in order
 *   done     — full document + findings + verdict visible, replay available
 *
 * Two-column layout:
 *   Left  — document body rendered like a real contract, each finding
 *           is its own inline "clause block" with risk styling
 *   Right — live risk score, counts, scan steps, findings list, verdict
 */

import * as React from "react";
import { FileText, Play, RotateCcw, Search } from "lucide-react";
import type { HighlightItem } from "@/lib/review";

// ---------------------------------------------------------------------------
// Severity → demo-style risk bucket
// ---------------------------------------------------------------------------
// The demo only had three buckets (red/yellow/green). We fold our five
// severities down: CRITICAL+HIGH = red, MEDIUM+LOW = yellow, POSITIVE = green.

type RiskTone = "red" | "yellow" | "green";

function riskOf(item: HighlightItem): RiskTone {
  if (item.severity === "POSITIVE") return "green";
  if (item.severity === "CRITICAL" || item.severity === "HIGH") return "red";
  return "yellow";
}

interface RiskStyle {
  bg: string;
  bgHover: string;
  border: string;
  dot: string;
  text: string;
  badge: string;
  icon: string;
  severityLabel: string;
}

const RISK: Record<RiskTone, RiskStyle> = {
  red: {
    bg: "rgba(239, 68, 68, 0.08)",
    bgHover: "rgba(239, 68, 68, 0.14)",
    border: "rgba(239, 68, 68, 0.4)",
    dot: "#EF4444",
    text: "#FCA5A5",
    badge: "#DC2626",
    icon: "🔴",
    severityLabel: "Critical",
  },
  yellow: {
    bg: "rgba(245, 158, 11, 0.06)",
    bgHover: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
    dot: "#F59E0B",
    text: "#FCD34D",
    badge: "#D97706",
    icon: "🟡",
    severityLabel: "Caution",
  },
  green: {
    bg: "rgba(16, 185, 129, 0.06)",
    bgHover: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.35)",
    dot: "#10B981",
    text: "#6EE7B7",
    badge: "#059669",
    icon: "🟢",
    severityLabel: "Safe",
  },
};

// ---------------------------------------------------------------------------
// Scan step labels for the sidebar progress list.
// ---------------------------------------------------------------------------

const SCAN_STEPS = [
  { label: "Extracting document text", pct: 10 },
  { label: "Identifying clause boundaries", pct: 25 },
  { label: "Matching risk patterns", pct: 50 },
  { label: "Scoring severity levels", pct: 75 },
  { label: "Generating findings", pct: 90 },
];

// ---------------------------------------------------------------------------

export interface LiveScanReviewProps {
  /** Normalized findings from `buildHighlights()`. */
  items: HighlightItem[];
  /** Full extracted contract text. Used for the intro paragraph. */
  text?: string | null;
  /** Original filename, shown in the doc toolbar. */
  filename?: string | null;
  /** Optional autoplay on mount. Default false. */
  autoStart?: boolean;
}

type Phase = "idle" | "scanning" | "done";

export default function LiveScanReview({
  items,
  text,
  filename,
  autoStart = false,
}: LiveScanReviewProps) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [scanProgress, setScanProgress] = React.useState(0);
  const [currentScanStep, setCurrentScanStep] = React.useState(0);
  const [revealedIds, setRevealedIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [scanBeamY, setScanBeamY] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [scanningId, setScanningId] = React.useState<string | null>(null);

  const docRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Sort items by document position so the scan sweeps top → bottom.
  const orderedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const aStart = a.start ?? Number.POSITIVE_INFINITY;
      const bStart = b.start ?? Number.POSITIVE_INFINITY;
      return aStart - bStart;
    });
  }, [items]);

  // --- Derived metrics ----------------------------------------------------
  const revealedItems = orderedItems.filter((s) => revealedIds.has(s.flag_id));
  const redCount = revealedItems.filter((s) => riskOf(s) === "red").length;
  const yellowCount = revealedItems.filter(
    (s) => riskOf(s) === "yellow",
  ).length;
  const greenCount = revealedItems.filter(
    (s) => riskOf(s) === "green",
  ).length;

  const riskScore =
    orderedItems.length > 0
      ? Math.round(
          ((redCount * 3 + yellowCount * 1.5) /
            ((revealedItems.length || 1) * 3)) *
            100,
        )
      : 0;

  const riskLabel =
    riskScore >= 65
      ? { text: "High Risk", color: "#EF4444" }
      : riskScore >= 35
        ? { text: "Medium Risk", color: "#F59E0B" }
        : { text: "Low Risk", color: "#10B981" };

  // --- Reset --------------------------------------------------------------
  const reset = React.useCallback(() => {
    setPhase("idle");
    setScanProgress(0);
    setCurrentScanStep(0);
    setRevealedIds(new Set());
    setScanBeamY(0);
    setSelectedId(null);
    setScanningId(null);
  }, []);

  // --- Start scan ---------------------------------------------------------
  const startScan = React.useCallback(() => {
    if (!orderedItems.length) return;
    setPhase("scanning");
    setScanProgress(0);
    setRevealedIds(new Set());
    setSelectedId(null);
    setCurrentScanStep(0);

    let idx = 0;
    const sections = orderedItems;

    const revealNext = () => {
      if (idx >= sections.length) {
        setScanningId(null);
        setCurrentScanStep(SCAN_STEPS.length - 1);
        setTimeout(() => setPhase("done"), 500);
        return;
      }

      const section = sections[idx];
      setScanningId(section.flag_id);

      // Scroll the section into view inside the doc scroll container.
      const el = sectionRefs.current[section.flag_id];
      if (el && docRef.current) {
        const container = docRef.current;
        const elTop = el.offsetTop - container.offsetTop;
        container.scrollTo({ top: elTop - 120, behavior: "smooth" });
      }

      // Update progress + scan step text.
      const pct = ((idx + 1) / sections.length) * 100;
      setScanProgress(pct);
      const stepIdx = SCAN_STEPS.findIndex((s) => pct <= s.pct);
      setCurrentScanStep(stepIdx >= 0 ? stepIdx : SCAN_STEPS.length - 1);

      // Reveal after a short theatrical beat.
      const delay = 600 + Math.random() * 600;
      setTimeout(() => {
        setRevealedIds((prev) => {
          const next = new Set(prev);
          next.add(section.flag_id);
          return next;
        });
        setScanningId(null);
        idx++;
        setTimeout(revealNext, 220);
      }, delay);
    };

    setTimeout(revealNext, 700);
  }, [orderedItems]);

  // Optional autostart (used when the caller mounts us on a dedicated page).
  React.useEffect(() => {
    if (autoStart && phase === "idle" && orderedItems.length > 0) {
      const t = setTimeout(startScan, 400);
      return () => clearTimeout(t);
    }
  }, [autoStart, phase, orderedItems.length, startScan]);

  // --- Scan beam animation ------------------------------------------------
  React.useEffect(() => {
    if (phase !== "scanning") return;
    let raf = 0;
    let y = 0;
    const tick = () => {
      y += 2;
      if (y > 100) y = 0;
      setScanBeamY(y);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // --- Intro prose --------------------------------------------------------
  // We show the first ~2 sentences of the extracted text as the "intro"
  // paragraph so the document doesn't feel like a pile of disconnected
  // clauses. If there's no text, we just fall back to a short placeholder.
  const intro = React.useMemo(() => {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    const firstChunk = trimmed.slice(0, 320);
    const lastStop = Math.max(
      firstChunk.lastIndexOf("."),
      firstChunk.lastIndexOf("!"),
      firstChunk.lastIndexOf("?"),
    );
    return lastStop > 80
      ? firstChunk.slice(0, lastStop + 1)
      : firstChunk + (trimmed.length > 320 ? "…" : "");
  }, [text]);

  const displayFilename = filename ?? "contract.pdf";

  // --- Empty state --------------------------------------------------------
  if (orderedItems.length === 0) {
    return (
      <div
        style={{
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0C0C12",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
          color: "#71717A",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div>
          <FileText style={{ margin: "0 auto", width: 32, height: 32 }} />
          <p style={{ marginTop: 12, fontWeight: 600, color: "#E4E4E7" }}>
            Nothing to scan yet
          </p>
          <p style={{ marginTop: 4, fontSize: 13 }}>
            The analysis didn&rsquo;t return any findings to replay.
          </p>
        </div>
      </div>
    );
  }

  // ========================================================================
  // Render
  // ========================================================================
  return (
    <div
      style={{
        background: "#08080C",
        color: "#D4D4D8",
        fontFamily: "'Newsreader', 'Georgia', 'Times New Roman', serif",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Local styles — keyframes + per-section animation classes. Scoped
          by unique class names so they don't leak to other components. */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes pacts-beamSweep {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes pacts-revealHighlight {
          0% { opacity: 0; transform: scaleX(0.95); }
          100% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes pacts-slideIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pacts-fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pacts-scanFlash {
          0% { background: rgba(99,102,241,0.06); }
          50% { background: rgba(99,102,241,0.15); }
          100% { background: rgba(99,102,241,0.06); }
        }
        @keyframes pacts-progressShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .pacts-doc-section { transition: all 0.4s ease; position: relative; }
        .pacts-doc-section.pacts-scanning-now {
          animation: pacts-scanFlash 0.8s ease-in-out infinite;
        }
        .pacts-doc-section.pacts-revealed {
          animation: pacts-revealHighlight 0.5s ease-out forwards;
        }
        .pacts-sidebar-item { animation: pacts-slideIn 0.4s ease-out forwards; }
        .pacts-scroll::-webkit-scrollbar { width: 5px; }
        .pacts-scroll::-webkit-scrollbar-track { background: transparent; }
        .pacts-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1); border-radius: 4px;
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(8,8,12,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: "linear-gradient(135deg, #6366F1, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "-0.01em",
            }}
          >
            PactSafe AI
          </span>
          <span style={{ fontSize: 11, color: "#52525B", marginLeft: 4 }}>
            / live analyzer
          </span>
        </div>
        {phase !== "idle" && (
          <button
            onClick={reset}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#A1A1AA",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RotateCcw style={{ width: 12, height: 12 }} /> Replay
          </button>
        )}
      </header>

      {/* IDLE — upload-like prompt */}
      {phase === "idle" && (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: "64px 24px",
            textAlign: "center",
            animation: "pacts-fadeUp 0.6s ease-out",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📑</div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              marginBottom: 10,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Live Contract Scanner
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#71717A",
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            Watch AI replay its scan clause-by-clause, highlighting risks
            directly on your document in real time.
          </p>

          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 16,
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#E4E4E7",
                    fontFamily: "'DM Sans', sans-serif",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayFilename}
                </div>
                <div style={{ fontSize: 12, color: "#52525B" }}>
                  {orderedItems.length} findings ready to replay
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: "rgba(16,185,129,0.1)",
                  color: "#34D399",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                ready
              </span>
            </div>
          </div>

          <button
            onClick={startScan}
            style={{
              width: "100%",
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #6366F1, #7C3AED)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "transform 0.2s",
              boxShadow: "0 4px 24px rgba(99,102,241,0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-1px)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0)")
            }
          >
            <Play style={{ width: 16, height: 16 }} /> Start Live Scan
          </button>

          <p style={{ fontSize: 12, color: "#3F3F46", marginTop: 14 }}>
            🔒 Encrypted · Never used for training · Private by default
          </p>
        </div>
      )}

      {/* SCANNING / DONE */}
      {(phase === "scanning" || phase === "done") && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 0,
            height: "min(80vh, 800px)",
          }}
        >
          {/* LEFT: document */}
          <div
            style={{
              borderRight: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            {/* Doc toolbar */}
            <div
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <span style={{ fontSize: 13 }}>📄</span>
              <span
                style={{
                  fontSize: 12,
                  color: "#A1A1AA",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayFilename}
              </span>
              {phase === "scanning" && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "#818CF8",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#6366F1",
                      animation: "pacts-beamSweep 1s ease-in-out infinite",
                    }}
                  />
                  Scanning…
                </span>
              )}
              {phase === "done" && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "#34D399",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#10B981",
                    }}
                  />
                  Complete — {orderedItems.length} clauses analyzed
                </span>
              )}
            </div>

            {/* Progress bar */}
            {phase === "scanning" && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.03)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${scanProgress}%`,
                    background:
                      "linear-gradient(90deg, #6366F1, #8B5CF6, #6366F1)",
                    backgroundSize: "200% 100%",
                    animation: "pacts-progressShimmer 1.5s linear infinite",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            )}

            {/* Document body */}
            <div
              ref={docRef}
              className="pacts-scroll"
              style={{
                flex: 1,
                overflowY: "auto",
                position: "relative",
                padding: "40px 48px 80px",
                background: "#0C0C12",
                minHeight: 0,
              }}
            >
              {/* Scan beam */}
              {phase === "scanning" && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${scanBeamY}%`,
                    height: 2,
                    zIndex: 5,
                    background:
                      "linear-gradient(90deg, transparent 0%, #6366F1 20%, #A78BFA 50%, #6366F1 80%, transparent 100%)",
                    boxShadow:
                      "0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1)",
                    animation: "pacts-beamSweep 1.2s ease-in-out infinite",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Title block */}
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#fff",
                  textAlign: "center",
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {displayFilename.replace(/\.[^.]+$/, "")}
              </h1>
              {intro && (
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "#9CA3AF",
                    marginBottom: 28,
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  {intro}
                </p>
              )}

              {/* Each finding rendered as an inline clause block */}
              {orderedItems.map((item, idx) => {
                const isRevealed = revealedIds.has(item.flag_id);
                const isScanning = scanningId === item.flag_id;
                const isSelected = selectedId === item.flag_id;
                const tone = riskOf(item);
                const rc = RISK[tone];

                return (
                  <div
                    key={item.flag_id}
                    ref={(el) => {
                      sectionRefs.current[item.flag_id] = el;
                    }}
                    className={[
                      "pacts-doc-section",
                      isScanning ? "pacts-scanning-now" : "",
                      isRevealed ? "pacts-revealed" : "",
                    ].join(" ")}
                    onClick={() =>
                      isRevealed &&
                      setSelectedId(isSelected ? null : item.flag_id)
                    }
                    style={{
                      position: "relative",
                      marginBottom: 6,
                      padding: "14px 18px",
                      borderRadius: 6,
                      borderLeft: isRevealed
                        ? `3px solid ${rc.border}`
                        : "3px solid transparent",
                      background: isRevealed
                        ? isSelected
                          ? rc.bgHover
                          : rc.bg
                        : "transparent",
                      cursor: isRevealed ? "pointer" : "default",
                    }}
                  >
                    {/* Section heading */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#E4E4E7",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        {idx + 1}. {item.title}
                      </span>

                      {isRevealed && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: rc.badge + "22",
                            color: rc.text,
                            fontWeight: 600,
                            fontFamily: "'DM Sans', sans-serif",
                            animation: "pacts-fadeUp 0.3s ease-out",
                          }}
                        >
                          {rc.icon} {rc.severityLabel}
                        </span>
                      )}
                    </div>

                    {/* Quote text */}
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.85,
                        color: "#B8B8BF",
                        fontFamily: "'Newsreader', Georgia, serif",
                      }}
                    >
                      {item.quote || "(clause text unavailable)"}
                    </p>

                    {/* Risk label strip */}
                    {isRevealed && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          animation: "pacts-fadeUp 0.4s ease-out",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: rc.text,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          ⚑ {item.title}
                        </span>
                        {!isSelected && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#52525B",
                              marginLeft: "auto",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            click to expand
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expanded explanation */}
                    {isSelected && isRevealed && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "16px 18px",
                          borderRadius: 8,
                          background: "rgba(0,0,0,0.5)",
                          border: `1px solid ${rc.border}`,
                          animation: "pacts-fadeUp 0.3s ease-out",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: rc.text,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 8,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          What this means for you
                        </div>
                        <p
                          style={{
                            fontSize: 14,
                            lineHeight: 1.8,
                            color: "#D4D4D8",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {item.explanation ||
                            "No additional explanation was provided for this finding."}
                        </p>
                        {item.suggested_fix && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: "10px 12px",
                              borderRadius: 6,
                              background: "rgba(124,92,252,0.08)",
                              border: "1px solid rgba(124,92,252,0.25)",
                              fontSize: 13,
                              lineHeight: 1.7,
                              color: "#D4D4D8",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            <strong style={{ color: "#C4B5FD" }}>
                              Suggested fix:
                            </strong>{" "}
                            {item.suggested_fix}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Findings sidebar */}
          <div
            className="pacts-scroll"
            style={{
              overflowY: "auto",
              background: "rgba(255,255,255,0.01)",
              fontFamily: "'DM Sans', sans-serif",
              minWidth: 0,
            }}
          >
            {/* Score card */}
            <div
              style={{
                padding: "24px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#71717A",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                Overall Risk Score
              </div>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: riskLabel.color,
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: "color 0.4s ease",
                }}
              >
                {riskScore}
              </div>
              <div
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  padding: "4px 14px",
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 600,
                  background: riskLabel.color + "15",
                  color: riskLabel.color,
                }}
              >
                {riskLabel.text}
              </div>

              {/* Mini gauge */}
              <div
                style={{
                  marginTop: 14,
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.05)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(riskScore, 100)}%`,
                    borderRadius: 3,
                    background:
                      "linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "#3F3F46",
                  marginTop: 5,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                <span>SAFE</span>
                <span>CRITICAL</span>
              </div>
            </div>

            {/* Counts */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                gap: 8,
              }}
            >
              {[
                { label: "Critical", count: redCount, color: "#EF4444" },
                { label: "Caution", count: yellowCount, color: "#F59E0B" },
                { label: "Safe", count: greenCount, color: "#10B981" },
              ].map((c) => (
                <div
                  key={c.label}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: 8,
                    background: c.color + "08",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: c.color,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {c.count}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#71717A",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {c.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Scan steps */}
            {phase === "scanning" && (
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#6366F1",
                      animation: "pacts-beamSweep 1s ease infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#818CF8",
                    }}
                  >
                    {SCAN_STEPS[currentScanStep]?.label}…
                  </span>
                </div>
                {SCAN_STEPS.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 0",
                      opacity: i <= currentScanStep ? 1 : 0.3,
                      transition: "opacity 0.3s",
                    }}
                  >
                    <span style={{ fontSize: 11 }}>
                      {i < currentScanStep
                        ? "✅"
                        : i === currentScanStep
                          ? "⏳"
                          : "○"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: i <= currentScanStep ? "#C7D2FE" : "#3F3F46",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Findings list */}
            <div style={{ padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#71717A",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Search style={{ width: 11, height: 11 }} />
                Findings ({revealedItems.length})
              </div>

              {revealedItems.map((s, i) => {
                const tone = riskOf(s);
                const rc = RISK[tone];
                const isActive = selectedId === s.flag_id;
                return (
                  <div
                    key={s.flag_id}
                    className="pacts-sidebar-item"
                    style={{
                      animationDelay: `${i * 0.05}s`,
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginBottom: 6,
                      background: isActive
                        ? rc.bgHover
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${
                        isActive ? rc.border : "rgba(255,255,255,0.04)"
                      }`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onClick={() => {
                      setSelectedId(isActive ? null : s.flag_id);
                      const el = sectionRefs.current[s.flag_id];
                      if (el && docRef.current) {
                        docRef.current.scrollTo({
                          top:
                            el.offsetTop - docRef.current.offsetTop - 100,
                          behavior: "smooth",
                        });
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 10 }}>{rc.icon}</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#E4E4E7",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.title}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: rc.text,
                        fontWeight: 500,
                        marginTop: 3,
                      }}
                    >
                      {rc.severityLabel}
                    </div>
                  </div>
                );
              })}

              {revealedItems.length === 0 && phase === "scanning" && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    fontSize: 13,
                    color: "#3F3F46",
                    fontStyle: "italic",
                  }}
                >
                  Waiting for findings…
                </div>
              )}
            </div>

            {/* Verdict when done */}
            {phase === "done" && (
              <div
                style={{
                  padding: "16px 20px",
                  margin: "0 20px 20px",
                  borderRadius: 10,
                  background:
                    redCount > 0
                      ? "rgba(239,68,68,0.05)"
                      : "rgba(16,185,129,0.05)",
                  border:
                    redCount > 0
                      ? "1px solid rgba(239,68,68,0.15)"
                      : "1px solid rgba(16,185,129,0.15)",
                  animation: "pacts-fadeUp 0.5s ease-out",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: redCount > 0 ? "#FCA5A5" : "#6EE7B7",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Verdict
                </div>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#D4D4D8",
                  }}
                >
                  {redCount > 0 ? (
                    <>
                      This contract has <strong>{redCount}</strong> critical
                      {redCount === 1 ? " issue" : " issues"}
                      {yellowCount > 0 && <> and {yellowCount} caution</>}.{" "}
                      <strong style={{ color: "#FCA5A5" }}>
                        Review carefully before signing.
                      </strong>
                    </>
                  ) : yellowCount > 0 ? (
                    <>
                      No critical issues, but {yellowCount} caution
                      {yellowCount === 1 ? "" : "s"} worth reviewing before
                      you sign.
                    </>
                  ) : (
                    <>
                      Looks clean — no critical or cautionary issues
                      detected in the analyzed clauses.
                    </>
                  )}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#A1A1AA",
                    marginTop: 8,
                  }}
                >
                  Click any highlighted section in the document to see what
                  it means and how to negotiate.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  Lock,
  Eye,
  Server,
  KeyRound,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How PactSafe AI keeps your contracts safe: TLS 1.3 in transit, AES-256 at rest, zero-retention LLM calls, and no training on your data.",
};

interface Pillar {
  icon: React.ElementType;
  title: string;
  body: string;
  items: string[];
}

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    title: "Encryption everywhere",
    body: "Your contracts never sit in the clear.",
    items: [
      "TLS 1.3 on every API endpoint and page load",
      "HSTS enforced with preload — no downgrade attacks",
      "AES-256-GCM at rest on stored uploads and database rows",
      "Encrypted backups, rotated every 30 days",
    ],
  },
  {
    icon: Eye,
    title: "Never used for training",
    body: "Your contracts don’t end up in anyone’s training set.",
    items: [
      "Zero-retention flags set on all Anthropic & Groq API calls",
      "No internal training corpus built from customer data",
      "No data share with third parties outside the LLM call itself",
      "Delete any analysis instantly — purged within 24 hours",
    ],
  },
  {
    icon: KeyRound,
    title: "Least-privilege access",
    body: "Only the code and people who need to touch data, can.",
    items: [
      "Engineers use 2FA-protected SSO on all production consoles",
      "Role-based database access, audit-logged",
      "Secrets managed in a hardware-backed vault",
      "Access reviews every 90 days",
    ],
  },
  {
    icon: Server,
    title: "Infra & monitoring",
    body: "Built on SOC 2-certified providers and watched 24/7.",
    items: [
      "Hosted on Vercel (frontend) and Fly.io (API) — both SOC 2 Type II",
      "Database isolated in a private network; no public internet access",
      "Uptime monitoring with 60-second resolution",
      "Automated anomaly detection on auth & API patterns",
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-hero">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] bg-grid-dot"
          />
          <div className="container-app pt-16 md:pt-24 pb-12">
            <Badge tone="accent" size="xs">
              Security & privacy
            </Badge>
            <h1 className="mt-4 text-3xl md:text-[52px] md:leading-[1.05] font-semibold tracking-tight text-gradient max-w-3xl">
              Your contracts are serious.
              <br />
              We treat them that way.
            </h1>
            <p className="mt-5 max-w-2xl text-base md:text-lg text-foreground-muted leading-relaxed">
              Nothing you send us ever ends up in a training set, a
              third-party log, or a data broker&rsquo;s inbox. Here&rsquo;s
              exactly what we do, and how you can verify it.
            </p>
          </div>
        </section>

        {/* Pillars */}
        <section className="relative py-16 md:py-20">
          <div className="container-app">
            <div className="grid gap-5 md:grid-cols-2">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border bg-surface/60 p-7"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                      <p.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {p.title}
                      </h2>
                      <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
                        {p.body}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {p.items.map((it) => (
                      <li
                        key={it}
                        className="flex items-start gap-2.5 text-sm text-foreground/90"
                      >
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-success" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Responsible disclosure */}
        <section className="relative py-16 md:py-24 bg-section">
          <div className="container-app">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface/60 p-8 md:p-10">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-severity-medium/10 text-severity-medium ring-1 ring-severity-medium/30">
                  <AlertOctagon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Found a vulnerability?
                  </h2>
                  <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                    We welcome responsible disclosure. Email{" "}
                    <a
                      href="mailto:security@pactsafe.ai"
                      className="text-accent hover:underline underline-offset-2"
                    >
                      security@pactsafe.ai
                    </a>{" "}
                    with details and a proof of concept. We&rsquo;ll respond
                    within 48 hours, fix valid issues promptly, and credit you
                    publicly (with your consent).
                  </p>
                  <ul className="mt-4 space-y-1.5 text-xs text-foreground-muted">
                    <li>• Please don&rsquo;t run automated scanners.</li>
                    <li>
                      • Please don&rsquo;t access other users&rsquo; data, even
                      if you find a way.
                    </li>
                    <li>
                      • Please give us a reasonable window to fix before
                      public disclosure.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ strip */}
        <section className="relative py-16 md:py-20">
          <div className="container-app">
            <div className="mx-auto max-w-3xl grid gap-3">
              {[
                {
                  q: "Are you SOC 2 certified?",
                  a: "Not yet — we're in a pre-audit phase. In the meantime, the infrastructure we build on (Vercel, Fly.io, Neon) is SOC 2 Type II certified, and we follow SOC 2-aligned practices internally.",
                },
                {
                  q: "Do you train models on my contracts?",
                  a: "No. Zero-retention flags are set on all LLM API calls, and we do not build internal training corpuses from customer data. This is a hard rule.",
                },
                {
                  q: "Where are my contracts stored?",
                  a: "In an encrypted database in the US region of our cloud provider. Backups are encrypted and also stored in the US. If you need EU data residency, contact us before uploading.",
                },
                {
                  q: "How long do you keep my data?",
                  a: "As long as your account is active and you haven't deleted the analysis. Deleting an analysis triggers a purge within 24 hours; closing an account triggers a full purge within 30 days.",
                },
              ].map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-border bg-surface/40 overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer text-sm font-medium text-foreground marker:content-none hover:bg-surface-2/50 transition-colors">
                    {f.q}
                    <span className="ml-auto text-foreground-muted group-open:rotate-180 transition-transform">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-foreground-muted leading-relaxed">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
            <p className="mt-10 text-center text-xs text-foreground-subtle">
              Questions? Email{" "}
              <Link
                href="/contact"
                className="text-accent hover:underline underline-offset-2"
              >
                our team
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

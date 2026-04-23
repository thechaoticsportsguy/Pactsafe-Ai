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
import { Badge } from "@/components/primitives/Badge";
import {
  SectionEditorial,
  SectionHeader,
} from "@/components/primitives/Section";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How PactSafe AI keeps your contracts safe: TLS 1.3 in transit, AES-256 at rest, Gemini API calls that don't train on your data, and one-click deletion.",
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
    body: "Your contracts don\u2019t end up in anyone\u2019s training set.",
    items: [
      "Google's Gemini API doesn't use your data for model training by default",
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

const SECURITY_FAQS = [
  {
    q: "Are you SOC 2 certified?",
    a: "Not yet — we're in a pre-audit phase. In the meantime, the infrastructure we build on (Vercel, Fly.io, Neon) is SOC 2 Type II certified, and we follow SOC 2-aligned practices internally.",
  },
  {
    q: "Do you train models on my contracts?",
    a: "No. We use Google's Gemini API, which by default does not use your data to train Google's models, and we do not build internal training corpuses from customer data. Your contract text is sent only as far as is required to generate your analysis, and you can delete any analysis with one click.",
  },
  {
    q: "Where are my contracts stored?",
    a: "In an encrypted database in the US region of our cloud provider. Backups are encrypted and also stored in the US. If you need EU data residency, contact us before uploading.",
  },
  {
    q: "How long do you keep my data?",
    a: "As long as your account is active and you haven't deleted the analysis. Deleting an analysis triggers a purge within 24 hours; closing an account triggers a full purge within 30 days.",
  },
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-beige-100">
          <div className="container-app pt-16 pb-12 md:pt-24">
            <Badge variant="eyebrow">Security &amp; privacy</Badge>
            <h1 className="mt-5 max-w-3xl text-3xl font-medium tracking-tightest text-ink-800 md:text-h1 md:leading-[1.05]">
              Your contracts are serious.
              <br />
              We treat them that way.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-600 md:text-body-lg">
              Nothing you send us ever ends up in a training set, a
              third-party log, or a data broker&rsquo;s inbox. Here&rsquo;s
              exactly what we do, and how you can verify it.
            </p>
          </div>
        </section>

        {/* Pillars */}
        <SectionEditorial tone="cream" divider="top" pad="lg">
          <div className="grid gap-5 md:grid-cols-2">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="border border-ink-800/10 bg-beige-50 p-7"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-ink-800 text-beige-50">
                    <p.icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-medium tracking-tight text-ink-800">
                      {p.title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">
                      {p.body}
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-start gap-2.5 text-sm text-ink-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-800" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionEditorial>

        {/* AI providers — explicit stack disclosure so technical
            auditors can match marketing copy to what's actually
            running in production. Update here when the stack
            changes; this is the canonical public source of truth. */}
        <SectionEditorial tone="warm" divider="top" pad="lg">
          <div className="mx-auto max-w-3xl border border-ink-800/10 bg-beige-50 p-8 md:p-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
              AI providers
            </p>
            <h2 className="mt-3 text-xl font-medium tracking-tight text-ink-800">
              What actually runs your analysis
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              PactSafe AI uses{" "}
              <strong className="text-ink-800">Google Gemini 2.5 Flash</strong>{" "}
              (clause extraction and contract-validity screening) and{" "}
              <strong className="text-ink-800">Google Gemini 2.5 Pro</strong>{" "}
              (risk analysis) via the Google AI API, plus{" "}
              <strong className="text-ink-800">LlamaParse by LlamaIndex</strong>{" "}
              for PDF parsing on complex documents. All API calls run
              server-side from our Fly.io infrastructure; your contract text is
              never sent to any AI provider from your browser.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Google&rsquo;s Gemini API does not use your data for model
              training by default. We do not store contract text beyond what
              is required to return your analysis; you can delete any analysis
              from your history at any time, which purges it within 24 hours.
            </p>
          </div>
        </SectionEditorial>

        {/* Responsible disclosure */}
        <SectionEditorial tone="warm" divider="top" pad="lg">
          <div className="mx-auto max-w-3xl border border-ink-800/10 bg-beige-50 p-8 md:p-10">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[#eab308]/40 bg-[#eab308]/10 text-[#854d0e]">
                <AlertOctagon className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-xl font-medium tracking-tight text-ink-800">
                  Found a vulnerability?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  We welcome responsible disclosure. Email{" "}
                  <a
                    href="mailto:security@pactsafe.ai"
                    className="text-ink-800 underline decoration-ink-800/35 underline-offset-2 hover:decoration-ink-800/85"
                  >
                    security@pactsafe.ai
                  </a>{" "}
                  with details and a proof of concept. We&rsquo;ll respond
                  within 48 hours, fix valid issues promptly, and credit you
                  publicly (with your consent).
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-ink-600">
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
        </SectionEditorial>

        {/* FAQ strip */}
        <SectionEditorial tone="cream" divider="top" pad="lg">
          <SectionHeader
            align="center"
            eyebrow="Common questions"
            title="Answers to the things people ask"
          />
          <div className="mx-auto mt-12 grid max-w-3xl gap-3">
            {SECURITY_FAQS.map((f) => (
              <details
                key={f.q}
                className="group overflow-hidden border border-ink-800/10 bg-beige-50"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink-800 transition-colors marker:content-none hover:bg-beige-100">
                  {f.q}
                  <span className="ml-auto text-ink-500 transition-transform group-open:rotate-180">
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
                <div className="px-5 pb-5 text-sm leading-relaxed text-ink-600">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
          <p className="mt-10 text-center text-xs text-ink-500">
            Questions? Email{" "}
            <Link
              href="/contact"
              className="text-ink-800 underline decoration-ink-800/35 underline-offset-2 hover:decoration-ink-800/85"
            >
              our team
            </Link>
            .
          </p>
        </SectionEditorial>
      </main>
      <Footer />
    </div>
  );
}

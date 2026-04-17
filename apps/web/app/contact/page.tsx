"use client";

import * as React from "react";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  ShieldAlert,
  Briefcase,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, TextArea } from "@/components/ui/input";

const TOPIC_OPTIONS = [
  { value: "general", label: "General question", icon: MessageSquare },
  { value: "support", label: "Support / a bug", icon: ShieldAlert },
  { value: "billing", label: "Billing", icon: Briefcase },
  { value: "privacy", label: "Privacy request", icon: ShieldAlert },
  { value: "press", label: "Press / partnerships", icon: Briefcase },
] as const;

type TopicValue = (typeof TOPIC_OPTIONS)[number]["value"];

const TOPIC_EMAIL: Record<TopicValue, string> = {
  general: "hello@pactsafe.ai",
  support: "support@pactsafe.ai",
  billing: "billing@pactsafe.ai",
  privacy: "privacy@pactsafe.ai",
  press: "press@pactsafe.ai",
};

const DIRECT_CHANNELS = [
  {
    icon: Mail,
    title: "General questions",
    body: "Anything about the product, your account, or how PactSafe works.",
    email: "hello@pactsafe.ai",
  },
  {
    icon: ShieldAlert,
    title: "Security & privacy",
    body: "Vulnerability reports, data requests, and privacy questions.",
    email: "security@pactsafe.ai",
  },
  {
    icon: Briefcase,
    title: "Press & partnerships",
    body: "Media inquiries, integrations, or reseller conversations.",
    email: "press@pactsafe.ai",
  },
];

export default function ContactPage() {
  const [topic, setTopic] = React.useState<TopicValue>("general");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sent, setSent] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const recipient = TOPIC_EMAIL[topic];
    const subject = encodeURIComponent(
      `[${topic}] ${name || "PactSafe contact"}`,
    );
    const body = encodeURIComponent(
      `${message}\n\n— ${name || "(no name)"} · ${email || "(no email)"}`,
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-hero">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] bg-grid-dot"
          />
          <div className="container-app pt-16 md:pt-24 pb-12 text-center">
            <Badge tone="accent" size="xs">
              Contact
            </Badge>
            <h1 className="mx-auto mt-4 max-w-2xl text-3xl md:text-[52px] md:leading-[1.05] font-semibold tracking-tight text-gradient">
              Talk to a human.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base md:text-lg text-foreground-muted leading-relaxed">
              We&rsquo;re a small team. A real person reads every message,
              usually within one business day.
            </p>
          </div>
        </section>

        <section className="relative py-12 md:py-16">
          <div className="container-app">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-border bg-surface/60 p-7"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Send us a message
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  What&rsquo;s on your mind?
                </h2>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="text-xs font-medium text-foreground-muted">
                      Topic
                    </label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TOPIC_OPTIONS.map((opt) => {
                        const active = topic === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTopic(opt.value)}
                            className={
                              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors " +
                              (active
                                ? "border-accent/60 bg-accent/10 text-accent"
                                : "border-border bg-surface/60 text-foreground-muted hover:border-border-strong hover:text-foreground")
                            }
                          >
                            <opt.icon className="h-3.5 w-3.5" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="text-xs font-medium text-foreground-muted"
                      >
                        Your name
                      </label>
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="text-xs font-medium text-foreground-muted"
                      >
                        Email
                      </label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="text-xs font-medium text-foreground-muted"
                    >
                      Message
                    </label>
                    <TextArea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={7}
                      placeholder="Tell us what you're trying to do, what you've tried, and any error messages…"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-foreground-subtle">
                    Hitting send opens your default email client.
                  </p>
                  <Button type="submit" disabled={!message.trim()}>
                    {sent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Opening mail app…
                      </>
                    ) : (
                      <>
                        Send message
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Direct channels */}
              <aside className="space-y-4 md:sticky md:top-24 md:self-start">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Or email us directly
                </p>
                {DIRECT_CHANNELS.map((c) => (
                  <div
                    key={c.email}
                    className="rounded-xl border border-border-subtle bg-surface/40 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
                        <c.icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {c.title}
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
                          {c.body}
                        </p>
                        <a
                          href={`mailto:${c.email}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline underline-offset-2"
                        >
                          {c.email}
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-border-subtle bg-surface/30 p-5">
                  <p className="text-xs text-foreground-subtle leading-relaxed">
                    Looking for docs? Start with{" "}
                    <Link
                      href="/#how-it-works"
                      className="text-accent hover:underline underline-offset-2"
                    >
                      how it works
                    </Link>{" "}
                    or browse the{" "}
                    <Link
                      href="/#faq"
                      className="text-accent hover:underline underline-offset-2"
                    >
                      FAQ
                    </Link>
                    .
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

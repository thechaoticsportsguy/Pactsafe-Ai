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
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { Input, TextArea } from "@/components/ui/input";
import { cn } from "@/lib/cn";

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

// Shared editorial overrides for <Input> and <TextArea>. Kept as a
// single string so if the ui/* primitives ever diverge we update one
// place. Not yet a primitive: needs 3+ re-uses before that investment.
const FIELD_EDITORIAL =
  "rounded-none border-ink-800/10 bg-beige-100 text-ink-800 " +
  "placeholder:text-ink-500 " +
  "focus:border-ink-800/40 focus:bg-beige-50 focus:ring-ink-800/10";

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
      <main className="flex-1 bg-beige-100">
        {/* Hero */}
        <section className="relative">
          <div className="container-app pt-16 pb-12 text-center md:pt-24">
            <div className="inline-flex">
              <Badge variant="eyebrow">Contact</Badge>
            </div>
            <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-medium tracking-tightest text-ink-800 md:text-h1 md:leading-[1.05]">
              Talk to a human.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-600 md:text-body-lg">
              We&rsquo;re a small team. A real person reads every message,
              usually within one business day.
            </p>
          </div>
        </section>

        {/* Form + channels */}
        <section className="relative border-t border-ink-800/10 py-12 md:py-16">
          <div className="container-app">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="border border-ink-800/10 bg-beige-50 p-7"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
                  Send us a message
                </p>
                <h2 className="mt-2 text-xl font-medium tracking-tight text-ink-800">
                  What&rsquo;s on your mind?
                </h2>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="text-xs font-medium text-ink-600">
                      Topic
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {TOPIC_OPTIONS.map((opt) => {
                        const active = topic === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTopic(opt.value)}
                            className={cn(
                              "inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-medium transition-colors",
                              active
                                ? "border-ink-800 bg-ink-800 text-beige-50"
                                : "border-ink-800/10 bg-beige-100 text-ink-700 hover:border-ink-800/40 hover:text-ink-800",
                            )}
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
                        className="text-xs font-medium text-ink-600"
                      >
                        Your name
                      </label>
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className={cn("mt-2", FIELD_EDITORIAL)}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="text-xs font-medium text-ink-600"
                      >
                        Email
                      </label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={cn("mt-2", FIELD_EDITORIAL)}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="text-xs font-medium text-ink-600"
                    >
                      Message
                    </label>
                    <TextArea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={7}
                      placeholder="Tell us what you're trying to do, what you've tried, and any error messages…"
                      className={cn("mt-2", FIELD_EDITORIAL)}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink-500">
                    Hitting send opens your default email client.
                  </p>
                  <Button
                    palette="editorial"
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={!message.trim()}
                  >
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
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
                  Or email us directly
                </p>
                {DIRECT_CHANNELS.map((c) => (
                  <div
                    key={c.email}
                    className="border border-ink-800/10 bg-beige-50 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-ink-800 text-beige-50">
                        <c.icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-800">
                          {c.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-600">
                          {c.body}
                        </p>
                        <a
                          href={`mailto:${c.email}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-ink-800 underline decoration-ink-800/35 underline-offset-2 hover:decoration-ink-800/85"
                        >
                          {c.email}
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border border-ink-800/10 bg-beige-200/60 p-5">
                  <p className="text-xs leading-relaxed text-ink-600">
                    Looking for docs? Start with{" "}
                    <Link
                      href="/#how-it-works"
                      className="text-ink-800 underline decoration-ink-800/35 underline-offset-2 hover:decoration-ink-800/85"
                    >
                      how it works
                    </Link>{" "}
                    or browse the{" "}
                    <Link
                      href="/#faq"
                      className="text-ink-800 underline decoration-ink-800/35 underline-offset-2 hover:decoration-ink-800/85"
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

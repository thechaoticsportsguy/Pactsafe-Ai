"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

interface TopNavProps {
  variant?: "marketing" | "app";
  className?: string;
}

const NAV_LINKS_MARKETING = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#use-cases", label: "For freelancers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

const NAV_LINKS_APP = [
  { href: "/analyze", label: "Analyze" },
  { href: "/history", label: "History" },
  { href: "/compare", label: "Compare" },
];

export default function TopNav({
  variant = "marketing",
  className,
}: TopNavProps) {
  const [open, setOpen] = useState(false);
  const links = variant === "marketing" ? NAV_LINKS_MARKETING : NAV_LINKS_APP;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border-subtle/60 bg-background/70 backdrop-blur-xl",
        className,
      )}
    >
      <div className="container-app flex h-16 items-center gap-6">
        <Link href="/" className="group" aria-label="PactSafe AI home">
          <Logo size={28} />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors rounded-md"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2">
          {variant === "marketing" ? (
            <>
              <Link href="/history">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/analyze">
                <Button size="sm">Analyze a contract</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Home
                </Button>
              </Link>
              <Link href="/analyze">
                <Button size="sm">New analysis</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-2"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border-subtle/60 bg-background/95 backdrop-blur-xl">
          <div className="container-app py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm text-foreground-muted hover:text-foreground rounded-md hover:bg-surface-2 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 pt-3 border-t border-border-subtle/60 flex flex-col gap-2">
              <Link href="/analyze" onClick={() => setOpen(false)}>
                <Button size="md" className="w-full">
                  Analyze a contract
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="relative border-t border-border-subtle/60 bg-background mt-20">
      <div className="container-app py-14">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link href="/" aria-label="PactSafe AI home">
              <Logo size={28} />
            </Link>
            <p className="mt-4 max-w-sm text-sm text-foreground-muted leading-relaxed">
              Plain-English contract review for freelancers, creators, and
              small businesses. Spot the traps before you sign.
            </p>
            <p className="mt-4 text-xs text-foreground-subtle">
              © {new Date().getFullYear()} PactSafe AI. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Product
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/analyze"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Analyze
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Sample report
                </Link>
              </li>
              <li>
                <Link
                  href="/compare"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Compare
                </Link>
              </li>
              <li>
                <Link
                  href="/history"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  History
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Use cases
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/#use-cases"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Designers
                </Link>
              </li>
              <li>
                <Link
                  href="/#use-cases"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Writers
                </Link>
              </li>
              <li>
                <Link
                  href="/#use-cases"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Consultants
                </Link>
              </li>
              <li>
                <Link
                  href="/#use-cases"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Creators
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Legal
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Terms of service
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border-subtle/60 pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-foreground-subtle max-w-2xl leading-relaxed">
            PactSafe AI is a contract review assistant. It is not a law firm
            and does not provide legal advice. For high-stakes agreements,
            consult a licensed attorney.
          </p>
          <div className="flex items-center gap-4 text-xs text-foreground-subtle">
            <span className="hidden md:inline-flex items-center gap-1.5">
              Press <kbd>?</kbd> for shortcuts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft"
              />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

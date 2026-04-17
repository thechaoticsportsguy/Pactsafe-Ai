import Link from "next/link";
import { LogoMark } from "@/components/primitives/LogoMark";

/**
 * Editorial footer — warm beige backdrop, ink-800 type, sharp corners.
 *
 * Used on every marketing surface. The workspace layout uses the
 * TopNav + in-app chrome instead, so this footer doesn't appear on
 * /analyze / /history / /compare / /analysis/[id].
 */

const LINK_BASE =
  "text-ink-600 hover:text-ink-800 transition-colors";

export default function Footer() {
  return (
    <footer className="relative border-t border-ink-800/10 bg-beige-200">
      <div className="container-app py-14">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <LogoMark variant="editorial" size={28} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
              Plain-English contract review for freelancers, creators, and
              small businesses. Spot the traps before you sign.
            </p>
            <p className="mt-4 text-xs text-ink-500">
              © {new Date().getFullYear()} PactSafe AI. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="md:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-800">
              Product
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/analyze" className={LINK_BASE}>
                  Analyze
                </Link>
              </li>
              <li>
                <Link href="/demo" className={LINK_BASE}>
                  Sample report
                </Link>
              </li>
              <li>
                <Link href="/compare" className={LINK_BASE}>
                  Compare
                </Link>
              </li>
              <li>
                <Link href="/history" className={LINK_BASE}>
                  History
                </Link>
              </li>
              <li>
                <Link href="/#features" className={LINK_BASE}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={LINK_BASE}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/changelog" className={LINK_BASE}>
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-800">
              Use cases
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/#use-cases" className={LINK_BASE}>
                  Designers
                </Link>
              </li>
              <li>
                <Link href="/#use-cases" className={LINK_BASE}>
                  Writers
                </Link>
              </li>
              <li>
                <Link href="/#use-cases" className={LINK_BASE}>
                  Consultants
                </Link>
              </li>
              <li>
                <Link href="/#use-cases" className={LINK_BASE}>
                  Creators
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-800">
              Legal
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/privacy" className={LINK_BASE}>
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={LINK_BASE}>
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/security" className={LINK_BASE}>
                  Security
                </Link>
              </li>
              <li>
                <Link href="/contact" className={LINK_BASE}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-800/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-ink-500">
            PactSafe AI is a contract review assistant. It is not a law firm
            and does not provide legal advice. For high-stakes agreements,
            consult a licensed attorney.
          </p>
          <div className="flex items-center gap-4 text-xs text-ink-500">
            <span className="hidden items-center gap-1.5 md:inline-flex">
              Press <kbd>?</kbd> for shortcuts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#10b981]"
              />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

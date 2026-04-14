import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-md bg-accent shadow-glow"
          />
          <span>PactSafe AI</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/analyze" className="hover:text-foreground">
            Analyze
          </Link>
          <Link href="/history" className="hover:text-foreground">
            History
          </Link>
          <Link href="/compare" className="hover:text-foreground">
            Compare
          </Link>
        </nav>
        <div className="flex-1" />
        <span className="text-xs text-muted hidden sm:block">
          Not legal advice.
        </span>
      </div>
    </header>
  );
}

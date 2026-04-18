"use client";

/**
 * Shell layout — wraps the four workspace routes (/analyze, /history,
 * /compare, /analysis/[id]) with a sticky TopNav + Footer.
 *
 * Palette routing (Option B, per Phase-4-D spec): /analyze and /history
 * now render the *editorial* palette (beige/ink, matches the landing
 * page) to collapse the workspace/editorial split on those two routes.
 * /compare and /analysis/[id] keep the dark workspace palette because
 * they remain "analysis cinema" surfaces.
 *
 * We use `usePathname()` inside this client layout rather than moving
 * TopNav into each page (Option A) because TopNav needs to sit OUTSIDE
 * `<main>` (sticky, full-bleed), and duplicating that wrapping in 4
 * separate page files is strictly more code for the same end result.
 * Document which route you took if you ever flip this.
 */
import { usePathname } from "next/navigation";
import TopNav, { type TopNavVariant } from "@/components/TopNav";
import Footer from "@/components/Footer";

// Routes that should use the editorial palette inside the shell.
// Everything else defaults to workspace.
const EDITORIAL_SHELL_ROUTES = ["/analyze", "/history"];

function resolveVariant(pathname: string | null): TopNavVariant {
  if (!pathname) return "workspace";
  for (const route of EDITORIAL_SHELL_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return "editorial";
    }
  }
  return "workspace";
}

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const variant = resolveVariant(pathname);
  const isEditorial = variant === "editorial";

  return (
    <div
      className={
        isEditorial
          ? "flex min-h-screen flex-col bg-beige-100 text-ink-800"
          : "flex min-h-screen flex-col"
      }
    >
      <TopNav variant={variant} />
      <main
        id="main-content"
        className="container-app flex-1 py-10 md:py-14"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

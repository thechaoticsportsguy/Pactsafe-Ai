import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/StructuredData";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pactsafe.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PactSafe AI — AI contract review for freelancers",
    template: "%s · PactSafe AI",
  },
  description:
    "Drop a freelance contract, NDA, or SOW. Get a risk score, plain-English red flags, missing protections, and ready-to-send negotiation language in under a minute.",
  keywords: [
    "contract review",
    "freelance contract",
    "NDA analysis",
    "AI contract analyzer",
    "legal tech",
    "freelancer tools",
    "contract red flags",
  ],
  authors: [{ name: "PactSafe AI" }],
  creator: "PactSafe AI",
  applicationName: "PactSafe AI",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "PactSafe AI — AI contract review for freelancers",
    description:
      "Spot the traps in any contract — before you sign. Built for freelancers, creators, and small businesses.",
    siteName: "PactSafe AI",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PactSafe AI — AI contract review for freelancers",
    description:
      "Spot the traps in any contract — before you sign. Built for freelancers, creators, and small businesses.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
  category: "business",
};

export const viewport: Viewport = {
  themeColor: "#07080c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:items-center focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-glow"
        >
          Skip to content
        </a>
        <ToastProvider>
          {children}
          <KeyboardShortcuts />
        </ToastProvider>
      </body>
    </html>
  );
}

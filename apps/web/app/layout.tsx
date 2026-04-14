import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pactsafe.ai"),
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
  openGraph: {
    type: "website",
    title: "PactSafe AI — AI contract review for freelancers",
    description:
      "Spot the traps in any contract — before you sign. Built for freelancers, creators, and small businesses.",
    siteName: "PactSafe AI",
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
  },
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
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

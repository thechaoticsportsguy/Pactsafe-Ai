import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contract analysis",
  description:
    "Plain-English risk score, red flags, missing protections, and negotiation draft for your contract.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

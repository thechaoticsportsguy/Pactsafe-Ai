import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze a contract",
  description:
    "Upload a PDF, DOCX, or paste contract text. PactSafe AI flags red flags, missing protections, and drafts negotiation language — in under a minute.",
};

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

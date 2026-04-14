import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contract history",
  description:
    "Every contract you've analyzed — searchable, filterable, and re-exportable as PDF or JSON.",
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

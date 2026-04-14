import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare contracts",
  description:
    "Put two contracts side by side. Compare risk scores, red flags, and missing protections at a glance.",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

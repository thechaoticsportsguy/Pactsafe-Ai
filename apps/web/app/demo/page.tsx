import type { Metadata } from "next";
import DemoPageClient from "./DemoPageClient";

export const metadata: Metadata = {
  title: "Live demo",
  description:
    "Watch PactSafe AI analyze a real contract end-to-end. Three pre-loaded samples, same v2 pipeline as every real upload — no sign-up, no mock data.",
  alternates: {
    canonical: "/demo",
  },
};

export default function DemoPage() {
  return <DemoPageClient />;
}

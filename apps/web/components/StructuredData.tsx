/**
 * JSON-LD structured data helpers. Rendered as <script type="application/ld+json">
 * tags so search engines and rich-result previews can parse them.
 *
 * Pure server components — no client JS needed.
 */

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore: necessary for JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const BASE_URL = "https://pactsafe.ai";

/** Organization schema — rendered on every page via the root layout. */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "PactSafe AI",
        url: BASE_URL,
        logo: `${BASE_URL}/icon.svg`,
        description:
          "AI-powered contract review for freelancers, creators, and small businesses.",
        sameAs: [
          "https://github.com/thechaoticsportsguy/Pactsafe-Ai",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          email: "hello@pactsafe.ai",
          contactType: "customer support",
          availableLanguage: "English",
        },
      }}
    />
  );
}

/** WebSite schema — enables sitelinks search box in Google results. */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PactSafe AI",
        url: BASE_URL,
        description:
          "Plain-English contract review for freelancers. Drop a contract, get red flags, missing protections, and a negotiation draft.",
      }}
    />
  );
}

/** SoftwareApplication schema — rich result eligibility for the landing page. */
export function SoftwareAppJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PactSafe AI",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "AI contract review for freelancers. Spot red flags, missing protections, and draft negotiation language in under a minute.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        creator: {
          "@type": "Organization",
          name: "PactSafe AI",
        },
      }}
    />
  );
}

/**
 * FAQPage schema for the landing page FAQ. Keep in sync with the FAQ
 * content in PactSafeLanding.tsx — if those answers change, update here.
 */
export function FaqJsonLd() {
  const faqs = [
    {
      q: "Is this a replacement for a lawyer?",
      a: "No. PactSafe flags risks and gives you negotiation starting points — but for high-stakes or precedent-setting deals you should still consult a licensed attorney. Think of it as your first line of defense, not your only one.",
    },
    {
      q: "What kinds of contracts can I analyze?",
      a: "NDAs, freelance SOWs, service agreements, consulting contracts, MSAs, employment offers, vendor terms, and creative licensing agreements. Anything under 200 pages.",
    },
    {
      q: "How private is my data?",
      a: "Uploads are TLS 1.3 encrypted in transit and AES-256 encrypted at rest. We use Google's Gemini API, which by default does not use your data to train Google's models, and we do not build internal training corpuses from customer data. You can delete any analysis with one click.",
    },
    {
      q: "How accurate is the analysis?",
      a: "PactSafe catches patterns across 50+ well-known risk categories with high precision. It will not catch everything a domain-specialist attorney would — we are a screening tool, not a replacement.",
    },
    {
      q: "Which file formats are supported?",
      a: "PDF, DOCX, and TXT files up to 10 MB on the Free tier, 25 MB on Pro, and 50 MB on Team. You can also paste raw contract text directly.",
    },
    {
      q: "Do I need an account?",
      a: "No. You can analyze a contract without signing up. Accounts are optional and unlock history, search, contract comparison, and the negotiation composer.",
    },
    {
      q: "What models do you use?",
      a: "PactSafe AI runs on Google Gemini 2.5 Flash (clause extraction and contract-validity screening) and Gemini 2.5 Pro (risk analysis) via the Google AI API. PDF parsing on complex documents uses LlamaParse by LlamaIndex. Google's Gemini API does not use your data to train Google's models by default.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No annual lock-in. Cancel from your account settings and get a pro-rata refund on the current month plus a 30-day money-back guarantee on your first paid month.",
    },
  ];

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      }}
    />
  );
}

/** BreadcrumbList schema for easier search result rendering. */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
        })),
      }}
    />
  );
}

/**
 * Product + Offer schema for the pricing page. Exposes Free/Pro/Team as
 * a single Product with an AggregateOffer.
 */
export function PricingProductJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: "PactSafe AI",
        description:
          "AI contract review for freelancers and small businesses. Free forever on your first contracts.",
        brand: {
          "@type": "Brand",
          name: "PactSafe AI",
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "0",
          highPrice: "39",
          offerCount: "3",
          offers: [
            {
              "@type": "Offer",
              name: "Free",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: `${BASE_URL}/pricing`,
            },
            {
              "@type": "Offer",
              name: "Pro",
              price: "15",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: `${BASE_URL}/pricing`,
            },
            {
              "@type": "Offer",
              name: "Team",
              price: "39",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: `${BASE_URL}/pricing`,
            },
          ],
        },
      }}
    />
  );
}

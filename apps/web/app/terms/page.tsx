import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "PactSafe AI terms of service. PactSafe is a contract screening tool, not a law firm. Read the full terms here.",
};

const UPDATED = "April 14, 2026";

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      updated={UPDATED}
      intro="The short version: you use PactSafe AI as a screening tool — not as a substitute for a lawyer. You own your contracts. We don't sell your data. Either of us can end this relationship at any time."
    >
      <h2>1. Who we are</h2>
      <p>
        &ldquo;PactSafe AI&rdquo;, &ldquo;we&rdquo;, and &ldquo;us&rdquo; refer
        to PactSafe AI, the software and service operated at pactsafe.ai. When
        we say &ldquo;you&rdquo;, we mean anyone accessing the service — with
        or without an account.
      </p>

      <h2>2. What PactSafe AI is (and isn&rsquo;t)</h2>
      <p>
        PactSafe AI is an automated contract review assistant. It reads the
        contract text you provide, flags risk patterns, and generates
        negotiation language using third-party large language models.
      </p>
      <p>
        <strong>
          PactSafe AI is not a law firm, not a lawyer, and not a substitute
          for legal advice.
        </strong>{" "}
        The analyses are informational. We are not licensed to practice law.
        No attorney-client relationship is created by your use of the service.
        For high-stakes, novel, or jurisdiction-specific deals, you should
        consult a licensed attorney.
      </p>

      <h2>3. Your account</h2>
      <p>
        You can use the service without an account. If you create one:
      </p>
      <ul>
        <li>You&rsquo;re responsible for keeping your credentials secure.</li>
        <li>
          You must be at least 16 years old (13 with parental consent in
          jurisdictions that allow it).
        </li>
        <li>
          You must use a real email address so we can reach you about security
          issues.
        </li>
        <li>
          You can close your account at any time, and we&rsquo;ll delete your
          data within 30 days.
        </li>
      </ul>

      <h2>4. What you own, what we own</h2>
      <p>
        <strong>You own the contracts you submit.</strong> Uploading a
        contract to PactSafe gives us a limited license only to process it and
        return the analysis. That license terminates the moment you delete the
        analysis.
      </p>
      <p>
        <strong>We own the product.</strong> The software, design, risk rules,
        and prompts are ours. You may not reverse-engineer, scrape, or
        republish the service.
      </p>
      <p>
        <strong>The analysis output is yours to use.</strong> Keep it, export
        it, share it, paste it into an email to your client — whatever helps.
      </p>

      <h2>5. Acceptable use</h2>
      <p>Don&rsquo;t use PactSafe to:</p>
      <ul>
        <li>Submit material you don&rsquo;t have the legal right to submit.</li>
        <li>
          Process contracts containing information you&rsquo;re legally
          prohibited from disclosing (classified documents, sealed court
          filings, etc.).
        </li>
        <li>Attack the service (rate limits, DoS, scraping, probing).</li>
        <li>
          Misrepresent the output as legal advice from a licensed attorney.
        </li>
        <li>Train a competing product or model on our outputs.</li>
      </ul>

      <h2>6. Pricing, billing, and refunds</h2>
      <ul>
        <li>Free tier: no charge, ever. See <a href="/pricing">/pricing</a>.</li>
        <li>
          Paid tiers: charged monthly, billed via Stripe. You can cancel any
          time from your account settings.
        </li>
        <li>
          Refunds: 30 days, no questions asked on your first paid month.
          Beyond that, we&rsquo;ll consider refunds case by case.
        </li>
        <li>
          Price changes: 30 days notice, applied to the next billing cycle.
        </li>
      </ul>

      <h2>7. Accuracy, reliability, and liability</h2>
      <p>
        The analyses PactSafe produces are <strong>best-effort</strong>. Large
        language models can be wrong, miss context, or hallucinate. You agree
        that:
      </p>
      <ul>
        <li>
          We make no warranty that the service is error-free or that every
          risk will be caught.
        </li>
        <li>
          We are not liable for losses arising from decisions you made based
          on a PactSafe analysis.
        </li>
        <li>
          Our aggregate liability is capped at the greater of (a) $100 or (b)
          what you paid us in the 12 months preceding a claim.
        </li>
      </ul>
      <p>
        These caps are part of the bargain. We couldn&rsquo;t offer an
        affordable, accessible tool without them.
      </p>

      <h2>8. Termination</h2>
      <p>
        Either of us can end this at any time. You can close your account;
        we&rsquo;ll honor any pro-rata refund due. We can suspend or terminate
        access if you violate Section 5 (Acceptable use) or if we&rsquo;re
        legally required to. When the relationship ends, your data is deleted
        within 30 days.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Delaware, United
        States. Disputes must be brought in Delaware state or federal court,
        unless your local consumer-protection law says otherwise.
      </p>

      <h2>10. Changes</h2>
      <p>
        We&rsquo;ll post any material change here and email anyone with an
        account at least 14 days before the change takes effect. If you
        don&rsquo;t agree with the change, close your account before the
        effective date.
      </p>

      <h2>11. Contact</h2>
      <p>
        Legal questions: <a href="mailto:legal@pactsafe.ai">legal@pactsafe.ai</a>.
        Everything else: <a href="/contact">/contact</a>.
      </p>
    </LegalShell>
  );
}

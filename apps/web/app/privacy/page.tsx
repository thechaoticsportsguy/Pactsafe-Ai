import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How PactSafe AI handles your contracts, personal data, and privacy. Encrypted in transit and at rest, never used for training.",
};

const UPDATED = "April 14, 2026";

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      updated={UPDATED}
      intro="We built PactSafe AI because we got burned by bad contracts ourselves. The last thing we want is to build a product that betrays its users. This page explains what we collect, why, and exactly what you can ask us to delete."
    >
      <h2>What we collect</h2>
      <p>
        When you use PactSafe AI, we collect only what we need to run the
        product. Specifically:
      </p>
      <ul>
        <li>
          <strong>The contracts you submit.</strong> Either pasted text or
          uploaded files (PDF, DOCX, TXT). We store these to run the analysis
          and show your history.
        </li>
        <li>
          <strong>Extracted text.</strong> After parsing your upload, we keep a
          plain-text copy so the clause highlighter and exports can reference
          the original passages.
        </li>
        <li>
          <strong>Analysis results.</strong> The risk score, red flags, missing
          protections, and negotiation drafts our model generates for your
          contract.
        </li>
        <li>
          <strong>Account metadata.</strong> If you sign in, we store your
          email, sign-in provider, and timestamps for created/updated analyses.
          You can use the product without an account.
        </li>
        <li>
          <strong>Usage logs.</strong> Timestamps, HTTP status codes, latency,
          and anonymized error traces — used for reliability and nothing else.
        </li>
      </ul>

      <h2>What we don&rsquo;t collect</h2>
      <p>
        We deliberately avoid collecting things we don&rsquo;t need. We do{" "}
        <strong>not</strong> collect:
      </p>
      <ul>
        <li>Credit card numbers (payments are handled by Stripe).</li>
        <li>Identity documents, SSNs, or any government ID.</li>
        <li>
          Third-party cookies or advertising trackers. No GA, no Facebook
          pixel, no ad networks.
        </li>
        <li>Location beyond the country derived from your IP address.</li>
        <li>Browser fingerprints.</li>
      </ul>

      <h2>How your contracts are used</h2>
      <p>
        Your contracts are used <strong>only</strong> to:
      </p>
      <ul>
        <li>
          Generate the analysis you requested (risk score, red flags,
          negotiation draft).
        </li>
        <li>
          Display your history and let you re-export previous analyses as PDF
          or JSON.
        </li>
        <li>Power the clause highlighter on your own analysis pages.</li>
      </ul>
      <p>
        Your contracts are <strong>never</strong> used to train machine
        learning models — not our own, not third-party models, not anyone else.
        This is a hard rule and is enforced at the system level: our LLM API
        calls go out with zero-retention flags where available, and we do not
        keep a separate training corpus.
      </p>

      <h2>Third parties we share data with</h2>
      <p>
        To run PactSafe we have to send the contract text to a language model
        provider. We currently use a subset of the following:
      </p>
      <ul>
        <li>
          <strong>Anthropic</strong> (Claude) — for primary analysis.
          Zero-retention is requested via API headers.
        </li>
        <li>
          <strong>Groq</strong> (Llama 3.3 70B) — for fast first-pass scoring.
          Zero-retention is requested via API headers.
        </li>
        <li>
          <strong>Ollama</strong> (self-hosted) — for local development. Never
          leaves our infrastructure.
        </li>
      </ul>
      <p>
        We do not share your contracts with any other third party. We do not
        sell data. We do not enrich or syndicate it. If a government agency
        requests data, we will push back to the extent the law allows and
        notify you unless a court order prohibits it.
      </p>

      <h2>Security</h2>
      <ul>
        <li>
          <strong>In transit:</strong> TLS 1.3 on all API endpoints. HSTS
          enforced on the public site.
        </li>
        <li>
          <strong>At rest:</strong> AES-256 encryption on stored uploads and
          database contents.
        </li>
        <li>
          <strong>Access:</strong> Least-privilege role policies, audit logs,
          2FA on all production console access.
        </li>
        <li>
          <strong>Retention:</strong> Contracts and results are kept until you
          delete them or until your account is closed. You can delete any
          analysis from your History page with one click.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Regardless of where you live, you have the following rights:
      </p>
      <ul>
        <li>
          <strong>Access:</strong> Export everything we have on you as a JSON
          bundle.
        </li>
        <li>
          <strong>Deletion:</strong> Remove any individual analysis, or close
          your account and wipe everything.
        </li>
        <li>
          <strong>Correction:</strong> Update your email or account details at
          any time.
        </li>
        <li>
          <strong>Portability:</strong> Download your analyses as PDF or JSON.
        </li>
        <li>
          <strong>Objection:</strong> Tell us to stop processing your data for
          any optional reason.
        </li>
      </ul>
      <p>
        To exercise any of these, email{" "}
        <a href="mailto:privacy@pactsafe.ai">privacy@pactsafe.ai</a>. We aim to
        respond within 5 business days.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a small number of first-party cookies for session management
        and CSRF protection. We do not use third-party or advertising cookies.
        You can block cookies in your browser; the product may be less
        convenient but will still work.
      </p>

      <h2>Changes</h2>
      <p>
        If we materially change this policy, we&rsquo;ll post the change here
        and email anyone with an account at least 14 days before it takes
        effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy: <a href="mailto:privacy@pactsafe.ai">privacy@pactsafe.ai</a>
        . Everything else: <a href="/contact">/contact</a>.
      </p>
    </LegalShell>
  );
}

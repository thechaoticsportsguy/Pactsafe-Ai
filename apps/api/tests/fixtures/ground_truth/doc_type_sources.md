# Ground-truth fixture sources

The five `_baseline.txt` files in this folder are placeholders. They must be
filled in with **real** contract text from public sources before
`run_ground_truth.py` will produce useful output. Template-site contracts
(LawInsider, USLegal) are too clean and don't stress-test the analyzer — use
actual contracts that real people actually signed.

## Do not fabricate

Do not generate contract text with an LLM. The entire point of this exercise
is to grade v2 pipeline output against a contract the pipeline has never
seen before. If the text is LLM-generated it leaks into every prompt and
invalidates the test.

## Suggested sources per doc type

### `employment_baseline.txt`

- **Primary**: SEC EDGAR full-text search for `"Form 8-K" "Exhibit 10"` —
  public companies file executive employment agreements as exhibits. Look
  for CEO/CFO agreements at mid-cap companies (3,000–6,000 words is ideal).
  Start at <https://efts.sec.gov/LATEST/search-index?q=%22employment+agreement%22&forms=8-K>.
- **Alternative**: A public university's adjunct faculty agreement (often
  published on the HR policies page — search `"adjunct faculty agreement" site:.edu`).
- **What to look for**: offer letter + at-will employment clause, stock
  vesting schedule, non-compete + non-solicit, confidentiality, severance
  terms, IP-assignment (invention assignment).

### `nda_baseline.txt`

- **Primary**: Y Combinator's public startup library (<https://www.ycombinator.com/library>)
  has a sample mutual NDA drafted by Orrick. Use that verbatim — it's
  intentionally short but well-drafted.
- **Alternative**: SEC EDGAR search for `"confidentiality agreement" exhibit`
  — M&A diligence NDAs between public companies are filed as exhibits.
- **Alternative 2**: A public open-source project's CLA (Google CLA, Apache
  ICLA) — technically a contributor agreement but tests the NDA pipeline
  since the clause patterns overlap.
- **What to look for**: mutual vs one-way, term, survival tail, permitted-use
  definitions, residual-knowledge carveout, non-solicit rider.

### `saas_terms_baseline.txt`

- **Primary**: Pick one of Heroku, Stripe, DigitalOcean, Vercel's publicly-
  available customer terms of service. Aim for the main terms document
  (3,000–5,000 words), not a supplemental data-processing addendum.
  - Heroku: <https://www.heroku.com/policy/heroku-customer-agreement>
  - Stripe: <https://stripe.com/legal/ssa>
  - DigitalOcean: <https://www.digitalocean.com/legal/terms-of-service-agreement>
  - Vercel: <https://vercel.com/legal/terms>
- **Alternative**: Slack's or Notion's main customer-facing terms.
- **What to look for**: auto-renewal, early-termination fee, data portability,
  liability cap, uptime SLA (and remedy for breach), SCC/DPA references,
  suspension/termination grounds.

### `service_agreement_baseline.txt`

- **Primary**: SEC EDGAR exhibit filings for `"master services agreement"`.
  Best results come from 8-K or 10-Q filings where the MSA is attached as a
  material contract. <https://efts.sec.gov/LATEST/search-index?q=%22master+services+agreement%22&forms=8-K>.
- **Alternative**: State procurement portals publish signed vendor MSAs —
  e.g., Texas SmartBuy, California eProcure. Search for a recent IT or
  consulting services MSA between a state agency and a vendor.
- **What to look for**: SOW framework, change-order process, milestone
  acceptance, IP ownership, liability cap, indemnification, service levels,
  termination-for-convenience vs termination-for-cause.

### `freelance_sow_baseline.txt`

- **Primary**: A real SOW excerpt from a SEC-filed services contract exhibit
  (often attached as "Exhibit A" or "Schedule 1" to an MSA). These represent
  the actual project-level terms real contractors face.
- **Alternative**: Upwork's and Contra's published resource libraries have
  SOW templates contributed by actual practitioners — use one that has been
  actively used (i.e., linked from a blog post describing a real engagement).
- **What to look for**: scope definition, deliverables list, acceptance
  criteria, milestone schedule, kill fee / termination compensation, rev
  round cap, IP transfer trigger, payment terms (Net-X), late-fee clause.

## Workflow

1. Pick a source per type from above.
2. Strip any obvious boilerplate that isn't part of the contract (signature
   block metadata, footers, page numbers — but leave the contract text itself
   verbatim).
3. Paste into the corresponding `_baseline.txt` file, overwriting the
   `TODO: ...` placeholder. The runner will refuse to run files that still
   start with `TODO:` so nothing fires against a fake.
4. Record the source URL and date in the fixture's first line as a comment
   (e.g. `# Source: https://efts.sec.gov/... — retrieved 2026-04-24`). The
   runner strips nothing and the v2 pipeline will tokenize the comment line,
   but at ~1 line of overhead it's worth it for traceability.

## Size targets

| Doc type           | Sweet spot (words) | Rationale                               |
|--------------------|--------------------|-----------------------------------------|
| employment         | 3,000–6,000        | Real exec agreements are long-ish       |
| nda                | 1,200–2,500        | Most production NDAs are short          |
| saas_terms         | 3,000–5,000        | Main ToS without addenda                |
| service_agreement  | 4,000–8,000        | MSAs are typically longer than SOWs     |
| freelance_sow      | 1,500–3,500        | Real SOWs vary widely; pick middle      |

Very short fixtures (< 1,000 words) don't give the risk analyzer enough to
chew on and under-represent real user traffic. Very long fixtures
(> 10,000 words) are expensive to re-run and slow the grading loop.

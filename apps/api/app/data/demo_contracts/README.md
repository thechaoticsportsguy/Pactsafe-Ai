# Demo contract fixtures

These three plaintext contract samples power the live `/demo` page — visitors
pick one, watch the scan cinema, and see a real analysis report from the
production v2 pipeline.

## Provenance

None of these files contain customer data. Each one is either:

- **`contractor_agreement.txt`** — A trimmed excerpt of the publicly-posted
  Handshake AI Contractor Agreement, used under fair use for illustrative
  demo purposes. Original source: https://ai.joinhandshake.com/. Party names
  and some identifying phrasing have been generalised.
- **`nda_mutual.txt`** — A hand-written mutual NDA template drafted in-house
  from publicly-available NDA patterns (Y Combinator library, Bonsai, and
  standard practitioner forms). Names, dates, and addresses are placeholders.
- **`saas_terms.txt`** — A hand-written SaaS subscription agreement drafted
  in-house combining common provisions from publicly-available SaaS terms
  (auto-renewal, data portability, liability caps). Names are fictitious.

## Why plaintext

The v2 pipeline accepts raw text via `run_v2_pipeline(document_text)`. No PDF
parsing, no file upload routing, no LlamaParse — cheapest possible path to a
real analysis. Each file is under 2,500 words so the Pass 1 + Pass 2 token
cost per fresh analysis stays well under $0.02.

## Word counts (as of last update)

| File                       | Approx. words | Key clauses covered                         |
|----------------------------|---------------|---------------------------------------------|
| contractor_agreement.txt   | ~2,000        | IP assignment, liability cap, arbitration   |
| nda_mutual.txt             | ~1,500        | Confidentiality obligations, remedies       |
| saas_terms.txt             | ~1,700        | Auto-renewal, data portability, liability   |

## Adding a new sample

1. Drop the plaintext file in this folder.
2. Add an entry to `SAMPLE_METADATA` in `apps/api/app/routers/demo.py`.
3. Add a card to the picker grid in `apps/web/app/demo/page.tsx`.
4. Verify the file is a real contract (not lorem ipsum) and under 2,500 words.

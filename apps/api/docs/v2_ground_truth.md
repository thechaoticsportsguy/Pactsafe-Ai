# v2 Analyzer — Ground-Truth Baseline Results

Status: template. Fill in after running `apps/api/run_ground_truth.py`.

## Purpose

This document is the **manually graded** companion to
`apps/api/run_ground_truth.py`. The runner executes the v2 pipeline 5
times against each fixture in `tests/fixtures/ground_truth/` and writes
`latest_results.json`; the human reads that JSON and records judgements
here that a script can't make — "is this flag a real risk in this
contract" vs "plausible-looking but wrong", and "what clauses in this
document the pipeline failed to flag".

The existing `docs/v2_followups.md` tracks the `contractor_platform`
type (Handshake fixture). This document extends that coverage to the
other five types the public analyzer actually routes to.

## Methodology

For each fixture:

1. Run `./.venv/Scripts/python.exe run_ground_truth.py --type <T> --runs 5`
   (or `--type all`). Cost estimate: ~$0.10–$0.20 per 5-run cycle per
   fixture, so $0.50–$1.00 for the full sweep.
2. Open `tests/fixtures/ground_truth/latest_results.json` alongside the
   raw fixture `tests/fixtures/ground_truth/<T>_baseline.txt`.
3. Copy the runner's **summary numbers** into the "Run stats" block below
   verbatim (they're printed in the console output and also in the JSON).
4. For each entry in **reliable_flags_3of5**, read the cited clause in
   the fixture and classify:
   - **✅ true positive** — this is a real, non-obvious risk the user
     would benefit from seeing.
   - **⚠️ true-but-obvious** — it's real but generic boilerplate (e.g.
     "late fees apply" in a payment-terms clause). Note whether we'd
     want to suppress it in production.
   - **❌ false positive** — the model has mischaracterised the clause,
     or the severity is miscalibrated, or it's hallucinated a concern
     that isn't grounded in the quoted text.
5. For each entry in **unstable_flags_1or2of5**, decide separately —
   run-to-run variance means we see the flag only sometimes, and the
   grading question is whether we want to suppress it, keep it, or tune
   the prompt to surface it reliably.
6. **Missing flags** is the recall gap. Read the fixture manually,
   identify the real risks (a quick checklist is below per type), then
   list the ones the pipeline missed across all 5 runs. This is the
   most expensive grading step but also the most valuable — false
   positives embarrass us, missing flags fail the user.
7. **Unstable missing protections** get the same treatment as unstable
   flags — reliable (3+ runs), unstable (1–2 runs), absent (0 runs).
8. Fill in the follow-ups checklist: every false positive and every
   recall gap should map to either a prompt tweak, a
   `UNIVERSAL_EXCLUSIONS` addition, or (rarely) a schema change.

Severity calibration note: when judging, the v2 pipeline produces
`severity` in `{critical, high, medium, low}`. A clause being real and
important is necessary but not sufficient for a "true positive" — if
the clause is a $500 liability cap and the pipeline labels it `low`,
that's a miscalibration worth flagging.

## Grading status

| Doc type           | Fixture filled? | Run completed? | Graded? |
|--------------------|-----------------|----------------|---------|
| employment         | ☐               | ☐              | ☐       |
| nda                | ☐               | ☐              | ☐       |
| saas_terms         | ☐               | ☐              | ☐       |
| service_agreement  | ☐               | ☐              | ☐       |
| freelance_sow      | ☐               | ☐              | ☐       |

---

## Employment

**Source**: _(paste URL + retrieval date from the first line of
`employment_baseline.txt`)_

**Word count**: _N_

**Date run**: _YYYY-MM-DD_

**Detected doc_type across 5 runs** (from `detected_types` in the JSON):

| Detected label | Runs |
|----------------|------|
| _e.g. employment_ | _5_  |

- Correct detection? ☐ yes ☐ no (if no, is routing the failure or is
  Pass 0 mis-classifying?)

**Run stats** (from JSON):

- `risk_score_per_run`: [_, _, _, _, _]
- `red_flag_count_per_run`: [_, _, _, _, _]
- `missing_protection_count_per_run`: [_, _, _, _, _]

### Reliable flags (≥3/5 runs)

| # | Section | Severity | Clause snippet | Verdict | Notes |
|---|---------|----------|----------------|---------|-------|
| 1 |         |          |                | ✅/⚠️/❌ |       |
| 2 |         |          |                |         |       |

### Unstable flags (1–2/5 runs)

| # | Section | Severity | Clause snippet | Runs | Keep / Suppress / Tune |
|---|---------|----------|----------------|------|------------------------|
| 1 |         |          |                |      |                        |

### Missing flags (recall gap — read the fixture manually)

Things a careful human would flag that the pipeline did not in **any**
of the 5 runs:

- [ ] _e.g. non-compete clause has no geographic scope limit_
- [ ] _e.g. invention assignment captures pre-existing IP_

Expected-risk checklist for employment (borrowed from
`doc_type_sources.md` — not exhaustive, use your judgement):

- [ ] At-will employment clause
- [ ] Non-compete + non-solicit scope + duration
- [ ] Confidentiality + survival
- [ ] Severance terms (or absence)
- [ ] IP / invention assignment (including pre-existing IP carveout)
- [ ] Stock vesting schedule (single trigger vs double trigger on change-of-control)
- [ ] Arbitration / class-action waiver

### Missing protections

Reliable (≥3/5): _(list from JSON; confirm each is genuinely absent)_

Unstable (1–2/5):

| Protection | Runs | Real gap? |
|------------|------|-----------|
|            |      | yes/no    |

### Follow-ups

- [ ] _e.g. risk_analyzer.py `employment` prompt under-weights pre-existing IP assignment_
- [ ] _e.g. UNIVERSAL_EXCLUSIONS should add "generic at-will language" if flagged as critical_

---

## NDA

**Fixture**: `apps/api/tests/fixtures/ground_truth/nda_baseline.txt`
**Source**: Y Combinator Mutual NDA template (https://www.ycombinator.com/documents) — retrieved 2026-04-24
**Word count**: ~800 words
**Date run**: 2026-04-24
**Runs completed**: 5 (1 real, 4 cache hits due to bypass_cache bug)

### Detected type
All 5 runs: `nda` (Pass 0 and Pass 1 agreed).

### Reliable flags (graded)

| # | Severity | §  | Flag title                                     | Grade | Notes |
|---|----------|----|------------------------------------------------|-------|-------|
| 1 | CRITICAL | 9  | Perpetual confidentiality term                 | ✅ core finding / ⚠️ severity | Real finding — perpetual term is worth flagging. But CRITICAL is too high for a template NDA. HIGH is the correct severity. CRITICAL should be reserved for jury-trial waivers, self-indemnity, etc. |
| 2 | HIGH     | 2  | Incomplete exclusions from confidentiality     | ⚠️    | Structurally a missing-protection argument (no independent-development exclusion), but expressed as a red flag attached to the present exclusions clause. Already correctly listed in missing_protections. Double-counting. |
| 3 | HIGH     | 10 | Automatic irreparable harm / injunctive relief | ⚠️    | Quote verbatim and interpretation accurate, but this is boilerplate NDA language. On a MUTUAL NDA where the clause cuts both ways, HIGH is overstated — should be MEDIUM. Pass 2 isn't accounting for reciprocity when calibrating severity. |
| 4 | MEDIUM   | 2  | Overly broad "Confidential Information" definition | ✅ | True positive. Oral disclosure without written confirmation is a real gotcha. MEDIUM correctly calibrated. |
| 5 | MEDIUM   | 7  | No right to retain archival copies             | ✅    | True positive. Compliance/audit use cases require retention. MEDIUM correct. |

### Missing protections (graded)

All 5 grounded and real: Fixed term, Independently developed info exclusion, Legally required disclosure safe harbor, Residuals clause, Destruction option.

### Green flags

0 returned. This is a MUTUAL NDA — reciprocal clauses (Section 5 No Obligation, Section 10 Remedies applying to both parties equally) could legitimately be surfaced as green flags for the Recipient. Confirms the green-flag recall concern from SaaS test.

### Scorecard

- Red flags: 3 ✅ / 2 ⚠️ / 0 ❌
- Citation grounding: 5/5 verbatim
- Missing protections: 5/5 grounded
- Severity calibration: 3/5 correct (Flag 1 and Flag 3 inflated)
- Summary accuracy: ✅

### Follow-ups

- [ ] Pass 2 severity rubric: cap severity at HIGH (not CRITICAL) for term-length concerns
- [ ] Pass 2 severity rubric: account for reciprocity on mutual NDAs — irreparable-harm and similar symmetric clauses should be MEDIUM on mutual agreements
- [ ] Pass 2 structural fix: prevent double-counting where a red flag and a missing protection express the same underlying concern

---

## SaaS Terms

**Fixture**: `apps/api/tests/fixtures/ground_truth/saas_terms_baseline.txt`
**Source**: Vercel Terms of Service (https://vercel.com/legal/terms) — retrieved 2026-04-24
**Word count**: ~4,500 words (trimmed excerpt of sections 1-9)
**Date run**: 2026-04-24
**Runs completed**: 5 (1 real, 4 cache hits due to bypass_cache bug — see v2_followups.md)

### Detected type
All 5 runs: `saas_terms` (via Pass 1). Pass 0 initially classified as `terms_of_service` — coarse-vs-refined classification split is expected behavior.

### Reliable flags (graded)

| # | Severity | §   | Flag title                                                     | Grade | Notes |
|---|----------|-----|----------------------------------------------------------------|-------|-------|
| 1 | CRITICAL | 3   | Content used for AI training on Hobby/trial Pro plans          | ✅    | True positive. Severity correct. |
| 2 | HIGH     | 3   | Provider can delete content for no reason                      | ✅    | True positive. |
| 3 | HIGH     | 3   | Broad, sublicensable, transferable content license             | ✅    | True positive. "Create derivatives" and "sublicensable" are unusually expansive. |
| 4 | HIGH     | 5   | Team owners can claim ownership of Your Content                | ⚠️    | Quote verbatim but rationale overreads "ownership of the Project" as "legal IP ownership." Tuning note: distinguish administrative ownership from IP ownership. |
| 5 | MEDIUM   | 8.1 | Provider disclaims liability for data loss on misconfiguration | ✅    | True positive. MEDIUM correctly calibrated — narrow scope (user misconfig only). |
| 6 | MEDIUM   | 4   | Hobby plan terminable without notice                           | ✅    | True positive. MEDIUM correct — narrowly scoped to free tier. |

### Missing protections (graded)

All 5 grounded and real: Data export/return on termination, Limitation of liability cap, Provider IP indemnity, Security breach notification, Uptime SLA.

### Unstable flags

N/A — bypass_cache bug means runs 2-5 were cache hits. Cannot measure stability until the cache-bypass fix lands.

### Green flags

0 returned. Vercel terms do have some pro-user elements (EEA-specific content removal review rights in §3, user retention of Account Information in §9.2) that were not surfaced. Possible recall issue in Pass 2 green-flag prompt — watch across other types.

### Scorecard

- Red flags: 5 ✅ / 1 ⚠️ / 0 ❌ (83% clean true positives)
- Citation grounding: 6/6 verbatim
- Missing protections: 5/5 grounded
- Summary accuracy: ✅
- Severity calibration: 5/6 correct (Flag 4 minor over-read)

### Follow-ups

- [ ] Pass 2 prompt tuning: distinguish "ownership of the Project/resource" from "IP ownership of the content" in team/organizational contexts
- [ ] Watch for green-flag recall issue across remaining types

---

## Service Agreement (MSA)

**Source**: _(URL + date)_

**Word count**: _N_

**Date run**: _YYYY-MM-DD_

**Detected doc_type across 5 runs**:

| Detected label | Runs |
|----------------|------|
|                |      |

- Correct detection? ☐ yes ☐ no (note: if the pipeline detects
  `contractor_platform` on an MSA, that's a routing bug worth fixing
  before grading further)

**Run stats**:

- `risk_score_per_run`: [_, _, _, _, _]
- `red_flag_count_per_run`: [_, _, _, _, _]
- `missing_protection_count_per_run`: [_, _, _, _, _]

### Reliable flags (≥3/5 runs)

| # | Section | Severity | Clause snippet | Verdict | Notes |
|---|---------|----------|----------------|---------|-------|
| 1 |         |          |                |         |       |

### Unstable flags (1–2/5 runs)

| # | Section | Severity | Clause snippet | Runs | Keep / Suppress / Tune |
|---|---------|----------|----------------|------|------------------------|
| 1 |         |          |                |      |                        |

### Missing flags

- [ ] _..._

Expected-risk checklist for service agreement:

- [ ] SOW framework + change-order process
- [ ] Milestone acceptance criteria
- [ ] IP ownership (work product vs pre-existing vs derivative)
- [ ] Liability cap (amount + carve-outs)
- [ ] Indemnification (IP + third-party claims)
- [ ] Service levels + remedy
- [ ] Termination-for-convenience notice period + compensation
- [ ] Termination-for-cause cure period
- [ ] Subcontracting restrictions

### Missing protections

Reliable (≥3/5): _(list)_

Unstable (1–2/5):

| Protection | Runs | Real gap? |
|------------|------|-----------|
|            |      |           |

### Follow-ups

- [ ] _..._

---

## Freelance SOW

**Source**: _(URL + date)_

**Word count**: _N_

**Date run**: _YYYY-MM-DD_

**Detected doc_type across 5 runs**:

| Detected label | Runs |
|----------------|------|
|                |      |

- Correct detection? ☐ yes ☐ no

**Run stats**:

- `risk_score_per_run`: [_, _, _, _, _]
- `red_flag_count_per_run`: [_, _, _, _, _]
- `missing_protection_count_per_run`: [_, _, _, _, _]

### Reliable flags (≥3/5 runs)

| # | Section | Severity | Clause snippet | Verdict | Notes |
|---|---------|----------|----------------|---------|-------|
| 1 |         |          |                |         |       |

### Unstable flags (1–2/5 runs)

| # | Section | Severity | Clause snippet | Runs | Keep / Suppress / Tune |
|---|---------|----------|----------------|------|------------------------|
| 1 |         |          |                |      |                        |

### Missing flags

- [ ] _..._

Expected-risk checklist for freelance SOW:

- [ ] Scope definition specificity (open-ended "as directed" is bad)
- [ ] Deliverables list + format
- [ ] Acceptance criteria (timeline for rejection, revision cap)
- [ ] Milestone schedule
- [ ] Kill fee / termination compensation
- [ ] Revision-round cap
- [ ] IP transfer trigger (on payment? on completion? never?)
- [ ] Payment terms (Net-X + late fee + interest)

### Missing protections

Reliable (≥3/5): _(list)_

Unstable (1–2/5):

| Protection | Runs | Real gap? |
|------------|------|-----------|
|            |      |           |

### Follow-ups

- [ ] _..._

---

## Cross-type observations

*Based on 2 of 6 contract types graded (saas_terms, nda). Patterns below are **hypotheses**, not confirmed findings. Do not tune prompts until at least 3-4 types have been tested and the patterns repeat with real cache-bypassed N=5 data.*

### Pattern A: Severity inflation on aggressive-but-common clauses
Evidence: SaaS Flag 4 (HIGH on "ownership" language, over-read), NDA Flag 1 (CRITICAL on perpetual term — should be HIGH), NDA Flag 3 (HIGH on mutual irreparable-harm — should be MEDIUM).
Hypothesis: Pass 2's severity rubric rewards finding issues but doesn't ground severity in actual contractual risk magnitude. Boilerplate language that's aggressive-but-common gets inflated.
Confirmation criteria: If employment, service_agreement, and/or freelance_sow show the same pattern on ≥2 flags, tune severity rubric in `risk_analyzer.py`.

### Pattern B: Double-counting missing protections as red flags
Evidence: NDA Flag 2 duplicates missing-protection #2 (both describe "missing independent-development exclusion"). Not observed on SaaS.
Hypothesis: Pass 2 converts missing-protection findings into red flags attached to the closest present clause.
Confirmation criteria: If any other type shows duplicate red-flag / missing-protection pairs, add de-duplication step to Pass 2 post-processing.

### Pattern C: Zero green-flag recall
Evidence: Both SaaS and NDA returned `green_flags: []` despite genuine user-favorable elements being present (EEA review rights, mutual NDA reciprocity).
Hypothesis: Pass 2 green-flag prompt is either too conservative, or the rubric is biased toward flagging risk over protection.
Confirmation criteria: If any remaining type returns green flags, the prompt may be working and SaaS/NDA were genuinely one-sided. If all types return zero, tune the green-flag prompt specifically.

---

## Prompt-tuning follow-ups

Once grading is complete, open one GitHub issue per clear follow-up
with a link back to the specific row in this document. Rough priority
order:

1. Hallucinated / false-positive flags that reliably appear (≥3/5 runs)
   — these actively mislead users and should be fixed first.
2. Recall gaps where a high-severity risk was missed in **all** 5 runs
   across multiple fixtures — the pipeline has a blind spot.
3. Severity miscalibration on reliable flags (the content is right,
   the label is wrong).
4. Unstable flags worth stabilising by tuning the prompt (vs just
   suppressing them).
5. Detection / routing bugs.
6. Cosmetic fixes (snippet truncation, clause-number parsing edge cases)
   — lowest priority unless they actively confuse users.

Link each issue from this doc's Follow-ups sections so the mapping from
"what we observed" to "what we did about it" stays traceable.

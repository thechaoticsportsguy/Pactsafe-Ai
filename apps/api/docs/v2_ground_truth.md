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
**Date run (real N=5)**: 2026-04-25
**Previous grading date**: 2026-04-24 (based on 1 real run + 4 cache hits)

### Detected type
Pass 0 and Pass 1 agree: `nda` on all 5 runs.

### Risk score stability
Runs: [30, 30, 30, 25, 30]. One outlier at 25.

### Red flags — real N=5 stability
Red flag counts per run: [4, 6, 6, 4, 5]. **4 reliable flags** (≥3/5 runs), **3 unstable flags** (1-2 runs). More variance than SaaS — expected since NDAs are short enough that small prompt variation changes which clauses get flagged as separate findings vs. combined.

| # | Severity | §  | Flag title                                     | Stable? | Grade from 2026-04-24 |
|---|----------|----|------------------------------------------------|---------|------|
| 1 | CRITICAL | 9  | Perpetual confidentiality term                 | Reliable | ✅ finding / ⚠️ severity inflated (should be HIGH) |
| 2 | HIGH     | 10 | Automatic irreparable harm / injunctive relief | Reliable | ⚠️ on mutual NDA should be MEDIUM not HIGH |
| 3 | HIGH     | 2  | Incomplete exclusions from confidentiality     | Reliable | ⚠️ Double-counts a missing protection |
| 4 | MEDIUM   | 2  | Overly broad "Confidential Information" definition | Reliable | ✅ TP |
| — | MEDIUM   | 7  | No right to retain archival copies             | **Unstable** (2/5) | Was graded ✅ yesterday; only appears in 2 of 5 real runs |

Key finding: yesterday's Flag 5 (No Right to Retain Archival Copies) is NOT reliable at N=5 — it appeared in only 2 runs. Yesterday's grading reflected the 1 real run where it happened to show. The 4 reliable flags today match the other 4 from yesterday's grading.

### Missing protections — real N=5 stability (MAJOR FINDING)
Counts per run: [4, 4, 5, 4, 4]. **0 reliable missing protections** (none in ≥3/5 runs). **21 unique unstable missing protections** across the 5 runs.

Same structural instability as SaaS. Yesterday's 5 graded protections (Fixed term, Independent-development exclusion, Legally-required disclosure, Residuals, Destruction alternative) are individually valid but just one random sample from the 21-strong unstable pool.

### Green flags
0 on all 5 runs. Same recall gap.

### Citation grounding
0 flags rejected across all 5 runs. Grounding working.

### Scorecard (updated)
- Red flags: 4 reliable, 3 unstable (moderate stability, less than SaaS)
- Missing protections: structural instability confirmed (0 reliable, 21 unstable)
- Severity calibration: Pattern A holds — Flag 1 inflated CRITICAL→HIGH, Flag 2 inflated HIGH→MEDIUM on mutual NDA

### Follow-ups
- [ ] See v2_followups.md — structural missing-protections fix applies here too
- [ ] Pass 2 severity rubric: cap term-length findings at HIGH, never CRITICAL
- [ ] Pass 2 severity rubric: on mutual agreements, symmetric-burden clauses like irreparable-harm should downgrade one severity tier
- [ ] Monitor whether "archival copies" finding stabilizes with larger/different NDAs — may indicate the prompt is sensitive to clause phrasing

---

## SaaS Terms

**Fixture**: `apps/api/tests/fixtures/ground_truth/saas_terms_baseline.txt`
**Source**: Vercel Terms of Service (https://vercel.com/legal/terms) — retrieved 2026-04-24
**Word count**: ~4,500 words (trimmed excerpt of sections 1-9)
**Date run (real N=5)**: 2026-04-25
**Previous grading date**: 2026-04-24 (based on 1 real run + 4 cache hits — see v2_followups.md cache-bypass bug, fixed in commit e08d032)

### Detected type
Pass 0 classified as `terms_of_service` on all 5 runs. Pass 1 refined to `saas_terms` on all 5 runs. Coarse-vs-refined split is working as expected.

### Risk score stability
Runs: [25, 25, 30, 30, 30]. Varies ±5 points run-to-run.

### Red flags — real N=5 stability
Red flag counts per run: [4, 5, 5, 6, 6]. **6 reliable flags** (appeared in ≥3/5 runs), **1 unstable flag** (appeared in 1-2 runs). Red-flag output is moderately stable.

| # | Severity | §   | Flag title                                                     | Stable? | Grade from 2026-04-24 grading |
|---|----------|-----|----------------------------------------------------------------|---------|------|
| 1 | CRITICAL | 3   | Content used for AI training on Hobby/trial Pro plans          | Reliable | ✅ TP |
| 2 | HIGH     | 3   | Provider can delete content for no reason                      | Reliable | ✅ TP |
| 3 | HIGH     | 3   | Broad, sublicensable, transferable content license             | Reliable | ✅ TP |
| 4 | HIGH     | 5   | Team owners can claim ownership of Your Content                | Reliable | ⚠️ Rationale over-reads "ownership" |
| 5 | MEDIUM   | 8.1 | Disclaims liability for data loss on user misconfiguration     | Reliable | ✅ TP |
| 6 | MEDIUM   | 4   | Hobby plan terminable without notice                           | Reliable | ✅ TP |

The 6 reliable flags match yesterday's grading. Yesterday's verdict on red flags stands: 5 ✅ / 1 ⚠️ / 0 ❌.

### Missing protections — real N=5 stability (MAJOR FINDING)
Counts per run: [6, 6, 5, 5, 6]. **0 reliable missing protections** (none appeared in ≥3/5 runs). **27 unique unstable missing protections** surfaced across the 5 runs.

This overturns yesterday's grading of 5 grounded missing protections. Those 5 were all valid individually — but they are only one sample of a much larger set (27+) that Pass 2 can surface. Different runs produce different subsets. The "missing protections" output is essentially non-deterministic at the feature level, not just the severity level.

Yesterday's 5 graded missing protections (Data Export, Liability Cap, IP Indemnity, Breach Notification, Uptime SLA) — are likely still all individually valid, but they are not the "canonical" set. See Cross-type observations below.

### Green flags
0 returned on all 5 runs. Recall concern confirmed.

### Citation grounding
0 flags rejected by validator across all 5 runs. Grounding layer is working correctly.

### Scorecard (updated)
- Red flags: 6 reliable, output stable (substantively correct per 2026-04-24 grading)
- Missing protections: **structural instability — 0 reliable, 27 unstable across 5 runs**
- Citation grounding: perfect (0 rejections)
- Severity calibration: minor over-reading on Flag 4 (ownership language)

### Follow-ups
- [ ] **HIGH**: Structural fix for missing protections — see v2_followups.md entry "missing-protections output is non-deterministic"
- [ ] Pass 2 prompt tuning: distinguish "administrative ownership of resource" from "IP ownership of content" in team contexts
- [ ] Monitor green-flag recall across remaining types

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

*Based on 2 contract types tested with real N=5 (post cache-bypass fix in commit e08d032). Patterns from yesterday's single-run grading have been re-evaluated against real stability data.*

### Finding 1 (CONFIRMED): Missing protections are structurally non-deterministic
Evidence: SaaS N=5 shows 0 reliable missing protections, 27 unstable. NDA N=5 shows 0 reliable, 21 unstable.
Across 10 runs, 48 unique "missing protections" were surfaced, yet no single protection appeared in ≥3 runs of the same document.
Both document types individually surface ~5 missing protections per run, all grounded and plausible — but the set of 5 is essentially random sampling from a pool of 20+ valid findings the model can produce.
Impact: A user running the same contract twice sees different missing-protection lists. This erodes trust and undermines the "consistent analysis" product claim.
Hypothesis: Pass 2's missing-protections prompt is open-ended generation ("identify missing protections") rather than evaluation against a canonical checklist ("for each of these 12 standard SaaS protections, evaluate presence").
Action: Logged as HIGH-severity in v2_followups.md. Fix requires structural change to Pass 2, not prompt tuning.

### Finding 2 (CONFIRMED): Red flag output is moderately stable
Evidence: SaaS has 6 reliable flags with 1 unstable. NDA has 4 reliable with 3 unstable.
Reliable flags from real N=5 match yesterday's cached-run grading (same 4-6 "core" flags both days).
Impact: Red flag feature is production-credible. Users see the same top risks across repeat runs.

### Finding 3 (SUPPORTED): Severity inflation on aggressive-but-common clauses (Pattern A)
Evidence: NDA §9 perpetual term reliably flagged CRITICAL across all 5 runs — should be HIGH for template NDAs.
NDA §10 irreparable-harm reliably flagged HIGH on a mutual NDA — should be MEDIUM when symmetric.
SaaS Flag 4 (ownership language) HIGH with consistent over-read rationale.
Action: Pass 2 severity rubric refinement needed. Document canonical severity for common clause patterns in the rubric.

### Finding 4 (SUPPORTED): Zero green-flag recall
Evidence: Both SaaS and NDA returned 0 green flags across all 10 real runs.
Mutual NDAs have reciprocal protections (both parties benefit from §5 No Obligation, §10 Remedies); Vercel has EEA-specific review rights. Neither surfaced.
Action: Green-flag prompt is either too conservative or the rubric weights risk over protection. Separate follow-up.

### Hypothesis retired: Double-counting of missing protections as red flags (Pattern B)
Yesterday's claim that NDA Flag 2 was a double-count of a missing protection is harder to evaluate now that we know missing-protections are non-deterministic. The flag does legitimately describe the clause as present-but-inadequate, which is distinct from the structural absence the missing-protections layer is trying to capture.
Retiring this as a finding until the missing-protections layer is stabilized.

### Testing state
Tested with real N=5: **saas_terms, nda**
Pending: **employment, service_agreement, freelance_sow**
Blocked: **large SaaS contracts** (Stripe SSA) — Pass 1 max_output_tokens crash, see v2_followups.md

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

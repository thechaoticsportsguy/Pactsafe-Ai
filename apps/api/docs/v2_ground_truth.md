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

- [ ] _e.g. no residual-knowledge carveout_

Expected-risk checklist for NDA:

- [ ] Mutual vs one-way
- [ ] Term (typically 2–5 years)
- [ ] Survival tail beyond term
- [ ] Permitted-use definition (narrow? or "business purpose"?)
- [ ] Residual-knowledge carveout
- [ ] Non-solicit rider (some NDAs smuggle this in)
- [ ] Return-or-destroy-on-termination obligation
- [ ] Injunctive relief waiver

### Missing protections

Reliable (≥3/5): _(list)_

Unstable (1–2/5):

| Protection | Runs | Real gap? |
|------------|------|-----------|
|            |      |           |

### Follow-ups

- [ ] _..._

---

## SaaS Terms

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

Expected-risk checklist for SaaS terms:

- [ ] Auto-renewal + notice window for opt-out
- [ ] Early-termination fee / commitment term
- [ ] Data portability on termination (export window, format)
- [ ] Liability cap (amount, carve-outs)
- [ ] Uptime SLA + remedy (service credits vs true refund)
- [ ] SCC / DPA references if personal data is processed
- [ ] Unilateral price-change rights
- [ ] Suspension-for-breach grounds

### Missing protections

Reliable (≥3/5): _(list)_

Unstable (1–2/5):

| Protection | Runs | Real gap? |
|------------|------|-----------|
|            |      |           |

### Follow-ups

- [ ] _..._

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

Use this section for patterns that span types — systematic prompt bugs,
consistent severity miscalibrations, gaps in `UNIVERSAL_EXCLUSIONS` that
show up in multiple fixtures, etc.

### Systematic false positives

- [ ] _e.g. "governing law = Delaware" flagged as risk in 3/5 types —
      either suppress via exclusion or re-tune the governing-law prompt
      guidance_

### Systematic recall gaps

- [ ] _e.g. survival clauses rarely flagged even when overbroad_

### UNIVERSAL_EXCLUSIONS candidates

(Add entries here only after they appear as false positives in **2+**
fixtures. Single-type false positives are prompt-level issues, not
universal ones.)

- [ ] _..._

### Severity-calibration findings

- [ ] _e.g. $500 liability caps consistently labelled `medium` — should
      be `critical` when cap is < 1% of expected contract value_

### Detection / routing

- [ ] _e.g. MSA fixture detected as contractor_platform in 2/5 runs —
      add MSA disambiguation to Pass 0_

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

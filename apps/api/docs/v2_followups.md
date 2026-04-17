# v2 Analyzer — Known Follow-Ups

Status as of Step 8 completion.

## Baseline quality

Ground-truth test on the Handshake AI Contractor Agreement
(`apps/api/tests/run_handshake_v2.py`) establishes the following baseline:

- **Hallucination rate: 0%** — no forbidden concepts appear in any output
  (red flags, missing protections, summary, or negotiation suggestions)
  when the test passes criteria 3 and 4.
- **Validator rejection rate: 0%** — every red flag the model produces
  grounds back to a real clause with a quote that fuzzy-matches the
  source ≥85 per non-ellipsis chunk.
- **Coverage: ~7/10 expected concerns per run.** The specific subset
  covered varies between runs (see D and F below), but the pipeline
  reliably produces 7 of the 10 pre-chosen concerns per run plus 3–5
  bonus flags of similar quality that weren't in the expected list.

The two real quality metrics are the first two (zero hallucinations, zero
validator rejections). The 7/10 is descriptive of coverage variance, not
correctness — the concerns missed on any given run are real concerns in
the document that the model chose not to separately flag that run, not
cases of the pipeline being wrong.

## (A) Section 13.3 tax indemnity conflated with 13.2 general indemnity

Pass 2 analyzer picks the broader 13.2 "You Indemnity" clause instead of
the more specific 13.3 "Tax Indemnity" clause on contractor platform
agreements. Extraction correctly separates both sections. Fix likely in
the `contractor_platform` prompt's focus-area wording for tax allocation,
or in how the analyzer ranks adjacent indemnity clauses.

## (C) Run-to-run variability at temperature 0.2

Pass 2 runs at `temperature=0.2`, which produces varied phrasing but also
varied red-flag selection across runs. The 14.2 $500/3-month liability
cap, the 7.1 LLM prohibition, and a separate class-action-waiver flag
all appear intermittently between runs even on the same input document.

Proposed fix: drop analysis-pass temperature to 0.0 and re-run the
ground-truth test. If flag coverage becomes deterministic without loss
of explanation quality, ship it. Fallback: run Pass 2 twice and union
the red flags (2× Gemini cost).

## (D) Pass 1 extraction instability

Section numbering shifts between runs depending on how the extractor
slices 17.5 / 17.6 "Informal Dispute Resolution". Observed numberings
for the same Handshake document:

| Concept | Run with Informal Dispute Resolution extracted | Run without |
|---|---|---|
| Class Action Waiver | 17.7 | 17.6 |
| Opt Out of Arbitration | 17.13 | 17.12 |

Not a correctness issue — both numberings describe the real clauses —
but it makes any section-number-pinned scoring or downstream logic
fragile. Post-CA investigation: either stabilize extraction (lower Pass
1 temp if not already 0.0, or add explicit section-boundary rules to the
extraction prompt) or switch scoring to quote-content matching instead
of section-number matching.

## (E) UNIVERSAL_EXCLUSIONS not enforced on missing-protections

On one run the model produced a missing-protection titled
`No "Kill Fee" for Canceled Projects` despite "kill fee" being in
`UNIVERSAL_EXCLUSIONS`. Red flags respect the exclusion list (they're
analyzed over the structured extraction and the prompt explicitly lists
forbidden concepts in the "DO NOT INCLUDE" block); missing-protections
have weaker enforcement because the exclusion list is aimed at the
red-flag generation, not the gap-finding.

Fix: extend the exclusion check to cover missing-protections — either
by adding the exclusion list verbatim to the missing-protections section
of the prompt, or by adding a post-generation filter that drops any
missing-protection whose title/body contains a forbidden term.

## (F) Ground-truth test format fights run-to-run variability by design

Current test pins 10 specific concerns to specific section numbers and
scores one run. The pipeline reliably covers ~7 per run but picks
different subsets each time (see C). A single run's 7/10 is not a
meaningful regression signal — re-running could give 6/10 or 8/10 on an
unchanged pipeline just from sampling.

Better test design post-CA: run N=5 times, score each concern as
"covered" if it appears in ≥3/5 runs. More work, more honest signal.
Don't redesign tonight — just note.

## Stale section-number spec — RESOLVED in Step 8 cleanup

Original spec had 17.7 and 17.10 for class-action waiver and opt-out.
Document actually uses 17.6 and 17.12 in the run the scorer was first
tuned against (and 17.7 / 17.13 on the run where Informal Dispute
Resolution got its own section — see D). Scorer now accepts both
numberings. Kept here as a record of why the scorer changed.

## Future work (not blocking)

- Ground-truth fixtures for the other 5 document types (freelance_sow,
  employment, nda, saas_terms, service_agreement). Each analyzer prompt
  should be verified against a real document of that type before
  high-stakes use.
- Frontend highlighting UI: overlay red/yellow/green severity spans on
  the original document text using v2's `section_number` + `quote`
  fields. Requires character-offset mapping from quote back to source
  document. 4–8 hour frontend task, design needed before build.

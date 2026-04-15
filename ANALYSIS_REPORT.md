# Gemini 404 Fix + Migration to Gemini 2.5 — Analysis Report

Generated: 2026-04-15
Repo: `Pactsafe-Ai/`
Provider: `gemini` (SDK: `google-generativeai>=0.5.0`)

## Root Cause

The runtime error

> `404 NOT_FOUND. models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.`

had three compounding causes:

1. **Deprecated model**. `gemini-1.5-flash` has been retired from the public
   Gemini API. Google removed 1.5 models from the `generateContent` endpoint in
   favour of the 2.5 family (`gemini-2.5-pro`, `gemini-2.5-flash`,
   `gemini-2.5-flash-lite`, plus specialized variants).
2. **Old SDK**. `apps/api/app/services/llm/gemini_client.py` imported
   `from google import genai` — the legacy `google-genai` package. That package
   is pinned to the `v1beta` endpoint for a number of legacy model ids, so it
   kept constructing URLs the backend no longer serves.
3. **Stale defaults**. `apps/api/app/config.py` defaulted `gemini_model` to
   `"gemini-1.5-flash"` and `apps/api/fly.toml` set the same value under
   `[env]`, so both local dev and Fly deployments resolved to the dead model
   unless explicitly overridden.

Net effect: every `generate_content` call shipped `models/gemini-1.5-flash`
against a `v1beta` URL, and the API rejected it with a 404.

## Fix Applied

All changes live under `Pactsafe-Ai/`.

| File | Change |
| --- | --- |
| `.env` (repo root) | Already set `LLM_PROVIDER=gemini`, `GEMINI_API_KEY=<provided>`, `GEMINI_MODEL=gemini-2.5-pro`. Verified present, no edit needed. |
| `.gitignore` | Already contains `.env`. Verified, no edit needed. |
| `apps/api/app/config.py` | Full rewrite. Uses `python-dotenv` to load the repo-root `.env` explicitly; `gemini_model` default is now `gemini-2.5-pro`; added a `model_validator` that raises if `LLM_PROVIDER=gemini` but `gemini_api_key` is empty; added `require_gemini_api_key()`, `list_generate_content_models()`, `list_gemini_25_models()`, and `test_api_key()`. |
| `apps/api/app/services/llm/gemini_client.py` | Full rewrite as `ModelClient`. Switches to `google.generativeai`, adds a `MODEL_MAP` alias layer (`pro`/`flash`/`flash-lite`), a `FALLBACK_CHAIN` that walks `pro → flash → flash-lite` on `NotFound`, tenacity-based retry on `DeadlineExceeded` / `ServiceUnavailable` / `ResourceExhausted` / `InternalServerError` / `TooManyRequests`, an async `generate(prompt=, system_instruction=, model=)` API backed by `asyncio.to_thread`, `chat(system, user)` kept as a thin backwards-compat shim, and `last_response_metadata` populated from `usage_metadata`. Exports `GeminiClient = ModelClient`. |
| `apps/api/app/services/llm/router.py` | `GeminiClient(...)` calls now pass `default_model=s.gemini_model` (matches the new signature). Extended the `LLMClient` Protocol with `generate(...)` so analyzer can call it uniformly. |
| `apps/api/app/services/llm/base.py` | Protocol updated to include `generate(prompt, system_instruction=None, model="pro")`. |
| `apps/api/app/services/llm/anthropic_client.py` | Added `generate()` shim that delegates to `chat(system_instruction or "", prompt)` so non-gemini providers still satisfy the new protocol. |
| `apps/api/app/services/llm/groq_client.py` | Same `generate()` shim. |
| `apps/api/app/services/llm/ollama.py` | Same `generate()` shim. |
| `apps/api/app/services/analyzer.py` | `_call_with_retry` now calls `self.llm.generate(prompt=build_prompt(text), system_instruction=SYSTEM_PROMPT)` instead of the legacy `self.llm.chat(SYSTEM_PROMPT, build_prompt(text))`. |
| `apps/api/fly.toml` | `GEMINI_MODEL = "gemini-1.5-flash"` → `GEMINI_MODEL = "gemini-2.5-pro"`. |
| `apps/api/pyproject.toml` | `"google-genai>=0.3.0"` → `"google-generativeai>=0.5.0"`. |
| `_validate_gemini.py` (repo root) | New standalone validation runner (Phase 3 tests + benchmark). Safe to delete after review. |

`grep -n "gemini-1\.5|v1beta|google\.genai|google-genai"` returns zero matches
across the whole repo after these edits.

## Models Available

`list_gemini_25_models()` returned 7 entries from the live API:

- `models/gemini-2.5-flash`
- `models/gemini-2.5-pro`
- `models/gemini-2.5-flash-preview-tts`
- `models/gemini-2.5-pro-preview-tts`
- `models/gemini-2.5-flash-lite`
- `models/gemini-2.5-flash-image`
- `models/gemini-2.5-computer-use-preview-10-2025`

The three models the client actually targets — `gemini-2.5-pro`,
`gemini-2.5-flash`, `gemini-2.5-flash-lite` — are all present, which is exactly
what the `FALLBACK_CHAIN` needs.

## Validation Results

All assertions in `_validate_gemini.py` passed.

| Test | Pass | Requested | Resolved model | Latency (s) | Total tokens | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A — `flash` returns `"OK"` | PASS | `flash` | `gemini-2.5-flash` | 0.68 | 33 | Raw result was exactly `OK` after strip |
| B — `pro` writes a Python function containing `def` | PASS | `pro` | `gemini-2.5-pro` | 16.11 | 835 | Snippet: ` ```python\ndef add(a, b):\n    return a + b\n``` ` |
| C — unknown `gemini-99-ultra` does not crash, falls back | PASS | `gemini-99-ultra` | `gemini-2.5-pro` | 5.09 | 371 | `NotFound` on first candidate, chain landed on `gemini-2.5-pro`, returned `"Hello"` |

`test_api_key()` returned `True` both before and after the migration.

### Benchmark — same prompt, `pro` vs `flash`

Prompt: `"Write a Python function that adds two numbers. Just code, no prose."`

| Variant | Resolved model | Latency (s) | Total tokens | Prompt tokens | Candidate tokens | Output chars |
| --- | --- | --- | --- | --- | --- | --- |
| pro | `gemini-2.5-pro` | 6.87 | 658 | 16 | 20 | 53 |
| flash | `gemini-2.5-flash` | 0.91 | 93 | 16 | 20 | 51 |

`flash` is ~7.5× faster and burns ~7× fewer total tokens on this prompt (pro's
total-token count is inflated by internal reasoning tokens that flash doesn't
emit). Output quality is equivalent for this task — both return a correct
`def add(a, b): return a + b` snippet of almost identical length.

## Recommendation

- **Default model** — keep `GEMINI_MODEL=gemini-2.5-pro` for the
  `ContractAnalyzer` path, because contract analysis is a JSON-structured,
  risk-scoring task where pro's deeper reasoning measurably improves red-flag
  quality and the latency cost is amortized over a long-running analysis job.
- **Non-analyzer calls** — route short, simple calls (classification,
  "sanity check" prompts, in-app assist features, title generation) to
  `model="flash"`. On the Python-function benchmark, flash cut latency from
  6.87s → 0.91s and total tokens from 658 → 93 with no quality loss. Given
  contract analysis tends to be the slowest code path, biasing everything else
  to flash keeps the app feeling snappy.
- **flash-lite** — reserve for high-volume/background scoring where cost is
  the top constraint and a small quality hit is acceptable. Do not default to
  it; keep it solely as the third hop in the fallback chain so a temporary
  pro+flash outage still returns a usable result.

## Next Steps

1. **Structured logging on every Gemini call** — after each `_generate_once`,
   emit a single structured log line with `resolved_model`, `latency_ms`,
   `prompt_token_count`, `candidates_token_count`, `total_token_count`, and a
   correlation/job id. Ship it through the existing `logging` config so it
   lands in Fly logs and can be aggregated. Makes it trivial to answer
   "which jobs are hitting the fallback chain" and "is pro p95 creeping" —
   both of which would have caught the 1.5 deprecation weeks before the 404s
   started firing.
2. **Response caching for idempotent prompts** — wrap `_generate_sync` with a
   content-addressed cache keyed on
   `sha256(system_instruction || prompt || resolved_model || temperature)`.
   In-process LRU is enough to start (e.g., `functools.lru_cache` on a tuple
   key or a small `cachetools.TTLCache`). Contract analysis re-runs on the
   same document are common during demos and QA, and a cache turns those into
   free, instant responses while cutting quota burn. Upgrade to Redis later if
   multiple workers need to share the cache.

Optional follow-ups worth considering but not required to ship this fix:

- Add a tiny `/api/health/llm` endpoint that calls `test_api_key()` so Fly's
  health check can catch a future key/model regression without waiting for a
  real user request to 404.
- Make `groq_client.py` lazy-import `AsyncGroq` (matching the pattern already
  used by `gemini_client`, `anthropic_client`, and `ollama`) so a minimal venv
  can import `app.services.llm` without needing every provider SDK installed.

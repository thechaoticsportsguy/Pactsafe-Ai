"""
ContractAnalyzer — async port of contract_analyzer.py's core logic.

Responsibilities:
- Validate / truncate input
- Build prompt
- Call LLM with tenacity retry (exponential backoff)
- Parse JSON response (strip markdown fences, fallback regex)
- Enrich red_flags with page numbers using the ingestion page_map
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.prompts.contract import SYSTEM_PROMPT, build_prompt
from app.schemas import AnalysisResult, GreenFlag, RedFlag, sort_flags_by_severity
from app.services.ingestion import PageRange, find_page_for_offset
from app.services.llm import LLMClient

logger = logging.getLogger(__name__)

MAX_CONTRACT_CHARS = 60_000
MIN_CONTRACT_CHARS = 50
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.5
TRUNCATION_NOTICE = "\n\n[Contract truncated for analysis]"

# Per-model output budget. Flash is used for fast home-page previews so we
# keep the cap lean; pro gets headroom for a full red-flag rundown.
MAX_OUTPUT_TOKENS: dict[str, int] = {
    "flash": 4000,
    "flash-lite": 3000,
    "pro": 10000,
}
DEFAULT_MAX_OUTPUT_TOKENS = 8000


def _token_budget_for(model: str) -> int:
    """Pick a sensible max_output_tokens for a given logical model tier."""

    return MAX_OUTPUT_TOKENS.get(model.lower(), DEFAULT_MAX_OUTPUT_TOKENS)


_FENCE_RE = re.compile(
    r"```(?:json|JSON)?\s*([\s\S]*?)```",
    re.MULTILINE,
)


def clean_json_response(response_text: str) -> str:
    """Strip markdown code fences and chatter from an LLM JSON response.

    Gemini (and friends) sometimes wraps JSON in ```json ... ``` fences even
    when the prompt forbids it. A few models also emit two fenced blocks
    (e.g. a preview followed by the final one) — we keep the *first* fenced
    block that parses as JSON-looking, or fall back to the whole cleaned
    string if no fence is present.
    """

    text = (response_text or "").strip()
    if not text:
        return text

    # Pull every fenced block. Prefer the largest one that starts with `{`
    # or `[`, since models occasionally show a small fragment before the
    # real JSON.
    matches = _FENCE_RE.findall(text)
    if matches:
        candidates = [m.strip() for m in matches if m.strip()]
        json_like = [c for c in candidates if c[:1] in "{["]
        if json_like:
            return max(json_like, key=len)
        if candidates:
            return max(candidates, key=len)

    # Unclosed leading fence: the model got truncated mid-output before the
    # closing ```. Strip the opening fence so the repair pass can take over.
    if text.startswith("```"):
        text = text[3:]
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.lstrip(":\n\r\t ")

    # No fences — strip a leading `json` hint some models emit on their own.
    if text.lower().startswith("json"):
        text = text[4:].lstrip(":\n\r\t ")

    return text.strip()


def is_json_complete(json_str: str) -> bool:
    """Return True if ``json_str`` parses as JSON OR its braces are balanced.

    A balanced but syntactically invalid string (trailing commas, etc.)
    will still return False — the repair pass is the place to fix that.
    """

    if not json_str:
        return False
    try:
        json.loads(json_str)
        return True
    except json.JSONDecodeError:
        pass

    # Fall back to a cheap brace-balance check so callers can tell the
    # difference between "truncated mid-object" (unbalanced) and "parser
    # rejected trailing commas" (balanced).
    opens, closes = _count_unquoted_braces(json_str)
    return closes >= opens


def repair_truncated_json(incomplete_json: str) -> str:
    """Best-effort repair for JSON that was cut off mid-output.

    Strategy:
    1. Walk the text with a tiny state machine, tracking the open-bracket
       stack, whether we're inside a string, and (for strings) whether we
       are currently reading a key or a value.
    2. If the walk ends mid-string:
         - inside a value string: close it, treat the pair as complete.
         - inside a key string: drop the dangling key entirely (trim back
           to before the last `,` or `{`).
    3. After that, trim any half-written tail that's not a complete
       token (`"foo":` with no value, a dangling `,`, etc.).
    4. Append `}` / `]` characters to balance the open-bracket stack.

    The result may still not parse for exotic failures — this is a salvage
    pass, not magic.
    """

    text = (incomplete_json or "").rstrip()
    if not text:
        return text

    stack: list[str] = []
    in_string = False
    escape = False
    # Role of the string we're currently *inside*. Set on string-open.
    #   "value" — string sits on the right side of `:`
    #   "key"   — anything else (object key, array item of strings)
    string_role: str | None = None
    # Last safe rollback point — index of a `,`, `{`, or `[` at depth>0,
    # after which we can safely cut and still have valid JSON (once the
    # stack is closed).
    safe_trim: int = -1

    for i, ch in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
                string_role = None
            continue

        if ch == '"':
            # Decide key vs value from the last non-whitespace char seen.
            j = i - 1
            while j >= 0 and text[j] in " \n\r\t":
                j -= 1
            prev = text[j] if j >= 0 else ""
            string_role = "value" if prev == ":" else "key"
            in_string = True
            continue

        if ch in "{[":
            stack.append("}" if ch == "{" else "]")
            safe_trim = i  # cut right after this opener is always safe
            continue

        if ch in "}]":
            if stack and stack[-1] == ch:
                stack.pop()
            continue

        if ch == "," and stack:
            safe_trim = i  # cut right before this comma is always safe

    # --- Step 2: resolve an open string --------------------------------------
    if in_string:
        if string_role == "value":
            # We stopped inside a value string → just close it. The key:value
            # pair is now complete.
            text += '"'
        else:
            # We stopped inside a key string (or an array of strings). Drop
            # the dangling entry by rewinding to the last safe trim point.
            if safe_trim >= 0:
                text = text[: safe_trim + 1 if text[safe_trim] in "{[" else safe_trim]

    # --- Step 3: trim half-written trailing token ----------------------------
    if stack:
        # Walk backwards, skipping whitespace, to find what we end on.
        j = len(text) - 1
        while j >= 0 and text[j] in " \n\r\t":
            j -= 1
        if j >= 0:
            tail = text[j]
            # If we end on `:` (dangling key:) or `,` (dangling comma) or
            # a digit/letter fragment (`95` fine, but `9.` not), rewind to
            # the last safe trim point.
            if tail == ":" or tail == ",":
                text = text[: safe_trim + 1 if (safe_trim >= 0 and text[safe_trim] in "{[") else max(safe_trim, 0)]

    # --- Step 4: balance brackets --------------------------------------------
    if stack:
        text += "".join(reversed(stack))
        logger.info(
            "[analyzer] repaired truncated JSON: added %d closers (%s)",
            len(stack),
            "".join(reversed(stack)),
        )

    return text


def _count_unquoted_braces(s: str) -> tuple[int, int]:
    """Count `{` / `}` outside of string literals."""

    opens = closes = 0
    in_string = False
    escape = False
    for ch in s:
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            opens += 1
        elif ch == "}":
            closes += 1
    return opens, closes


def _extract_outermost_json_object(text: str) -> Optional[str]:
    """Return the outermost {...} block in ``text``, or None.

    Brace-walks with string-awareness so commas and braces inside string
    literals don't confuse the extraction.
    """

    start = text.find("{")
    if start < 0:
        return None

    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


class ContractAnalyzer:
    """Server-side contract analyzer. Single instance per job."""

    def __init__(self, llm: LLMClient) -> None:
        self.llm = llm

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def analyze(
        self,
        text: str,
        page_map: Optional[list[PageRange]] = None,
        model: str = "pro",
    ) -> AnalysisResult:
        """Analyze `text` and return an AnalysisResult.

        If page_map is provided (from ingestion.extract_text), red flags will
        be enriched with page numbers and offsets.

        `model` is a logical alias (``"pro"``, ``"flash"``, ``"flash-lite"``)
        passed through to the LLM client. Callers use ``"flash"`` for quick
        home-page previews and ``"pro"`` for the deep /analyze flow.
        """

        validation_error = self._validate(text)
        if validation_error is not None:
            return validation_error

        safe_text, truncated = self._truncate(text.strip())

        try:
            raw = await self._call_with_retry(safe_text, model=model)
        except Exception as exc:
            logger.exception("LLM call failed")
            return AnalysisResult(
                error=f"Analysis failed after {MAX_RETRIES} attempts: {exc}",
                model_used=getattr(self.llm, "model", ""),
                provider=getattr(self.llm, "provider", None),
                truncated=truncated,
            )

        result = self._parse_response(raw)
        result.model_used = getattr(self.llm, "model", "")
        result.provider = getattr(self.llm, "provider", None)
        result.truncated = truncated

        if page_map and not result.error:
            self._attach_page_numbers(result, text, page_map)

        return result

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _validate(self, text: str) -> Optional[AnalysisResult]:
        if not text or not isinstance(text, str):
            return AnalysisResult(error="Contract text must be a non-empty string.")
        if len(text.strip()) < MIN_CONTRACT_CHARS:
            return AnalysisResult(
                error=f"Contract too short (min {MIN_CONTRACT_CHARS} chars)."
            )
        return None

    def _truncate(self, text: str) -> tuple[str, bool]:
        if len(text) > MAX_CONTRACT_CHARS:
            return text[:MAX_CONTRACT_CHARS] + TRUNCATION_NOTICE, True
        return text, False

    async def _call_with_retry(self, text: str, model: str = "pro") -> str:
        budget = _token_budget_for(model)
        retryer = AsyncRetrying(
            stop=stop_after_attempt(MAX_RETRIES),
            wait=wait_exponential(multiplier=RETRY_BASE_DELAY, min=RETRY_BASE_DELAY, max=12),
            retry=retry_if_exception_type(Exception),
            reraise=True,
        )
        async for attempt in retryer:
            with attempt:
                response = await self.llm.generate(
                    prompt=build_prompt(text, model=model),
                    system_instruction=SYSTEM_PROMPT,
                    model=model,
                    max_output_tokens=budget,
                )
                logger.info(
                    "[analyzer] llm call model=%s budget=%d response_chars=%d",
                    model,
                    budget,
                    len(response or ""),
                )
                return response
        # Unreachable but keeps mypy happy
        raise RuntimeError("Retry loop exited without a result")

    def _parse_response(self, raw: str) -> AnalysisResult:
        if not raw or not raw.strip():
            logger.error("[analyzer] empty response from LLM")
            return AnalysisResult(error="AI returned an empty response. Try again.")

        cleaned = clean_json_response(raw)

        # Try strict JSON first.
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as err_strict:
            # Step 1 — find the outermost {...} blob. We walk braces instead
            # of regex-greedy matching so trailing prose after the JSON
            # object (Gemini occasionally adds "Here's the analysis:" before
            # or after) doesn't break the parser.
            blob = _extract_outermost_json_object(cleaned) or cleaned

            # Step 2 — if the response is clearly truncated (unbalanced
            # braces or raw ended mid-string), try to repair it before
            # giving up. Common cause: max_output_tokens cut off the
            # response right inside a red_flags entry.
            if not is_json_complete(blob):
                logger.warning(
                    "[analyzer] response appears truncated; attempting repair. "
                    "tail=%r",
                    blob[-120:],
                )
                repaired = repair_truncated_json(blob)
                try:
                    data = json.loads(repaired)
                    logger.info(
                        "[analyzer] repair succeeded, recovered analysis JSON"
                    )
                except json.JSONDecodeError as err_repair:
                    logger.error(
                        "[analyzer] repair failed. strict_err=%s repair_err=%s "
                        "raw_len=%d raw_head=%r raw_tail=%r",
                        err_strict,
                        err_repair,
                        len(raw),
                        raw[:200],
                        raw[-200:],
                    )
                    return AnalysisResult(
                        error="Could not parse AI response. Try again."
                    )
            else:
                try:
                    data = json.loads(blob)
                except json.JSONDecodeError as err_blob:
                    logger.error(
                        "[analyzer] could not parse extracted JSON blob. "
                        "strict_err=%s blob_err=%s raw=%r",
                        err_strict,
                        err_blob,
                        raw[:500],
                    )
                    return AnalysisResult(
                        error="Could not parse AI response. Try again."
                    )

        # Red flags — normalize severity, clamp to 8 items, sort CRITICAL first
        red_flags: list[RedFlag] = []
        for item in (data.get("red_flags") or [])[:8]:
            if not isinstance(item, dict):
                continue
            clause = str(item.get("clause") or "").strip()
            explanation = str(item.get("explanation") or "").strip()
            if not clause or not explanation:
                continue
            sev_raw = str(item.get("severity") or "MEDIUM").upper()
            sev = sev_raw if sev_raw in {"LOW", "MEDIUM", "HIGH", "CRITICAL"} else "MEDIUM"
            red_flags.append(
                RedFlag(
                    clause=clause,
                    explanation=explanation,
                    severity=sev,  # type: ignore[arg-type]
                )
            )

        # Green flags — clauses that work in the signer's favor. Optional
        # per the schema, safe to emit even as an empty list.
        green_flags: list[GreenFlag] = []
        for item in (data.get("green_flags") or [])[:6]:
            if not isinstance(item, dict):
                continue
            clause = str(item.get("clause") or "").strip()
            explanation = str(item.get("explanation") or "").strip()
            if not clause or not explanation:
                continue
            green_flags.append(
                GreenFlag(clause=clause, explanation=explanation)
            )

        return AnalysisResult(
            contract_type=str(data.get("contract_type") or "Unknown Contract").strip(),
            risk_score=max(0, min(100, int(data.get("risk_score") or 50))),
            overall_summary=str(data.get("overall_summary") or "").strip(),
            red_flags=sort_flags_by_severity(red_flags),
            green_flags=green_flags,
            missing_protections=[
                str(x).strip()
                for x in (data.get("missing_protections") or [])[:6]
                if str(x).strip()
            ],
            negotiation_suggestions=[
                str(x).strip()
                for x in (data.get("negotiation_suggestions") or [])[:6]
                if str(x).strip()
            ],
        )

    def _attach_page_numbers(
        self,
        result: AnalysisResult,
        full_text: str,
        page_map: list[PageRange],
    ) -> None:
        """Look up each flag's clause in the extracted text and tag it with a page."""

        for flag in (*result.red_flags, *result.green_flags):
            if not flag.clause:
                continue
            # Use first 80 chars of the clause as a lookup key (robust to paraphrase).
            needle = flag.clause[:80].strip()
            if not needle:
                continue
            offset = full_text.find(needle)
            if offset >= 0:
                flag.start_offset = offset
                flag.end_offset = offset + len(flag.clause)
                flag.page = find_page_for_offset(page_map, offset)

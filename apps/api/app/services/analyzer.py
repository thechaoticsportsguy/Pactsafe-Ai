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
from app.schemas import AnalysisResult, RedFlag, sort_flags_by_severity
from app.services.ingestion import PageRange, find_page_for_offset
from app.services.llm import LLMClient

logger = logging.getLogger(__name__)

MAX_CONTRACT_CHARS = 60_000
MIN_CONTRACT_CHARS = 50
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.5
TRUNCATION_NOTICE = "\n\n[Contract truncated for analysis]"


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
    ) -> AnalysisResult:
        """Analyze `text` and return an AnalysisResult.

        If page_map is provided (from ingestion.extract_text), red flags will
        be enriched with page numbers and offsets.
        """

        validation_error = self._validate(text)
        if validation_error is not None:
            return validation_error

        safe_text, truncated = self._truncate(text.strip())

        try:
            raw = await self._call_with_retry(safe_text)
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

    async def _call_with_retry(self, text: str) -> str:
        retryer = AsyncRetrying(
            stop=stop_after_attempt(MAX_RETRIES),
            wait=wait_exponential(multiplier=RETRY_BASE_DELAY, min=RETRY_BASE_DELAY, max=12),
            retry=retry_if_exception_type(Exception),
            reraise=True,
        )
        async for attempt in retryer:
            with attempt:
                return await self.llm.generate(
                    prompt=build_prompt(text),
                    system_instruction=SYSTEM_PROMPT,
                )
        # Unreachable but keeps mypy happy
        raise RuntimeError("Retry loop exited without a result")

    def _parse_response(self, raw: str) -> AnalysisResult:
        cleaned = (raw or "").strip()

        # Strip markdown fences: ```json\n{...}\n```
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
        if fence:
            cleaned = fence.group(1).strip()

        # Try strict JSON first
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            # Fallback: grab first {...} blob
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if not match:
                return AnalysisResult(
                    error=f"Unexpected AI response format: {cleaned[:200]}"
                )
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                return AnalysisResult(error="Could not parse AI response. Try again.")

        # Red flags — normalize severity, clamp to 8 items, sort CRITICAL first
        red_flags: list[RedFlag] = []
        for item in (data.get("red_flags") or [])[:8]:
            sev_raw = str(item.get("severity") or "MEDIUM").upper()
            sev = sev_raw if sev_raw in {"LOW", "MEDIUM", "HIGH", "CRITICAL"} else "MEDIUM"
            red_flags.append(
                RedFlag(
                    clause=str(item.get("clause") or "").strip(),
                    explanation=str(item.get("explanation") or "").strip(),
                    severity=sev,  # type: ignore[arg-type]
                )
            )

        return AnalysisResult(
            contract_type=str(data.get("contract_type") or "Unknown Contract").strip(),
            risk_score=max(0, min(100, int(data.get("risk_score") or 50))),
            overall_summary=str(data.get("overall_summary") or "").strip(),
            red_flags=sort_flags_by_severity(red_flags),
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

        for flag in result.red_flags:
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

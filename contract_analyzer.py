"""
PactSafe AI - Contract Analyzer
================================
A production-grade AI contract analysis engine built with Python + Claude.

Features:
- PDF, DOCX, and TXT file ingestion
- Severity-scored red flags (LOW / MEDIUM / HIGH / CRITICAL)
- Overall contract risk score (0-100)
- Contract type auto-detection
- Clause-by-clause breakdown with exact quotes
- Rich color-coded CLI output
- Async + exponential backoff retry
- .env support for API key management
"""

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

import anthropic
import typer
from dotenv import load_dotenv
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.text import Text

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_CONTRACT_CHARS = 80_000   # ~20k tokens
MIN_CONTRACT_CHARS = 50
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.5        # seconds (doubles each retry)

# ---------------------------------------------------------------------------
# Enums & Dataclasses
# ---------------------------------------------------------------------------

class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

SEVERITY_COLORS = {
    Severity.LOW: "green",
    Severity.MEDIUM: "yellow",
    Severity.HIGH: "red",
    Severity.CRITICAL: "bold red",
}

SEVERITY_EMOJI = {
    Severity.LOW: "🟢",
    Severity.MEDIUM: "🟡",
    Severity.HIGH: "🔴",
    Severity.CRITICAL: "💀",
}

@dataclass
class RedFlag:
    clause: str           # Exact or paraphrased quote from contract
    explanation: str      # Plain-English explanation
    severity: Severity

@dataclass
class AnalysisResult:
    contract_type: str                          # e.g. "Freelance Service Agreement"
    risk_score: int                             # 0-100
    red_flags: list[RedFlag] = field(default_factory=list)
    missing_protections: list[str] = field(default_factory=list)
    negotiation_suggestions: list[str] = field(default_factory=list)
    overall_summary: str = ""
    error: Optional[str] = None

# ---------------------------------------------------------------------------
# File Ingestion
# ---------------------------------------------------------------------------

def extract_text_from_file(file_path: str) -> str:
    """Extract raw text from PDF, DOCX, or TXT files."""
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = path.suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(path)
    elif ext in (".docx", ".doc"):
        return _extract_docx(path)
    elif ext == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    else:
        # Try reading as plain text anyway
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            raise ValueError(f"Unsupported file type: {ext}. Use PDF, DOCX, or TXT.")


def _extract_pdf(path: Path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()


def _extract_docx(path: Path) -> str:
    from docx import Document
    doc = Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a senior contract attorney with 20 years of experience 
protecting freelancers, consultants, and independent contractors from exploitative agreements.

Your job is to analyze contracts with a sharp, protective eye. You think like a lawyer 
but speak like a trusted friend — no jargon, no hedging, just honest assessments.

You identify:
- Clauses that could harm or exploit the freelancer
- Industry-standard protections that are suspiciously absent
- Specific, actionable negotiation tactics

You are direct, specific, and always quote the actual contract language when flagging issues."""


def build_analysis_prompt(contract_text: str) -> str:
    return f"""Analyze this contract thoroughly and return a JSON object ONLY (no markdown, no preamble).

CONTRACT:
---
{contract_text}
---

Return EXACTLY this JSON structure:

{{
  "contract_type": "string (e.g. 'Freelance Web Development Agreement', 'NDA', 'Employment Contract')",
  "risk_score": integer from 0 to 100 (0 = perfectly safe, 100 = extremely dangerous),
  "overall_summary": "2-3 sentence plain-English verdict on this contract",
  "red_flags": [
    {{
      "clause": "exact quote or close paraphrase from the contract",
      "explanation": "why this is dangerous in plain English",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }}
  ],
  "missing_protections": [
    "string describing what's missing and why it matters"
  ],
  "negotiation_suggestions": [
    "specific, actionable suggestion with exact language to propose if possible"
  ]
}}

Rules:
- red_flags: 3-8 items, ordered by severity (CRITICAL first)
- missing_protections: 3-6 items
- negotiation_suggestions: 3-6 items, be SPECIFIC (include example contract language)
- risk_score: be honest and calibrated
- Severity guide: LOW=minor inconvenience, MEDIUM=real risk, HIGH=serious harm likely, CRITICAL=do not sign as-is"""

# ---------------------------------------------------------------------------
# Core Analyzer
# ---------------------------------------------------------------------------

class ContractAnalyzer:
    """
    Core AI engine for freelance contract analysis.
    Uses Anthropic Claude with async support, retry logic, and structured output.
    """

    def __init__(self, api_key: Optional[str] = None):
        key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not key or not key.strip():
            raise ValueError(
                "Anthropic API key required. Set ANTHROPIC_API_KEY in .env or pass it directly."
            )
        self.client = anthropic.Anthropic(api_key=key.strip())
        self.async_client = anthropic.AsyncAnthropic(api_key=key.strip())

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze_text(self, contract_text: str) -> AnalysisResult:
        """Analyze raw contract text (synchronous)."""
        return asyncio.run(self.analyze_text_async(contract_text))

    def analyze_file(self, file_path: str) -> AnalysisResult:
        """Extract text from a file and analyze it (synchronous)."""
        return asyncio.run(self.analyze_file_async(file_path))

    async def analyze_text_async(self, contract_text: str) -> AnalysisResult:
        """Analyze raw contract text (async)."""
        validated = self._validate_input(contract_text)
        if isinstance(validated, AnalysisResult):
            return validated  # validation error

        safe_text = self._truncate(validated)
        return await self._run_with_retry(safe_text)

    async def analyze_file_async(self, file_path: str) -> AnalysisResult:
        """Extract text from file and analyze (async)."""
        try:
            text = extract_text_from_file(file_path)
        except (FileNotFoundError, ValueError) as e:
            return AnalysisResult(
                contract_type="Unknown",
                risk_score=0,
                error=str(e)
            )
        return await self.analyze_text_async(text)

    # ------------------------------------------------------------------
    # Internal methods
    # ------------------------------------------------------------------

    def _validate_input(self, text: str) -> str | AnalysisResult:
        if not text or not isinstance(text, str):
            return AnalysisResult(contract_type="Unknown", risk_score=0,
                                  error="Contract text must be a non-empty string.")
        trimmed = text.strip()
        if len(trimmed) < MIN_CONTRACT_CHARS:
            return AnalysisResult(contract_type="Unknown", risk_score=0,
                                  error=f"Contract too short (min {MIN_CONTRACT_CHARS} chars). Provide the full contract.")
        return trimmed

    def _truncate(self, text: str) -> str:
        if len(text) > MAX_CONTRACT_CHARS:
            return text[:MAX_CONTRACT_CHARS] + "\n\n[Contract truncated — first 80,000 characters analyzed]"
        return text

    async def _run_with_retry(self, contract_text: str) -> AnalysisResult:
        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                return await self._call_claude(contract_text)
            except anthropic.RateLimitError:
                wait = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(wait)
                last_error = "Rate limit hit. Try again in a moment."
            except anthropic.APIStatusError as e:
                wait = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(wait)
                last_error = f"API error ({e.status_code}): {e.message}"
            except Exception as e:
                last_error = str(e)
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_BASE_DELAY)

        return AnalysisResult(
            contract_type="Unknown",
            risk_score=0,
            error=f"Analysis failed after {MAX_RETRIES} attempts: {last_error}"
        )

    async def _call_claude(self, contract_text: str) -> AnalysisResult:
        response = await self.async_client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_analysis_prompt(contract_text)}],
        )

        raw = response.content[0].text if response.content else ""
        if not raw:
            raise ValueError("Claude returned an empty response.")

        return self._parse_response(raw)

    def _parse_response(self, raw: str) -> AnalysisResult:
        # Strip markdown fences
        cleaned = raw.strip()
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
        if fence:
            cleaned = fence.group(1).strip()

        # Parse JSON
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to extract JSON object
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                try:
                    data = json.loads(match.group(0))
                except json.JSONDecodeError:
                    return AnalysisResult(contract_type="Unknown", risk_score=0,
                                          error="Could not parse AI response. Please try again.")
            else:
                return AnalysisResult(contract_type="Unknown", risk_score=0,
                                      error="Unexpected response format from AI.")

        # Build red flags with severity
        red_flags = []
        for item in data.get("red_flags", [])[:8]:
            try:
                sev = Severity(item.get("severity", "MEDIUM").upper())
            except ValueError:
                sev = Severity.MEDIUM
            red_flags.append(RedFlag(
                clause=str(item.get("clause", "")).strip(),
                explanation=str(item.get("explanation", "")).strip(),
                severity=sev,
            ))

        # Sort by severity (CRITICAL → HIGH → MEDIUM → LOW)
        sev_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3}
        red_flags.sort(key=lambda f: sev_order.get(f.severity, 99))

        return AnalysisResult(
            contract_type=str(data.get("contract_type", "Unknown Contract")).strip(),
            risk_score=max(0, min(100, int(data.get("risk_score", 50)))),
            overall_summary=str(data.get("overall_summary", "")).strip(),
            red_flags=red_flags,
            missing_protections=[
                str(x).strip() for x in data.get("missing_protections", [])[:6] if x
            ],
            negotiation_suggestions=[
                str(x).strip() for x in data.get("negotiation_suggestions", [])[:6] if x
            ],
        )

# ---------------------------------------------------------------------------
# Rich CLI Display
# ---------------------------------------------------------------------------

console = Console()

def render_results(result: AnalysisResult, source: str = "") -> None:
    """Render analysis results with rich formatting."""

    console.print()

    # Error state
    if result.error:
        console.print(Panel(
            f"[bold red]❌ Error:[/] {result.error}",
            title="Analysis Failed",
            border_style="red"
        ))
        return

    # Header
    header_lines = [f"[bold white]{result.contract_type}[/]"]
    if source:
        header_lines.append(f"[dim]Source: {source}[/]")
    console.print(Panel("\n".join(header_lines), title="📄 PactSafe AI Analysis", border_style="cyan"))

    # Risk score bar
    score = result.risk_score
    if score <= 30:
        score_color, score_label = "green", "LOW RISK"
    elif score <= 60:
        score_color, score_label = "yellow", "MODERATE RISK"
    elif score <= 80:
        score_color, score_label = "red", "HIGH RISK"
    else:
        score_color, score_label = "bold red", "CRITICAL RISK"

    bar_filled = int(score / 5)
    bar = "█" * bar_filled + "░" * (20 - bar_filled)
    console.print(f"\n  Risk Score: [{score_color}]{score}/100  {bar}  {score_label}[/]\n")

    # Summary
    if result.overall_summary:
        console.print(Panel(
            result.overall_summary,
            title="⚖️  Verdict",
            border_style="blue"
        ))
        console.print()

    # Red Flags
    if result.red_flags:
        console.print("[bold red]🚩 Red Flags[/]")
        console.print()
        for i, flag in enumerate(result.red_flags, 1):
            sev_color = {"LOW": "green", "MEDIUM": "yellow", "HIGH": "red", "CRITICAL": "bold red"}[flag.severity]
            emoji = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🔴", "CRITICAL": "💀"}[flag.severity]

            console.print(f"  {i}. [{sev_color}]{emoji} [{flag.severity}][/]")
            console.print(f"     [dim italic]\"{flag.clause}\"[/]")
            console.print(f"     {flag.explanation}")
            console.print()

    # Missing Protections
    if result.missing_protections:
        console.print("[bold yellow]🛡️  Missing Protections[/]")
        console.print()
        for item in result.missing_protections:
            console.print(f"  • {item}")
        console.print()

    # Negotiation Suggestions
    if result.negotiation_suggestions:
        console.print("[bold green]💬 Negotiation Suggestions[/]")
        console.print()
        for i, suggestion in enumerate(result.negotiation_suggestions, 1):
            console.print(f"  {i}. {suggestion}")
        console.print()

    console.print(Panel(
        "[dim]Not legal advice. Always consult a licensed attorney for high-stakes contracts.[/]",
        border_style="dim"
    ))
    console.print()

# ---------------------------------------------------------------------------
# CLI (Typer)
# ---------------------------------------------------------------------------

app = typer.Typer(
    name="pactsafe",
    help="🔍 PactSafe AI — Analyze any freelance contract in seconds.",
    add_completion=False,
)


@app.command()
def analyze(
    file: Optional[Path] = typer.Argument(None, help="Path to contract file (PDF, DOCX, TXT)"),
    text: Optional[str] = typer.Option(None, "--text", "-t", help="Raw contract text (use quotes)"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Anthropic API key (or set ANTHROPIC_API_KEY in .env)"),
    json_output: bool = typer.Option(False, "--json", "-j", help="Output raw JSON instead of rich display"),
):
    """Analyze a contract for red flags, missing protections, and negotiation tips."""

    if not file and not text:
        console.print("[red]Error:[/] Provide a file path or --text with contract content.")
        raise typer.Exit(1)

    analyzer = ContractAnalyzer(api_key=api_key)

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]Analyzing contract with Claude AI...[/]"),
        transient=True,
    ) as progress:
        progress.add_task("analyze")
        if file:
            result = analyzer.analyze_file(str(file))
            source = str(file)
        else:
            result = analyzer.analyze_text(text)
            source = "inline text"

    if json_output:
        import dataclasses
        def serialize(obj):
            if isinstance(obj, Enum):
                return obj.value
            if dataclasses.is_dataclass(obj):
                return dataclasses.asdict(obj)
            return str(obj)
        print(json.dumps(dataclasses.asdict(result), default=serialize, indent=2))
    else:
        render_results(result, source=source)


# ---------------------------------------------------------------------------
# Programmatic usage example (runs when executed directly)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    # If called with CLI args, use the Typer app
    if len(sys.argv) > 1:
        app()
    else:
        # Demo mode — runs a sample analysis
        SAMPLE_CONTRACT = """
        FREELANCE SERVICE AGREEMENT

        This Agreement is entered into between Client ("Company") and Contractor ("Freelancer").

        1. SERVICES: Freelancer agrees to provide web development services as directed by Client.

        2. PAYMENT: Client will pay Freelancer $5,000 upon final delivery and approval. 
           Client may withhold payment if work does not meet expectations, at Client's sole discretion.

        3. TERMINATION: Client may terminate this agreement at any time without cause. 
           Upon termination, no payment will be made for incomplete work, regardless of progress.

        4. INTELLECTUAL PROPERTY: All work product, including preliminary drafts, concepts, 
           and final deliverables, shall become the sole property of Client immediately upon creation,
           before payment is made.

        5. REVISIONS: Freelancer agrees to make unlimited revisions until Client is satisfied.

        6. CONFIDENTIALITY: Freelancer agrees to keep all information confidential indefinitely.

        7. NON-COMPETE: Freelancer agrees not to work with any competitor of Client for 2 years 
           following this agreement, globally.

        8. INDEMNIFICATION: Freelancer shall indemnify Client against all claims, damages, 
           and legal fees arising from Freelancer's work.

        9. GOVERNING LAW: This agreement shall be governed by the laws of Client's choosing.
        """

        print("\n🔍 PactSafe AI — Demo Analysis\n")
        print("Running analysis on sample contract...")
        print("(Set ANTHROPIC_API_KEY in .env or environment to use your key)\n")

        analyzer = ContractAnalyzer()
        result = analyzer.analyze_text(SAMPLE_CONTRACT)
        render_results(result, source="sample contract")

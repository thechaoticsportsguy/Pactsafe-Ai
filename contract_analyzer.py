"""
PactSafe AI - Contract Analyzer (Ollama Edition)
==================================================
100% FREE. No API key needed. Runs locally using Ollama.

Features:
- PDF, DOCX, and TXT file ingestion
- Severity-scored red flags (LOW / MEDIUM / HIGH / CRITICAL)
- Overall contract risk score (0-100)
- Contract type auto-detection
- Clause-by-clause breakdown with exact quotes
- Rich color-coded CLI output
- Retry logic with exponential backoff
- Falls back to Anthropic Claude if ANTHROPIC_API_KEY is set in .env

Usage:
    python3 contract_analyzer.py contract.pdf
    python3 contract_analyzer.py --text "This contract allows termination..."
    python3 contract_analyzer.py --text "..." --json
    python3 contract_analyzer.py --model qwen2.5:0.5b --text "..."
    python3 contract_analyzer.py --claude --text "..."   # use Claude instead
"""

import asyncio
import json
import os
import re
import sys
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

load_dotenv()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_CONTRACT_CHARS = 60_000
MIN_CONTRACT_CHARS = 50
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.5

OLLAMA_BASE_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")


# ---------------------------------------------------------------------------
# Enums & Dataclasses
# ---------------------------------------------------------------------------

class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class RedFlag:
    clause: str
    explanation: str
    severity: Severity


@dataclass
class AnalysisResult:
    contract_type: str
    risk_score: int
    red_flags: list = field(default_factory=list)
    missing_protections: list = field(default_factory=list)
    negotiation_suggestions: list = field(default_factory=list)
    overall_summary: str = ""
    error: Optional[str] = None
    model_used: str = ""


# ---------------------------------------------------------------------------
# File Ingestion
# ---------------------------------------------------------------------------

def extract_text_from_file(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    ext = path.suffix.lower()
    if ext == ".pdf":
        return _extract_pdf(path)
    elif ext in (".docx", ".doc"):
        return _extract_docx(path)
    else:
        return path.read_text(encoding="utf-8", errors="ignore")


def _extract_pdf(path: Path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return "".join(page.extract_text() or "" for page in reader.pages).strip()


def _extract_docx(path: Path) -> str:
    from docx import Document
    doc = Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a senior contract attorney protecting freelancers from exploitative agreements.
Analyze contracts with precision. Be direct. Use plain English — no legal jargon.
Always quote specific contract language when flagging issues."""


def build_prompt(contract_text: str) -> str:
    return f"""Analyze this contract and return ONLY a JSON object — no markdown, no explanation outside JSON.

CONTRACT:
---
{contract_text}
---

Return EXACTLY this JSON:
{{
  "contract_type": "type of contract (e.g. Freelance Web Development Agreement)",
  "risk_score": <integer 0-100>,
  "overall_summary": "2-3 plain-English sentences summarizing the contract's fairness",
  "red_flags": [
    {{
      "clause": "exact quote or close paraphrase from the contract",
      "explanation": "why this is dangerous in plain English",
      "severity": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL"
    }}
  ],
  "missing_protections": ["what's missing and why it matters"],
  "negotiation_suggestions": ["specific actionable suggestion with example language if possible"]
}}

Rules:
- red_flags: 3-7 items ordered by severity (CRITICAL first)
- missing_protections: 3-5 items
- negotiation_suggestions: 3-5 specific, actionable items
- risk_score: 0=perfectly safe, 100=do not sign
- Severity: LOW=minor, MEDIUM=real risk, HIGH=serious harm likely, CRITICAL=don't sign as-is"""


# ---------------------------------------------------------------------------
# Ollama Backend
# ---------------------------------------------------------------------------

class OllamaClient:
    def __init__(self, model: str = DEFAULT_OLLAMA_MODEL, base_url: str = OLLAMA_BASE_URL):
        self.model = model
        self.base_url = base_url.rstrip("/")

    def is_available(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags")
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.status == 200
        except Exception:
            return False

    def chat(self, system: str, user: str) -> str:
        payload = json.dumps({
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {
                "temperature": 0.1,   # Low temp for structured output
                "num_predict": 2048,
            }
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self.base_url}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            return data["message"]["content"]


# ---------------------------------------------------------------------------
# Claude Backend (optional fallback)
# ---------------------------------------------------------------------------

class ClaudeClient:
    def __init__(self, api_key: str):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.async_client = anthropic.AsyncAnthropic(api_key=api_key)

    def chat(self, system: str, user: str) -> str:
        response = self.client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text


# ---------------------------------------------------------------------------
# Core Analyzer
# ---------------------------------------------------------------------------

class ContractAnalyzer:
    """
    Core engine for AI-powered contract analysis.
    Uses Ollama (free, local) by default.
    Optionally falls back to Anthropic Claude if --claude flag or ANTHROPIC_API_KEY is set.
    """

    def __init__(
        self,
        use_claude: bool = False,
        api_key: Optional[str] = None,
        ollama_model: str = DEFAULT_OLLAMA_MODEL,
    ):
        self.use_claude = use_claude
        anthropic_key = api_key or os.getenv("ANTHROPIC_API_KEY")

        if use_claude:
            if not anthropic_key:
                raise ValueError("Claude mode requires ANTHROPIC_API_KEY in .env or --api-key flag.")
            self.backend = ClaudeClient(anthropic_key)
            self.model_name = "claude-opus-4-5"
        else:
            self.backend = OllamaClient(model=ollama_model)
            self.model_name = ollama_model
            if not self.backend.is_available():
                raise RuntimeError(
                    "Ollama is not running. Start it with: ollama serve\n"
                    "Or use --claude with an Anthropic API key."
                )

    def analyze_text(self, contract_text: str) -> AnalysisResult:
        return asyncio.run(self.analyze_text_async(contract_text))

    def analyze_file(self, file_path: str) -> AnalysisResult:
        try:
            text = extract_text_from_file(file_path)
        except (FileNotFoundError, ValueError) as e:
            return AnalysisResult(contract_type="Unknown", risk_score=0, error=str(e))
        return self.analyze_text(text)

    async def analyze_text_async(self, contract_text: str) -> AnalysisResult:
        validated = self._validate_input(contract_text)
        if isinstance(validated, AnalysisResult):
            return validated
        safe_text = self._truncate(validated)
        return await self._run_with_retry(safe_text)

    def _validate_input(self, text: str):
        if not text or not isinstance(text, str):
            return AnalysisResult(contract_type="Unknown", risk_score=0,
                                  error="Contract text must be a non-empty string.")
        trimmed = text.strip()
        if len(trimmed) < MIN_CONTRACT_CHARS:
            return AnalysisResult(contract_type="Unknown", risk_score=0,
                                  error=f"Contract too short (min {MIN_CONTRACT_CHARS} chars).")
        return trimmed

    def _truncate(self, text: str) -> str:
        if len(text) > MAX_CONTRACT_CHARS:
            return text[:MAX_CONTRACT_CHARS] + "\n\n[Contract truncated for analysis]"
        return text

    async def _run_with_retry(self, contract_text: str) -> AnalysisResult:
        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                raw = self.backend.chat(SYSTEM_PROMPT, build_prompt(contract_text))
                result = self._parse_response(raw)
                result.model_used = self.model_name
                return result
            except Exception as e:
                last_error = str(e)
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_BASE_DELAY * (2 ** (attempt - 1)))

        return AnalysisResult(
            contract_type="Unknown", risk_score=0,
            error=f"Analysis failed after {MAX_RETRIES} attempts: {last_error}",
            model_used=self.model_name,
        )

    def _parse_response(self, raw: str) -> AnalysisResult:
        cleaned = raw.strip()

        # Strip markdown fences
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
        if fence:
            cleaned = fence.group(1).strip()

        # Parse JSON
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                try:
                    data = json.loads(match.group(0))
                except json.JSONDecodeError:
                    return AnalysisResult(contract_type="Unknown", risk_score=0,
                                          error="Could not parse AI response. Try again.")
            else:
                return AnalysisResult(contract_type="Unknown", risk_score=0,
                                      error=f"Unexpected AI response format: {cleaned[:200]}")

        # Build red flags
        red_flags = []
        for item in (data.get("red_flags") or [])[:8]:
            try:
                sev = Severity((item.get("severity") or "MEDIUM").upper())
            except ValueError:
                sev = Severity.MEDIUM
            red_flags.append(RedFlag(
                clause=str(item.get("clause") or "").strip(),
                explanation=str(item.get("explanation") or "").strip(),
                severity=sev,
            ))

        sev_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3}
        red_flags.sort(key=lambda f: sev_order.get(f.severity, 99))

        return AnalysisResult(
            contract_type=str(data.get("contract_type") or "Unknown Contract").strip(),
            risk_score=max(0, min(100, int(data.get("risk_score") or 50))),
            overall_summary=str(data.get("overall_summary") or "").strip(),
            red_flags=red_flags,
            missing_protections=[str(x).strip() for x in (data.get("missing_protections") or [])[:6] if x],
            negotiation_suggestions=[str(x).strip() for x in (data.get("negotiation_suggestions") or [])[:6] if x],
        )


# ---------------------------------------------------------------------------
# Rich CLI Display
# ---------------------------------------------------------------------------

console = Console()


def render_results(result: AnalysisResult, source: str = "") -> None:
    console.print()

    if result.error:
        console.print(Panel(f"[bold red]❌ Error:[/] {result.error}", title="Analysis Failed", border_style="red"))
        return

    # Header
    lines = [f"[bold white]{result.contract_type}[/]"]
    if source:
        lines.append(f"[dim]Source: {source}[/]")
    if result.model_used:
        lines.append(f"[dim]Model: {result.model_used}[/]")
    console.print(Panel("\n".join(lines), title="📄 PactSafe AI", border_style="cyan"))

    # Risk score bar
    score = result.risk_score
    if score <= 30:
        color, label = "green", "LOW RISK"
    elif score <= 60:
        color, label = "yellow", "MODERATE RISK"
    elif score <= 80:
        color, label = "red", "HIGH RISK"
    else:
        color, label = "bold red", "CRITICAL RISK"

    bar = "█" * int(score / 5) + "░" * (20 - int(score / 5))
    console.print(f"\n  Risk Score: [{color}]{score}/100  {bar}  {label}[/]\n")

    # Summary
    if result.overall_summary:
        console.print(Panel(result.overall_summary, title="⚖️  Verdict", border_style="blue"))
        console.print()

    # Red Flags
    if result.red_flags:
        console.print("[bold red]🚩 Red Flags[/]\n")
        sev_colors = {"LOW": "green", "MEDIUM": "yellow", "HIGH": "red", "CRITICAL": "bold red"}
        sev_emojis = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🔴", "CRITICAL": "💀"}
        for i, flag in enumerate(result.red_flags, 1):
            c = sev_colors.get(flag.severity.value, "white")
            e = sev_emojis.get(flag.severity.value, "⚠️")
            console.print(f"  {i}. [{c}]{e} [{flag.severity.value}][/]")
            if flag.clause:
                console.print(f'     [dim italic]"{flag.clause}"[/]')
            console.print(f"     {flag.explanation}\n")

    # Missing Protections
    if result.missing_protections:
        console.print("[bold yellow]🛡️  Missing Protections[/]\n")
        for item in result.missing_protections:
            console.print(f"  • {item}")
        console.print()

    # Negotiation Suggestions
    if result.negotiation_suggestions:
        console.print("[bold green]💬 Negotiation Suggestions[/]\n")
        for i, s in enumerate(result.negotiation_suggestions, 1):
            console.print(f"  {i}. {s}")
        console.print()

    console.print(Panel("[dim]Not legal advice. Consult a licensed attorney for high-stakes contracts.[/]", border_style="dim"))
    console.print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

app = typer.Typer(name="pactsafe", help="🔍 PactSafe AI — Free local contract analysis using Ollama.", add_completion=False)


@app.command()
def analyze(
    file: Optional[Path] = typer.Argument(None, help="Contract file (PDF, DOCX, TXT)"),
    text: Optional[str] = typer.Option(None, "--text", "-t", help="Raw contract text"),
    model: str = typer.Option(DEFAULT_OLLAMA_MODEL, "--model", "-m", help="Ollama model to use"),
    use_claude: bool = typer.Option(False, "--claude", help="Use Anthropic Claude instead of Ollama"),
    api_key: Optional[str] = typer.Option(None, "--api-key", "-k", help="Anthropic API key (or set in .env)"),
    json_out: bool = typer.Option(False, "--json", "-j", help="Output raw JSON"),
):
    """Analyze a contract for red flags, missing protections, and negotiation tips. Free with Ollama."""

    if not file and not text:
        console.print("[red]Error:[/] Provide a file path or use --text")
        raise typer.Exit(1)

    try:
        analyzer = ContractAnalyzer(use_claude=use_claude, api_key=api_key, ollama_model=model)
    except (ValueError, RuntimeError) as e:
        console.print(f"[red]Setup error:[/] {e}")
        raise typer.Exit(1)

    with Progress(SpinnerColumn(), TextColumn(f"[bold cyan]Analyzing with {analyzer.model_name}...[/]"), transient=True) as p:
        p.add_task("analyze")
        result = analyzer.analyze_file(str(file)) if file else analyzer.analyze_text(text)

    if json_out:
        import dataclasses
        def serialize(obj):
            if isinstance(obj, Enum):
                return obj.value
            if dataclasses.is_dataclass(obj):
                return dataclasses.asdict(obj)
            return str(obj)
        print(json.dumps(dataclasses.asdict(result), default=serialize, indent=2))
    else:
        render_results(result, source=str(file) if file else "inline text")


# ---------------------------------------------------------------------------
# Demo / direct run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) > 1:
        app()
    else:
        # Demo with a sample bad contract
        SAMPLE = """
        FREELANCE SERVICE AGREEMENT

        1. PAYMENT: Client will pay upon final delivery. Client may withhold payment
           if work does not meet expectations, at Client's sole discretion.

        2. TERMINATION: Client may terminate this agreement at any time without cause.
           No payment will be made for incomplete work regardless of progress.

        3. INTELLECTUAL PROPERTY: All work product shall become the sole property of
           Client immediately upon creation, before payment is made.

        4. REVISIONS: Freelancer agrees to make unlimited revisions until Client is satisfied.

        5. NON-COMPETE: Freelancer agrees not to work with any competitor of Client for
           2 years following this agreement, globally.

        6. INDEMNIFICATION: Freelancer shall indemnify Client against all claims and legal fees.
        """

        console.print("\n[bold cyan]🔍 PactSafe AI — Demo Mode[/]")
        console.print(f"[dim]Using model: {DEFAULT_OLLAMA_MODEL} via Ollama (free, local)[/]\n")

        try:
            analyzer = ContractAnalyzer()
            result = analyzer.analyze_text(SAMPLE)
            render_results(result, source="sample contract")
        except RuntimeError as e:
            console.print(f"[red]{e}[/]")
            console.print("\n[dim]Start Ollama with: ollama serve[/]")

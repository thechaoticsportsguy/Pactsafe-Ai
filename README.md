# PactSafe AI 🔍

**AI-powered contract analyzer for freelancers.** Upload any contract and get instant, plain-English analysis — no lawyer required.

Built with Python + Anthropic Claude.

---

## Features

- 📄 **PDF, DOCX & TXT support** — drop in any contract file
- 💀 **Severity-scored red flags** — CRITICAL / HIGH / MEDIUM / LOW with exact contract quotes
- 📊 **Risk score (0–100)** — calibrated overall danger rating
- 🔍 **Contract type detection** — auto-identifies agreement type
- 🛡️ **Missing protections** — what should be there but isn't
- 💬 **Negotiation suggestions** — specific language to propose
- 🎨 **Rich color CLI** — beautiful terminal output
- 🔁 **Retry + backoff** — handles rate limits gracefully
- 🔐 **.env support** — keep your API key safe

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your API key
cp .env.example .env
# Edit .env and add your Anthropic API key

# 3. Analyze a contract file
python contract_analyzer.py my_contract.pdf

# 4. Or paste raw text
python contract_analyzer.py --text "This agreement allows termination at any time..."

# 5. Get JSON output
python contract_analyzer.py my_contract.pdf --json
```

---

## CLI Usage

```
Usage: contract_analyzer.py [OPTIONS] [FILE]

Arguments:
  FILE  Path to contract file (PDF, DOCX, TXT)

Options:
  --text   -t  Raw contract text (use quotes)
  --api-key -k  Anthropic API key (or set in .env)
  --json   -j  Output raw JSON instead of rich display
  --help       Show this message and exit.
```

---

## Programmatic Usage

```python
from contract_analyzer import ContractAnalyzer

analyzer = ContractAnalyzer()  # reads ANTHROPIC_API_KEY from .env

# From file
result = analyzer.analyze_file("contract.pdf")

# From text
result = analyzer.analyze_text("This agreement states...")

# Async
result = await analyzer.analyze_text_async("This agreement states...")

print(f"Risk Score: {result.risk_score}/100")
print(f"Contract Type: {result.contract_type}")

for flag in result.red_flags:
    print(f"[{flag.severity}] {flag.explanation}")
```

---

## Output Structure

```python
AnalysisResult(
    contract_type = "Freelance Web Development Agreement",
    risk_score    = 78,          # 0-100
    overall_summary = "...",
    red_flags = [
        RedFlag(
            clause      = "exact quote from contract",
            explanation = "why this is dangerous",
            severity    = Severity.CRITICAL  # LOW / MEDIUM / HIGH / CRITICAL
        ),
        ...
    ],
    missing_protections    = ["...", "..."],
    negotiation_suggestions = ["...", "..."],
)
```

---

## Stack

- **Python 3.11+**
- **Anthropic SDK** (`claude-opus-4-5`)
- **Rich** — terminal UI
- **Typer** — CLI framework
- **pypdf** — PDF parsing
- **python-docx** — DOCX parsing
- **python-dotenv** — env management

---

## License

MIT

---

*Not legal advice. For high-stakes contracts, always consult a licensed attorney.*

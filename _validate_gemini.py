"""
Phase 3 validation script — runs the four Gemini 2.5 tests and prints JSON.

Loads gemini_client.py via importlib to avoid the app.services.llm package
__init__.py which chains into optional provider SDKs we don't need here.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

REPO_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(REPO_ROOT / "apps" / "api"))

from app.config import (  # noqa: E402
    list_gemini_25_models,
    require_gemini_api_key,
    test_api_key,
)


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_gemini_module = _load_module(
    "gemini_client_isolated",
    REPO_ROOT / "apps" / "api" / "app" / "services" / "llm" / "gemini_client.py",
)
ModelClient = _gemini_module.ModelClient


async def run() -> dict:
    out: dict = {}

    print("== test_api_key() ==", flush=True)
    out["test_api_key"] = bool(test_api_key())

    print("\n== list_gemini_25_models() ==", flush=True)
    models_25 = list_gemini_25_models()
    out["list_gemini_25_models"] = models_25
    for m in models_25:
        print(" -", m)

    api_key = require_gemini_api_key()
    client = ModelClient(api_key=api_key, default_model="gemini-2.5-pro")

    # --- Test A: flash returns "OK" ---
    print("\n== Test A: flash -> 'OK' ==", flush=True)
    t0 = time.perf_counter()
    a_result = await client.generate(
        prompt="Return only the word 'OK'. No punctuation, no explanation.",
        model="flash",
    )
    a_latency = time.perf_counter() - t0
    a_stripped = a_result.strip().strip("'").strip('"').strip(".")
    a_pass = a_stripped.upper() == "OK"
    a_meta = dict(client.last_response_metadata)
    print(f"  result={a_result!r} latency={a_latency:.2f}s meta={a_meta}")
    out["test_a"] = {
        "pass": a_pass,
        "latency_sec": round(a_latency, 3),
        "resolved_model": a_meta.get("resolved_model"),
        "raw_result": a_result,
        "total_token_count": a_meta.get("total_token_count"),
    }

    # --- Test B: pro -> Python function with 'def' ---
    print("\n== Test B: pro -> Python function ==", flush=True)
    t0 = time.perf_counter()
    b_result = await client.generate(
        prompt="Write a Python function that adds two numbers. Just code, no prose.",
        model="pro",
    )
    b_latency = time.perf_counter() - t0
    b_pass = "def" in b_result
    b_meta = dict(client.last_response_metadata)
    print(f"  latency={b_latency:.2f}s meta={b_meta}")
    print(f"  snippet={b_result[:160]!r}")
    out["test_b"] = {
        "pass": b_pass,
        "latency_sec": round(b_latency, 3),
        "resolved_model": b_meta.get("resolved_model"),
        "total_token_count": b_meta.get("total_token_count"),
        "prompt_token_count": b_meta.get("prompt_token_count"),
        "candidates_token_count": b_meta.get("candidates_token_count"),
    }

    # --- Test C: unknown model -> fallback chain ---
    print("\n== Test C: unknown model 'gemini-99-ultra' -> fallback ==", flush=True)
    c_crashed = False
    c_result = ""
    c_meta: dict = {}
    c_latency = 0.0
    try:
        t0 = time.perf_counter()
        c_result = await client.generate(
            prompt="Say hello in one word.",
            model="gemini-99-ultra",
        )
        c_latency = time.perf_counter() - t0
        c_meta = dict(client.last_response_metadata)
    except Exception as exc:  # pragma: no cover
        c_crashed = True
        c_meta = {"error": f"{type(exc).__name__}: {exc}"}

    c_has_text = bool(c_result.strip())
    c_pass = (not c_crashed) and c_has_text
    print(f"  result={c_result[:80]!r} latency={c_latency:.2f}s meta={c_meta}")
    out["test_c"] = {
        "pass": c_pass,
        "crashed": c_crashed,
        "latency_sec": round(c_latency, 3),
        "resolved_model": c_meta.get("resolved_model"),
        "total_token_count": c_meta.get("total_token_count"),
        "raw_result_head": c_result[:120],
    }

    # --- Benchmark: pro vs flash, same Test B prompt ---
    print("\n== Benchmark: pro vs flash ==", flush=True)
    bench_prompt = "Write a Python function that adds two numbers. Just code, no prose."
    bench = {}
    for variant in ("pro", "flash"):
        t0 = time.perf_counter()
        text = await client.generate(prompt=bench_prompt, model=variant)
        lat = time.perf_counter() - t0
        m = dict(client.last_response_metadata)
        bench[variant] = {
            "latency_sec": round(lat, 3),
            "resolved_model": m.get("resolved_model"),
            "total_token_count": m.get("total_token_count"),
            "prompt_token_count": m.get("prompt_token_count"),
            "candidates_token_count": m.get("candidates_token_count"),
            "output_len_chars": len(text),
        }
        print(f"  {variant}: {bench[variant]}")
    out["benchmark"] = bench

    return out


if __name__ == "__main__":
    result = asyncio.run(run())
    print("\n=== JSON ===")
    print(json.dumps(result, indent=2, default=str))

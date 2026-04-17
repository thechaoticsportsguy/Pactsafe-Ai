// Runtime sanity check for locateQuote. No test framework on the web app,
// so this is a standalone script runnable with `node apps/web/lib/locate-quote.check.mjs`.
// Kept out of the build (`.mjs` not imported anywhere), just for local verification.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// Hand-port the TS source since node doesn't transpile `.ts` directly.
// If you edit locate-quote.ts, mirror the edit here.

const MIN_CHUNK_LEN = 5;
function locateQuote(documentText, quote) {
  if (!documentText || !quote) return null;
  const chunks = quote
    .split(/\.{3,}|…/g)
    .map((c) => c.trim())
    .filter((c) => c.length >= MIN_CHUNK_LEN);
  if (chunks.length === 0) return null;
  let cursor = 0;
  let firstStart = -1;
  let lastEnd = -1;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let idx = documentText.indexOf(chunk, cursor);
    if (idx === -1) {
      if (i === 0) {
        const lowerDoc = documentText.toLowerCase();
        const lowerChunk = chunk.toLowerCase();
        const ci = lowerDoc.indexOf(lowerChunk, cursor);
        if (ci === -1) return null;
        idx = ci;
      } else {
        return null;
      }
    }
    if (firstStart === -1) firstStart = idx;
    lastEnd = idx + chunk.length;
    cursor = lastEnd;
  }
  if (firstStart === -1 || lastEnd <= firstStart) return null;
  return { start: firstStart, end: lastEnd };
}

function assert(label, cond) {
  if (!cond) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

const doc = `Section 5.1 Intellectual Property.
You hereby irrevocably assign to the Platform all right, title, and
interest in and to any and all work product, including pre-existing
materials, that you create in connection with this Agreement.

Section 14.2 Limitation of Liability.
In no event shall the Platform's total aggregate liability exceed the
lesser of (a) $500 or (b) the fees actually paid to you in the three
months preceding the event giving rise to the claim.`;

// (a) Exact contiguous match
const r1 = locateQuote(doc, "all right, title, and\ninterest in and to any and all work product");
assert("exact contiguous match returns range", r1 !== null);
assert("exact match start is at assignment clause", doc.slice(r1.start, r1.end).startsWith("all right"));

// (b) Ellipsis-split match (two chunks, in order)
const r2 = locateQuote(doc, "total aggregate liability exceed the...fees actually paid to you");
assert("ellipsis-split match returns range", r2 !== null);
assert(
  "ellipsis span covers from first chunk to last chunk",
  r2 !== null && r2.end - r2.start > 40,
);

// Unicode ellipsis variant
const r2b = locateQuote(doc, "total aggregate liability exceed the…fees actually paid to you");
assert("unicode ellipsis match returns range", r2b !== null);

// (c) Not-found returns null
const r3 = locateQuote(doc, "this phrase does not appear anywhere in the document at all");
assert("not-found returns null", r3 === null);

// (d) Case-insensitive fallback on first chunk
const r4 = locateQuote(doc, "INTELLECTUAL PROPERTY.\nYou hereby irrevocably assign");
assert("case-insensitive fallback finds the clause", r4 !== null);
assert(
  "case-insensitive start is at the heading",
  r4 !== null && doc.slice(r4.start, r4.end).toLowerCase().startsWith("intellectual property"),
);

// Extra: second-chunk case-insensitive should NOT match (we only fall back on first)
const r5 = locateQuote(doc, "You hereby irrevocably assign...FEES ACTUALLY PAID TO YOU");
assert(
  "case-insensitive fallback is first-chunk only (second-chunk caps should fail)",
  r5 === null,
);

// Extra: empty inputs
assert("empty doc returns null", locateQuote("", "anything") === null);
assert("empty quote returns null", locateQuote(doc, "") === null);
assert("all-whitespace quote returns null", locateQuote(doc, "   ...   ") === null);

// Extra: very short chunk (below MIN_CHUNK_LEN) dropped
assert(
  "short-only chunks return null (dropped by length filter)",
  locateQuote(doc, "a...b...c") === null,
);

console.log(process.exitCode ? "\nCHECK FAILED" : "\nCHECK OK");

/**
 * Locate a v2 red-flag `quote` inside the full document text.
 *
 * Mirrors the backend citation validator's ellipsis-tolerant matching
 * (rapidfuzz partial_ratio with chunk-order preservation) but simplified
 * for the frontend where we only need exact substring + case-insensitive
 * fallback — the validator already rejected anything that didn't fuzzy-
 * match at >=85, so by the time a flag reaches the UI the quote is known
 * to appear in the source.
 *
 * Handles:
 *  - Plain contiguous quote: indexOf exact, then toLowerCase fallback.
 *  - Ellipsis-split quote ("chunk1 ... chunk2"): each chunk must appear
 *    in the document in order. The span spans from first-chunk-start to
 *    last-chunk-end, so any painting between them is acceptable (the
 *    intervening text is implicitly included in the highlight range).
 *
 * Returns the absolute character offsets in `documentText` so the
 * ClauseHighlighter segment builder can paint them, or `null` if the
 * quote can't be located — in which case the caller should render the
 * flag card without a jump target.
 */

/**
 * Quote chunks shorter than this are discarded before matching. Short
 * fragments ("the", "of") would match in dozens of places and make the
 * locator useless. Five chars is the threshold the backend citation
 * validator uses as well.
 */
const MIN_CHUNK_LEN = 5;

export interface LocatedRange {
  start: number;
  end: number;
}

/**
 * Return [start, end] character offsets of `quote` inside `documentText`,
 * or `null` if the quote cannot be located.
 *
 * See module docstring for algorithm.
 */
export function locateQuote(
  documentText: string,
  quote: string,
): LocatedRange | null {
  if (!documentText || !quote) return null;

  // Split on runs of three-or-more dots OR the single-char ellipsis. Trim
  // each chunk, drop anything shorter than MIN_CHUNK_LEN so we don't try
  // to match noise like " " or "," — those would pass indexOf but locate
  // to the wrong place.
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
    // Exact match first.
    let idx = documentText.indexOf(chunk, cursor);

    if (idx === -1) {
      // Case-insensitive fallback ONLY on the first chunk, so we don't
      // stitch together unrelated case-variant fragments from different
      // parts of the document.
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

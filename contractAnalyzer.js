/**
 * ContractAnalyzer - Core AI engine for freelance contract analysis
 * Uses Anthropic Claude API to identify red flags, missing protections,
 * and negotiation suggestions from raw contract text.
 */

import Anthropic from "@anthropic-ai/sdk";

// Token limits — Claude handles ~100k tokens but we cap for cost/speed
const MAX_CONTRACT_CHARS = 40000; // ~10k tokens, plenty for any real contract
const MIN_CONTRACT_CHARS = 50;

const SYSTEM_PROMPT = `You are a contract lawyer reviewing this agreement for a freelancer.

Analyze the contract and output:
 1. Red flag clauses (explain simply)
 2. Missing protections
 3. 3 specific negotiation suggestions

Be direct. Use plain English. No legal jargon.`;

const USER_PROMPT_TEMPLATE = (contractText) => `
Here is the contract to analyze:

---
${contractText}
---

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "redFlags": ["...", "..."],
  "missingProtections": ["...", "..."],
  "negotiationSuggestions": ["...", "..."]
}

Each array must have 3–7 short, plain-English bullet-style items.
`;

export class ContractAnalyzer {
  constructor(apiKey) {
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      throw new Error("ContractAnalyzer: A valid Anthropic API key is required.");
    }

    this.client = new Anthropic({ apiKey: apiKey.trim() });
  }

  /**
   * Analyze a contract and return structured feedback.
   * @param {string} contractText - Raw text of the contract
   * @returns {Promise<{ redFlags: string[], missingProtections: string[], negotiationSuggestions: string[] }>}
   */
  async analyze(contractText) {
    // --- Input validation ---
    if (!contractText || typeof contractText !== "string") {
      return this._error("Contract text must be a non-empty string.");
    }

    const trimmed = contractText.trim();
    if (trimmed.length < MIN_CONTRACT_CHARS) {
      return this._error(
        `Contract text is too short (minimum ${MIN_CONTRACT_CHARS} characters). Please provide the full contract.`
      );
    }

    // --- Truncate very long contracts to stay within sensible limits ---
    const safeText =
      trimmed.length > MAX_CONTRACT_CHARS
        ? trimmed.slice(0, MAX_CONTRACT_CHARS) + "\n\n[Contract truncated for analysis]"
        : trimmed;

    // --- Call Claude with 1 retry on failure ---
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await this._callClaude(safeText);
        return result;
      } catch (err) {
        lastError = err;
        if (attempt === 1) {
          // Brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }

    return this._error(`API request failed after 2 attempts: ${lastError?.message ?? "Unknown error"}`);
  }

  /**
   * Make the Claude API call and parse the response.
   * @private
   */
  async _callClaude(contractText) {
    let response;

    try {
      response = await this.client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: USER_PROMPT_TEMPLATE(contractText),
          },
        ],
      });
    } catch (err) {
      // Surface API-level errors (auth, network, rate limit, timeout)
      const message = err?.message ?? "Unknown API error";
      throw new Error(`Claude API error: ${message}`);
    }

    // Extract text content from Claude's response
    const rawText = response?.content?.[0]?.text ?? "";
    if (!rawText) {
      throw new Error("Claude returned an empty response.");
    }

    return this._parseResponse(rawText);
  }

  /**
   * Parse Claude's response into the required structured format.
   * Handles cases where Claude wraps JSON in markdown code fences.
   * @private
   */
  _parseResponse(rawText) {
    // Strip markdown code fences if present (```json ... ```)
    let cleaned = rawText.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    // Attempt JSON parse
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: try to extract a JSON object manually if parse fails
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return this._error("Could not parse Claude's response as JSON. Try again.");
        }
      } else {
        return this._error("Claude returned an unexpected response format. Try again.");
      }
    }

    // Normalize and validate each field
    const normalize = (field, fallback) => {
      const arr = Array.isArray(parsed?.[field]) ? parsed[field] : [];
      const cleaned = arr
        .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
        .filter(Boolean)
        .slice(0, 7); // Cap at 7 items max

      // Ensure at least the minimum content
      return cleaned.length > 0 ? cleaned : [fallback];
    };

    return {
      redFlags: normalize("redFlags", "No specific red flags identified."),
      missingProtections: normalize("missingProtections", "No missing protections identified."),
      negotiationSuggestions: normalize("negotiationSuggestions", "No specific suggestions available."),
    };
  }

  /**
   * Return a clean error object that matches the output shape.
   * Never throws — always returns a usable object.
   * @private
   */
  _error(message) {
    return {
      error: message,
      redFlags: [],
      missingProtections: [],
      negotiationSuggestions: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Example usage
// ---------------------------------------------------------------------------

const analyzer = new ContractAnalyzer("YOUR_API_KEY");

const sampleText = `This agreement allows termination at any time without payment.
The client retains full ownership of all work immediately.
No revision limits are specified.`;

const result = await analyzer.analyze(sampleText);

console.log(result);

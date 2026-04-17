/**
 * Display labels for the v2 pipeline `document_type` enum.
 *
 * Mirrors the backend's `DOCUMENT_TYPE_LABELS` in
 * `apps/api/app/services/v2_pipeline.py`. The mapping is hardcoded
 * rather than derived via string manipulation because naive title-casing
 * turns "saas_terms" into "Saas Terms" and drops "Agreement" from
 * "contractor_platform" — the whole point of the lookup is to control
 * the exact phrasing the user sees.
 *
 * Keep in sync with the backend dict. If a new document_type is added
 * there, add the matching label here or users will see the generic
 * "Contract" fallback.
 */

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contractor_platform: "Contractor Platform Agreement",
  freelance_sow: "Freelance Services Agreement",
  employment: "Employment Agreement",
  nda: "Non-Disclosure Agreement",
  saas_terms: "SaaS Terms of Service",
  service_agreement: "Service Agreement",
  lease: "Lease Agreement",
  purchase_order: "Purchase Order",
  other: "Contract",
};

/**
 * Resolve a v2 document_type enum value to its human-readable label.
 * Falls back to "Contract" for unknown or missing types (legacy
 * responses without the metadata block).
 */
export function getDocumentTypeLabel(type: string | undefined | null): string {
  if (!type) return "Contract";
  return DOCUMENT_TYPE_LABELS[type] ?? "Contract";
}

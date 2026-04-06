/**
 * Canonical labels for shipments.product_classification (align with frontend lib/product-classification).
 */

const LEGACY_TO_CURRENT: Record<string, string> = {
  Chemical: "Chemical",
  Checmical: "Chemical",
  Packaging: "Package",
};

/** Normalize stored value for API JSON (list/detail). */
export function normalizeProductClassificationForApi(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = value.trim();
  if (!v) return null;
  return LEGACY_TO_CURRENT[v] ?? v;
}

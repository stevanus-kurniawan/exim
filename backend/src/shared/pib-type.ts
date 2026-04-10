/**
 * PIB type normalization — keep in sync with frontEnd/lib/pib-type-label.ts (isPibTypeBc23).
 */

const PIB_TYPE_CANONICAL: Record<string, string> = {
  "PIB 2.3": "BC 2.3",
  "PIB 2.0": "BC 2.0",
  "BC 2.3": "BC 2.3",
  "BC 2.0": "BC 2.0",
  "BC 23": "BC 2.3",
  "BC 20": "BC 2.0",
  "Consignee Note": "Consignment Note",
};

/** PIB BC 2.3: BM / PPN / PPH not required for customs clearance validation. */
export function isPibTypeBc23(stored: string | null | undefined): boolean {
  const v = stored != null ? String(stored).trim() : "";
  if (!v) return false;
  const canonical = PIB_TYPE_CANONICAL[v] ?? v;
  return canonical === "BC 2.3";
}

/**
 * Folder name under Year/PT/Plant for customs filing (BC 2.0 vs BC 2.3).
 * Unknown non-empty values are sanitized; empty → Unknown_PIB.
 */
export function pibTypeStorageFolderName(stored: string | null | undefined): string {
  const v = stored != null ? String(stored).trim() : "";
  if (!v) return "Unknown_PIB";
  const canonical = PIB_TYPE_CANONICAL[v] ?? v;
  if (canonical === "BC 2.0" || canonical === "BC 2.3") return canonical;
  return canonical.replace(/[/\\:*?"<>|\s]+/g, "_").replace(/_+/g, "_").slice(0, 80) || "Other_PIB";
}

/** Legacy `pib_type` values stored before label rename; map to current labels. */

const PIB_TYPE_LEGACY_TO_CURRENT: Record<string, string> = {
  "PIB 2.3": "BC 23",
  "PIB 2.0": "BC 20",
  "BC 2.3": "BC 23",
  "BC 2.0": "BC 20",
  "Consignee Note": "Consignment Note",
};

export function displayPibTypeLabel(stored: string | null | undefined): string {
  const v = stored != null && String(stored).trim() !== "" ? String(stored).trim() : "";
  if (!v) return "—";
  return PIB_TYPE_LEGACY_TO_CURRENT[v] ?? v;
}

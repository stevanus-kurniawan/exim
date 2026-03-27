/** Shared Yes/No field helpers for shipment & PO (legacy free text still displays as-is). */

export type YesNoValue = "Yes" | "No";

export function parseYesNoSelectValue(v: string | null | undefined): "" | YesNoValue {
  if (v == null || String(v).trim() === "") return "";
  const t = String(v).trim();
  if (/^yes$/i.test(t)) return "Yes";
  if (/^no$/i.test(t)) return "No";
  return "";
}

export function formatYesNoOrLegacy(v: string | null | undefined): string {
  if (v == null || String(v).trim() === "") return "—";
  const t = String(v).trim();
  if (/^yes$/i.test(t)) return "Yes";
  if (/^no$/i.test(t)) return "No";
  return t;
}

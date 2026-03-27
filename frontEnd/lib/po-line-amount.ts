/**
 * PO line amount for shipment duties / totals: Value × Qty × Rate.
 * API field name is `kurs`; in the UI we call it Rate. Missing rate defaults to 1.
 */
export function poLineAmountValueQtyRate(
  value: number | null | undefined,
  qty: number | null | undefined,
  /** Line rate (API: `kurs`). */
  kurs: number | null | undefined
): number {
  const v = Number(value);
  const q = Number(qty);
  const k = kurs != null && !Number.isNaN(Number(kurs)) ? Number(kurs) : 1;
  const vn = Number.isFinite(v) ? v : 0;
  const qn = Number.isFinite(q) ? q : 0;
  return vn * qn * k;
}

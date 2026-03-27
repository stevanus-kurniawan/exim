/**
 * Shared date/time formatter for consistent display (cursor-rules: reuse, no duplication).
 */

/**
 * Calendar day as "day Month year" (e.g. 27 March 2026). Uses local calendar date for YYYY-MM-DD
 * strings so the day does not shift across timezones. For shipment schedule fields (ETD, ETA, ATD,
 * ATA, delivered at) and anywhere else date-only semantics apply.
 */
export function formatDayMonthYear(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  const s = String(value).trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  let d: Date;
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
      d = new Date(s);
    } else {
      d = new Date(y, m, day);
    }
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

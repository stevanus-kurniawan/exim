/**
 * Shared date/time formatter for consistent display (cursor-rules: reuse, no duplication).
 */

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

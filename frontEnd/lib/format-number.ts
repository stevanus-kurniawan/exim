/**
 * Format numbers with exactly 2 digits after the decimal point.
 * Use for display only; does not round the underlying value.
 */

/**
 * Format a number for display with 2 decimal places. Returns "—" for null/undefined/NaN.
 */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Round a number to 2 decimal places (for storing user input).
 */
export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

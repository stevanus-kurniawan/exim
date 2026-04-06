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

/** Remove thousands separators for parsing. */
export function stripCommaThousands(s: string): string {
  return s.replace(/,/g, "");
}

/**
 * Normalize price input: digits, optional single decimal, with comma as thousands separator (en-US style).
 * @param maxFractionDigits when set, caps digits after the decimal (e.g. 2 for money fields).
 */
export function formatPriceInputWithCommas(raw: string, maxFractionDigits?: number): string {
  const noComma = stripCommaThousands(raw);
  if (noComma === "") return "";

  let cleaned = "";
  let dotSeen = false;
  for (const ch of noComma) {
    if (ch >= "0" && ch <= "9") cleaned += ch;
    else if (ch === "." && !dotSeen) {
      cleaned += ".";
      dotSeen = true;
    }
  }
  if (cleaned === "") return "";

  const parts = cleaned.split(".");
  const intRaw = parts[0] ?? "";
  let frac = parts.slice(1).join("").replace(/\./g, "");
  if (maxFractionDigits != null && maxFractionDigits >= 0) {
    frac = frac.slice(0, maxFractionDigits);
  }

  if (intRaw === "" && frac === "") {
    return dotSeen ? "." : "";
  }

  let intFmt = "";
  if (intRaw !== "") {
    const n = Number(intRaw);
    if (!Number.isFinite(n)) return "";
    intFmt = n.toLocaleString("en-US", { maximumFractionDigits: 0, useGrouping: true });
  }

  if (dotSeen) {
    if (intRaw === "" && frac !== "") return `.${frac}`;
    if (frac !== "") return `${intFmt}.${frac}`;
    if (cleaned.endsWith(".")) return intFmt ? `${intFmt}.` : ".";
    return intFmt;
  }

  return intFmt;
}

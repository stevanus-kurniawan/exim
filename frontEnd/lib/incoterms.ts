/**
 * Standard Incoterms 2020 codes — same list as PO create form dropdown.
 * Keep in sync with purchase order UI.
 */
export const INCOTERM_OPTIONS = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DPU",
  "DAP",
  "DDP",
] as const;

export type IncotermCode = (typeof INCOTERM_OPTIONS)[number];

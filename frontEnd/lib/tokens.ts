/**
 * Design tokens loader — frontend/design-tokens.json is the source of truth.
 * Resolves semantic references (e.g. {color.primitive.brand.red.primary}) to primitive values.
 * Do not add or invent tokens; use only what is defined in design-tokens.json.
 */

import designTokens from "../design-tokens.json";

type TokenNode = { value?: string; type?: string; [key: string]: unknown };
/** Nested token tree; avoid circular type by using Record<string, unknown> for recursion. */
type TokenTree = Record<string, TokenNode | Record<string, unknown>>;

const ROOT = designTokens as TokenTree;

/** Get a nested value by path (e.g. "color.primitive.brand.red.primary") */
function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (current != null && typeof current === "object" && "value" in current) {
    return (current as TokenNode).value;
  }
  return undefined;
}

/** Resolve a token value; if it references another token (e.g. {color.primitive...}), resolve recursively */
function resolveValue(path: string, value: string, seen: Set<string>): string {
  const refMatch = value.trim().match(/^\{(.+)\}$/);
  if (!refMatch) return value;
  const refPath = refMatch[1];
  if (seen.has(refPath)) return value;
  seen.add(refPath);
  const refVal = getByPath(ROOT, refPath);
  if (refVal == null) return value;
  return resolveValue(refPath, refVal, seen);
}

/** Recursively collect all token values and resolve references. Keys become dot-notation. */
function collectResolved(
  obj: Record<string, unknown>,
  prefix: string,
  out: Record<string, string>,
  seen: Set<string>
): void {
  for (const [key, node] of Object.entries(obj)) {
    if (key === "$metadata" || key === "usage" || Array.isArray(node)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (node && typeof node === "object" && "value" in node && typeof (node as TokenNode).value === "string") {
      const raw = (node as TokenNode).value as string;
      out[path] = resolveValue(path, raw, new Set(seen));
    } else if (node && typeof node === "object" && !Array.isArray(node)) {
      collectResolved(node as Record<string, unknown>, path, out, seen);
    }
  }
}

let cached: Record<string, string> | null = null;

/** All resolved token values keyed by path (e.g. color.primitive.text.charcoal) */
export function getResolvedTokens(): Record<string, string> {
  if (cached) return cached;
  const out: Record<string, string> = {};
  collectResolved(ROOT, "", out, new Set());
  cached = out;
  return out;
}

/** CSS variable name from token path (e.g. color.primitive.text.charcoal -> --color-primitive-text-charcoal) */
export function tokenPathToCssVar(path: string): string {
  return "--" + path.replace(/\./g, "-");
}

/** Generate :root { --token-name: value; ... } from design tokens. Use in layout or globals. */
export function getThemeCssVars(): string {
  const tokens = getResolvedTokens();
  const lines = Object.entries(tokens).map(([path, value]) => `${tokenPathToCssVar(path)}: ${value};`);
  return `:root {\n  ${lines.join("\n  ")}\n}`;
}

/** Get a single token value by path (e.g. "color.primitive.brand.red.primary") */
export function getToken(path: string): string | undefined {
  return getResolvedTokens()[path];
}

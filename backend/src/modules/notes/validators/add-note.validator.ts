/**
 * Add note request validation.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

export function validateAddNoteBody(
  req: Request
): { ok: true; data: { note: string } } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!note) {
    return { ok: false, errors: [{ field: "note", message: "Note is required" }] };
  }
  return { ok: true, data: { note } };
}

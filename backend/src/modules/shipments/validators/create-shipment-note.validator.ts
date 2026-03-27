/**
 * POST /shipments/:id/notes body validation.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

const MAX_LEN = 8000;

export function validateCreateShipmentNoteBody(
  req: Request
): { ok: true; note: string } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const raw = body?.note;
  if (typeof raw !== "string") {
    return { ok: false, errors: [{ field: "note", message: "note is required" }] };
  }
  const note = raw.trim();
  if (!note) {
    return { ok: false, errors: [{ field: "note", message: "note cannot be empty" }] };
  }
  if (note.length > MAX_LEN) {
    return { ok: false, errors: [{ field: "note", message: `note must be at most ${MAX_LEN} characters` }] };
  }
  return { ok: true, note };
}

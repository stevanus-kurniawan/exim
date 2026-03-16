/**
 * Take ownership: no body required; user from auth. Validator only ensures intake id from params.
 */

import type { Request } from "express";

export function getIntakeIdFromParams(req: Request): string {
  return (req.params.id ?? req.params.intakeId ?? "") as string;
}

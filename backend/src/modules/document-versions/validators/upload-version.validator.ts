/**
 * Upload new version validation (version_label: DRAFT or FINAL, file required).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import { VERSION_LABELS } from "../dto/index.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateUploadVersion(
  req: Request
): { ok: true; data: { version_label: string; remarks?: string } } | { ok: false; errors: ErrorField[] } {
  const errors: ErrorField[] = [];
  const version_label =
    typeof req.body?.version_label === "string" ? req.body.version_label.trim().toUpperCase() : "";
  if (!version_label) {
    errors.push({ field: "version_label", message: "Version label is required" });
  } else if (!VERSION_LABELS.includes(version_label as import("../dto/index.js").VersionLabel)) {
    errors.push({ field: "version_label", message: "Version label must be DRAFT or FINAL" });
  }

  const file = (req as Request & { file?: { buffer?: Buffer; size?: number } }).file;
  if (!file?.buffer) {
    errors.push({ field: "file", message: "File is required" });
  } else if (file.size !== undefined && file.size > MAX_FILE_SIZE) {
    errors.push({ field: "file", message: "File size must not exceed 10 MB" });
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      version_label,
      remarks: typeof req.body?.remarks === "string" ? req.body.remarks.trim() : undefined,
    },
  };
}

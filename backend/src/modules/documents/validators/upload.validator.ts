/**
 * Document upload validation (API Spec §6.3).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import { VERSION_LABELS } from "../dto/index.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateUploadDocument(
  req: Request
): { ok: true; data: { document_type: string; document_name: string; version_label: string; remarks?: string } } | { ok: false; errors: ErrorField[] } {
  const errors: ErrorField[] = [];
  const document_type = typeof req.body?.document_type === "string" ? req.body.document_type.trim() : "";
  const document_name = typeof req.body?.document_name === "string" ? req.body.document_name.trim() : "";
  const version_label = typeof req.body?.version_label === "string" ? req.body.version_label.trim().toUpperCase() : "";

  if (!document_type) errors.push({ field: "document_type", message: "Document type is required" });
  if (!document_name) errors.push({ field: "document_name", message: "Document name is required" });
  if (!version_label) errors.push({ field: "version_label", message: "Version label is required" });
  else if (!VERSION_LABELS.includes(version_label as import("../dto/index.js").VersionLabel)) {
    errors.push({ field: "version_label", message: "Version label must be DRAFT or FINAL" });
  }

  const file = (req as Request & { file?: { buffer?: Buffer; size?: number; mimetype?: string } }).file;
  if (!file?.buffer) {
    errors.push({ field: "file", message: "File is required" });
  } else {
    if (file.size !== undefined && file.size > MAX_FILE_SIZE) {
      errors.push({ field: "file", message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024} MB` });
    }
    if (file.mimetype && !ALLOWED_MIMES.has(file.mimetype)) {
      errors.push({ field: "file", message: "File type is not allowed" });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      document_type,
      document_name,
      version_label,
      remarks: typeof req.body?.remarks === "string" ? req.body.remarks.trim() : undefined,
    },
  };
}

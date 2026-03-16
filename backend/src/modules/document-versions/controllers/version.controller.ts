/**
 * Document version controllers: parse request, return response.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import { validateUploadVersion } from "../validators/index.js";
import { DocumentVersionService } from "../services/version.service.js";
import { DocumentRepository } from "../../documents/repositories/document.repository.js";
import { DocumentVersionRepository } from "../repositories/version.repository.js";
import { LocalStorageAdapter } from "../../../shared/storage/local-storage.adapter.js";

const documentRepo = new DocumentRepository();
const versionRepo = new DocumentVersionRepository();
const storage = new LocalStorageAdapter();
const service = new DocumentVersionService(documentRepo, versionRepo, storage);

type MulterFile = { buffer: Buffer; originalname: string; mimetype?: string; size?: number };

export async function uploadVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  const documentId = req.params.documentId as string;
  const validation = validateUploadVersion(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  const file = (req as Request & { file?: MulterFile }).file;
  if (!file?.buffer) {
    sendError(res, "File is required", { statusCode: 400 });
    return;
  }
  const uploadedBy = req.user?.name ?? "System";
  try {
    const data = await service.addVersion(
      documentId,
      validation.data.version_label,
      file.buffer,
      file.originalname || "file",
      file.mimetype,
      uploadedBy
    );
    sendSuccess(res, data, { message: "New document version uploaded successfully", statusCode: 201 });
  } catch (e) {
    next(e);
  }
}

export async function listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
  const documentId = req.params.documentId as string;
  try {
    const data = await service.listVersions(documentId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function getVersionDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  const documentId = req.params.documentId as string;
  const versionNumber = parseInt(req.params.versionNumber as string, 10);
  if (Number.isNaN(versionNumber) || versionNumber < 1) {
    sendError(res, "Invalid version number", { statusCode: 400 });
    return;
  }
  try {
    const data = await service.getVersionDetail(documentId, versionNumber);
    if (!data) {
      sendError(res, "Version not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function downloadVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  const documentId = req.params.documentId as string;
  const versionNumber = parseInt(req.params.versionNumber as string, 10);
  if (Number.isNaN(versionNumber) || versionNumber < 1) {
    sendError(res, "Invalid version number", { statusCode: 400 });
    return;
  }
  try {
    const result = await service.getVersionDownloadStream(documentId, versionNumber);
    if (!result) {
      sendError(res, "Version not found", { statusCode: 404 });
      return;
    }
    res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
    if (result.mimeType) res.setHeader("Content-Type", result.mimeType);
    result.stream.pipe(res);
  } catch (e) {
    next(e);
  }
}

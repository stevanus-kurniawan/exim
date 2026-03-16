/**
 * Document controllers: parse request, return response. No business logic.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import { validateUploadDocument } from "../validators/index.js";
import { DocumentService } from "../services/document.service.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { DocumentVersionRepository } from "../../document-versions/repositories/version.repository.js";
import { LocalStorageAdapter } from "../../../shared/storage/local-storage.adapter.js";
import { ImportTransactionRepository } from "../../import-transactions/repositories/import-transaction.repository.js";

const documentRepo = new DocumentRepository();
const versionRepo = new DocumentVersionRepository();
const storage = new LocalStorageAdapter();
const transactionRepo = new ImportTransactionRepository();
const service = new DocumentService(documentRepo, versionRepo, storage, transactionRepo);

type MulterFile = { buffer: Buffer; originalname: string; mimetype?: string; size?: number };

export async function uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transactionId = req.params.id as string;
  const validation = validateUploadDocument(req);
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
    const data = await service.uploadDocument(
      transactionId,
      validation.data.document_type,
      validation.data.document_name,
      validation.data.version_label,
      file.buffer,
      file.originalname || "file",
      file.mimetype,
      uploadedBy
    );
    sendSuccess(res, data, { message: "Document uploaded successfully", statusCode: 201 });
  } catch (e) {
    next(e);
  }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transactionId = req.params.id as string;
  try {
    const data = await service.listByTransactionId(transactionId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function getDocumentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  const documentId = req.params.documentId as string;
  try {
    const data = await service.getDetail(documentId);
    if (!data) {
      sendError(res, "Document not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function downloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const documentId = req.params.documentId as string;
  try {
    const result = await service.getDownloadStream(documentId);
    if (!result) {
      sendError(res, "Document not found", { statusCode: 404 });
      return;
    }
    res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
    if (result.mimeType) res.setHeader("Content-Type", result.mimeType);
    result.stream.pipe(res);
  } catch (e) {
    next(e);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  const documentId = req.params.documentId as string;
  try {
    const deleted = await service.softDelete(documentId);
    if (!deleted) {
      sendError(res, "Document not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, {}, { message: "Document deleted successfully" });
  } catch (e) {
    next(e);
  }
}

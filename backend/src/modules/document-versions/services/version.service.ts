/**
 * Document version service: add version, list, get by version, download. Uses storage interface.
 */

import { v4 as uuidv4 } from "uuid";
import type { IStorageService } from "../../../shared/storage/types.js";
import { DocumentRepository } from "../../documents/repositories/document.repository.js";
import { DocumentVersionRepository } from "../repositories/version.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import type { UploadVersionResponseData } from "../dto/index.js";
import type { DocumentVersionListItem } from "../../documents/dto/index.js";
import type { DocumentVersionDetailData } from "../dto/index.js";

export class DocumentVersionService {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly versionRepo: DocumentVersionRepository,
    private readonly storage: IStorageService
  ) {}

  async addVersion(
    documentId: string,
    versionLabel: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string | undefined,
    uploadedBy: string
  ): Promise<UploadVersionResponseData> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) throw new AppError("Document not found", 404);

    const versionNumber = await this.versionRepo.getNextVersionNumber(documentId);
    const versionId = uuidv4();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
    const { storageKey } = await this.storage.upload(fileBuffer, {
      documentId: doc.id,
      versionId,
      fileName: safeFileName,
      mimeType,
    });

    await this.versionRepo.create({
      documentId: doc.id,
      versionNumber,
      versionLabel,
      storageKey,
      fileName: safeFileName,
      mimeType: mimeType ?? null,
      sizeBytes: fileBuffer.length,
      uploadedBy,
    });

    return {
      document_id: doc.id,
      version_number: versionNumber,
      version_label: versionLabel,
      file_name: safeFileName,
    };
  }

  async listVersions(documentId: string): Promise<DocumentVersionListItem[]> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) return [];
    const rows = await this.versionRepo.findByDocumentId(documentId);
    return rows.map((r) => ({
      version_number: r.version_number,
      version_label: r.version_label,
      file_name: r.file_name,
      uploaded_by: r.uploaded_by,
      uploaded_at: r.uploaded_at.toISOString(),
    }));
  }

  async getVersionDetail(
    documentId: string,
    versionNumber: number
  ): Promise<DocumentVersionDetailData | null> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) return null;
    const row = await this.versionRepo.findByDocumentIdAndVersion(documentId, versionNumber);
    if (!row) return null;
    return {
      version_number: row.version_number,
      version_label: row.version_label,
      file_name: row.file_name,
      uploaded_by: row.uploaded_by,
      uploaded_at: row.uploaded_at.toISOString(),
    };
  }

  async getVersionDownloadStream(
    documentId: string,
    versionNumber: number
  ): Promise<{ stream: NodeJS.ReadableStream; fileName: string; mimeType?: string } | null> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) return null;
    const row = await this.versionRepo.findByDocumentIdAndVersion(documentId, versionNumber);
    if (!row) return null;
    const result = await this.storage.download(row.storage_key);
    if (!result) return null;
    return { stream: result.stream, fileName: result.fileName, mimeType: result.mimeType };
  }
}

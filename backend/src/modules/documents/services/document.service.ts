/**
 * Document service: business logic. Uses storage interface; no direct file I/O.
 */

import { v4 as uuidv4 } from "uuid";
import type { IStorageService } from "../../../shared/storage/types.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { DocumentVersionRepository } from "../../document-versions/repositories/version.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import type {
  UploadDocumentResponseData,
  TransactionDocumentListItem,
  DocumentDetailData,
} from "../dto/index.js";
import { ImportTransactionRepository } from "../../import-transactions/repositories/import-transaction.repository.js";

export class DocumentService {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly versionRepo: DocumentVersionRepository,
    private readonly storage: IStorageService,
    private readonly transactionRepo: ImportTransactionRepository
  ) {}

  async uploadDocument(
    transactionId: string,
    documentType: string,
    documentName: string,
    versionLabel: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string | undefined,
    uploadedBy: string
  ): Promise<UploadDocumentResponseData> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) throw new AppError("Transaction not found", 404);

    const doc = await this.documentRepo.create({
      transactionId,
      documentType,
      documentName,
    });
    const versionNumber = 1;
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
      document_name: doc.document_name,
      document_type: doc.document_type,
      current_version: versionNumber,
      version_label: versionLabel,
      file_name: safeFileName,
    };
  }

  async listByTransactionId(transactionId: string): Promise<TransactionDocumentListItem[]> {
    const docs = await this.documentRepo.findByTransactionId(transactionId);
    const items: TransactionDocumentListItem[] = [];
    for (const doc of docs) {
      const latest = await this.versionRepo.getLatestVersion(doc.id);
      items.push({
        document_id: doc.id,
        document_name: doc.document_name,
        document_type: doc.document_type,
        latest_version_number: latest?.version_number ?? 0,
        latest_version_label: latest?.version_label ?? "",
        uploaded_at: latest?.uploaded_at.toISOString() ?? doc.created_at.toISOString(),
      });
    }
    return items;
  }

  async getDetail(documentId: string): Promise<DocumentDetailData | null> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) return null;
    const latest = await this.versionRepo.getLatestVersion(doc.id);
    return {
      document_id: doc.id,
      transaction_id: doc.transaction_id,
      document_name: doc.document_name,
      document_type: doc.document_type,
      latest_version_number: latest?.version_number ?? 0,
      latest_version_label: latest?.version_label ?? "",
    };
  }

  async getDownloadStream(documentId: string): Promise<{ stream: NodeJS.ReadableStream; fileName: string; mimeType?: string } | null> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) return null;
    const latest = await this.versionRepo.getLatestVersion(doc.id);
    if (!latest) return null;
    const result = await this.storage.download(latest.storage_key);
    if (!result) return null;
    return { stream: result.stream, fileName: result.fileName, mimeType: result.mimeType };
  }

  async softDelete(documentId: string): Promise<boolean> {
    return this.documentRepo.softDelete(documentId);
  }
}

/**
 * Document version repository: persistence only.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type { DocumentVersionRow } from "../../documents/dto/index.js";

export interface CreateVersionInput {
  documentId: string;
  versionNumber: number;
  versionLabel: string;
  storageKey: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string;
}

export class DocumentVersionRepository {
  private get pool(): Pool {
    return getPool();
  }

  async getNextVersionNumber(documentId: string): Promise<number> {
    const result = await this.pool.query<{ max: string | null }>(
      `SELECT MAX(version_number)::text AS max FROM document_versions WHERE document_id = $1`,
      [documentId]
    );
    const max = result.rows[0]?.max;
    return max ? parseInt(max, 10) + 1 : 1;
  }

  async create(input: CreateVersionInput): Promise<DocumentVersionRow> {
    const result = await this.pool.query<DocumentVersionRow>(
      `INSERT INTO document_versions (id, document_id, version_number, version_label, storage_key, file_name, mime_type, size_bytes, uploaded_by, uploaded_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, document_id, version_number, version_label, storage_key, file_name, mime_type, size_bytes, uploaded_by, uploaded_at`,
      [
        input.documentId,
        input.versionNumber,
        input.versionLabel,
        input.storageKey,
        input.fileName,
        input.mimeType,
        input.sizeBytes,
        input.uploadedBy,
      ]
    );
    if (!result.rows[0]) throw new Error("DocumentVersionRepository.create: no row returned");
    return result.rows[0];
  }

  async findByDocumentId(documentId: string): Promise<DocumentVersionRow[]> {
    const result = await this.pool.query<DocumentVersionRow>(
      `SELECT id, document_id, version_number, version_label, storage_key, file_name, mime_type, size_bytes, uploaded_by, uploaded_at
       FROM document_versions WHERE document_id = $1 ORDER BY version_number ASC`,
      [documentId]
    );
    return result.rows;
  }

  async findByDocumentIdAndVersion(
    documentId: string,
    versionNumber: number
  ): Promise<DocumentVersionRow | null> {
    const result = await this.pool.query<DocumentVersionRow>(
      `SELECT id, document_id, version_number, version_label, storage_key, file_name, mime_type, size_bytes, uploaded_by, uploaded_at
       FROM document_versions WHERE document_id = $1 AND version_number = $2`,
      [documentId, versionNumber]
    );
    return result.rows[0] ?? null;
  }

  async getLatestVersion(documentId: string): Promise<DocumentVersionRow | null> {
    const result = await this.pool.query<DocumentVersionRow>(
      `SELECT id, document_id, version_number, version_label, storage_key, file_name, mime_type, size_bytes, uploaded_by, uploaded_at
       FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [documentId]
    );
    return result.rows[0] ?? null;
  }
}

/**
 * Document version DTOs (API Spec §5.7).
 */

export const VERSION_LABELS = ["DRAFT", "FINAL"] as const;
export type VersionLabel = (typeof VERSION_LABELS)[number];

/** Upload new version response */
export interface UploadVersionResponseData {
  document_id: string;
  version_number: number;
  version_label: string;
  file_name: string;
}

/** Version detail for GET /documents/:id/versions/:versionNumber */
export interface DocumentVersionDetailData {
  version_number: number;
  version_label: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
  storage_key?: string;
}

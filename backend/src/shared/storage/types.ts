/**
 * Storage abstraction types. Implementations: local, NFS, S3, etc.
 */

export interface StorageUploadOptions {
  documentId: string;
  versionId: string;
  fileName: string;
  mimeType?: string;
  /**
   * When set, storage key is `{directoryPrefix}/{fileName}_{versionId}` (relative to base path).
   * When omitted, `{documentId}/{fileName}_{versionId}`.
   */
  directoryPrefix?: string;
}

export interface StorageUploadResult {
  storageKey: string;
}

export interface StorageDownloadResult {
  stream: NodeJS.ReadableStream;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface IStorageService {
  upload(content: Buffer, options: StorageUploadOptions): Promise<StorageUploadResult>;
  download(storageKey: string): Promise<StorageDownloadResult | null>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}

/**
 * Local filesystem storage adapter. Placeholder for NFS/shared/object storage.
 */

import { createReadStream, mkdirSync, existsSync, unlinkSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../../config/index.js";
import type {
  IStorageService,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDownloadResult,
} from "./types.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function getBasePath(): string {
  const path = config.storage.localPath ?? "./uploads";
  return path;
}

function storageKeyToPath(storageKey: string): string {
  return join(getBasePath(), storageKey.replace(/\.\./g, ""));
}

export class LocalStorageAdapter implements IStorageService {
  async upload(content: Buffer, options: StorageUploadOptions): Promise<StorageUploadResult> {
    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit`);
    }
    const base = getBasePath();
    const storageKey = options.directoryPrefix
      ? `${options.directoryPrefix.replace(/\.\./g, "")}/${options.versionId}_${options.fileName}`
      : `${options.documentId}/${options.versionId}_${options.fileName}`;
    const fullPath = join(base, storageKey);
    const dir = join(fullPath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    await writeFile(fullPath, content);
    return { storageKey };
  }

  async download(storageKey: string): Promise<StorageDownloadResult | null> {
    const fullPath = storageKeyToPath(storageKey);
    if (!existsSync(fullPath)) return null;
    const fileName = storageKey.split("/").pop()?.replace(/^[^_]+_/, "") ?? "document";
    const stream = createReadStream(fullPath);
    return { stream, fileName };
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = storageKeyToPath(storageKey);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    return existsSync(storageKeyToPath(storageKey));
  }
}

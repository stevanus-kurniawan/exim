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

/** UUID v4 at end: `name_uuid` (current). */
const UUID_SUFFIX = /_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
/** UUID v4 at start: `uuid_name` (legacy uploads). */
const UUID_PREFIX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_/i;

/** Leaf file part of storage key → user-facing base name (strips document id). */
export function parseStoredLeafBaseName(leaf: string): string {
  const tail = leaf.match(UUID_SUFFIX);
  if (tail) return leaf.slice(0, leaf.length - tail[0].length);
  const head = leaf.match(UUID_PREFIX);
  if (head) return leaf.slice(head[0].length);
  return leaf;
}

export class LocalStorageAdapter implements IStorageService {
  async upload(content: Buffer, options: StorageUploadOptions): Promise<StorageUploadResult> {
    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit`);
    }
    const base = getBasePath();
    const leaf = `${options.fileName}_${options.versionId}`;
    const storageKey = options.directoryPrefix
      ? `${options.directoryPrefix.replace(/\.\./g, "")}/${leaf}`
      : `${options.documentId}/${leaf}`;
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
    const leaf = storageKey.split("/").pop() ?? "document";
    const fileName = parseStoredLeafBaseName(leaf);
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

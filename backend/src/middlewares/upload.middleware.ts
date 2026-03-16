/**
 * Multer middleware for multipart/form-data file uploads.
 */

import multer from "multer";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const memoryStorage = multer.memoryStorage();

export const uploadSingle = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("file");

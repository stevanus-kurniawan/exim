/**
 * Document and document-version routes (API Spec §5.6, §5.7).
 * Mount at /api/v1/documents
 */

import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/rbac.middleware.js";
import { PERMISSIONS } from "../../shared/rbac.js";
import { uploadSingle } from "../../middlewares/upload.middleware.js";
import * as documentController from "./controllers/document.controller.js";
import * as versionController from "../document-versions/controllers/version.controller.js";

export const documentRoutes = Router();

documentRoutes.get("/:documentId/download", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), documentController.downloadDocument);
documentRoutes.post("/:documentId/versions", authMiddleware, requirePermission(PERMISSIONS.UPLOAD_DOCUMENT), uploadSingle, versionController.uploadVersion);
documentRoutes.get("/:documentId/versions/:versionNumber/download", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), versionController.downloadVersion);
documentRoutes.get("/:documentId/versions/:versionNumber", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), versionController.getVersionDetail);
documentRoutes.get("/:documentId/versions", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), versionController.listVersions);
documentRoutes.get("/:documentId", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), documentController.getDocumentDetail);
documentRoutes.delete("/:documentId", authMiddleware, requirePermission(PERMISSIONS.UPLOAD_DOCUMENT), documentController.deleteDocument);

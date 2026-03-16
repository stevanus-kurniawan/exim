/**
 * Import transaction routes (API Spec §5.4, §5.5).
 */

import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/rbac.middleware.js";
import { PERMISSIONS } from "../../shared/rbac.js";
import * as controller from "./controllers/import-transaction.controller.js";
import * as statusController from "../transaction-status/controllers/transaction-status.controller.js";
import * as documentController from "../documents/controllers/document.controller.js";
import * as noteController from "../notes/controllers/note.controller.js";
import { uploadSingle } from "../../middlewares/upload.middleware.js";

export const importTransactionRoutes = Router();

importTransactionRoutes.post("/", authMiddleware, requirePermission(PERMISSIONS.CREATE_TRANSACTION), controller.create);
importTransactionRoutes.get("/", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), controller.list);
importTransactionRoutes.get("/:id", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), controller.getById);
importTransactionRoutes.put("/:id", authMiddleware, requirePermission(PERMISSIONS.UPDATE_TRANSACTION), controller.update);
importTransactionRoutes.patch("/:id/close", authMiddleware, requirePermission(PERMISSIONS.UPDATE_TRANSACTION), controller.close);

importTransactionRoutes.post("/:id/status", authMiddleware, requirePermission(PERMISSIONS.UPDATE_STATUS), statusController.updateStatus);
importTransactionRoutes.get("/:id/timeline", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), statusController.getTimeline);
importTransactionRoutes.get("/:id/status-summary", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), statusController.getStatusSummary);

importTransactionRoutes.post("/:id/documents", authMiddleware, requirePermission(PERMISSIONS.UPLOAD_DOCUMENT), uploadSingle, documentController.uploadDocument);
importTransactionRoutes.get("/:id/documents", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), documentController.listDocuments);

importTransactionRoutes.post("/:id/notes", authMiddleware, requirePermission(PERMISSIONS.UPDATE_TRANSACTION), noteController.addNote);
importTransactionRoutes.get("/:id/notes", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), noteController.listNotes);

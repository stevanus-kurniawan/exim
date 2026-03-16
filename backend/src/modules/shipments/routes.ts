/**
 * Shipment routes. CRUD, status, timeline, couple/decouple PO.
 */

import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/rbac.middleware.js";
import { PERMISSIONS } from "../../shared/rbac.js";
import * as shipmentController from "./controllers/shipment.controller.js";
import * as statusController from "./controllers/shipment-status.controller.js";

export const shipmentRoutes = Router();

shipmentRoutes.post("/", authMiddleware, requirePermission(PERMISSIONS.CREATE_SHIPMENT), shipmentController.create);
shipmentRoutes.get("/", authMiddleware, requirePermission(PERMISSIONS.VIEW_SHIPMENTS), shipmentController.list);
shipmentRoutes.get("/:id", authMiddleware, requirePermission(PERMISSIONS.VIEW_SHIPMENTS), shipmentController.getById);
shipmentRoutes.put("/:id", authMiddleware, requirePermission(PERMISSIONS.UPDATE_SHIPMENT), shipmentController.update);
shipmentRoutes.patch("/:id/close", authMiddleware, requirePermission(PERMISSIONS.UPDATE_SHIPMENT), shipmentController.close);

shipmentRoutes.patch("/:id/status", authMiddleware, requirePermission(PERMISSIONS.UPDATE_STATUS), statusController.updateStatus);
shipmentRoutes.get("/:id/timeline", authMiddleware, requirePermission(PERMISSIONS.VIEW_SHIPMENTS), statusController.getTimeline);
shipmentRoutes.get("/:id/status-summary", authMiddleware, requirePermission(PERMISSIONS.VIEW_SHIPMENTS), statusController.getStatusSummary);

shipmentRoutes.post("/:id/couple-po", authMiddleware, requirePermission(PERMISSIONS.COUPLE_DECOUPLE_PO), shipmentController.couplePo);
shipmentRoutes.post("/:id/decouple-po", authMiddleware, requirePermission(PERMISSIONS.COUPLE_DECOUPLE_PO), shipmentController.decouplePo);

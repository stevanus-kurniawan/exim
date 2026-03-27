/**
 * PO routes. API: GET /po, GET /po/:id, POST /:id/take, POST /:id/create-shipment, POST /:id/couple-to-shipment.
 * test-create kept for E2E.
 */

import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/rbac.middleware.js";
import { PERMISSIONS } from "../../shared/rbac.js";
import * as controller from "./controllers/po-intake.controller.js";

export const poIntakeRoutes = Router();

poIntakeRoutes.post(
  "/test-create",
  authMiddleware,
  requirePermission(PERMISSIONS.CREATE_PO_INTAKE_TEST),
  controller.create
);
poIntakeRoutes.get("/", authMiddleware, requirePermission(PERMISSIONS.VIEW_PO_INTAKE), controller.list);
poIntakeRoutes.get(
  "/lookup-by-po-number",
  authMiddleware,
  requirePermission(PERMISSIONS.VIEW_PO_INTAKE),
  controller.lookupByPoNumber
);
poIntakeRoutes.get("/:id", authMiddleware, requirePermission(PERMISSIONS.VIEW_PO_INTAKE), controller.getById);
poIntakeRoutes.post("/:id/take", authMiddleware, requirePermission(PERMISSIONS.TAKE_OWNERSHIP), controller.takeOwnership);
poIntakeRoutes.post(
  "/:id/create-shipment",
  authMiddleware,
  requirePermission(PERMISSIONS.CREATE_SHIPMENT),
  controller.createShipment
);
poIntakeRoutes.post(
  "/:id/couple-to-shipment",
  authMiddleware,
  requirePermission(PERMISSIONS.COUPLE_DECOUPLE_PO),
  controller.coupleToShipment
);

import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/rbac.middleware.js";
import { PERMISSIONS } from "../../shared/rbac.js";
import * as dashboardController from "./controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get(
  "/delivered-management",
  authMiddleware,
  requirePermission(PERMISSIONS.VIEW_SHIPMENTS),
  dashboardController.getDeliveredManagementSummary
);
/** @deprecated Use GET /dashboard/delivered-management — same response shape. */
dashboardRoutes.get(
  "/product-specification-summary",
  authMiddleware,
  requirePermission(PERMISSIONS.VIEW_SHIPMENTS),
  dashboardController.getDeliveredManagementSummary
);

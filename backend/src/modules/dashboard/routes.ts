/**
 * Dashboard routes (API Spec §5.9). Mount at /api/v1/dashboard
 */

import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/rbac.middleware.js";
import { PERMISSIONS } from "../../shared/rbac.js";
import * as controller from "./controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/import-summary", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), controller.getImportSummary);
dashboardRoutes.get("/import-status-summary", authMiddleware, requirePermission(PERMISSIONS.VIEW_TRANSACTIONS), controller.getImportStatusSummary);

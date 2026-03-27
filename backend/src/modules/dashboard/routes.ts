import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/rbac.middleware.js";
import { PERMISSIONS } from "../../shared/rbac.js";
import * as dashboardController from "./controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get(
  "/product-specification-summary",
  authMiddleware,
  requirePermission(PERMISSIONS.VIEW_SHIPMENTS),
  dashboardController.getProductSpecificationSummary
);

/**
 * Health check routes (no business logic).
 */

import { Router } from "express";
import { getHealth } from "./healthController.js";

export const healthRoutes = Router();
healthRoutes.get("/", getHealth);

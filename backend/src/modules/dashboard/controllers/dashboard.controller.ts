/**
 * Dashboard controllers: parse request, return response only.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../../shared/response.js";
import { DashboardService } from "../services/dashboard.service.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";

const repo = new DashboardRepository();
const service = new DashboardService(repo);

export async function getImportSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getImportSummary();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function getImportStatusSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getImportStatusSummary();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

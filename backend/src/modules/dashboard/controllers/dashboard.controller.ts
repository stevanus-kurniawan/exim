import type { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../../../shared/response.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";
import { DashboardService } from "../services/dashboard.service.js";

const service = new DashboardService(new DashboardRepository());

function parseIntegerQuery(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function getDeliveredManagementSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const month = parseIntegerQuery(req.query.month);
  const year = parseIntegerQuery(req.query.year);

  if (month != null && (month < 1 || month > 12)) {
    sendError(res, "Validation error", {
      statusCode: 400,
      errors: [{ field: "month", message: "month must be between 1 and 12" }],
    });
    return;
  }
  if (year != null && (year < 2000 || year > 9999)) {
    sendError(res, "Validation error", {
      statusCode: 400,
      errors: [{ field: "year", message: "year must be a 4-digit number" }],
    });
    return;
  }

  try {
    const items = await service.getDeliveredManagementSummary({ month, year });
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

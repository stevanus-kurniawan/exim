/**
 * Standard API response helpers (cursor-rules §6).
 * Success and error formats match API Specification.
 */

import type { Response } from "express";

export interface SuccessMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export function sendSuccess(
  res: Response,
  data: unknown,
  options?: { message?: string; meta?: SuccessMeta; statusCode?: number }
): void {
  const { message = "Request processed successfully", meta = {}, statusCode = 200 } = options ?? {};
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? {},
    meta,
  });
}

export interface ErrorField {
  field: string;
  message: string;
}

export function sendError(
  res: Response,
  message: string,
  options?: { errors?: ErrorField[]; statusCode?: number }
): void {
  const { errors, statusCode = 400 } = options ?? {};
  const body: { success: false; message: string; errors?: ErrorField[] } = {
    success: false,
    message,
  };
  if (errors?.length) {
    body.errors = errors;
  }
  res.status(statusCode).json(body);
}

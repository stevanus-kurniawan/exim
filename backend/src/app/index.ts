/**
 * Express app bootstrap: middlewares, routes, error handling.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "../config/index.js";
import { errorHandler, AppError } from "../middlewares/errorHandler.js";
import { healthRoutes } from "../modules/health/routes.js";
import { authRoutes } from "../modules/auth/routes.js";
import { poIntakeRoutes } from "../modules/po-intake/routes.js";
import { shipmentRoutes } from "../modules/shipments/routes.js";
import { userAdminRoutes } from "../modules/users/routes.js";
import { dashboardRoutes } from "../modules/dashboard/routes.js";

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  const corsOptions: cors.CorsOptions = {
    origin:
      config.cors.origins.length > 0
        ? config.cors.origins
        : true,
    credentials: true,
  };
  app.use(cors(corsOptions));

  app.get("/", (_req, res) => {
    res.json({ name: "EOS API", version: "1.0.0", scope: "Phase 1 Import" });
  });

  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userAdminRoutes);
  app.use("/api/v1/po", poIntakeRoutes);
  app.use("/api/v1/shipments", shipmentRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);

  app.use((_req, _res, next) => next(new AppError("Not found", 404)));
  app.use(errorHandler);

  return app;
}

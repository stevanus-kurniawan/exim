/**
 * Auth routes: login, refresh, logout, me, verify-email, forgot-password, reset-password.
 */

import { Router } from "express";
import { login, refresh, logout, getMe, verifyEmail, forgotPassword, resetPassword } from "./controllers/auth.controller.js";
import { authMiddleware } from "./auth.middleware.js";
import {
  authCredentialLimiter,
  authTokenFlowLimiter,
  forgotPasswordLimiter,
} from "../../middlewares/auth-rate-limit.js";

export const authRoutes = Router();

authRoutes.post("/login", authCredentialLimiter, login);
authRoutes.post("/refresh", authCredentialLimiter, refresh);
authRoutes.post("/logout", authCredentialLimiter, logout);
authRoutes.get("/me", authMiddleware, getMe);

authRoutes.post("/verify-email", authTokenFlowLimiter, verifyEmail);
authRoutes.get("/verify-email", authTokenFlowLimiter, verifyEmail);
authRoutes.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
authRoutes.post("/reset-password", authTokenFlowLimiter, resetPassword);

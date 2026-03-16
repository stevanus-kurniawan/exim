/**
 * Auth routes: login, refresh, logout, me, register, verify-email, forgot-password, reset-password.
 */

import { Router } from "express";
import { login, refresh, logout, getMe, register, verifyEmail, forgotPassword, resetPassword } from "./controllers/auth.controller.js";
import { authMiddleware } from "./auth.middleware.js";

export const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/refresh", refresh);
authRoutes.post("/logout", logout);
authRoutes.get("/me", authMiddleware, getMe);

authRoutes.post("/register", register);
authRoutes.post("/verify-email", verifyEmail);
authRoutes.get("/verify-email", verifyEmail);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);

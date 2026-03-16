/**
 * Auth service — login, logout, refresh, getMe, register, verifyEmail, forgotPassword, resetPassword.
 * Uses API client; no token storage (handled by auth state).
 */

import { apiPost, apiGet } from "./api-client";
import type { LoginResponseData, RefreshResponseData, AuthUser } from "@/types/auth";
import type { ApiResponse } from "@/types/api";

const AUTH_PREFIX = "auth";

export async function login(
  email: string,
  password: string
): Promise<ApiResponse<LoginResponseData>> {
  return apiPost<LoginResponseData>(`${AUTH_PREFIX}/login`, { email, password });
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<ApiResponse<{ user_id: string }>> {
  return apiPost<{ user_id: string }>(`${AUTH_PREFIX}/register`, payload);
}

export async function verifyEmail(token: string): Promise<ApiResponse<unknown>> {
  return apiPost<unknown>(`${AUTH_PREFIX}/verify-email`, { token });
}

export async function forgotPassword(email: string): Promise<ApiResponse<unknown>> {
  return apiPost<unknown>(`${AUTH_PREFIX}/forgot-password`, { email });
}

export async function resetPassword(payload: {
  token: string;
  new_password: string;
  password_confirmation: string;
}): Promise<ApiResponse<unknown>> {
  return apiPost<unknown>(`${AUTH_PREFIX}/reset-password`, payload);
}

export async function refresh(refreshToken: string): Promise<ApiResponse<RefreshResponseData>> {
  return apiPost<RefreshResponseData>(`${AUTH_PREFIX}/refresh`, { refresh_token: refreshToken });
}

export async function logout(refreshToken: string): Promise<ApiResponse<unknown>> {
  return apiPost<unknown>(`${AUTH_PREFIX}/logout`, { refresh_token: refreshToken });
}

export async function getMe(accessToken: string): Promise<ApiResponse<AuthUser>> {
  return apiGet<AuthUser>(`${AUTH_PREFIX}/me`, accessToken);
}

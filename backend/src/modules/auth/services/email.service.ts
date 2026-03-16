/**
 * Email service for verification and password reset. Uses SMTP from config.
 */

import nodemailer from "nodemailer";
import { config } from "../../../config/index.js";

function getTransporter(): nodemailer.Transporter | null {
  const { host, port, secure, user, pass } = config.smtp;
  if (!host) return null;
  const options = {
    host,
    port,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
  };
  return nodemailer.createTransport(options);
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const transporter = getTransporter();
  const baseUrl = config.auth.frontendBaseUrl.replace(/\/$/, "");
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const from = config.smtp.from;

  const mailOptions: nodemailer.SendMailOptions = {
    from: from ? `EOS <${from}>` : undefined,
    to,
    subject: "Verify your email — EOS",
    text: `Hello ${name},\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nThe link expires in 24 hours.\n\n— EOS`,
    html: `
      <p>Hello ${name},</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>The link expires in 24 hours.</p>
      <p>— EOS</p>
    `,
  };

  if (!transporter) {
    console.warn("[Email] SMTP not configured; skipping verification email to", to, "Link:", verifyUrl);
    return;
  }
  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const transporter = getTransporter();
  const baseUrl = config.auth.frontendBaseUrl.replace(/\/$/, "");
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const from = config.smtp.from;

  const mailOptions: nodemailer.SendMailOptions = {
    from: from ? `EOS <${from}>` : undefined,
    to,
    subject: "Reset your password — EOS",
    text: `Hello ${name},\n\nYou requested a password reset. Open this link to set a new password:\n${resetUrl}\n\nThe link expires in 1 hour.\n\nIf you did not request this, ignore this email.\n\n— EOS`,
    html: `
      <p>Hello ${name},</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>The link expires in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>— EOS</p>
    `,
  };

  if (!transporter) {
    console.warn("[Email] SMTP not configured; skipping reset email to", to, "Link:", resetUrl);
    return;
  }
  await transporter.sendMail(mailOptions);
}

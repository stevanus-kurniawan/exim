"use client";

import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, id, className = "", ...props }: InputProps) {
  const inputId = id ?? `input-${label.replace(/\s/g, "-").toLowerCase()}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(" ") || undefined;
  return (
    <label htmlFor={inputId} className={`${styles.label} ${className}`}>
      {label}
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      />
      {helperText && (
        <span id={helperId} className={styles.helper}>
          {helperText}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

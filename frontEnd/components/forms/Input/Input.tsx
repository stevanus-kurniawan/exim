"use client";

import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? `input-${label.replace(/\s/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={inputId} className={`${styles.label} ${className}`}>
      {label}
      <input id={inputId} className={styles.input} aria-invalid={!!error} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </label>
  );
}

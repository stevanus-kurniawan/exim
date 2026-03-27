"use client";

import styles from "./LoadingSkeleton.module.css";

export interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`${styles.wrapper} ${className}`.trim()} role="status" aria-live="polite" aria-label="Loading">
      {Array.from({ length: Math.max(1, lines) }).map((_, idx) => (
        <span key={idx} className={styles.line} />
      ))}
    </div>
  );
}


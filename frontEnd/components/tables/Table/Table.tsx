"use client";

import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import styles from "./Table.module.css";

export type TableProps = HTMLAttributes<HTMLTableElement> & {
  /** Extra class on the scroll wrapper (e.g. overflow: visible for nested full-bleed rows). */
  wrapperClassName?: string;
};

export function Table({ className = "", wrapperClassName = "", children, ...props }: TableProps) {
  return (
    <div className={`${styles.wrapper} ${wrapperClassName}`.trim()}>
      <table className={`${styles.table} ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`${styles.thead} ${className}`} {...props} />;
}

export function TableBody({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={styles.tbody} {...props} />;
}

export function TableRow({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`${styles.tr} ${className}`} {...props} />;
}

export function TableCell({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`${styles.td} ${className}`} {...props} />;
}

export function TableHeaderCell({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`${styles.th} ${className}`} {...props} />;
}

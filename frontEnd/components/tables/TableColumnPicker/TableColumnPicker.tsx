"use client";

import { useId } from "react";
import type { TableColumnDef } from "@/hooks/use-table-column-visibility";
import styles from "./TableColumnPicker.module.css";

type Props = {
  label?: string;
  columns: readonly TableColumnDef[];
  visibleById: Record<string, boolean>;
  onToggle: (columnId: string) => void;
  onReset: () => void;
};

export function TableColumnPicker({
  label = "Columns",
  columns,
  visibleById,
  onToggle,
  onReset,
}: Props) {
  const baseId = useId();
  const optional = columns.filter((c) => !c.locked);

  if (optional.length === 0) return null;

  return (
    <details className={styles.details}>
      <summary className={styles.summary} aria-label={`${label}: choose visible columns`}>
        {label}
      </summary>
      <div className={styles.panel} role="group" aria-label="Visible columns">
        <ul className={styles.list}>
          {optional.map((c) => {
            const checked = visibleById[c.id] !== false;
            const inputId = `${baseId}-${c.id}`;
            return (
              <li key={c.id} className={styles.item}>
                <label className={styles.label} htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="checkbox"
                    className={styles.checkbox}
                    checked={checked}
                    onChange={() => onToggle(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <button type="button" className={styles.resetBtn} onClick={onReset}>
          Reset to default
        </button>
      </div>
    </details>
  );
}

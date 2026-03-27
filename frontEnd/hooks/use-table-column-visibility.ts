"use client";

import { useCallback, useEffect, useState } from "react";

export type TableColumnDef = {
  id: string;
  label: string;
  /** If true, column is always shown and not listed in the picker. */
  locked?: boolean;
  /** If false, column is hidden until the user enables it in the column picker. Default true. */
  defaultVisible?: boolean;
};

export function defaultVisibility(columns: readonly TableColumnDef[]): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const c of columns) m[c.id] = c.defaultVisible !== false;
  return m;
}

function mergeSaved(
  columns: readonly TableColumnDef[],
  saved: unknown
): Record<string, boolean> {
  const base = defaultVisibility(columns);
  const locked = new Set(columns.filter((c) => c.locked).map((c) => c.id));
  if (!saved || typeof saved !== "object") return base;
  const rec = saved as Record<string, unknown>;
  for (const c of columns) {
    if (locked.has(c.id)) {
      base[c.id] = true;
      continue;
    }
    if (typeof rec[c.id] === "boolean") base[c.id] = rec[c.id] as boolean;
  }
  return base;
}

/**
 * Persist optional table column visibility in localStorage (per browser).
 * Pass a stable `columns` array (e.g. module-level const) so effects stay correct.
 */
export function useTableColumnVisibility(storageKey: string, columns: readonly TableColumnDef[]) {
  const [visibleById, setVisibleById] = useState<Record<string, boolean>>(() =>
    defaultVisibility(columns)
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setVisibleById(mergeSaved(columns, JSON.parse(raw) as unknown));
      } else {
        setVisibleById(defaultVisibility(columns));
      }
    } catch {
      setVisibleById(defaultVisibility(columns));
    }
  }, [storageKey, columns]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore quota / private mode */
      }
    },
    [storageKey]
  );

  const toggleColumn = useCallback(
    (id: string) => {
      const col = columns.find((c) => c.id === id);
      if (!col || col.locked) return;
      setVisibleById((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        persist(next);
        return next;
      });
    },
    [columns, persist]
  );

  const resetColumns = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setVisibleById(defaultVisibility(columns));
  }, [storageKey, columns]);

  const applyVisibility = useCallback(
    (nextVisibility: Record<string, boolean>) => {
      const next = mergeSaved(columns, nextVisibility);
      setVisibleById(next);
      persist(next);
    },
    [columns, persist]
  );

  const isVisible = useCallback(
    (id: string) => {
      return visibleById[id] !== false;
    },
    [visibleById]
  );

  return { visibleById, toggleColumn, resetColumns, applyVisibility, isVisible, columns };
}

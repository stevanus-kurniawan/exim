"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { listMentionableUsers } from "@/services/users-service";
import type { MentionableUser } from "@/types/users";
import { isApiError } from "@/types/api";
import styles from "./ShipmentNoteMentionTextarea.module.css";

export interface ShipmentNoteMentionTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  accessToken: string | null;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
}

function getActiveMention(
  text: string,
  cursor: number
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  const charBefore = at > 0 ? before[at - 1] : " ";
  if (charBefore !== " " && charBefore !== "\n" && at !== 0) return null;
  const afterAt = before.slice(at + 1);
  if (afterAt.includes(" ") || afterAt.includes("\n")) return null;
  return { start: at, query: afterAt };
}

function sanitizeMentionLabel(name: string, email: string): string {
  const u = name.replace(/\]/g, "").trim();
  if (u) return u.slice(0, 120);
  return email.replace(/\]/g, "").slice(0, 120);
}

export function ShipmentNoteMentionTextarea({
  id,
  value,
  onChange,
  accessToken,
  placeholder = "Write a note…",
  rows = 4,
  disabled = false,
  className,
  "aria-describedby": ariaDescribedBy,
}: ShipmentNoteMentionTextareaProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const listId = useId();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [candidates, setCandidates] = useState<MentionableUser[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const fetchMentions = useCallback(
    (q: string) => {
      if (!accessToken) {
        setCandidates([]);
        return;
      }
      setLoadingMentions(true);
      listMentionableUsers({ q: q || undefined, limit: 20 }, accessToken)
        .then((res) => {
          if (!isApiError(res) && Array.isArray(res.data)) setCandidates(res.data);
          else setCandidates([]);
        })
        .catch(() => setCandidates([]))
        .finally(() => setLoadingMentions(false));
    },
    [accessToken]
  );

  useEffect(() => {
    if (!mentionOpen) return;
    const t = window.setTimeout(() => fetchMentions(mentionQuery), 250);
    return () => window.clearTimeout(t);
  }, [mentionOpen, mentionQuery, fetchMentions]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [candidates]);

  useEffect(() => {
    if (!mentionOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = taRef.current;
      if (!el) return;
      const t = e.target;
      if (t instanceof Node && el.contains(t)) return;
      setMentionOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [mentionOpen]);

  function applyMention(user: MentionableUser) {
    const el = taRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const label = sanitizeMentionLabel(user.name, user.email);
    const token = `@[${label}](${user.id})`;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const next = `${before}${token} ${after}`;
    onChange(next);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      const pos = before.length + token.length + 1;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function onInputChange(next: string) {
    onChange(next);
    const el = taRef.current;
    const cursor = el?.selectionStart ?? next.length;
    const m = getActiveMention(next, cursor);
    if (m) {
      setMentionStart(m.start);
      setMentionQuery(m.query);
      setMentionOpen(true);
      setHighlightIdx(0);
    } else {
      setMentionOpen(false);
    }
  }

  function onSelectChange() {
    const el = taRef.current;
    if (!el) return;
    const m = getActiveMention(value, el.selectionStart ?? 0);
    if (m) {
      setMentionStart(m.start);
      setMentionQuery(m.query);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || candidates.length === 0) {
      if (e.key === "Escape") setMentionOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, candidates.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      applyMention(candidates[highlightIdx]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <textarea
        ref={taRef}
        id={id}
        className={className ?? styles.textarea}
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        onInput={onSelectChange}
        onKeyUp={onSelectChange}
        onKeyDown={onKeyDown}
        onClick={onSelectChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        aria-autocomplete={mentionOpen ? "list" : undefined}
        aria-controls={mentionOpen ? listId : undefined}
        aria-expanded={mentionOpen}
        aria-describedby={ariaDescribedBy}
      />
      {mentionOpen ? (
        <div id={listId} className={styles.dropdown} role="listbox" aria-label="Mention user">
          {loadingMentions ? (
            <p className={styles.dropdownEmpty}>Loading…</p>
          ) : candidates.length === 0 ? (
            <p className={styles.dropdownEmpty}>No users match.</p>
          ) : (
            candidates.map((u, i) => (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={i === highlightIdx}
                className={`${styles.dropdownItem} ${i === highlightIdx ? styles.dropdownItemActive : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyMention(u)}
              >
                {u.name || u.email}
                <span className={styles.dropdownItemEmail}>{u.email}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
      <p className={styles.hint}>Type @ to mention a teammate. They will be notified when you post.</p>
    </div>
  );
}

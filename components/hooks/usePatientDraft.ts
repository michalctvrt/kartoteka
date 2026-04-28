"use client";

import { useCallback, useRef, useState } from "react";

export function usePatientDraft<T extends object | null>(
  patientId: string,
  initial: T
) {
  const key = `patient-draft:${patientId}`;
  const metaKey = `${key}:meta`;

  const [draft, setDraftState] = useState<T | null>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  });

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => {
    try {
      const meta = localStorage.getItem(metaKey);
      return meta ? (JSON.parse(meta) as { ts: number }).ts : null;
    } catch {
      return null;
    }
  });

  const saveTimeoutRef = useRef<number | null>(null);

  const persist = useCallback(
    (obj: T | null) => {
      if (obj === null) {
        localStorage.removeItem(key);
        localStorage.removeItem(metaKey);
        setDraftState(null);
        setLastSavedAt(null);
        return;
      }
      localStorage.setItem(key, JSON.stringify(obj));
      const meta = { ts: Date.now() };
      localStorage.setItem(metaKey, JSON.stringify(meta));
      setLastSavedAt(meta.ts);
    },
    [key, metaKey]
  );

  const setDraft = useCallback(
    (updater: React.SetStateAction<T | null>) => {
      setDraftState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T | null) => T | null)(prev)
            : updater;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => persist(next), 800);
        return next;
      });
    },
    [persist]
  );

  const setField = useCallback(
    (path: string, value: unknown) => {
      setDraft((prev) => {
        const base = (
          prev
            ? { ...(prev as Record<string, unknown>) }
            : { ...(initial as Record<string, unknown>) }
        ) as Record<string, unknown>;
        const parts = path.split(".");
        let cur: Record<string, unknown> = base;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          cur[p] = { ...((cur[p] as Record<string, unknown>) ?? {}) };
          cur = cur[p] as Record<string, unknown>;
        }
        cur[parts[parts.length - 1]] = value;
        return base as T;
      });
    },
    [initial, setDraft]
  );

  const discardDraft = useCallback(() => {
    persist(null);
  }, [persist]);

  const saveDraftLocally = useCallback(() => {
    persist(null);
  }, [persist]);

  const hasDraft = Boolean(draft);
  return {
    draft,
    setField,
    setDraft,
    discardDraft,
    saveDraftLocally,
    hasDraft,
    lastSavedAt,
  } as const;
}

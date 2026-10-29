"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { queueApi, queueOrder } from "@/lib/call250v/browser";
import type { QueueItem } from "@/lib/call250v/types";

/**
 * Pravidelné načítání fronty (Call250V nemá webhooky → polling).
 *
 * Komponenty, které chtějí stejná data (stejné serviceIds), sdílejí JEDNO
 * načítání — i když je na ploše víc oken, na Call250V jde jen jeden dotaz.
 * Interval je nejkratší, jaký si některé z oken vyžádalo.
 */

interface Snapshot {
  items: QueueItem[];
  error: string | null;
  loading: boolean;
}

interface Store {
  ids: string[];
  snapshot: Snapshot;
  subs: Set<() => void>;
  intervals: Map<() => void, number>;
  timer: ReturnType<typeof setInterval> | null;
  timerMs: number;
}

const INITIAL: Snapshot = { items: [], error: null, loading: true };
const stores = new Map<string, Store>();

function getStore(key: string): Store {
  let s = stores.get(key);
  if (!s) {
    s = {
      ids: key ? key.split(",") : [],
      snapshot: INITIAL,
      subs: new Set(),
      intervals: new Map(),
      timer: null,
      timerMs: 0,
    };
    stores.set(key, s);
  }
  return s;
}

async function fetchStore(s: Store) {
  try {
    const data = await queueApi.list(s.ids);
    s.snapshot = { items: [...data].sort(queueOrder), error: null, loading: false };
  } catch (e) {
    s.snapshot = { ...s.snapshot, error: (e as Error).message, loading: false };
  }
  s.subs.forEach((cb) => cb());
}

function restartTimer(s: Store) {
  const ms = Math.min(...s.intervals.values());
  if (s.timer && ms === s.timerMs) return;
  if (s.timer) clearInterval(s.timer);
  s.timer = setInterval(() => fetchStore(s), ms);
  s.timerMs = ms;
}

function subscribe(s: Store, cb: () => void, intervalMs: number) {
  const first = s.subs.size === 0;
  s.subs.add(cb);
  s.intervals.set(cb, intervalMs);
  restartTimer(s);
  if (first) fetchStore(s);
  return () => {
    s.subs.delete(cb);
    s.intervals.delete(cb);
    if (s.subs.size === 0) {
      if (s.timer) clearInterval(s.timer);
      s.timer = null;
    } else {
      restartTimer(s);
    }
  };
}

/**
 * `run(akce)` provede akci, hned obnoví seznam a chybu akce zobrazí v `error`.
 */
export function useQueue(serviceIds: string[], intervalMs = 3000) {
  const key = serviceIds.join(",");
  const store = getStore(key);

  const sub = useCallback(
    (cb: () => void) => subscribe(store, cb, intervalMs),
    [store, intervalMs]
  );
  const snap = useSyncExternalStore(sub, () => store.snapshot, () => INITIAL);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    await fetchStore(store);
    // Akce mění i jiné fronty (přeřazení RTG → UZ) → obnovit všechny
    stores.forEach((s) => s !== store && s.subs.size > 0 && fetchStore(s));
  }, [store]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await action();
        setActionError(null);
        return r;
      } catch (e) {
        setActionError((e as Error).message);
        return undefined;
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [refresh]
  );

  return {
    items: snap.items,
    loading: snap.loading,
    error: actionError ?? snap.error,
    clearError: () => setActionError(null),
    busy,
    refresh,
    run,
  };
}

/** Jestli běží simulátor (pro zobrazení tlačítek „kiosk“ a varování). */
let mockCache: Promise<boolean> | null = null;
export function useQueueMock() {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    let cancelled = false;
    mockCache ??= queueApi
      .config()
      .then((c) => !!c.mock)
      .catch(() => false);
    mockCache.then((m) => !cancelled && setMock(m));
    return () => {
      cancelled = true;
    };
  }, []);
  return mock;
}

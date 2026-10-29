"use client";

import { useCallback, useEffect, useState } from "react";
import { queueApi, queueOrder } from "@/lib/call250v/browser";
import type { QueueItem } from "@/lib/call250v/types";

/**
 * Pravidelně načítá frontu (Call250V nemá webhooky → polling).
 * `run(akce)` provede akci, okamžitě obnoví seznam a zachytí chybu do `error`.
 */
export function useQueue(serviceIds: string[], intervalMs = 3000) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const key = serviceIds.join(",");

  const refresh = useCallback(async () => {
    try {
      const ids = key ? key.split(",") : [];
      const data = await queueApi.list(ids);
      setItems([...data].sort(queueOrder));
      setPollError(null);
    } catch (e) {
      setPollError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, refresh]);

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

  const error = actionError ?? pollError;
  const clearError = () => setActionError(null);
  return { items, error, clearError, loading, busy, refresh, run };
}

/** Jestli běží simulátor (pro zobrazení tlačítek „kiosk“ a varování). */
export function useQueueMock() {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    queueApi
      .config()
      .then((c) => setMock(!!c.mock))
      .catch(() => setMock(false));
  }, []);
  return mock;
}

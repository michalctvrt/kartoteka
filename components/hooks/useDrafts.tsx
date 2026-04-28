"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * useDrafts – sleduje drafty pacientů v localStorage
 * vrací: { map, count, latestId, rescan }
 */
export default function useDrafts() {
  const [map, setMap] = useState<Record<string, { ts: number }>>({});

  const scan = useCallback(() => {
    try {
      const next: Record<string, { ts: number }> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("patient-draft:") && !key.endsWith(":meta")) {
          const id = key.split(":")[1];
          const meta = localStorage.getItem(`patient-draft:${id}:meta`);
          const ts = meta ? (JSON.parse(meta).ts as number) : 0;
          next[id] = { ts };
        }
      }

      // aktualizuj jen pokud se změnilo
      setMap((prev) => {
        const same =
          Object.keys(prev).length === Object.keys(next).length &&
          Object.keys(prev).every((k) => next[k] && prev[k].ts === next[k].ts);
        return same ? prev : next;
      });
    } catch {
      setMap({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 🧠 první scan odložíme, aby se nespustil synchronně při mountu
    queueMicrotask(() => scan());

    // naslouchání na změny storage z jiných tabů
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("patient-draft:")) scan();
    };

    // 🩸 a navíc reaguj i na custom event z té samé taby
    const onPatientUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string }>;
      if (!ce.detail?.id) {
        // pokud není id, přepočítej celé
        scan();
      } else {
        // ověř, jestli draft pro dané id ještě existuje
        const key = `patient-draft:${ce.detail.id}`;
        if (localStorage.getItem(key) === null) {
          // draft smazán → přepočítej
          scan();
        }
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("patient-updated", onPatientUpdated);

    const interval = setInterval(scan, 1500);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("patient-updated", onPatientUpdated);
      clearInterval(interval);
    };
  }, [scan]);

  const ids = Object.keys(map);
  const count = ids.length;
  const latestId =
    ids.length > 0
      ? ids.reduce((a, b) => (map[a].ts >= map[b].ts ? a : b))
      : null;

  return { map, count, latestId, rescan: scan };
}

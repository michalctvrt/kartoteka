"use client";

/**
 * Objednávky ze SuperSaaS (app/api/supersaas/booking → v demo režimu smyšlené).
 * Časy chodí jako místní čas bez zóny („2026-10-29T07:00:00“).
 */

import { useCallback, useEffect, useState } from "react";
import { bridge } from "@/lib/runtimeConfig";

export type Booking = {
  id: number;
  title: string; // jméno pacienta
  start: Date;
  end: Date;
  exam: string; // popis vyšetření z objednávky (např. „UZ břicha“, „dopler DK“)
  details: Record<string, string>;
};

const SCHEDULE_ID = 268518; // UZ Vídeňská – stejné jako v app/api/supersaas (TODO: víc rozvrhů)
export const SCHEDULE_NAME = "UZ Vídeňská";

type Raw = { id: number; title: string; start: string; end: string; details?: Record<string, unknown> };

export function useBookings() {
  const [state, setState] = useState<{ list: Booking[]; error: string | null; loading: boolean }>({
    list: [],
    error: null,
    loading: true,
  });

  const load = useCallback(() => {
    fetch(bridge(`supersaas/booking?schedule_id=${SCHEDULE_ID}`), { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !Array.isArray(data)) throw new Error((data as { error?: string })?.error ?? `Chyba ${r.status}`);
        const list = (data as Raw[])
          .map((e) => {
            const details = Object.fromEntries(Object.entries(e.details ?? {}).map(([k, v]) => [k, String(v ?? "")]));
            return {
              id: Number(e.id),
              title: e.title,
              start: new Date(e.start),
              end: new Date(e.end),
              // jen to, co pacient vyplnil (typ služby je u všech stejný – „UZ Videnska“)
              exam: (details["Vyšetření"] ?? "").trim(),
              details,
            };
          })
          .sort((a, b) => a.start.getTime() - b.start.getTime());
        setState({ list, error: null, loading: false });
      })
      .catch((e: Error) => setState({ list: [], error: e.message, loading: false }));
  }, []);

  useEffect(() => load(), [load]);

  const reload = () => {
    setState((s) => ({ ...s, loading: true }));
    load();
  };

  return { ...state, reload };
}

// ─── datum ───

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
/** Pondělí týdne, do kterého den patří. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
export const hm = (d: Date) => d.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });

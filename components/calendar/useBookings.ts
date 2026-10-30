"use client";

/**
 * Objednávky ze SuperSaaS (app/api/supersaas/booking → v demo režimu smyšlené), víc kalendářů najednou.
 * Časy chodí jako místní čas bez zóny („2026-10-29T07:00:00“).
 */

import { useCallback, useEffect, useState } from "react";
import { bridge } from "@/lib/runtimeConfig";
import { calendarById } from "@/lib/supersaas/calendars";

export type Booking = {
  id: number;
  title: string; // jméno pacienta
  start: Date;
  end: Date;
  exam: string; // popis vyšetření z objednávky (např. „UZ břicha“, „dopler DK“)
  details: Record<string, string>;
  /** kalendář SuperSaaS, ze kterého objednávka je (lib/supersaas/calendars.ts) */
  calendarId: number;
};

type Raw = { id: number; title: string; start: string; end: string; details?: Record<string, unknown> };

async function loadOne(calendarId: number): Promise<Booking[]> {
  const r = await fetch(bridge(`supersaas/booking?schedule_id=${calendarId}`), { cache: "no-store" });
  const data = await r.json();
  if (!r.ok || !Array.isArray(data)) throw new Error((data as { error?: string })?.error ?? `Chyba ${r.status}`);
  return (data as Raw[]).map((e) => {
    const details = Object.fromEntries(Object.entries(e.details ?? {}).map(([k, v]) => [k, String(v ?? "")]));
    return {
      id: Number(e.id),
      title: e.title,
      start: new Date(e.start),
      end: new Date(e.end),
      // jen to, co pacient vyplnil (typ služby je v kalendáři u všech stejný)
      exam: (details["Vyšetření"] ?? "").trim(),
      details,
      calendarId,
    };
  });
}

/**
 * Objednávky z jednoho nebo víc kalendářů najednou. Když některý kalendář selže, ostatní se ukážou
 * a chyba řekne, který chybí.
 */
export function useBookings(calendarIds: number[]) {
  const key = calendarIds.join(",");
  const [state, setState] = useState<{ key: string; list: Booking[]; error: string | null; loading: boolean }>({
    key: "",
    list: [],
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let off = false;
    const ids = key ? key.split(",").map(Number) : [];
    Promise.allSettled(ids.map(loadOne)).then((res) => {
      if (off) return;
      const list = res
        .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      const failed = ids.filter((_, i) => res[i].status === "rejected");
      const why = res.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason as Error | undefined;
      setState({
        key,
        list,
        loading: false,
        error: failed.length
          ? `${failed.map((id) => calendarById(id)?.short ?? id).join(", ")}: ${why?.message ?? "nepodařilo se načíst"}`
          : null,
      });
    });
    return () => {
      off = true;
    };
  }, [key, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setTick((t) => t + 1);
  }, []);

  // jiný výběr kalendářů = zase „načítám“ (staré objednávky jiného kalendáře neukazovat)
  const current = state.key === key;
  return { list: current ? state.list : [], error: current ? state.error : null, loading: !current || state.loading, reload };
}

/** Dlouhý blok (≥ 3 h) = blokace rozvrhu (dovolená, servis…), ne objednávka pacienta. */
export const isBlock = (b: Booking) => b.end.getTime() - b.start.getTime() >= 3 * 3600_000;

// ─── datum ───

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
/** Pondělí týdne, do kterého den patří. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
export const hm = (d: Date) => d.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" });

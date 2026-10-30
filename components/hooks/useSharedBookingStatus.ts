"use client";

/**
 * Stav „Dnešních objednávek“ (přišel / odebrán) SDÍLENÝ mezi recepcemi (most booking-status).
 * Obnova každých 15 s a při návratu do okna. Klik se ukáže hned (optimisticky) a pošle na server;
 * když server neodpoví, stav zůstane v prohlížeči a pošle se znovu při další obnově.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { bridge } from "@/lib/runtimeConfig";
import { useSession } from "@/components/auth/SessionProvider";
import { employeeName } from "@/lib/auth/types";

export type SharedStatus = "checked_in" | "removed";
type Day = Record<string, { status: SharedStatus; by: string | null; at: string }>;

const LS_KEY = "rt_statuses_v10"; // záloha v prohlížeči (dřívější v9 byl jen místní)
const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD v místním čase

export function useSharedBookingStatus() {
  const { user } = useSession();
  const [day, setDay] = useState<Day>(() => {
    try {
      return (JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, Day>)[today()] ?? {};
    } catch {
      return {};
    }
  });
  const [offline, setOffline] = useState(false);
  const pending = useRef(new Map<string, SharedStatus | null>()); // neodeslané změny

  const keep = (d: Day) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ [today()]: d }));
    } catch {}
  };

  const send = useCallback(
    async (id: string, status: SharedStatus | null) => {
      const r = await fetch(bridge("booking-status"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: today(), id, status, by: user ? employeeName(user) : null }),
      });
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json()) as Day;
    },
    [user]
  );

  const refresh = useCallback(async () => {
    try {
      // nejdřív doposlat, co neodešlo
      for (const [id, st] of [...pending.current]) {
        await send(id, st);
        pending.current.delete(id);
      }
      const r = await fetch(bridge(`booking-status?date=${today()}`), { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as Day;
      // ještě neodeslané změny nechat vidět
      for (const [id, st] of pending.current) {
        if (st) d[id] = { status: st, by: null, at: new Date().toISOString() };
        else delete d[id];
      }
      setDay(d);
      keep(d);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [send]);

  useEffect(() => {
    // první načtení hned, pak každých 15 s a při návratu do okna
    const first = setTimeout(refresh, 0);
    const t = setInterval(refresh, 15_000);
    const on = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", on);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", on);
    };
  }, [refresh]);

  const set = (id: string, status: SharedStatus | null) => {
    setDay((d) => {
      const n = { ...d };
      if (status) n[id] = { status, by: user ? employeeName(user) : null, at: new Date().toISOString() };
      else delete n[id];
      keep(n);
      return n;
    });
    send(id, status)
      .then(() => setOffline(false))
      .catch(() => {
        pending.current.set(id, status);
        setOffline(true);
      });
  };

  return { status: (id: string) => day[id]?.status, by: (id: string) => day[id]?.by ?? null, set, offline };
}

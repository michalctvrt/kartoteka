"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { format, isToday, differenceInMinutes } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock, User, Check, X, RotateCcw } from "lucide-react";
import React from "react";

interface SuperSaaSBooking {
  id: string | number;
  full_name?: string;
  title?: string;
  start: string;
  finish?: string;
  end?: string;
  field_1_r?: string;
  service_name?: string;
  mobile?: string;
  details?: Record<string, string>;
}

interface ApiEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  details: Record<string, string>;
}

type LocalState = Record<string, "scheduled" | "checked_in" | "removed">;
type DerivedStatus = "scheduled" | "late" | "absent" | "checked_in" | "removed";

const LS_KEY = "rt_statuses_v9";

export default function ReceptionTodayList() {
  const pathname = usePathname();

  // ✅ Inicializace stavu z localStorage
  const [localState, setLocalState] = useState<LocalState>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 💾 Ulož stav do localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(localState));
    } catch {}
  }, [localState]);

  // 🔁 Znovunačtení při návratu z jiné stránky
  useEffect(() => {
    const loadState = () => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setLocalState(JSON.parse(raw));
      } catch {}
    };
    loadState();
  }, [pathname]);

  // 🆔 Stabilní ID
  const makeStableId = (title: string, start: string) => {
    const date = new Date(start);
    const localDate = new Date(
      date.toLocaleString("en-US", { timeZone: "Europe/Prague" })
    );
    const safeTitle = (title || "").toLowerCase().replace(/\s+/g, "-");
    const day = format(localDate, "yyyy-MM-dd");
    const time = format(localDate, "HH:mm");
    return `${safeTitle}_${day}_${time}`;
  };

  // 📅 Načti dnešní objednávky
  useEffect(() => {
    let mounted = true;
    const fetchToday = async () => {
      try {
        const res = await fetch("/api/supersaas/booking?schedule_id=268518", {
          cache: "no-store",
        });
        const data: SuperSaaSBooking[] = await res.json();

        if (!Array.isArray(data)) {
          setEvents([]);
          return;
        }

        const todayEvents: ApiEvent[] = data
          .map((e: SuperSaaSBooking) => {
            const title = e.full_name || e.title || "Neznámý pacient";
            const start = e.start;
            const end = e.finish ?? e.end ?? e.start;
            const id = makeStableId(title, start);
            return {
              id,
              title,
              start,
              end,
              details: e.details || {
                Vyšetření: e.field_1_r || "",
                "Typ služby": e.service_name || "",
                Mobil: e.mobile || "",
              },
            };
          })
          .filter((e) => isToday(new Date(e.start)))
          .sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
          );

        if (mounted) setEvents(todayEvents);
      } catch (error) {
        console.error("❌ Chyba při načítání dnešních pacientů:", error);
        if (mounted) setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchToday();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔄 Automatická aktualizace zpoždění
  useEffect(() => {
    const t = setInterval(() => setLocalState((s) => ({ ...s })), 60_000);
    return () => clearInterval(t);
  }, []);

  const deriveStatus = useCallback(
    (ev: ApiEvent): DerivedStatus => {
      const id = ev.id;
      if (localState[id] === "checked_in") return "checked_in";
      if (localState[id] === "removed") return "removed";

      const now = new Date();
      const start = new Date(ev.start);
      const minutesLate = differenceInMinutes(now, start);

      if (minutesLate >= 20) return "absent";
      if (minutesLate >= 0) return "late";
      return "scheduled";
    },
    [localState]
  );

  const markCheckedIn = (id: string) =>
    setLocalState((prev) => ({ ...prev, [id]: "checked_in" }));

  const uncheck = (id: string) =>
    setLocalState((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

  const markRemoved = (id: string) =>
    setLocalState((prev) => ({ ...prev, [id]: "removed" }));

  const truncate = (text: string | undefined, max: number) =>
    !text ? "—" : text.length > max ? text.substring(0, max) + "…" : text;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📋 Dnešní přehled</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Načítám dnešní objednávky…</p>
        </CardContent>
      </Card>
    );
  }

  // 🧩 Rozdělení do sekcí
  const activeEvents = events.filter(
    (e) => localState[e.id] !== "checked_in" && localState[e.id] !== "removed"
  );
  const doneEvents = events.filter((e) => localState[e.id] === "checked_in");
  const removedEvents = events.filter((e) => localState[e.id] === "removed");

  // 🧩 Pomocná funkce pro vykreslení seznamu
  const renderList = (
    items: ApiEvent[],
    colorClass: string,
    actions?: (ev: ApiEvent) => React.ReactNode
  ) => (
    <ul className="divide-y divide-gray-200 dark:divide-neutral-700">
      {items.map((ev) => {
        const timeLabel = `${format(new Date(ev.start), "HH:mm")}–${format(
          new Date(ev.end),
          "HH:mm"
        )}`;

        return (
          <li
            key={ev.id}
            className={`${colorClass} px-3 py-2 flex items-center justify-between hover:brightness-95 dark:hover:brightness-110 transition`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  <User className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="truncate">{ev.title}</span>
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-medium">{timeLabel}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">
                    {truncate(ev.details["Vyšetření"], 30)}
                  </span>
                </div>
              </div>
            </div>
            {actions?.(ev)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 🔵 Aktivní objednávky */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivní objednávky</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeEvents.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">
              Žádné aktivní objednávky.
            </p>
          ) : (
            renderList(activeEvents, "bg-white", (ev) => {
              const status = deriveStatus(ev);
              return (
                <div className="flex items-center gap-2">
                  {status !== "checked_in" && (
                    <button
                      onClick={() => markCheckedIn(ev.id)}
                      title="Označit jako přítomný"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-green-700 hover:bg-green-100 transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {status === "absent" && (
                    <button
                      onClick={() => markRemoved(ev.id)}
                      title="Zrušit"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-red-700 hover:bg-red-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ✅ Vyřízeno */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Vyřízeno</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {doneEvents.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">Zatím žádní vyřízení.</p>
          ) : (
            renderList(doneEvents, "bg-green-50", (ev) => (
              <button
                onClick={() => uncheck(ev.id)}
                title="Vrátit zpět"
                className="inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* ❌ Zrušeno */}
      <Card>
        <CardHeader>
          <CardTitle>❌ Zrušeno</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {removedEvents.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">Nic zrušeného.</p>
          ) : (
            renderList(removedEvents, "bg-red-50", (ev) => (
              <button
                onClick={() => uncheck(ev.id)}
                title="Vrátit zpět"
                className="inline-flex items-center justify-center p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { format, isToday, differenceInMinutes } from "date-fns";
import { Clock, User, Check, X, RotateCcw } from "lucide-react";
import React from "react";
import { FULL, type WidgetSize } from "@/components/dashboard/size";
import { bridge } from "@/lib/runtimeConfig";
import { useWorkstation } from "@/components/queue/useWorkstation";
import { useSharedBookingStatus } from "@/components/hooks/useSharedBookingStatus";

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

type DerivedStatus = "scheduled" | "late" | "absent" | "checked_in" | "removed";


/**
 * `size` = podoba podle velikosti okna na ploše:
 *  S – souhrn (počet čekajících objednávek + kdo je další),
 *  M – jen aktivní objednávky, L – vše (aktivní, vyřízeno, zrušeno).
 */
export default function ReceptionTodayList({ size = FULL }: { size?: WidgetSize } = {}) {

  // Inicializace stavu z localStorage
  // stav přišel / odebrán SDÍLENÝ mezi recepcemi (dřív jen v tomto prohlížeči)
  const shared = useSharedBookingStatus();
  const [, setTick] = useState(0); // přepočet „zpoždění“ každou minutu

  const [events, setEvents] = useState<ApiEvent[]>([]);
  // kalendář podle nastavení tohoto počítače (Nastavení → Toto pracoviště)
  const calendarId = useWorkstation().ws.calendarId;
  const [loading, setLoading] = useState(true);

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
        const res = await fetch(bridge(`supersaas/booking?schedule_id=${calendarId}`), {
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
        console.error("Chyba při načítání dnešních pacientů:", error);
        if (mounted) setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchToday();
    return () => {
      mounted = false;
    };
  }, [calendarId]);

  // 🔄 Automatická aktualizace zpoždění
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const deriveStatus = (ev: ApiEvent): DerivedStatus => {
      const st = shared.status(ev.id);
      if (st === "checked_in") return "checked_in";
      if (st === "removed") return "removed";

      const now = new Date();
      const start = new Date(ev.start);
      const minutesLate = differenceInMinutes(now, start);

      if (minutesLate >= 20) return "absent";
      if (minutesLate >= 0) return "late";
      return "scheduled";
  };

  const markCheckedIn = (id: string) => shared.set(id, "checked_in");
  const uncheck = (id: string) => shared.set(id, null);
  const markRemoved = (id: string) => shared.set(id, "removed");

  const truncate = (text: string | undefined, max: number) =>
    !text ? "—" : text.length > max ? text.substring(0, max) + "…" : text;

  if (loading) {
    return (
      <section>
                  <h3 className="mb-1 text-sm font-semibold">Dnešní objednávky</h3>
                <div>
          <p className="text-ui-faint text-sm">Načítám dnešní objednávky…</p>
        </div>
      </section>
    );
  }

  // 🧩 Rozdělení do sekcí
  const activeEvents = events.filter((e) => !shared.status(e.id));
  const doneEvents = events.filter((e) => shared.status(e.id) === "checked_in");
  const removedEvents = events.filter((e) => shared.status(e.id) === "removed");

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
                <span className="flex items-center gap-1 text-sm font-medium text-ui-ink truncate">
                  <User className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span className="truncate">{ev.title}</span>
                </span>
                <div className="flex items-center gap-2 text-xs text-ui-muted">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span className="font-medium">{timeLabel}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">
                    {truncate(ev.details["Vyšetření"], 30)}
                  </span>
                  {/* kdo odškrtl – při víc recepcích */}
                  {shared.by(ev.id) && <span className="hidden text-ui-faint md:inline">· {shared.by(ev.id)}</span>}
                </div>
              </div>
            </div>
            {actions?.(ev)}
          </li>
        );
      })}
    </ul>
  );

  // ── S: souhrn ──
  if (size.size === "S") {
    const next = activeEvents[0];
    return (
      <div className="h-full flex items-center gap-4">
        <div className="text-center shrink-0">
          <div className="text-4xl font-bold text-brand-700 dark:text-brand-300 leading-none">
            {activeEvents.length}
          </div>
          <div className="text-[11px] text-ui-faint mt-1">aktivních</div>
        </div>
        <div className="min-w-0 flex-1 text-sm">
          {next ? (
            <>
              <div className="text-xs text-ui-faint">Další</div>
              <div className="font-medium truncate">{next.title}</div>
              <div className="text-xs text-ui-faint truncate">
                {format(new Date(next.start), "HH:mm")} · {truncate(next.details["Vyšetření"], 40)}
              </div>
            </>
          ) : (
            <div className="text-ui-faint">Žádné aktivní objednávky.</div>
          )}
          <div className="text-[11px] text-ui-faint mt-1">
            {doneEvents.length} vyřízeno · {removedEvents.length} zrušeno
          </div>
        </div>
      </div>
    );
  }

  const activeActions = (ev: ApiEvent) => {
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
  };

  // ── M: jen aktivní objednávky, bez rámečků ──
  if (size.size === "M") {
    return activeEvents.length === 0 ? (
      <p className="text-ui-faint text-sm">Žádné aktivní objednávky.</p>
    ) : (
      <div className="-mx-3 -mb-3">{renderList(activeEvents, "bg-ui-sheet dark:bg-transparent", activeActions)}</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {shared.offline && (
        <p role="status" className="rounded-md border border-amber-200 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-900 dark:text-amber-200">
          Stav se teď nedaří uložit pro ostatní recepce – drží se v tomto počítači a pošle se, až server odpoví.
        </p>
      )}
      {/* 🔵 Aktivní objednávky */}
      <section>
                  <h3 className="mb-1 text-sm font-semibold">Aktivní objednávky</h3>
                <div className="-mx-3">
          {activeEvents.length === 0 ? (
            <p className="text-ui-faint text-sm p-4">
              Žádné aktivní objednávky.
            </p>
          ) : (
            renderList(activeEvents, "bg-ui-sheet", (ev) => {
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
        </div>
      </section>

      {/* Vyřízeno */}
      <section>
                  <h3 className="mb-1 text-sm font-semibold">Vyřízeno</h3>
                <div className="-mx-3">
          {doneEvents.length === 0 ? (
            <p className="text-ui-faint text-sm py-2">Zatím žádní vyřízení.</p>
          ) : (
            renderList(doneEvents, "bg-green-50", (ev) => (
              <button
                onClick={() => uncheck(ev.id)}
                title="Vrátit zpět"
                className="inline-flex items-center justify-center p-1 rounded-md text-ui-muted hover:text-gray-900 hover:bg-ui-raised transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            ))
          )}
        </div>
      </section>

      {/* Zrušeno */}
      <section>
                  <h3 className="mb-1 text-sm font-semibold">Zrušeno</h3>
                <div className="-mx-3">
          {removedEvents.length === 0 ? (
            <p className="text-ui-faint text-sm py-2">Nic zrušeného.</p>
          ) : (
            renderList(removedEvents, "bg-red-50", (ev) => (
              <button
                onClick={() => uncheck(ev.id)}
                title="Vrátit zpět"
                className="inline-flex items-center justify-center p-1 rounded-md text-ui-muted hover:text-gray-900 hover:bg-ui-raised transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

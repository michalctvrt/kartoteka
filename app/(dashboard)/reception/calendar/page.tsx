"use client";

/**
 * Kalendář objednávek (bento):
 *   Dnes (2 sl.) · Další na řadě · Tento týden
 *   Kalendář Den / Týden (3 sl.) + detail objednávky (1 sl.; bez výběru = další na řadě)
 * Data ze SuperSaaS (components/calendar/useBookings). Šipky ← → posouvají den/týden.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, Phone, RefreshCw, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, DataRow, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import TimeGrid from "@/components/calendar/TimeGrid";
import {
  SCHEDULE_NAME,
  addDays,
  hm,
  sameDay,
  startOfDay,
  startOfWeek,
  useBookings,
  type Booking,
} from "@/components/calendar/useBookings";

type View = "day" | "week";
const plural = (n: number) => (n === 1 ? "objednávka" : n >= 2 && n <= 4 ? "objednávky" : "objednávek");

export default function CalendarPage() {
  const { list, loading, error, reload } = useBookings();
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

  // čára „teď“ a „další na řadě“ se posouvají
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const days = useMemo(() => {
    if (view === "day") return [date];
    const mon = startOfWeek(date);
    const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    // víkend jen když je v něm objednávka
    return week.filter((d, i) => i < 5 || list.some((b) => sameDay(b.start, d)));
  }, [view, date, list]);

  const step = (dir: 1 | -1) => setDate((d) => addDays(d, dir * (view === "day" ? 1 : 7)));

  // klávesy ← → (mimo pole formulářů)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const today = list.filter((b) => sameDay(b.start, now));
  const doneToday = today.filter((b) => b.end <= now).length;
  const next = list.find((b) => b.end > now);
  const weekStart = startOfWeek(now);
  const thisWeek = list.filter((b) => b.start >= weekStart && b.start < addDays(weekStart, 7));
  const selected = list.find((b) => b.id === selectedId) ?? null;
  const isToday = view === "day" ? sameDay(date, now) : sameDay(startOfWeek(date), weekStart);

  const dayLabel = date.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
  const label =
    view === "day"
      ? dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)
      : `${days[0].toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })} – ${days[days.length - 1].toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })}`;

  const pending = (
    <div className="space-y-3 pt-1">
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kalendář objednávek</h1>
          <p className="mt-1 text-sm text-ui-muted">{SCHEDULE_NAME} · objednávky ze SuperSaaS</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={cn(loading && "animate-spin")} /> Obnovit
        </Button>
      </header>

      {error && (
        <div className="ui-tile flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>Objednávky se nepodařilo načíst: {error}</span>
          <button type="button" onClick={reload} className="text-ui-primary hover:underline">
            Zkusit znovu
          </button>
        </div>
      )}

      <Bento>
        {/* souhrn */}
        <BentoTile span={2} index={0} title="Dnes">
          {loading ? (
            pending
          ) : (
            <>
              <Metric
                value={today.length}
                unit={plural(today.length)}
                sub={today.length ? `${doneToday} hotovo · ${today.length - doneToday} zbývá` : undefined}
              />
              {today.length > 0 && (
                <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-ui-raised" aria-hidden>
                  <motion.span
                    className="bg-brand-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(doneToday / today.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              )}
            </>
          )}
        </BentoTile>
        <BentoTile index={1} title="Další na řadě">
          {loading ? (
            pending
          ) : next ? (
            <button type="button" className="text-left" onClick={() => {
              setSelectedId(next.id);
              setView("day");
              setDate(startOfDay(next.start));
            }}>
              <Metric
                value={<span className="text-[22px]">{sameDay(next.start, now) ? hm(next.start) : next.start.toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" }) + " " + hm(next.start)}</span>}
                sub={next.title}
              />
            </button>
          ) : (
            <Metric value="—" sub="žádná další objednávka" />
          )}
        </BentoTile>
        <BentoTile index={2} title="Tento týden">
          {loading ? pending : <Metric value={thisWeek.length} unit={plural(thisWeek.length)} />}
        </BentoTile>

        {/* kalendář */}
        <BentoTile
          span={2}
          index={3}
          className="xl:col-span-3"
          bodyClassName="px-0 pb-0"
          title={<span className="text-ui-ink">{label}</span>}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center">
                <Button size="sm" variant="ghost" onClick={() => step(-1)} aria-label={view === "day" ? "Předchozí den" : "Předchozí týden"}>
                  <ChevronLeft />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDate(startOfDay(new Date()))} disabled={isToday}>
                  Dnes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => step(1)} aria-label={view === "day" ? "Další den" : "Další týden"}>
                  <ChevronRight />
                </Button>
              </div>
              <Segmented<View>
                size="sm"
                label="Zobrazení"
                value={view}
                onChange={setView}
                options={[
                  { value: "day", label: "Den" },
                  { value: "week", label: "Týden" },
                ]}
              />
            </div>
          }
        >
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8" style={{ width: `${60 + ((i * 13) % 35)}%` }} />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${view}-${days[0].toISOString()}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="px-2 pb-3"
              >
                <TimeGrid days={days} bookings={list} selectedId={selectedId} onSelect={(b) => setSelectedId(b.id)} now={now} />
              </motion.div>
            </AnimatePresence>
          )}
        </BentoTile>

        {/* detail */}
        <BookingDetail booking={selected ?? (loading ? null : next ?? null)} isNext={!selected && !!next} index={4} onClear={selected ? () => setSelectedId(null) : undefined} loading={loading} />
      </Bento>
    </div>
  );
}

function BookingDetail({
  booking: b,
  isNext,
  index,
  onClear,
  loading,
}: {
  booking: Booking | null;
  isNext: boolean;
  index: number;
  onClear?: () => void;
  loading: boolean;
}) {
  const d = b?.details ?? {};
  return (
    <BentoTile
      index={index}
      className="xl:sticky xl:top-4 xl:self-start"
      title={isNext ? "Další na řadě" : "Objednávka"}
      action={
        onClear && (
          <button type="button" onClick={onClear} className="text-[13px] text-ui-primary hover:underline">
            Další na řadě
          </button>
        )
      }
    >
      {loading ? (
        <div className="space-y-2 pt-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-full" />
        </div>
      ) : !b ? (
        <Ghost label="Žádná objednávka" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={b.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="text-[17px] font-semibold leading-snug">{b.title}</div>
            <div className="mt-0.5 text-[13px] text-ui-muted">
              {b.start.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" })} · {hm(b.start)}–{hm(b.end)}
            </div>
            {b.exam && <div className="mt-3 inline-flex rounded-md border border-ui-line bg-ui-raised px-2 py-1 text-[13px]">{b.exam}</div>}
            <dl className="mt-3 divide-y divide-ui-rule">
              <DataRow label="Narozen(a)">{d["Datum narození"] ? new Date(d["Datum narození"]).toLocaleDateString("cs-CZ") : null}</DataRow>
              <DataRow label="Pohlaví">{d["Pohlaví"]}</DataRow>
              <DataRow label="Telefon">
                {d["Mobil"] && (
                  <a href={`tel:${d["Mobil"].replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-ui-primary">
                    <Phone className="h-3.5 w-3.5 text-ui-faint" /> {d["Mobil"]}
                  </a>
                )}
              </DataRow>
              <DataRow label="E-mail">
                {d["Email"] && (
                  <a href={`mailto:${d["Email"]}`} className="inline-flex items-center gap-1 hover:text-ui-primary">
                    <Mail className="h-3.5 w-3.5 text-ui-faint" /> {d["Email"]}
                  </a>
                )}
              </DataRow>
              <DataRow label="Služba">{d["Typ služby"]}</DataRow>
            </dl>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link href={`/reception/patients?q=${encodeURIComponent(b.title)}`}>
                <UserSearch /> Vyhledat v kartotéce
              </Link>
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </BentoTile>
  );
}

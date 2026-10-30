"use client";

/**
 * Kalendář objednávek (bento):
 *   Dnes (2 sl.) · Další na řadě · Tento týden
 *   Kalendář Den / Týden (3 sl.) + detail objednávky (1 sl.; bez výběru = další na řadě)
 * Data ze SuperSaaS (components/calendar/useBookings). Šipky ← → posouvají den/týden.
 * Nahoře výběr kalendáře (lib/supersaas/calendars.ts): „Vše“ = všechny pobočky – den ukáže kalendáře
 * vedle sebe, týden je sloučí (barevný proužek = kalendář). Výběr si pamatuje prohlížeč.
 */

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2, Mail, Phone, RefreshCw, Trash2, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, DataRow, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import TimeGrid, { type GridColumn } from "@/components/calendar/TimeGrid";
import { ALL_REAL, BOOKABLE, CALENDARS, calendarById } from "@/lib/supersaas/calendars";
import BookingDialog, { type BookingPrefill } from "@/components/calendar/BookingDialog";
import { useSession } from "@/components/auth/SessionProvider";
import { PatientService } from "@/lib/api/generated/services/PatientService";
import {
  addDays,
  cancelBooking,
  hm,
  isBlock,
  sameDay,
  startOfDay,
  startOfWeek,
  useBookings,
  type Booking,
} from "@/components/calendar/useBookings";

type View = "day" | "week";
const plural = (n: number) => (n === 1 ? "objednávka" : n >= 2 && n <= 4 ? "objednávky" : "objednávek");

// výběr kalendáře: "all" nebo číslo kalendáře; v prohlížeči (useSyncExternalStore = bez nesouladu se serverem)
const SEL_KEY = "kartoteka_calendar_sel";
const SEL_EVENT = "kartoteka-calendar-sel";
const subscribeSel = (cb: () => void) => {
  window.addEventListener(SEL_EVENT, cb);
  return () => window.removeEventListener(SEL_EVENT, cb);
};
const readSel = () => {
  try {
    return localStorage.getItem(SEL_KEY) ?? "all";
  } catch {
    return "all";
  }
};
function useCalendarSel(): [number | "all", (v: number | "all") => void] {
  const raw = useSyncExternalStore(subscribeSel, readSel, () => "all");
  const sel = raw !== "all" && calendarById(Number(raw)) ? Number(raw) : "all";
  const set = (v: number | "all") => {
    try {
      localStorage.setItem(SEL_KEY, String(v));
    } catch {}
    window.dispatchEvent(new Event(SEL_EVENT));
  };
  return [sel, set];
}

const colorOf = (b: Booking) => calendarById(b.calendarId)?.color;

/** Adresa ?book=1&pid=… (z karty pacienta) otevře novou objednávku s jeho údaji – proto Suspense. */
export default function CalendarRoute() {
  return (
    <Suspense>
      <CalendarPage />
    </Suspense>
  );
}

const GENDER: Record<string, "Žena" | "Muž"> = { FEMALE: "Žena", MALE: "Muž" };

function CalendarPage() {
  const router = useRouter();
  const query = useSearchParams();
  const canBook = useSession().can("calendar.book") && BOOKABLE.length > 0;
  const [booking, setBooking] = useState<BookingPrefill | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [sel, setSel] = useCalendarSel();
  const ids = useMemo(() => (sel === "all" ? ALL_REAL.map((c) => c.id) : [sel]), [sel]);
  const { list, loading, error, reload } = useBookings(ids);
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

  // „Vše“ ve dni = jeden sloupec na kalendář pobočky
  const columns: GridColumn[] | undefined =
    sel === "all" && view === "day"
      ? ALL_REAL.map((c) => ({
          key: String(c.id),
          date,
          filter: (b: Booking) => b.calendarId === c.id,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
              {c.short}
            </span>
          ),
        }))
      : undefined;

  // z karty pacienta: ?book=1&pid=… → formulář s údaji pacienta (adresa se hned uklidí, ať se neotvírá znovu)
  const bookPid = query.get("book") === "1" ? query.get("pid") : null;
  useEffect(() => {
    if (!bookPid || !canBook) return;
    router.replace("/reception/calendar");
    PatientService.findByPid(bookPid)
      .then((pt) => {
        const d = pt.patientDataInfo;
        setBooking({
          calendarId: sel === "all" ? undefined : sel,
          fullName: [d?.firstName, d?.lastName].filter(Boolean).join(" "),
          birthYear: d?.birthDate?.slice(0, 4) ?? "",
          gender: GENDER[d?.gender ?? ""] ?? "",
          mobile: d?.phone ?? "",
          email: d?.email ?? "",
        });
      })
      .catch(() => setBooking({}));
  }, [bookPid, canBook, router, sel]);

  // klik do volného místa – jen v kalendáři, kam jde zapisovat
  const selCal = sel === "all" ? null : calendarById(sel);
  const onEmptyClick = canBook && selCal?.bookable ? (start: Date) => setBooking({ calendarId: selCal.id, start }) : undefined;

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

  // počty a „další na řadě“ jen z objednávek pacientů (blokace rozvrhu ne)
  const patients = list.filter((b) => !isBlock(b));
  const today = patients.filter((b) => sameDay(b.start, now));
  const doneToday = today.filter((b) => b.end <= now).length;
  const next = patients.find((b) => b.end > now);
  const weekStart = startOfWeek(now);
  const thisWeek = patients.filter((b) => b.start >= weekStart && b.start < addDays(weekStart, 7));
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
          <p className="mt-1 text-sm text-ui-muted">
            {sel === "all" ? "Všechny pobočky" : calendarById(sel)?.name} · objednávky ze SuperSaaS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} /> Obnovit
          </Button>
          {canBook && (
            <Button onClick={() => setBooking({ calendarId: selCal?.bookable ? selCal.id : undefined })}>
              <CalendarPlus /> Nová objednávka
            </Button>
          )}
        </div>
      </header>

      {flash && (
        <p role="status" className="rounded-lg border border-emerald-200 px-3 py-2 text-[13px] text-emerald-800 dark:border-emerald-900 dark:text-emerald-200">
          {flash}
        </p>
      )}
      {booking && (
        <BookingDialog
          prefill={booking}
          onClose={() => setBooking(null)}
          onCreated={({ id, calendarId, start }) => {
            setBooking(null);
            setSel(calendarId);
            setView("day");
            setDate(startOfDay(start));
            setSelectedId(id);
            setFlash(`Objednáno: ${start.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" })} ${hm(start)} · ${calendarById(calendarId)?.name}`);
            reload();
          }}
        />
      )}

      {/* výběr kalendáře */}
      <div role="radiogroup" aria-label="Kalendář" className="flex flex-wrap gap-1.5">
        {[{ id: "all" as const, short: "Vše", color: "" }, ...CALENDARS].map((c) => {
          const on = sel === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setSel(c.id);
                setSelectedId(null);
              }}
              className={cn(
                "ui-press inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors",
                on ? "border-ui-primary bg-ui-active font-medium text-ui-ink" : "border-ui-line text-ui-muted hover:bg-ui-raised hover:text-ui-ink"
              )}
            >
              {c.color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: c.color }} />}
              {c.short}
            </button>
          );
        })}
      </div>

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
          ) : sel === "all" && view === "week" ? (
            // všechny kalendáře × týden = přehled počtů (bloky by byly nečitelně úzké)
            <WeekOverview
              days={days}
              list={patients}
              now={now}
              onPick={(d) => {
                setDate(startOfDay(d));
                setView("day");
              }}
            />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${view}-${sel}-${days[0].toISOString()}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="px-2 pb-3"
              >
                <TimeGrid
                  days={days}
                  columns={columns}
                  bookings={list}
                  selectedId={selectedId}
                  onSelect={(b) => setSelectedId(b.id)}
                  now={now}
                  colorOf={sel === "all" ? colorOf : undefined}
                  onEmptyClick={onEmptyClick}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </BentoTile>

        {/* detail */}
        <BookingDetail
          booking={selected ?? (loading ? null : next ?? null)}
          isNext={!selected && !!next}
          index={4}
          onClear={selected ? () => setSelectedId(null) : undefined}
          loading={loading}
          canCancel={canBook}
          onCancelled={(b) => {
            setSelectedId(null);
            setFlash(`Zrušeno: ${b.title} ${b.start.toLocaleDateString("cs-CZ")} ${hm(b.start)}`);
            reload();
          }}
        />
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
  canCancel,
  onCancelled,
}: {
  booking: Booking | null;
  isNext: boolean;
  index: number;
  onClear?: () => void;
  loading: boolean;
  canCancel: boolean;
  onCancelled: (b: Booking) => void;
}) {
  const d = b?.details ?? {};
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ id: number; text: string } | null>(null);
  const cancellable = !!b && canCancel && !!calendarById(b.calendarId)?.bookable;
  const cancel = async () => {
    if (!b || !window.confirm(`Zrušit objednávku ${b.title} (${b.start.toLocaleDateString("cs-CZ")} ${hm(b.start)})?`)) return;
    setBusy(true);
    try {
      await cancelBooking(b.id, b.calendarId);
      onCancelled(b);
    } catch (e) {
      setErr({ id: b.id, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
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
              <DataRow label="Kalendář">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: calendarById(b.calendarId)?.color }} />
                  {calendarById(b.calendarId)?.name}
                </span>
              </DataRow>
            </dl>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link href={`/reception/patients?q=${encodeURIComponent(b.title)}`}>
                <UserSearch /> Vyhledat v kartotéce
              </Link>
            </Button>
            {cancellable && (
              <Button variant="ghost" size="sm" className="mt-2 w-full text-red-700 dark:text-red-300" onClick={cancel} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Zrušit objednávku
              </Button>
            )}
            {err?.id === b.id && <p className="mt-2 text-[13px] text-red-700 dark:text-red-300">{err.text}</p>}
          </motion.div>
        </AnimatePresence>
      )}
    </BentoTile>
  );
}

/** Týden pro všechny kalendáře: řádek = kalendář, sloupec = den, číslo = objednávky. Klik → ten den. */
function WeekOverview({ days, list, now, onPick }: { days: Date[]; list: Booking[]; now: Date; onPick: (d: Date) => void }) {
  const count = (calId: number, d: Date) => list.filter((b) => b.calendarId === calId && sameDay(b.start, d)).length;
  const max = Math.max(1, ...ALL_REAL.flatMap((c) => days.map((d) => count(c.id, d))));
  return (
    <div className="overflow-x-auto px-4 pb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[12px] text-ui-muted">
            <th className="py-2 pr-3 font-normal">Kalendář</th>
            {days.map((d) => (
              <th key={d.toISOString()} className={cn("px-2 py-2 text-center font-normal", sameDay(d, now) && "font-medium text-ui-primary")}>
                {d.toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" })}
              </th>
            ))}
            <th className="py-2 pl-3 text-right font-medium text-ui-ink">Týden</th>
          </tr>
        </thead>
        <tbody>
          {ALL_REAL.map((c, i) => {
            const total = days.reduce((n, d) => n + count(c.id, d), 0);
            return (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                className="border-t border-ui-rule"
              >
                <td className="whitespace-nowrap py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.short}
                  </span>
                </td>
                {days.map((d) => {
                  const n = count(c.id, d);
                  return (
                    <td key={d.toISOString()} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onPick(d)}
                        title={`${c.name} · ${d.toLocaleDateString("cs-CZ")} – otevřít den`}
                        className={cn("h-9 w-full rounded-md tabular-nums transition-colors hover:ring-1 hover:ring-ui-primary", n ? "text-ui-ink" : "text-ui-faint")}
                        // sytost podkladu podle obsazenosti – na první pohled vidět, kde je místo
                        style={n ? { background: `color-mix(in srgb, ${c.color} ${Math.round(8 + (n / max) * 22)}%, transparent)` } : undefined}
                      >
                        {n || "–"}
                      </button>
                    </td>
                  );
                })}
                <td className="py-2 pl-3 text-right font-semibold tabular-nums">{total}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


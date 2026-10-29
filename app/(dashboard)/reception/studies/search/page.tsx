"use client";

/**
 * Vyhledávání studií (bento).
 * Nahoře jedno pole (číslo studie / RČ / příjmení) + modalita + období, pod tím
 * souhrn výsledků (počet s poměrem modalit, kolik čeká na popis, nejnovější)
 * a seznam. Hledá se samo po 350 ms klidu; klik na řádek otevře kartu studie.
 * Poslední dotaz si pamatujeme v sessionStorage, aby „Zpět“ z karty vrátil výsledky.
 */

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { apiErrorText } from "@/lib/study/lookups";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import StudyList from "@/components/study/StudyList";
import { EMPTY_QUERY, formatDateTime, hasReport, patientName, searchStudies, type StudyQuery } from "@/lib/studies";

const STORE = "kartoteka_study_search";
const BAR: Record<string, string> = { RTG: "bg-orange-400", UZ: "bg-sky-500", MRI: "bg-purple-500" };

function readStored(): StudyQuery {
  try {
    const raw = sessionStorage.getItem(STORE);
    return raw ? { ...EMPTY_QUERY, ...JSON.parse(raw) } : EMPTY_QUERY;
  } catch {
    return EMPTY_QUERY;
  }
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};
const plural = (n: number) => (n === 1 ? "studie" : n >= 2 && n <= 4 ? "studie" : "studií");

export default function StudiesSearchPage() {
  const [q, setQ] = useState<StudyQuery>(EMPTY_QUERY);
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<StudyInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // obnov poslední dotaz (až na klientovi)
  useEffect(() => {
    setQ(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORE, JSON.stringify(q));
    } catch {}
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchStudies(q);
        if (my !== seq.current) return;
        setRows(res.rows);
        setTotal(res.total);
        setError(null);
      } catch (e) {
        if (my !== seq.current) return;
        setError(
          e instanceof ApiError
            ? e.status === 401
              ? "Přihlášení k backendu vypršelo (401)."
              : apiErrorText(e)
            : "Studie se nepodařilo načíst."
        );
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, q.text ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, ready]);

  const set = (patch: Partial<StudyQuery>) => setQ((p) => ({ ...p, ...patch }));
  const filtered = !!(q.text || q.modality || q.dateFrom || q.dateTo);
  const today = isoDay(new Date());
  const range = (from: string | null, to: string | null) => q.dateFrom === from && q.dateTo === to;
  const period = range(null, null)
    ? "all"
    : range(today, today)
    ? "today"
    : range(daysAgo(6), today)
    ? "7"
    : range(daysAgo(29), today)
    ? "30"
    : "custom";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Vyhledat studii</h1>
        <p className="mt-1 text-sm text-ui-muted">Číslo studie, rodné číslo nebo příjmení pacienta</p>
      </header>

      {/* Hledání a filtry */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block min-w-[260px] flex-1">
          <span className="sr-only">Číslo studie, rodné číslo nebo příjmení</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-faint" />
          <input
            autoFocus
            value={q.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="např. 3260000003, 691110/3815 nebo Novák"
            className="ui-input h-11 pl-9 pr-9 text-[15px]"
          />
          {q.text && (
            <button
              type="button"
              onClick={() => set({ text: "" })}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ui-faint hover:bg-ui-sheet hover:text-ui-ink"
              aria-label="Vymazat hledání"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <Segmented
          label="Modalita"
          value={q.modality}
          onChange={(m) => set({ modality: m })}
          options={[null, "RTG", "UZ", "MRI"].map((m) => ({ value: m, label: m ?? "Vše" }))}
        />
        <Segmented
          label="Období"
          value={period}
          onChange={(v) =>
            set(
              v === "all"
                ? { dateFrom: null, dateTo: null }
                : v === "today"
                ? { dateFrom: today, dateTo: today }
                : { dateFrom: daysAgo(Number(v) - 1), dateTo: today }
            )
          }
          options={[
            { value: "all", label: "Kdykoli" },
            { value: "today", label: "Dnes" },
            { value: "7", label: "7 dní" },
            { value: "30", label: "30 dní" },
          ]}
        />
        <div className="flex gap-2">
          <input
            type="date"
            aria-label="Datum od"
            value={q.dateFrom ?? ""}
            onChange={(e) => set({ dateFrom: e.target.value || null })}
            className="ui-input w-[140px] text-[13px]"
          />
          <input
            type="date"
            aria-label="Datum do"
            value={q.dateTo ?? ""}
            onChange={(e) => set({ dateTo: e.target.value || null })}
            className="ui-input w-[140px] text-[13px]"
          />
        </div>
        {filtered && (
          <button type="button" onClick={() => setQ(EMPTY_QUERY)} className="h-10 px-2 text-sm text-ui-primary hover:underline">
            Zrušit filtry
          </button>
        )}
      </div>

      {error ? (
        <div className="ui-tile flex items-center justify-between gap-3 p-4 text-sm">
          <span>{error}</span>
          <button type="button" className="text-ui-primary hover:underline" onClick={() => setQ({ ...q })}>
            Zkusit znovu
          </button>
        </div>
      ) : (
        <Bento>
          <ResultSummary rows={rows} total={total} loading={loading && rows.length === 0} filtered={filtered} />
          <BentoTile span={4} index={3} title={filtered ? "Výsledky" : "Poslední studie"} bodyClassName="px-0 pb-1">
            <StudyList
              withPatient
              studies={rows}
              loading={loading}
              dimmed={loading && rows.length > 0}
              emptyLabel="Žádná studie neodpovídá hledání"
            />
          </BentoTile>
        </Bento>
      )}
    </div>
  );
}

/** Souhrn nad seznamem: počet (2 sloupce, s poměrem modalit) · čeká na popis · nejnovější. */
function ResultSummary({
  rows,
  total,
  loading,
  filtered,
}: {
  rows: StudyInfo[];
  total: number;
  loading: boolean;
  filtered: boolean;
}) {
  const counts = Object.entries(
    rows.reduce<Record<string, number>>((acc, s) => {
      const m = s.idMedicalServiceCategory || "—";
      acc[m] = (acc[m] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const waiting = rows.filter((s) => !hasReport(s)).length;
  const newest = rows[0];
  const partial = total > rows.length;

  const pending = (
    <div className="space-y-3 pt-1">
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-3 w-32" />
    </div>
  );

  return (
    <>
      <BentoTile span={2} index={0} title={filtered ? "Nalezeno" : "Zobrazeno"}>
        {loading ? (
          pending
        ) : (
          <>
            <Metric
              value={total}
              unit={plural(total)}
              sub={partial ? `zobrazeno prvních ${rows.length}, upřesněte hledání` : undefined}
            />
            {rows.length > 0 && (
              <>
                <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-ui-raised" aria-hidden>
                  {counts.map(([m, n]) => (
                    <span key={m} className={BAR[m] ?? "bg-ui-control"} style={{ width: `${(n / rows.length) * 100}%` }} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-ui-muted">
                  {counts.map(([m, n]) => (
                    <span key={m}>
                      {m} {n}
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </BentoTile>
      <BentoTile index={1} title="Čeká na popis">
        {loading ? pending : <Metric value={waiting} sub={rows.length ? `z ${rows.length} zobrazených` : undefined} />}
      </BentoTile>
      <BentoTile index={2} title="Nejnovější">
        {loading ? (
          pending
        ) : newest ? (
          <Metric
            value={<span className="text-[20px]">{formatDateTime(newest.studyDate)}</span>}
            sub={patientName(newest)}
          />
        ) : (
          <Metric value="—" />
        )}
      </BentoTile>
    </>
  );
}

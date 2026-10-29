"use client";

/**
 * Vyhledávání studií.
 * Jedno pole (číslo studie / RČ / příjmení) + modalita + období. Hledá se
 * samo po 350 ms klidu; klik na řádek otevře kartu studie.
 * Poslední dotaz si pamatujeme v sessionStorage, aby „Zpět“ z karty vrátil výsledky.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import {
  EMPTY_QUERY,
  formatDate,
  formatRc,
  hasReport,
  patientName,
  reportPreview,
  searchStudies,
  type StudyQuery,
} from "@/lib/studies";
import { ModalityTag, ReportStatus } from "@/components/study/StudyBits";

const STORE = "kartoteka_study_search";
const MODALITIES = [null, "RTG", "UZ", "MRI"] as const;

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

export default function StudiesSearchPage() {
  const router = useRouter();
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
    setLoading(true);
    const t = setTimeout(async () => {
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
              : `Backend odpověděl chybou ${e.status}.`
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
  const range = (from: string | null, to: string | null) =>
    q.dateFrom === from && q.dateTo === to;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Vyhledat studii</h1>
        <p className="mt-1 text-sm text-ui-muted">
          {loading
            ? "Hledám…"
            : filtered
            ? total === 0
              ? "Nic nenalezeno"
              : `Nalezeno ${total} ${plural(total)}`
            : `${rows.length >= 2 && rows.length <= 4 ? "Poslední" : "Posledních"} ${rows.length} ${plural(rows.length)} podle data vyšetření`}
        </p>
      </div>

      {/* Hledání a filtry – jedna řada */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative block min-w-[260px] flex-1">
          <span className="sr-only">Číslo studie, rodné číslo nebo příjmení</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-faint" />
          <input
            autoFocus
            value={q.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Číslo studie, rodné číslo nebo příjmení"
            className="h-10 w-full rounded-lg border border-ui-control bg-ui-sheet pl-9 pr-9 text-sm outline-none focus:border-ui-primary"
          />
          {q.text && (
            <button
              type="button"
              onClick={() => set({ text: "" })}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ui-faint hover:bg-ui-raised hover:text-ui-ink"
              aria-label="Vymazat hledání"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <Segmented
          label="Modalita"
          options={MODALITIES.map((m) => ({ value: m, label: m ?? "Vše" }))}
          value={q.modality}
          onChange={(m) => set({ modality: m })}
        />

        <div className="flex flex-wrap items-end gap-2">
          <Segmented
            label="Období"
            options={[
              { value: "all", label: "Kdykoli" },
              { value: "today", label: "Dnes" },
              { value: "7", label: "7 dní" },
              { value: "30", label: "30 dní" },
            ]}
            value={
              range(null, null)
                ? "all"
                : range(today, today)
                ? "today"
                : range(daysAgo(6), today)
                ? "7"
                : range(daysAgo(29), today)
                ? "30"
                : "custom"
            }
            onChange={(v) =>
              set(
                v === "all"
                  ? { dateFrom: null, dateTo: null }
                  : v === "today"
                  ? { dateFrom: today, dateTo: today }
                  : { dateFrom: daysAgo(Number(v) - 1), dateTo: today }
              )
            }
          />
          <div className="flex gap-2">
            <DateInput label="Od" value={q.dateFrom} onChange={(v) => set({ dateFrom: v })} />
            <DateInput label="Do" value={q.dateTo} onChange={(v) => set({ dateTo: v })} />
          </div>
        </div>

        {filtered && (
          <button
            type="button"
            onClick={() => setQ(EMPTY_QUERY)}
            className="h-10 px-2 text-sm text-ui-primary hover:underline"
          >
            Zrušit filtry
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-ui-line p-4 text-sm">
          {error}{" "}
          <button type="button" className="text-ui-primary hover:underline" onClick={() => setQ({ ...q })}>
            Zkusit znovu
          </button>
        </div>
      ) : (
        <StudyTable
          rows={rows}
          loading={loading}
          onOpen={(s) => router.push(`/reception/studies/${s.id}`)}
        />
      )}
    </div>
  );
}

function plural(n: number) {
  return n === 1 ? "studie" : n >= 2 && n <= 4 ? "studie" : "studií";
}

function StudyTable({
  rows,
  loading,
  onOpen,
}: {
  rows: StudyInfo[];
  loading: boolean;
  onOpen: (s: StudyInfo) => void;
}) {
  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ui-control px-4 py-8 text-center text-sm text-ui-muted">
        Žádná studie neodpovídá hledání. Zkuste celé rodné číslo, číslo studie nebo jen příjmení.
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-ui-line transition-opacity", loading && "opacity-60")}>
      <table className="w-full text-sm">
        <thead className="hidden text-left text-xs text-ui-muted md:table-header-group">
          <tr className="border-b border-ui-line">
            <th className="px-4 py-2.5 font-normal">Vyšetřeno</th>
            <th className="px-4 py-2.5 font-normal">Pacient</th>
            <th className="px-4 py-2.5 font-normal">Vyšetření</th>
            <th className="px-4 py-2.5 font-normal">Popis</th>
            <th className="px-4 py-2.5 text-right font-normal">Číslo studie</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              tabIndex={0}
              onClick={() => onOpen(s)}
              onKeyDown={(e) => e.key === "Enter" && onOpen(s)}
              className="cursor-pointer border-b border-ui-rule align-top last:border-0 hover:bg-ui-raised focus-visible:bg-ui-raised focus-visible:outline-none"
            >
              {/* telefon: dvouřádkový řádek */}
              <td className="px-4 py-3 md:hidden" colSpan={5}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{patientName(s)}</span>
                  <span className="shrink-0 text-ui-muted">{formatDate(s.studyDate)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ui-muted">
                  <ModalityTag modality={s.idMedicalServiceCategory} />
                  <span>{formatRc(s.pid)}</span>
                  <ReportStatus study={s} compact />
                </div>
              </td>

              <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                {formatDate(s.studyDate)}
                <div className="text-[13px] text-ui-muted">
                  {s.studyDate ? new Date(s.studyDate).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }) : ""}
                </div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <span className="font-medium">{patientName(s)}</span>
                <div className="text-[13px] text-ui-muted">{formatRc(s.pid)}</div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <ModalityTag modality={s.idMedicalServiceCategory} />
                <div className="mt-1 max-w-[260px] truncate text-[13px] text-ui-muted" title={s.medicalDiagnosisRequestedInfo?.description}>
                  {s.medicalDiagnosisRequestedInfo
                    ? `${s.idMedicalDiagnosisRequested} ${s.medicalDiagnosisRequestedInfo.description ?? ""}`
                    : "Bez diagnózy"}
                </div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <ReportStatus study={s} />
                {hasReport(s) && (
                  <div className="mt-1 max-w-[320px] truncate text-[13px] text-ui-muted">{reportPreview(s)}</div>
                )}
              </td>
              <td className="hidden px-4 py-3 text-right md:table-cell">{s.uid}</td>
            </tr>
          ))}
          {loading && rows.length === 0 &&
            [0, 1, 2].map((i) => (
              <tr key={i} className="border-b border-ui-rule last:border-0">
                <td colSpan={5} className="px-4 py-3">
                  <div className="h-4 w-1/3 rounded bg-ui-raised" />
                  <div className="mt-2 h-3 w-1/5 rounded bg-ui-raised" />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function Segmented<T extends string | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | "custom";
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-10 items-center rounded-lg bg-ui-raised p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 whitespace-nowrap rounded-md px-3 text-[13px] transition-colors",
              active ? "border border-ui-line bg-ui-sheet font-medium text-ui-ink" : "text-ui-muted hover:text-ui-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="flex flex-col">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        aria-label={`Datum ${label.toLowerCase()}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-10 w-[140px] rounded-lg border border-ui-control bg-ui-sheet px-2 text-[13px] text-ui-ink"
      />
    </label>
  );
}

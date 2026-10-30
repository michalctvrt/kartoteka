"use client";

/**
 * Vyhledávání pacientů v kartotéce.
 *
 * Recepční zadá:
 *   - rodné číslo (full match na pid), NEBO
 *   - jméno / příjmení (volný text na "name" filtr)
 *
 * Výsledky v bento dlaždici (skeleton při hledání, Ghost když nic); klik → /reception/patients/{pid}.
 * Bez dotazu ukáže rozpracované karty (drafty v prohlížeči), jsou-li nějaké.
 * Mock pacienti pryč — vše přes Václavův backend (PatientService.search3).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, AlertTriangle, ChevronRight, X } from "lucide-react";
import { Bento, BentoTile } from "@/components/ui/bento";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { ageYears } from "@/lib/study/card-check";
import { formatDate } from "@/lib/studies";
import { PatientService } from "@/lib/api/generated/services/PatientService";
import type { PatientInfo } from "@/lib/api/generated/models/PatientInfo";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { apiErrorText } from "@/lib/study/lookups";
import useDrafts from "@/components/hooks/useDrafts";
import { patientHref } from "@/lib/routes";

export default function PatientsListPage() {
  const router = useRouter();
  const { map: drafts } = useDrafts();

  const [query, setQuery] = useState("");

  // ?q= z jiných obrazovek (např. „Vyhledat v kartotéce“ v kalendáři objednávek)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) queueMicrotask(() => setQuery(q));
  }, []);
  const [results, setResults] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false); // false = úvodní stav, neukazuj "žádné výsledky"

  // Debounce → search po 350 ms klidu
  const trimmed = query.trim();
  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setTouched(false);
      return;
    }

    const t = setTimeout(() => {
      void runSearch(trimmed);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    setTouched(true);

    // Heuristika: 9–10 cifer = RČ → hledej přes pid; jinak přes name
    const isPid = /^\d{9,10}$/.test(q.replace(/\s+/g, "").replace("/", ""));

    try {
      const res = await PatientService.search3({
        searchFilter: isPid
          ? { pid: q.replace(/\s+/g, "").replace("/", "") }
          : { name: q },
        limitFilter: { first: 0, count: 50 },
        orderByFilter: { column: "lastName", desc: false },
      });
      setResults(res.data ?? []);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? apiErrorText(e)
          : (e as Error).message ?? "Chyba při vyhledávání.";
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const placeholder = useMemo(
    () => "Rodné číslo, jméno nebo příjmení",
    []
  );

  const draftIds = Object.keys(drafts).sort((x, y) => drafts[y].ts - drafts[x].ts);
  const open = (pid: string) => router.push(patientHref(pid));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Vyhledat pacienta</h1>
        <p className="mt-1 text-sm text-ui-muted">Rodné číslo, jméno nebo příjmení</p>
      </header>

      <label className="relative block">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-faint" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="např. 691110/3815 nebo Novák"
          className="ui-input h-11 pl-9 pr-9 text-[15px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ui-faint hover:bg-ui-sheet hover:text-ui-ink"
            aria-label="Vymazat hledání"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-[13px] text-red-800 dark:border-red-900 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <Bento>
        {touched ? (
          <BentoTile
            span={4}
            index={0}
            title={loading && results.length === 0 ? "Hledám" : `Nalezeno · ${results.length}`}
            bodyClassName="px-0 pb-1"
          >
            {loading && results.length === 0 ? (
              <div className="divide-y divide-ui-rule">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <Ghost label={`Žádný pacient pro „${query}“`} className="px-4 py-4" />
            ) : (
              <ul className={`divide-y divide-ui-rule transition-opacity ${loading ? "opacity-50" : ""}`}>
                {results.map((p, i) => {
                  // Backend někdy vrátí patientDataInfo === undefined (PID bez detailů)
                  const d = p.patientDataInfo;
                  const name = [d?.title, d?.firstName, d?.lastName].filter(Boolean).join(" ");
                  const age = ageYears(d?.birthDate);
                  return (
                    <motion.li
                      key={p.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + Math.min(i, 12) * 0.025, duration: 0.2 }}
                    >
                      <div
                        role="link"
                        tabIndex={0}
                        onClick={() => open(p.pid)}
                        onKeyDown={(e) => e.key === "Enter" && open(p.pid)}
                        className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-2.5 transition-colors hover:bg-ui-raised focus-visible:bg-ui-raised focus-visible:outline-none md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {name || <span className="font-normal text-amber-700 dark:text-amber-300">bez údajů</span>}
                          </span>
                          {drafts[p.pid] && (
                            <span title="Rozpracovaná karta" className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
                          )}
                        </span>
                        <span className="text-sm text-ui-muted md:text-ui-ink">{formatRc(p.pid)}</span>
                        <span className="hidden text-sm text-ui-muted md:block">
                          {d?.birthDate ? `${formatDate(d.birthDate)}${age !== null ? ` · ${age} let` : ""}` : "—"}
                        </span>
                        <ChevronRight className="hidden h-4 w-4 text-ui-faint transition-transform group-hover:translate-x-0.5 md:block" />
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </BentoTile>
        ) : (
          draftIds.length > 0 && (
            <BentoTile span={2} index={0} title={`Rozpracované karty · ${draftIds.length}`} bodyClassName="px-0 pb-1">
              <ul className="divide-y divide-ui-rule">
                {draftIds.map((id) => (
                  <li key={id}>
                    <Link
                      href={patientHref(id)}
                      className="group flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-ui-raised"
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden />
                        {formatRc(id)}
                      </span>
                      <span className="text-[13px] text-ui-muted">
                        {drafts[id].ts ? new Date(drafts[id].ts).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </BentoTile>
          )
        )}
      </Bento>
    </div>
  );
}

function formatRc(rc: string): string {
  if (!rc || rc.length <= 6) return rc ?? "";
  return `${rc.substring(0, 6)}/${rc.substring(6)}`;
}

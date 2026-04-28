"use client";

/**
 * Vyhledávání pacientů v kartotéce.
 *
 * Recepční zadá:
 *   - rodné číslo (full match na pid), NEBO
 *   - jméno / příjmení (volný text na "name" filtr)
 *
 * Výsledky tabulkou; klik na řádek → /reception/patients/{pid}.
 * Mock pacienti pryč — vše přes Václavův backend (PatientService.search3).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PatientService } from "@/lib/api/generated/services/PatientService";
import type { PatientInfo } from "@/lib/api/generated/models/PatientInfo";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import useDrafts from "@/components/hooks/useDrafts";

export default function PatientsListPage() {
  const router = useRouter();
  const { map: drafts } = useDrafts();

  const [query, setQuery] = useState("");
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
          ? `Backend (${e.status}): ${e.message}`
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Vyhledávání pacientů
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Najdi existující kartu zadáním RČ, jména nebo příjmení.
        </p>
      </header>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        />
        <span className="text-xs text-gray-500">
          {loading
            ? "Hledám…"
            : touched
            ? `${results.length} výsledků`
            : ""}
        </span>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!touched ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-500">
            Začni psát do vyhledávacího pole. Pro založení nového pacienta
            použij box &quot;Nový pacient&quot; na hlavní stránce recepce.
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-neutral-700 text-left">
              <tr>
                <th className="p-3">Příjmení</th>
                <th className="p-3">Jméno</th>
                <th className="p-3">Rodné číslo</th>
                <th className="p-3">Datum narození</th>
                <th className="p-3 w-10 text-center">Stav</th>
              </tr>
            </thead>
            <tbody>
              {!loading && results.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-gray-500"
                  >
                    Žádné výsledky pro &quot;{query}&quot;.
                  </td>
                </tr>
              )}
              {results.map((p) => {
                // Backend někdy vrátí patientDataInfo === undefined (PID bez detailů)
                const d = p.patientDataInfo;
                const hasDraft = Boolean(drafts[p.pid]);
                const lastName = d?.lastName?.trim();
                const firstName = d?.firstName?.trim();
                const isEmpty = !lastName && !firstName;
                return (
                  <tr
                    key={p.id}
                    onClick={() =>
                      router.push(
                        `/reception/patients/${encodeURIComponent(p.pid)}`
                      )
                    }
                    className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    <td className="p-3 font-medium">
                      {lastName ?? (
                        <span className="text-amber-600 italic">
                          (bez údajů)
                        </span>
                      )}
                    </td>
                    <td className="p-3">{firstName ?? (isEmpty ? "" : "—")}</td>
                    <td className="p-3">{formatRc(p.pid)}</td>
                    <td className="p-3">{d?.birthDate ?? "—"}</td>
                    <td className="p-3 text-center">
                      {hasDraft && (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"
                          title="Rozpracovaná karta"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatRc(rc: string): string {
  if (!rc || rc.length <= 6) return rc ?? "";
  return `${rc.substring(0, 6)}/${rc.substring(6)}`;
}

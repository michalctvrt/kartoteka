"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { StudyService } from "@/lib/api/generated/services/StudyService";

interface StudyRow {
  id: number;
  uid: string;
  rc: string;
  firstName: string;
  lastName: string;
  modality: string;
  date: string;
  studyDateRaw?: string;
}

const MODALITY_CLASSES: Record<string, string> = {
  UZ: "bg-blue-100 text-blue-800",
  RTG: "bg-orange-100 text-orange-800",
  MRI: "bg-purple-100 text-purple-800",
  CT: "bg-red-100 text-red-800",
  OTHER: "bg-gray-200 text-gray-700",
};

export default function StudiesSearchPage() {
  const [filters, setFilters] = useState({
    uid: "",
    dateFrom: null as string | null,
    dateTo: null as string | null,
  });

  const [results, setResults] = useState<StudyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [lastRequest, setLastRequest] = useState<any | null>(null);
  const [lastResponse, setLastResponse] = useState<any | null>(null);

  // -------------------------------------------------------
  // LOAD 10 NEWEST ON START
  // -------------------------------------------------------
  useEffect(() => {
    loadLatest10();
  }, []);

  async function loadLatest10() {
    setLoading(true);

    try {
      const res = await StudyService.search4({
        orderByFilter: { column: "requestDate", desc: true },
        limitFilter: { first: 0, count: 10 },
      });

      const data = normalize(res);
      setResults(data.map(mapStudyRow));

      setLastRequest({ info: "loadLatest10" });
      setLastResponse(res);
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  // MAIN SEARCH — BACKEND MAX 1 FILTER, FRONTEND AND
  // -------------------------------------------------------
  async function search() {
    setLoading(true);

    try {
      const reqBody: any = {
        browseFilter: {},
        limitFilter: { first: 0, count: 500 },
      };

      // Backend umí jen jeden filtr → preferujeme UID
     if (filters.uid.trim()) {
  reqBody.browseFilter.dicomUid = {
    comparator: "EQUALS",
    values: [filters.uid.trim()],
  };
} else if (filters.dateFrom || filters.dateTo) {
        const from = filters.dateFrom ?? filters.dateTo;
        const to = filters.dateTo ?? filters.dateFrom;

        reqBody.browseFilter.requestDate = {
          comparator: "BETWEEN",
          values: [from, to],
        };
      }

      setLastRequest(reqBody);

      // Backend výsledky
      const res = await StudyService.search4(reqBody);
      setLastResponse(res);

      // Normalizace
      let raw = normalize(res);

      // -------------------------------------------------------
      // 🔥 FRONTEND AND FILTER (UID + DATE současně)
      // -------------------------------------------------------
      raw = raw.filter((s: any) => {
        const okUid = !filters.uid || s.uid === filters.uid;

        const d = new Date(s.requestDate);
        const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const to = filters.dateTo ? new Date(filters.dateTo) : null;

        const okDate =
          (!from || d >= from) &&
          (!to || d <= to);

        return okUid && okDate;
      });

      // Seřadit nejnovější
      raw.sort(
        (a, b) =>
          new Date(b.requestDate).getTime() -
          new Date(a.requestDate).getTime()
      );

      setResults(raw.map(mapStudyRow));
    } catch (err) {
      console.error("SEARCH ERROR:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Auto search
  useEffect(() => {
    const t = setTimeout(() => {
      const noFilters =
        !filters.uid.trim() && !filters.dateFrom && !filters.dateTo;

      if (noFilters) loadLatest10();
      else search();
    }, 350);

    return () => clearTimeout(t);
  }, [filters.uid, filters.dateFrom, filters.dateTo]);

  // -------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------
  function normalize(res: any): any[] {
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res)) return res;
    return [];
  }

  function mapStudyRow(s: any): StudyRow {
    const dt = s.requestDate;

    return {
      id: s.id,
      uid: s.uid ?? s.dicomUid ?? "",
      rc: s.patientDataInfo?.patientInfo?.pid ?? s.pid ?? "",
      firstName: s.patientDataInfo?.firstName ?? "",
      lastName: s.patientDataInfo?.lastName ?? "",
      modality: s.idMedicalServiceCategory ?? "OTHER",
      date: dt?.substring(0, 10) ?? "",
      studyDateRaw: dt,
    };
  }

  function formatDate(d?: string) {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("cs-CZ");
  }

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Search className="w-5 h-5" />
        Vyhledávání studií
      </h1>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg border">
        <div>
          <label className="text-sm">Číslo studie (UID)</label>
          <input
            value={filters.uid}
            onChange={(e) =>
              setFilters({ ...filters, uid: e.target.value })
            }
            className="px-3 py-2 rounded-md border w-full dark:bg-neutral-900"
            placeholder="např. 3180000001"
          />
        </div>

        <div>
          <label className="text-sm">Datum</label>
          <DateRangePicker
            from={filters.dateFrom}
            to={filters.dateTo}
            onChange={(from, to) =>
              setFilters({
                ...filters,
                dateFrom: from,
                dateTo: to,
              })
            }
          />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={() => search()}
          className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Hledat
        </button>

        <button
          onClick={() => {
            setFilters({ uid: "", dateFrom: null, dateTo: null });
            loadLatest10();
          }}
          className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Vymazat filtry
        </button>

        <div className="ml-auto text-sm text-gray-600">
          {loading ? "Načítání…" : `${results.length} výsledků`}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-neutral-800 border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-neutral-700">
            <tr>
              <th className="p-3">UID</th>
              <th className="p-3">RČ</th>
              <th className="p-3">Jméno</th>
              <th className="p-3">Příjmení</th>
              <th className="p-3">Mod.</th>
              <th className="p-3">Datum</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center opacity-60"
                >
                  Načítání…
                </td>
              </tr>
            )}

            {!loading && results.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center opacity-60"
                >
                  Žádné výsledky
                </td>
              </tr>
            )}

            {!loading &&
              results.map((s) => {
                const cls =
                  MODALITY_CLASSES[s.modality] ??
                  MODALITY_CLASSES.OTHER;

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
                    onClick={() =>
                      (location.href = `/reception/studies/detail?id=${s.id}`)
                    }
                  >
                    <td className="p-3">{s.uid}</td>
                    <td className="p-3">{s.rc}</td>
                    <td className="p-3">{s.firstName}</td>
                    <td className="p-3">{s.lastName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs rounded ${cls}`}>
                        {s.modality}
                      </span>
                    </td>
                    <td className="p-3">{formatDate(s.date)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* DEBUG PANEL */}
      <div className="mt-4 p-4 border rounded bg-gray-50 text-sm">
        <strong>Last request:</strong>
        <pre className="text-xs whitespace-pre-wrap">
          {lastRequest ? JSON.stringify(lastRequest, null, 2) : "—"}
        </pre>

        <strong>Last response:</strong>
        <pre className="text-xs whitespace-pre-wrap">
          {lastResponse ? JSON.stringify(lastResponse, null, 2) : "—"}
        </pre>
      </div>
    </div>
  );
}

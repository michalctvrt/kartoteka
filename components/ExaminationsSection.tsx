"use client";

import { useEffect, useState } from "react";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";

interface StudyRow {
  id: number;
  pid: string;
  studyDate?: string;
  requestDate?: string;
  description?: string;
  flagCompleted?: boolean;
  remark?: string;
  idMedicalServiceCategory?: string;
}

const MODALITY_CLASSES: Record<string, string> = {
  UZ: "bg-blue-100 text-blue-800",
  RTG: "bg-orange-100 text-orange-800",
  MRI: "bg-purple-100 text-purple-800",
  CT: "bg-red-100 text-red-800",
  OTHER: "bg-gray-200 text-gray-700",
};

export default function ExaminationsSection({ pid }: { pid: string }) {
  const [allStudies, setAllStudies] = useState<StudyRow[]>([]);
  const [visibleStudies, setVisibleStudies] = useState<StudyRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleString("cs-CZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shortDesc = (raw?: string) => {
    const s = (raw ?? "").replace(/\r?\n|\r/g, " ");
    return s.length > 60 ? s.slice(0, 60).trimEnd() + "…" : s;
  };

  useEffect(() => {
    if (!pid) {
      setAllStudies([]);
      setVisibleStudies([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await StudyService.search4({
          searchFilter: { pid },
          limitFilter: { first: 0, count: 500 },
        });

        const data: StudyRow[] = (res.data ?? []).map((s: any) => ({
          id: s.id,
          pid: s.pid,
          studyDate: s.studyDate,
          requestDate: s.requestDate,
          description: s.description,
          flagCompleted: s.flagCompleted,
          remark: s.remark,
          idMedicalServiceCategory: s.idMedicalServiceCategory ?? "OTHER",
        }));

        // nejnovější -> nejstarší
        data.sort((a, b) => {
          const da = a.studyDate ? new Date(a.studyDate).getTime() : 0;
          const db = b.studyDate ? new Date(b.studyDate).getTime() : 0;
          return db - da;
        });

        setAllStudies(data);
        setVisibleCount(10);
        setVisibleStudies(data.slice(0, 10));
      } catch (err: any) {
        console.error("Chyba načítání vyšetření:", err);
        setError(err?.message ?? "Chyba");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pid]);

  // filtr + stránkování
  useEffect(() => {
    const filtered = allStudies.filter(
      (s) => filter === "ALL" || s.idMedicalServiceCategory === filter
    );
    setVisibleStudies(filtered.slice(0, visibleCount));
  }, [filter, allStudies, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((c) => c + 10);
  };

  const hasMore =
    allStudies.filter((s) => filter === "ALL" || s.idMedicalServiceCategory === filter)
      .length > visibleCount;

  return (
    <div className="bg-white dark:bg-neutral-800 border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium border-b pb-2">Vyšetření</h2>
        {/* (volitelně) další kontrolky zde */}
      </div>

      {error && <div className="text-sm text-red-600 mb-3">Chyba: {error}</div>}

      {loading ? (
        <div className="text-sm text-gray-600">Načítám vyšetření...</div>
      ) : visibleStudies.length === 0 ? (
        <div className="text-sm text-gray-600">Žádná vyšetření k zobrazení.</div>
      ) : (
        <div className="overflow-x-auto">
          {/* table-fixed: zamkne rozložení sloupců */}
          <table className="w-full text-sm table-fixed">
            <thead>
              {/* hlavní hlavička */}
              <tr className="text-left border-b dark:border-neutral-700">
                <th className="p-2" style={{ width: "6rem" }}>ID</th>
                <th className="p-2 whitespace-nowrap" style={{ width: "12rem" }}>Datum</th>
                <th className="p-2" style={{ width: "7rem" }}>Typ</th>
                <th className="p-2">Popis</th>
                <th className="p-2" style={{ width: "8rem" }}>Stav</th>
                <th className="p-2 text-right" style={{ width: "11rem" }}>Akce</th>
              </tr>

              {/* druhý řádek hlavičky: filtr umístěný přímo nad sloupcem "Typ" */}
              <tr className="text-left border-b border-transparent">
                <th className="p-2" /> {/* ID - prázdné */}
                <th className="p-2" /> {/* Datum - prázdné */}
                <th className="p-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Filtr:</label>
                    <select
                      className="px-2 py-1 border rounded bg-white dark:bg-neutral-900 text-sm"
                      value={filter}
                      onChange={(e) => {
                        setVisibleCount(10);
                        setFilter(e.target.value);
                      }}
                    >
                      <option value="ALL">Vše</option>
                      <option value="UZ">Ultrazvuk (UZ)</option>
                      <option value="RTG">RTG</option>
                      {/* rozšiř podle potřeby */}
                    </select>
                  </div>
                </th>
                <th className="p-2" /> {/* Popis - prázdné */}
                <th className="p-2" /> {/* Stav - prázdné */}
                <th className="p-2" /> {/* Akce - prázdné */}
              </tr>
            </thead>

            <tbody>
              {visibleStudies.map((s) => {
                const modality = s.idMedicalServiceCategory ?? "OTHER";
                const cls = MODALITY_CLASSES[modality] ?? MODALITY_CLASSES.OTHER;

                return (
                  <tr key={s.id} className="border-b dark:border-neutral-800 align-top">
                    <td className="p-2 align-top">{s.id}</td>

                    <td className="p-2 align-top whitespace-nowrap">
                      {formatDate(s.studyDate ?? s.requestDate)}
                    </td>

                    <td className="p-2 align-top">
                      <span className={`inline-block w-20 text-center px-2 py-1 text-xs rounded ${cls}`}>
                        {modality}
                      </span>
                    </td>

                    <td className="p-2 align-top">
                      <div className="max-w-[48ch] truncate" title={ (s.description ?? s.remark) ?? ""}>
                        {shortDesc(s.description ?? s.remark) || "—"}
                      </div>
                    </td>

                    <td className="p-2 align-top">
                      {s.flagCompleted ? "Dokončeno" : "Probíhá"}
                    </td>

                    <td className="p-2 text-right align-top">
                      <a
                        href={`${OpenAPI.BASE}/study/${s.id}/documentData.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 mr-2"
                      >
                        PDF
                      </a>
                      <button
                        onClick={() => window.open(`/reception/studies/${s.id}`, "_blank")}
                        className="inline-block px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Otevřít
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center">
        {hasMore ? (
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 rounded-md bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-sm"
          >
            Zobrazit další
          </button>
        ) : (
          allStudies.length > 0 && <div className="text-sm text-gray-500">Žádná další vyšetření.</div>
        )}
      </div>
    </div>
  );
}

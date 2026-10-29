"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalityTag, ReportStatus } from "@/components/study/StudyBits";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";

export default function ExaminationsSection({ pid }: { pid: string }) {
  const router = useRouter();
  const [allStudies, setAllStudies] = useState<StudyInfo[]>([]);
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

        const data = [...(res.data ?? [])];

        // nejnovější -> nejstarší
        data.sort((a, b) => {
          const da = a.studyDate ? new Date(a.studyDate).getTime() : 0;
          const db = b.studyDate ? new Date(b.studyDate).getTime() : 0;
          return db - da;
        });

        setAllStudies(data);
        setVisibleCount(10);
      } catch (err: unknown) {
        console.error("Chyba načítání vyšetření:", err);
        setError((err as Error)?.message ?? "Chyba");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pid]);

  // filtr + stránkování
  const filteredStudies = useMemo(
    () => allStudies.filter((s) => filter === "ALL" || s.idMedicalServiceCategory === filter),
    [allStudies, filter]
  );
  const visibleStudies = filteredStudies.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((c) => c + 10);
  };

  const hasMore = filteredStudies.length > visibleCount;

  const count = (m: string) =>
    m === "ALL" ? allStudies.length : allStudies.filter((s) => s.idMedicalServiceCategory === m).length;

  return (
    <section className="rounded-lg border border-ui-line" aria-labelledby="vysetreni">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-rule px-5 py-3">
        <h2 id="vysetreni" className="text-base font-semibold">
          Vyšetření <span className="font-normal text-ui-muted">{loading ? "" : allStudies.length}</span>
        </h2>
        {/* filtr modality – jen modality, které pacient má */}
        <div role="radiogroup" aria-label="Modalita" className="flex h-9 items-center rounded-lg bg-ui-raised p-1">
          {["ALL", "RTG", "UZ", "MRI"]
            .filter((m) => m === "ALL" || count(m) > 0)
            .map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={filter === m}
                onClick={() => {
                  setVisibleCount(10);
                  setFilter(m);
                }}
                className={
                  filter === m
                    ? "h-7 rounded-md border border-ui-line bg-ui-sheet px-3 text-[13px] font-medium"
                    : "h-7 rounded-md px-3 text-[13px] text-ui-muted hover:text-ui-ink"
                }
              >
                {m === "ALL" ? "Vše" : m} <span className="text-ui-muted">{count(m)}</span>
              </button>
            ))}
        </div>
      </header>

      {error && <div className="px-5 py-3 text-sm">Vyšetření se nepodařilo načíst: {error}</div>}

      {loading ? (
        <div className="px-5 py-4 text-sm text-ui-muted">Načítám vyšetření…</div>
      ) : visibleStudies.length === 0 ? (
        <div className="px-5 py-4 text-sm text-ui-muted">Pacient zatím nemá žádné vyšetření.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="hidden text-left text-xs text-ui-muted lg:table-header-group">
            <tr className="border-b border-ui-rule">
              <th className="px-5 py-2 font-normal">Vyšetřeno</th>
              <th className="px-5 py-2 font-normal">Vyšetření</th>
              <th className="px-5 py-2 font-normal">Popis</th>
              <th className="px-5 py-2 text-right font-normal">Číslo studie</th>
              <th className="w-16 px-5 py-2 text-right font-normal">Zpráva</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudies.map((s) => (
              <tr
                key={s.id}
                tabIndex={0}
                onClick={() => router.push(`/reception/studies/${s.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/reception/studies/${s.id}`)}
                className="cursor-pointer border-b border-ui-rule align-top last:border-0 hover:bg-ui-raised focus-visible:bg-ui-raised focus-visible:outline-none"
              >
                <td className="whitespace-nowrap px-5 py-3">{formatDate(s.studyDate ?? s.requestDate)}</td>
                <td className="px-5 py-3">
                  <ModalityTag modality={s.idMedicalServiceCategory} />
                  <div className="mt-1 hidden max-w-[260px] truncate text-[13px] text-ui-muted lg:block">
                    {s.medicalDiagnosisRequestedInfo
                      ? `${s.idMedicalDiagnosisRequested} ${s.medicalDiagnosisRequestedInfo.description ?? ""}`
                      : "Bez diagnózy"}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <ReportStatus study={s} />
                  {s.description && (
                    <div className="mt-1 hidden max-w-[40ch] truncate text-[13px] text-ui-muted lg:block">
                      {shortDesc(s.description)}
                    </div>
                  )}
                </td>
                <td className="hidden px-5 py-3 text-right lg:table-cell">{s.uid}</td>
                <td className="px-5 py-3 text-right">
                  <a
                    href={`${OpenAPI.BASE}/study/${s.id}/documentData.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-ui-primary hover:underline"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {hasMore && (
        <div className="border-t border-ui-rule px-5 py-3">
          <button type="button" onClick={handleLoadMore} className="text-sm text-ui-primary hover:underline">
            Zobrazit další
          </button>
        </div>
      )}
    </section>
  );
}

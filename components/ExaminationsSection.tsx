"use client";

/**
 * Vyšetření pacienta na kartě – dlaždice přes celou šířku bento mřížky.
 * Data dodává rodič (usePatientStudies), aby je sdílela i souhrnná dlaždice.
 * Klik na řádek → karta studie. Filtr modality jen z modalit, které pacient má.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { BentoTile } from "@/components/ui/bento";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { ModalityTag, ReportStatus } from "@/components/study/StudyBits";
import { formatDateTime, reportPreview } from "@/lib/studies";

const PAGE = 8;

export default function ExaminationsSection({
  studies,
  loading,
  error,
  index = 0,
}: {
  studies: StudyInfo[];
  loading: boolean;
  error?: string | null;
  index?: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [shown, setShown] = useState(PAGE);

  const modalities = useMemo(
    () => [...new Set(studies.map((s) => s.idMedicalServiceCategory).filter(Boolean))],
    [studies]
  );
  const filtered = filter === "ALL" ? studies : studies.filter((s) => s.idMedicalServiceCategory === filter);
  const visible = filtered.slice(0, shown);
  const open = (s: StudyInfo) => router.push(`/reception/studies/${s.id}`);

  return (
    <BentoTile
      span={4}
      index={index}
      bodyClassName="px-0 pb-1"
      title={
        <span>
          Vyšetření <span className="text-ui-faint">{loading ? "" : studies.length}</span>
        </span>
      }
      action={
        modalities.length > 1 && (
          <div role="radiogroup" aria-label="Modalita" className="flex rounded-lg border border-ui-line p-0.5">
            {["ALL", ...modalities].map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={filter === m}
                onClick={() => {
                  setFilter(m);
                  setShown(PAGE);
                }}
                className={cn(
                  "relative h-7 rounded-md px-2.5 text-[13px] transition-colors",
                  filter === m ? "text-ui-ink" : "text-ui-muted hover:text-ui-ink"
                )}
              >
                {filter === m && (
                  <motion.span
                    layoutId="exam-filter"
                    className="absolute inset-0 rounded-md bg-ui-active"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{m === "ALL" ? "Vše" : m}</span>
              </button>
            ))}
          </div>
        )
      }
    >
      {error ? (
        <p className="px-4 py-3 text-sm text-ui-muted">Vyšetření se nepodařilo načíst. {error}</p>
      ) : loading ? (
        <div className="divide-y divide-ui-rule">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : studies.length === 0 ? (
        <Ghost label="Pacient zatím nemá žádné vyšetření" className="px-4 py-4" />
      ) : (
        <ul className="divide-y divide-ui-rule">
          {visible.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.03, duration: 0.2 }}
            >
              <div
                role="link"
                tabIndex={0}
                onClick={() => open(s)}
                onKeyDown={(e) => e.key === "Enter" && open(s)}
                className="group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-ui-raised focus-visible:bg-ui-raised focus-visible:outline-none md:grid-cols-[9.5rem_3.5rem_minmax(0,1fr)_minmax(0,14rem)_auto]"
              >
                <span className="whitespace-nowrap text-sm">{formatDateTime(s.studyDate ?? s.requestDate)}</span>
                <span className="justify-self-end md:justify-self-start">
                  <ModalityTag modality={s.idMedicalServiceCategory} />
                </span>
                <span className="col-span-2 truncate text-[13px] text-ui-muted md:col-span-1">
                  {s.description ? reportPreview(s, 120) : s.medicalDiagnosisRequestedInfo?.description ?? ""}
                </span>
                <span className="hidden text-[13px] md:block">
                  <ReportStatus study={s} />
                </span>
                <span className="hidden items-center gap-3 md:flex">
                  <a
                    href={`${OpenAPI.BASE}/study/${s.id}/documentData.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[13px] text-ui-primary opacity-0 transition-opacity hover:underline focus:opacity-100 group-hover:opacity-100"
                  >
                    PDF
                  </a>
                  <ChevronRight className="h-4 w-4 text-ui-faint transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      {filtered.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mx-4 my-2 text-[13px] text-ui-primary hover:underline"
        >
          Další {Math.min(PAGE, filtered.length - shown)} z {filtered.length - shown}
        </button>
      )}
    </BentoTile>
  );
}

"use client";

/**
 * Seznam studií (řádky) – sdílí karta pacienta i vyhledávání studií.
 * Načítání = skeleton řádky, prázdno = Ghost. Řádky najedou postupně zleva.
 * `withPatient` přidá sloupec s pacientem (ve vyhledávání).
 */

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { ModalityTag, ReportStatus } from "@/components/study/StudyBits";
import { formatDateTime, formatRc, patientName, reportPreview } from "@/lib/studies";

export default function StudyList({
  studies,
  loading,
  withPatient,
  emptyLabel,
  dimmed,
}: {
  studies: StudyInfo[];
  loading: boolean;
  withPatient?: boolean;
  emptyLabel: string;
  /** při novém hledání nad starými výsledky jen ztlumit (nepřeskakovat na skeleton) */
  dimmed?: boolean;
}) {
  const router = useRouter();
  const open = (s: StudyInfo) => router.push(`/reception/studies/${s.id}`);
  const cols = withPatient
    ? "md:grid-cols-[8.5rem_minmax(0,12rem)_3.5rem_minmax(0,1fr)_minmax(0,13rem)_auto]"
    : "md:grid-cols-[9.5rem_3.5rem_minmax(0,1fr)_minmax(0,14rem)_auto]";

  if (loading && studies.length === 0) {
    return (
      <div className="divide-y divide-ui-rule">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-28" />
            {withPatient && <Skeleton className="h-4 w-36" />}
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }
  if (studies.length === 0) return <Ghost label={emptyLabel} className="px-4 py-4" />;

  return (
    <ul className={cn("divide-y divide-ui-rule transition-opacity", dimmed && "opacity-50")}>
      {studies.map((s, i) => (
        <motion.li
          key={s.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 + Math.min(i, 12) * 0.025, duration: 0.2 }}
        >
          <div
            role="link"
            tabIndex={0}
            onClick={() => open(s)}
            onKeyDown={(e) => e.key === "Enter" && open(s)}
            className={cn(
              "group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-ui-raised focus-visible:bg-ui-raised focus-visible:outline-none",
              cols
            )}
          >
            <span className="whitespace-nowrap text-sm">{formatDateTime(s.studyDate ?? s.requestDate)}</span>
            {withPatient && (
              <span className="col-span-2 min-w-0 md:col-span-1">
                <span className="block truncate text-sm font-medium">{patientName(s)}</span>
                <span className="block text-[12px] text-ui-muted">{formatRc(s.pid)}</span>
              </span>
            )}
            <span className={cn("justify-self-end md:justify-self-start", withPatient && "row-start-1 col-start-2 md:row-auto md:col-auto")}>
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
  );
}

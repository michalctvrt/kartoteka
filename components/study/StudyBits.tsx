/** Drobnosti sdílené vyhledáváním studií, kartou studie a kartou pacienta. */

import { cn } from "@/lib/utils";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { MODALITY_STYLE } from "@/components/queue/WaitingBoard";
import { hasReport } from "@/lib/studies";

/** Modalita jako světlý štítek v barvě čekárny (RTG oranžová, UZ sky, MRI fialová). */
export function ModalityTag({ modality, className }: { modality?: string | null; className?: string }) {
  const st = modality ? MODALITY_STYLE[modality as keyof typeof MODALITY_STYLE] : undefined;
  return (
    <span
      className={cn(
        "inline-flex h-5 flex-none items-center whitespace-nowrap rounded px-1.5 text-xs font-medium",
        st ? st.badge : "bg-ui-raised text-ui-muted",
        className
      )}
    >
      {modality || "—"}
    </span>
  );
}

/** Stav popisu: tečka + slova. Zelená = popsáno, jantarová = čeká na popis. */
export function ReportStatus({ study, compact }: { study: StudyInfo; compact?: boolean }) {
  const done = hasReport(study);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", done ? "bg-emerald-600" : "bg-amber-500")}
      />
      <span className={cn(compact ? "" : "text-ui-ink")}>
        {done
          ? compact
            ? "Popsáno"
            : `Popsáno${study.nameDescriptionChanged ? ` · ${study.nameDescriptionChanged}` : ""}`
          : "Čeká na popis"}
      </span>
    </span>
  );
}

/** Světlý štítek se stavem (akutní, samoplátce…). */
export function Flag({ tone, children }: { tone: "neutral" | "warning" | "negative"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center whitespace-nowrap rounded-md px-2 text-xs font-medium",
        tone === "neutral" && "bg-ui-raised text-ui-muted",
        tone === "warning" && "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
        tone === "negative" && "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
      )}
    >
      {children}
    </span>
  );
}

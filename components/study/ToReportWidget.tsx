"use client";

/**
 * Okno plochy „K popisu“ (lékař): kolik studií čeká na popis, urgentní, nejdéle čekající,
 * tlačítko „Začít popisovat“. Větší okno ukáže i řádky – jen kolik se vejde, zbytek „+ N dalších“
 * (nikdy posuvník, jako čekárny). Období a modalita = stejný filtr jako stránka K popisu.
 * Obnova: každé 2 minuty a při návratu do okna.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ModalityTag } from "@/components/study/StudyBits";
import { FULL, type WidgetSize } from "@/components/dashboard/size";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { loadToReport, saveQueue, useReportFilter, waitingFor } from "@/lib/reportQueue";
import { patientName } from "@/lib/studies";
import { studyHref } from "@/lib/routes";

const SUMMARY = 76; // řádek s čísly + tlačítko
const ROW = 40;
const FOOTER = 20;

const PERIOD: Record<string, string> = { "1": "dnes", "3": "3 dny", "7": "týden", "14": "14 dní", "30": "30 dní" };

export default function ToReportWidget({ size = FULL }: { size?: WidgetSize }) {
  const router = useRouter();
  const [f] = useReportFilter();
  const [rows, setRows] = useState<StudyInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let off = false;
    loadToReport(Number(f.days), f.modality)
      .then((r) => {
        if (off) return;
        setRows(r.rows);
        setError(null);
      })
      .catch((e: Error) => !off && setError(e.message));
    return () => {
      off = true;
    };
  }, [f.days, f.modality, tick]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 120_000);
    const on = () => document.visibilityState === "visible" && setTick((x) => x + 1);
    document.addEventListener("visibilitychange", on);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", on);
    };
  }, []);

  const open = (s: StudyInfo) => {
    if (!rows) return;
    saveQueue(rows.map((x) => x.id));
    router.push(studyHref(s.id, { write: true }));
  };

  if (error) return <p className="text-[13px] text-red-700 dark:text-red-300">Nepodařilo se načíst: {error}</p>;
  if (!rows)
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>
    );

  const urgent = rows.filter((s) => s.flagUrgent).length;
  const oldest = rows.reduce<StudyInfo | null>((o, s) => (!o || (s.studyDate ?? "") < (o.studyDate ?? "") ? s : o), null);

  // kolik řádků se vejde (S = žádný)
  const room = size.size === "S" ? 0 : Math.max(0, Math.floor((size.height - SUMMARY) / ROW));
  const fit = rows.length > room ? Math.max(0, Math.floor((size.height - SUMMARY - FOOTER) / ROW)) : rows.length;
  const shown = rows.slice(0, fit);
  const rest = rows.length - shown.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/doctor/reports" className="group">
          <span className="block text-3xl font-semibold leading-none tabular-nums group-hover:text-ui-primary">{rows.length}</span>
          <span className="text-[12px] text-ui-muted">k popisu · {f.modality ?? PERIOD[f.days]}</span>
        </Link>
        {urgent > 0 && (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" /> {urgent} urgentní
          </span>
        )}
        {oldest && <span className="text-[13px] text-ui-muted">nejdéle čeká {waitingFor(oldest.studyDate)}</span>}
        <button
          type="button"
          onClick={() => rows[0] && open(rows[0])}
          disabled={!rows.length}
          className="ui-press ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-ui-primary-hover bg-ui-primary px-3.5 text-[13px] font-medium text-white [--ui-bevel:rgba(255,255,255,0.18)] hover:bg-ui-primary-hover disabled:pointer-events-none disabled:opacity-50 dark:text-brand-950"
        >
          <PenLine className="h-4 w-4" /> Začít popisovat
        </button>
      </div>

      {shown.length > 0 && (
        <ul className="mt-3 divide-y divide-ui-rule border-t border-ui-rule">
          {shown.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => open(s)}
                className="flex h-10 w-full items-center gap-3 px-1 text-left text-[13px] transition-colors hover:bg-ui-raised"
              >
                <span className={cn("w-14 shrink-0 tabular-nums", s.flagUrgent ? "font-semibold text-red-700 dark:text-red-300" : "text-ui-muted")}>
                  {waitingFor(s.studyDate)}
                </span>
                <ModalityTag modality={s.idMedicalServiceCategory} />
                <span className="min-w-0 flex-1 truncate font-medium">{patientName(s)}</span>
                {size.wide && (
                  <span className="min-w-0 max-w-[45%] truncate text-ui-muted">
                    {s.idMedicalDiagnosisRequested} {s.medicalDiagnosisRequestedInfo?.description}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {rest > 0 && size.size !== "S" && (
        <Link href="/doctor/reports" className="mt-1 text-[12px] text-ui-primary hover:underline">
          + {rest} {rest === 1 ? "další" : rest <= 4 ? "další" : "dalších"}
        </Link>
      )}
      {!rows.length && <p className="mt-2 text-[13px] text-ui-faint">Vše je popsané.</p>}
    </div>
  );
}

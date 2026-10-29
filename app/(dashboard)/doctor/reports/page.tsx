"use client";

/**
 * Pracovní seznam lékaře „K popisu“ – nepopsané studie, urgentní a nejstarší nahoře.
 * Klik na řádek / „Začít popisovat“ otevře psaní popisu (karta studie ?write=1) a uloží frontu,
 * takže v psaní funguje „Další na řadě“. Seznam se obnoví při návratu do okna.
 * Výběr nepopsaných: lib/reportQueue.ts (backend filtr „bez popisu“ nemá).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, PenLine, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { ModalityTag } from "@/components/study/StudyBits";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { loadToReport, saveQueue, useReportFilter, waitingFor, type Days } from "@/lib/reportQueue";
import { formatDateTime, formatRc, patientName } from "@/lib/studies";

export default function ReportsWorklistPage() {
  const router = useRouter();
  const [f, setFilter] = useReportFilter();
  const [data, setData] = useState<{ key: string; rows?: StudyInfo[]; truncated?: boolean; error?: string } | null>(null);
  const [tick, setTick] = useState(0);
  const key = `${f.days}|${f.modality}|${tick}`;
  const rows = data?.key === key ? data.rows : undefined;
  const loading = data?.key !== key;
  const shown = rows ?? (data?.rows || []); // při obnově nechat staré řádky (ztlumené)

  useEffect(() => {
    let off = false;
    loadToReport(Number(f.days), f.modality)
      .then((r) => !off && setData({ key, rows: r.rows, truncated: r.truncated }))
      .catch((e: Error) => !off && setData({ key, error: e.message }));
    return () => {
      off = true;
    };
  }, [key, f.days, f.modality]);

  useEffect(() => {
    const on = () => document.visibilityState === "visible" && setTick((t) => t + 1);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const open = (s: StudyInfo) => {
    saveQueue(shown.map((x) => x.id));
    router.push(`/reception/studies/${s.id}?write=1`);
  };

  const urgent = shown.filter((s) => s.flagUrgent).length;
  const oldest = shown.reduce<StudyInfo | null>((o, s) => (!o || (s.studyDate ?? "") < (o.studyDate ?? "") ? s : o), null);
  const byMod = (m: string) => shown.filter((s) => s.idMedicalServiceCategory === m).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">K popisu</h1>
          <p className="mt-1 text-sm text-ui-muted">Nepopsané studie – urgentní a nejstarší nahoře</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setTick((t) => t + 1)} aria-label="Obnovit">
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
          <Button onClick={() => shown[0] && open(shown[0])} disabled={!shown.length}>
            <PenLine /> Začít popisovat
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<string | null>
          label="Modalita"
          value={f.modality}
          onChange={(modality) => setFilter({ modality })}
          options={[
            { value: null, label: "Vše" },
            { value: "RTG", label: "RTG" },
            { value: "UZ", label: "UZ" },
            { value: "MRI", label: "MRI" },
          ]}
        />
        <Segmented<Days>
          label="Období"
          value={f.days}
          onChange={(days) => setFilter({ days })}
          options={[
            { value: "1", label: "Dnes" },
            { value: "3", label: "3 dny" },
            { value: "7", label: "Týden" },
            { value: "14", label: "14 dní" },
            { value: "30", label: "30 dní" },
          ]}
        />
      </div>

      {data?.error && data.key === key && <div className="ui-tile p-4 text-sm">Studie se nepodařilo načíst: {data.error}</div>}

      <Bento>
        <BentoTile span={2} index={0} title="K popisu">
          {!rows && loading && !data?.rows ? (
            <Skeleton className="mt-1 h-8 w-16" />
          ) : (
            <Metric
              value={shown.length}
              sub={
                f.modality
                  ? f.modality
                  : ["RTG", "UZ", "MRI"]
                      .map((m) => [m, byMod(m)] as const)
                      .filter(([, n]) => n)
                      .map(([m, n]) => `${m} ${n}`)
                      .join(" · ") || "vše popsáno"
              }
            />
          )}
        </BentoTile>
        <BentoTile index={1} title="Urgentní">
          {loading && !data?.rows ? <Skeleton className="mt-1 h-8 w-10" /> : <Metric value={urgent} sub={urgent ? "jsou na začátku seznamu" : "žádná"} />}
        </BentoTile>
        <BentoTile index={2} title="Nejdéle čeká">
          {loading && !data?.rows ? (
            <Skeleton className="mt-1 h-8 w-20" />
          ) : oldest ? (
            <Metric value={waitingFor(oldest.studyDate)} sub={patientName(oldest)} />
          ) : (
            <Ghost label="Nic nečeká" />
          )}
        </BentoTile>

        <BentoTile span={4} index={3} title={`Seznam${data?.truncated ? " · zobrazeno prvních 500 studií období" : ""}`} bodyClassName="px-0 pb-1">
          {!data?.rows && loading ? (
            <div className="space-y-2 px-4 py-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !shown.length ? (
            <Ghost label="Vše je popsané" className="px-4 py-4" />
          ) : (
            <ul className={cn("divide-y divide-ui-rule transition-opacity", loading && "opacity-50")}>
              {shown.map((s, i) => (
                <motion.li key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + Math.min(i, 12) * 0.025, duration: 0.2 }}>
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() => open(s)}
                    onKeyDown={(e) => e.key === "Enter" && open(s)}
                    className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-ui-raised focus-visible:bg-ui-raised focus-visible:outline-none md:grid-cols-[5.5rem_8.5rem_minmax(0,14rem)_3.5rem_minmax(0,1fr)_auto]"
                  >
                    <span className={cn("flex items-center gap-1 text-[13px] tabular-nums", s.flagUrgent ? "font-semibold text-red-700 dark:text-red-300" : "text-ui-muted")}>
                      {s.flagUrgent && <AlertTriangle className="h-3.5 w-3.5" aria-label="Urgentní" />}
                      {waitingFor(s.studyDate)}
                    </span>
                    <span className="hidden whitespace-nowrap text-sm md:block">{formatDateTime(s.studyDate)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{patientName(s)}</span>
                      <span className="block text-[12px] text-ui-muted">{formatRc(s.pid)}</span>
                    </span>
                    <span className="hidden md:block">
                      <ModalityTag modality={s.idMedicalServiceCategory} />
                    </span>
                    <span className="col-span-2 min-w-0 truncate text-[13px] text-ui-muted md:col-span-1">
                      {(s.studyServiceInfo ?? []).map((v) => v.idMedicalService).join(", ")}
                      {s.idMedicalDiagnosisRequested && ` · ${s.idMedicalDiagnosisRequested} ${s.medicalDiagnosisRequestedInfo?.description ?? ""}`}
                    </span>
                    <span className="hidden items-center gap-1 text-[13px] text-ui-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:inline-flex">
                      Popsat <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </BentoTile>
      </Bento>
    </div>
  );
}


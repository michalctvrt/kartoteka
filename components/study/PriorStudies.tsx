"use client";

/**
 * Předchozí vyšetření pacienta vedle psaní popisu – ke srovnání s minulým nálezem.
 * Výchozí: jen stejná modalita (lze přepnout na všechny). Popis se rozbalí, „Vložit srovnání“ vloží
 * větu „Srovnání s předchozím vyšetřením z D. M. RRRR: “, „Vložit popis“ celý minulý popis.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { ModalityTag } from "@/components/study/StudyBits";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { loadPriorStudies } from "@/lib/reportQueue";
import { formatDate, hasReport } from "@/lib/studies";

export default function PriorStudies({
  study,
  onInsert,
  onCount,
}: {
  study: StudyInfo;
  onInsert: (text: string) => void;
  onCount?: (n: number) => void;
}) {
  const [rows, setRows] = useState<StudyInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [same, setSame] = useState<"same" | "all">("same");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let off = false;
    loadPriorStudies(study.pid, study.id)
      .then((r) => {
        if (off) return;
        setRows(r);
        onCount?.(r.length);
      })
      .catch((e: Error) => !off && setError(e.message));
    return () => {
      off = true;
    };
  }, [study.pid, study.id, onCount]);

  const sameCount = (rows ?? []).filter((s) => s.idMedicalServiceCategory === study.idMedicalServiceCategory).length;
  const mode = same === "same" && !sameCount ? "all" : same;
  const list = (rows ?? []).filter((s) => mode === "all" || s.idMedicalServiceCategory === study.idMedicalServiceCategory);

  return (
    <div className="flex flex-col gap-3">
      <Segmented<"same" | "all">
        size="sm"
        label="Která vyšetření"
        value={mode}
        onChange={setSame}
        options={[
          { value: "same", label: `${study.idMedicalServiceCategory ?? "Stejná"} ${sameCount}` },
          { value: "all", label: `Všechna ${rows?.length ?? ""}` },
        ]}
      />
      {error ? (
        <p className="text-[13px] text-red-700 dark:text-red-300">Nepodařilo se načíst: {error}</p>
      ) : !rows ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !list.length ? (
        <Ghost label="Pacient nemá jiné vyšetření" />
      ) : (
        <ul className="-mx-1 max-h-[65vh] space-y-1 overflow-y-auto px-1">
          {list.map((s, i) => {
            const isOpen = open === s.id;
            const date = formatDate(s.studyDate);
            return (
              <motion.li key={s.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="rounded-md border border-ui-line">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-ui-raised"
                >
                  <ModalityTag modality={s.idMedicalServiceCategory} />
                  <span className="font-medium tabular-nums">{date}</span>
                  <span className="min-w-0 flex-1 truncate text-ui-muted">
                    {(s.studyServiceInfo ?? []).map((v) => v.idMedicalService).join(", ")}
                    {!hasReport(s) && " · bez popisu"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-ui-faint transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-2 border-t border-ui-rule px-2.5 pb-2.5 pt-2">
                    {hasReport(s) ? (
                      <div className="ui-paper max-h-80 overflow-y-auto whitespace-pre-wrap px-3 py-2 text-[13px] leading-relaxed">{s.description}</div>
                    ) : (
                      <p className="text-[13px] text-ui-faint">Studie není popsaná.</p>
                    )}
                    {s.nameDescriptionChanged && <p className="text-[11px] text-ui-faint">Popsal(a) {s.nameDescriptionChanged}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => onInsert(`Srovnání s předchozím vyšetřením z ${date}: `)}>
                        Vložit srovnání
                      </Button>
                      {hasReport(s) && (
                        <Button size="sm" variant="outline" onClick={() => onInsert(s.description ?? "")}>
                          Vložit popis
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/reception/studies/${s.id}`} target="_blank">
                          <ExternalLink /> Karta
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

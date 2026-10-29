"use client";

/**
 * Ověření pojištění v registru (převzato z /opt/testapp → Pacient).
 * Při otevření karty se ověří k dnešku; jiný den jde vybrat. Když registr
 * hlásí jinou pojišťovnu než karta, upozorní (a recepční může kartu opravit).
 */

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, CircleHelp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { checkInsurance, type InsuranceResult } from "@/lib/ops";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function InsuranceCheck({
  pid,
  cardCode,
  onUseCode,
}: {
  pid: string;
  /** pojišťovna uložená na kartě */
  cardCode: string;
  /** převzít pojišťovnu z registru na kartu (jen kdo smí upravovat) */
  onUseCode?: (code: string) => void;
}) {
  const [date, setDate] = useState(today);
  const [attempt, setAttempt] = useState(0);
  const key = `${pid}|${date}|${attempt}`;
  const [result, setResult] = useState<{ key: string; r: InsuranceResult } | null>(null);
  const r = result?.key === key ? result.r : null;

  useEffect(() => {
    let cancelled = false;
    checkInsurance(pid, date).then((res) => !cancelled && setResult({ key, r: res }));
    return () => {
      cancelled = true;
    };
  }, [pid, date, key]);

  const mismatch = r?.status === "insured" && r.code && cardCode && r.code !== cardCode;

  return (
    <div className="mt-3 border-t border-ui-rule pt-3" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-ui-muted" title="Registr pojištěnců">Registr</span>
        <div className="flex items-center gap-1">
          <input
            type="date"
            aria-label="Pojištění ke dni"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="ui-input h-7 w-[124px] px-1.5 text-[12px]"
          />
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="rounded p-1 text-ui-faint hover:bg-ui-raised hover:text-ui-ink"
            aria-label="Ověřit znovu"
            title="Ověřit znovu"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", !r && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="mt-2 min-h-[22px] text-[13px]">
        {!r ? (
          <Skeleton className="h-5 w-40" />
        ) : r.status === "insured" ? (
          <span className="flex items-start gap-1.5 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Pojištěn · <span className="text-ui-ink">{[r.code, r.name].filter(Boolean).join(" – ")}</span>
            </span>
          </span>
        ) : r.status === "uninsured" ? (
          <span className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-300">
            <CircleAlert className="h-4 w-4" /> Nepojištěn k tomuto dni
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300" title={r.error}>
            <CircleHelp className="h-4 w-4" /> Stav se nepodařilo zjistit
          </span>
        )}
      </div>

      {mismatch && (
        <p className="mt-1.5 text-[12px] text-amber-800 dark:text-amber-300">
          Na kartě je {cardCode}, registr hlásí {r.code}.
          {onUseCode && (
            <button type="button" onClick={() => onUseCode(r.code)} className="ml-1 text-ui-primary hover:underline">
              Přepsat na {r.code}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

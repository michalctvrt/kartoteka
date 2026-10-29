"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueApi, waitingMinutes } from "@/lib/call250v/browser";
import { ARRIVAL_KINDS, ARRIVAL_LABEL, ARRIVAL_SERVICES, type ArrivalKind } from "@/lib/call250v/config";

/** Číslo lístku tak, jak ho vidí pacient na tabuli. */
export function TicketNo({ no, big }: { no?: string | null; big?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-semibold bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
        big ? "text-3xl px-4 py-2 min-w-[5.5rem] bg-brand-700 text-white dark:bg-brand-700 dark:text-white" : "text-sm px-2 py-0.5 min-w-[3.5rem]"
      )}
    >
      {no ?? "—"}
    </span>
  );
}

export function WaitTime({ created }: { created?: string | null }) {
  const m = waitingMinutes(created);
  if (m === null) return null;
  return (
    <span className={cn("whitespace-nowrap text-xs", m >= 30 ? "text-red-600 font-semibold" : "text-ui-faint")}>
      čeká {m} min
    </span>
  );
}

export function QueueError({ error, onClose }: { error: string | null; onClose?: () => void }) {
  if (!error) return null;
  return (
    <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md p-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">{error}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Zavřít">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function QueueButton({
  children,
  onClick,
  disabled,
  variant = "default",
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger" | "success";
  title?: string;
}) {
  const styles = {
    default: "border border-ui-control bg-ui-sheet text-ui-ink hover:bg-ui-raised",
    primary: "border border-ui-primary-hover bg-ui-primary text-white [--ui-bevel:rgba(255,255,255,0.18)] hover:bg-ui-primary-hover dark:text-brand-950",
    danger: "bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    success: "bg-green-600 hover:bg-green-700 text-white",
  }[variant];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "ui-press inline-flex h-8 items-center gap-1 rounded-md px-3 text-[13px] font-medium disabled:pointer-events-none disabled:opacity-50",
        styles
      )}
    >
      {children}
    </button>
  );
}

/** Jen v simulaci: nahrazuje kiosk u vstupu (tisk lístku – jen „na vyšetření“ / „objednat se“, bez modality). */
export function MockKiosk({ onDone, compact = false }: { onDone: () => void; compact?: boolean }) {
  const add = async (k: ArrivalKind) => {
    await queueApi.add(ARRIVAL_SERVICES[k]);
    onDone();
  };
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Simulace kiosku:</span>
        {ARRIVAL_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => add(k)}
            className="px-2 py-0.5 rounded border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100"
          >
            + {ARRIVAL_LABEL[k]}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs space-y-2">
      <div className="font-semibold text-amber-800 dark:text-amber-300">
        SIMULACE – Call250V není připojený. Kiosk u vstupu:
      </div>
      <div className="flex gap-2 flex-wrap">
        {ARRIVAL_KINDS.map((k) => (
          <QueueButton key={k} onClick={() => add(k)}>
            Lístek – {ARRIVAL_LABEL[k]}
          </QueueButton>
        ))}
      </div>
    </div>
  );
}

export function OperatorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-ui-muted">
      Operátor
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ID v Call250V"
        className="w-28 px-2 py-1 border rounded bg-ui-sheet"
      />
    </label>
  );
}

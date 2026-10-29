"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueApi, waitingMinutes } from "@/lib/call250v/browser";
import { ARRIVAL_SERVICES, MODALITIES } from "@/lib/call250v/config";

/** Číslo lístku tak, jak ho vidí pacient na tabuli. */
export function TicketNo({ no, big }: { no?: string | null; big?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-bold bg-brand-600 text-white",
        big ? "text-3xl px-4 py-2 min-w-[5.5rem]" : "text-sm px-2 py-0.5 min-w-[3.5rem]"
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
    <span className={cn("text-xs", m >= 30 ? "text-red-600 font-semibold" : "text-gray-500")}>
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
    default: "bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:hover:bg-neutral-600",
    primary: "bg-brand-600 hover:bg-brand-700 text-white",
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
        "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition disabled:opacity-50 disabled:pointer-events-none",
        styles
      )}
    >
      {children}
    </button>
  );
}

/** Jen v simulaci: nahrazuje kiosk u vstupu (tisk lístku). */
export function MockKiosk({ onDone }: { onDone: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs space-y-2">
      <div className="font-semibold text-amber-800 dark:text-amber-300">
        SIMULACE – Call250V není připojený. Kiosk u vstupu:
      </div>
      <div className="flex gap-2">
        {MODALITIES.map((m) => (
          <QueueButton
            key={m}
            onClick={async () => {
              await queueApi.add(ARRIVAL_SERVICES[m]);
              onDone();
            }}
          >
            Vytisknout lístek {m}
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
    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
      Operátor
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ID v Call250V"
        className="w-28 px-2 py-1 border rounded bg-white dark:bg-neutral-900"
      />
    </label>
  );
}

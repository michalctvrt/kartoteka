"use client";

/**
 * Přehled čekáren pro laboranty a lékaře: tři oddělené sloupce RTG / UZ / MRI.
 *
 * - „Čeká“: pacienti v čekárně (pending). Tlačítko u dveří ho vyvolá →
 *   okamžitě zmizí z čekajících (na všech obrazovkách po dalším obnovení,
 *   tj. do 2 s) a přesune se do „Na vyšetření“.
 * - „Na vyšetření“: vyvolaní (called). Po vyšetření „Hotovo → UZ/MRI/…“
 *   přeřadí pacienta — objeví se jako čekající v cílovém sloupci.
 * - Lístek se tu nikdy neukončuje (jinak by pacientovi přestal fungovat QR).
 */

import Link from "next/link";
import { Megaphone, RotateCcw, Stethoscope, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueApi } from "@/lib/call250v/browser";
import {
  MODALITIES,
  MODALITY_COUNTERS,
  REPORT_SERVICE,
  WAITING_SERVICES,
  counterLabel,
  type Modality,
} from "@/lib/call250v/config";
import type { QueueItem } from "@/lib/call250v/types";
import { useQueue, useQueueMock } from "./useQueue";
import { useWorkstation } from "./useWorkstation";
import { usePatientNames } from "./usePatientNames";
import { FULL, type WidgetSize } from "@/components/dashboard/size";
import { OperatorInput, QueueButton, QueueError, TicketNo, WaitTime } from "./QueueUi";

/** Barvy modalit — stejné jako u vyšetření na kartě pacienta. */
export const MODALITY_STYLE: Record<
  Modality,
  { title: string; header: string; border: string; badge: string; soft: string }
> = {
  RTG: {
    title: "RTG",
    header: "bg-orange-500 text-white",
    border: "border-orange-300 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    soft: "bg-orange-50 dark:bg-orange-950/30",
  },
  UZ: {
    title: "Ultrazvuk",
    header: "bg-sky-600 text-white",
    border: "border-sky-300 dark:border-sky-800",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    soft: "bg-sky-50 dark:bg-sky-950/30",
  },
  MRI: {
    title: "MRI",
    header: "bg-purple-600 text-white",
    border: "border-purple-300 dark:border-purple-800",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
    soft: "bg-purple-50 dark:bg-purple-950/30",
  },
};

const WAITING_IDS = MODALITIES.map((m) => WAITING_SERVICES[m]);

export default function WaitingBoard() {
  const { ws, update } = useWorkstation();
  const mock = useQueueMock();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" /> Čekající pacienti
        </h2>
        {mock && (
          <span className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
            SIMULACE – vyvolávací systém není připojený
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {MODALITIES.map((m) => (
          <ModalityColumn key={m} m={m} />
        ))}
      </div>

      <div className="flex justify-end">
        <OperatorInput value={ws.operatorId} onChange={(v) => update({ operatorId: v })} />
      </div>
    </div>
  );
}

/**
 * Jedna čekárna (RTG / UZ / MRI) — samostatně použitelná i jako okno na ploše.
 * Podoba podle velikosti okna (size): S = velké číslo + další na řadě,
 * M/L = seznam; `wide` = řádky na jeden řádek s tlačítky vpravo.
 * Všechny sloupce sdílejí jedno načítání fronty (viz useQueue).
 */
export function ModalityColumn({
  m,
  className,
  size = FULL,
}: {
  m: Modality;
  className?: string;
  size?: WidgetSize;
}) {
  const { items, error, clearError, busy, run, loading } = useQueue(WAITING_IDS, 2000);
  const names = usePatientNames(items.map((i) => i.externalIdentifier ?? "").filter(Boolean));
  const call = (id: string, counter: string) => run(() => queueApi.call(id, counter));
  const moveTo = (id: string, serviceId: string) => run(() => queueApi.patch(id, { serviceId }));

  const inService = items.filter((i) => i.serviceId === WAITING_SERVICES[m]);
  const waiting = inService.filter((i) => i.status !== "called");
  const called = inService.filter((i) => i.status === "called");
  const st = MODALITY_STYLE[m];
  const small = size.size === "S";
  const counters = MODALITY_COUNTERS[m];

  const callButtons = (it: QueueItem, compact = false) =>
    counters.map((c) => (
      <QueueButton
        key={c.id}
        variant="primary"
        disabled={busy}
        title={`Vyvolat – ${c.label}`}
        onClick={() => call(it.queueItemId, c.id)}
      >
        <Megaphone className="w-4 h-4" />
        {compact
          ? counters.length > 1 && c.label.match(/\d+$/)?.[0]
          : counters.length > 1
          ? c.label.split("–").pop()!.trim()
          : "Vyvolat"}
      </QueueButton>
    ));

  return (
    <section className={cn("rounded-xl border-2 overflow-hidden flex flex-col", st.border, className)}>
      <header
        className={cn(
          "flex items-center justify-between shrink-0",
          small ? "px-3 py-1.5" : "px-4 py-3",
          st.header
        )}
      >
        <span className={cn("font-bold", small ? "text-base" : "text-lg")}>{st.title}</span>
        <span
          className={cn(
            "min-w-[2.5rem] text-center rounded-full px-3 py-0.5 font-bold bg-white/25",
            small ? "text-base" : "text-lg",
            waiting.length > 0 && "animate-pulse"
          )}
          title="Počet čekajících"
        >
          {waiting.length}
        </span>
      </header>
      {error && (
        <div className="p-2">
          <QueueError error={error} onClose={clearError} />
        </div>
      )}

      {small ? (
        /* ── S: souhrn — další na řadě ── */
        <div className="flex-1 min-h-0 p-2.5 flex flex-col justify-center gap-1.5">
          {loading ? (
            <p className="text-sm text-gray-500 text-center">Načítám…</p>
          ) : waiting.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">Nikdo nečeká</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <TicketNo no={waiting[0].orderNumber} />
                <span className="text-sm font-medium truncate flex-1">
                  {names[waiting[0].externalIdentifier ?? ""] ?? waiting[0].externalIdentifier ?? "—"}
                </span>
                <div className="flex gap-1">{callButtons(waiting[0], true)}</div>
              </div>
              {(waiting.length > 1 || called.length > 0) && (
                <div className="text-xs text-gray-500 flex gap-3">
                  {waiting.length > 1 && <span>+ {waiting.length - 1} další</span>}
                  {called.length > 0 && <span>{called.length} na vyšetření</span>}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* ── M/L: Čeká ── */}
          <div className="p-3 space-y-2 flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500">Načítám…</p>
            ) : waiting.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Nikdo nečeká.</p>
            ) : (
              waiting.map((it) => (
                <TicketRow
                  key={it.queueItemId}
                  item={it}
                  name={names[it.externalIdentifier ?? ""]}
                  inline={size.wide}
                >
                  {callButtons(it, !size.wide && size.width < 340)}
                </TicketRow>
              ))
            )}
          </div>

          {/* ── Na vyšetření ── */}
          {called.length > 0 && (
            <div className={cn("border-t p-3 space-y-2 shrink-0 max-h-[50%] overflow-y-auto", st.soft)}>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" /> Na vyšetření
              </div>
              {called.map((it) => (
                <TicketRow
                  key={it.queueItemId}
                  item={it}
                  name={names[it.externalIdentifier ?? ""]}
                  status={`→ ${counterLabel(it.counter)}`}
                  inline={size.wide}
                >
                  <QueueButton disabled={busy} title="Znovu vyvolat" onClick={() => call(it.queueItemId, it.counter!)}>
                    <RotateCcw className="w-4 h-4" /> {size.size === "L" && "Znovu"}
                  </QueueButton>
                  <span className="text-xs text-gray-500 self-center">Hotovo →</span>
                  {MODALITIES.filter((x) => x !== m).map((x) => (
                    <button
                      key={x}
                      type="button"
                      disabled={busy}
                      onClick={() => moveTo(it.queueItemId, WAITING_SERVICES[x])}
                      className={cn(
                        "px-2.5 py-1.5 text-xs font-semibold rounded-md disabled:opacity-50",
                        MODALITY_STYLE[x].badge
                      )}
                    >
                      {x}
                    </button>
                  ))}
                  <QueueButton variant="success" disabled={busy} onClick={() => moveTo(it.queueItemId, REPORT_SERVICE)}>
                    Recepce
                  </QueueButton>
                </TicketRow>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TicketRow({
  item,
  name,
  status,
  inline = false,
  children,
}: {
  item: QueueItem;
  name?: string;
  status?: string;
  /** široké okno: vše na jednom řádku, tlačítka vpravo */
  inline?: boolean;
  children: React.ReactNode;
}) {
  const pid = item.externalIdentifier ?? "";
  const info = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <TicketNo no={item.orderNumber} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          {pid ? (
            <Link href={`/reception/patients/${encodeURIComponent(pid)}`} className="hover:underline">
              {name ?? pid}
            </Link>
          ) : (
            <span className="text-gray-500">Nepřiřazený lístek</span>
          )}
        </div>
        <div className="text-xs flex gap-2">
          {status && <span className="font-semibold text-brand-700 dark:text-brand-300">{status}</span>}
          <WaitTime created={item.createdDate} />
          {item.priority && <span className="text-red-600 font-semibold">PRIORITA</span>}
        </div>
      </div>
    </div>
  );
  return (
    <div
      className={cn(
        "rounded-lg border bg-white dark:bg-neutral-900 p-2.5 shadow-sm",
        inline ? "flex items-center gap-3" : "space-y-2"
      )}
    >
      {info}
      <div className={cn("flex gap-1.5 flex-wrap", inline && "justify-end shrink-0")}>{children}</div>
    </div>
  );
}

"use client";

/**
 * Na kartě pacienta: propojí lístek z kiosku s pacientem a pošle ho do čekárny.
 *
 * - Lístek se najde podle ?ticket= v URL (přechod z panelu recepce),
 *   nebo jako lístek vyvolaný právě u tohoto pultu recepce.
 * - PATCH { externalIdentifier: RČ, serviceId: čekárna } → laborant/lékař
 *   ho hned uvidí ve worklistu.
 * - Když už je lístek propojený, ukáže kde pacient je a dovolí přeřadit.
 */

import type { ReactNode } from "react";
import { BentoTile } from "@/components/ui/bento";
import { Skeleton } from "@/components/ui/skeleton";
import { queueApi } from "@/lib/call250v/browser";
import {
  ARRIVAL_SERVICES,
  MODALITIES,
  REPORT_SERVICE,
  WAITING_SERVICES,
  counterLabel,
  arrivalKindOf,
  serviceLabel,
} from "@/lib/call250v/config";
import { useQueue } from "./useQueue";
import { useWorkstation } from "./useWorkstation";
import { useSession } from "@/components/auth/SessionProvider";
import Link from "next/link";
import { BOOKABLE } from "@/lib/supersaas/calendars";
import { QueueButton, QueueError, TicketNo, WaitTime } from "./QueueUi";

const ARRIVALS = Object.values(ARRIVAL_SERVICES);

/**
 * Dlaždice (2 sloupce) na kartě pacienta. Bez lístku vrátí `fallback`
 * (typicky poslední vyšetření) – na kartě se tak neukazuje prázdné místo.
 */
export default function PatientQueueBox({
  pid,
  ticketId,
  fallback = null,
  index = 0,
}: {
  pid: string;
  ticketId?: string | null;
  fallback?: ReactNode;
  index?: number;
}) {
  const { ws } = useWorkstation();
  // přiřazovat lístek a rozřazovat do čekáren smí recepce (a admin); ostatní jen vidí, kde pacient je
  const { can } = useSession();
  const canRoute = can("queue.reception");
  const canBook = can("calendar.book") && BOOKABLE.length > 0;
  const { items, error, clearError, busy, run, loading } = useQueue([], 4000);

  const linked = items.find((i) => i.externalIdentifier === pid);
  const unlinked =
    !linked &&
    (items.find((i) => i.queueItemId === ticketId) ??
      items.find(
        (i) =>
          i.status === "called" &&
          i.counter === ws.receptionCounter &&
          ARRIVALS.includes(i.serviceId ?? "") &&
          !i.externalIdentifier
      ));

  if (loading) {
    return (
      <BentoTile span={2} index={index}>
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-14 w-24 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </BentoTile>
    );
  }
  if (!linked && !unlinked && !error) return <>{fallback}</>;

  const item = linked || unlinked || null;
  const kioskChoice = unlinked ? arrivalKindOf(unlinked.serviceId) : null;

  const sendTo = (serviceId: string) =>
    item &&
    run(() =>
      queueApi.patch(item.queueItemId, {
        serviceId,
        ...(linked ? {} : { externalIdentifier: pid }),
      })
    );

  return (
    <BentoTile
      span={2}
      index={index}
      title="Návštěva – vyvolávací systém"
      action={item && <WaitTime created={item.createdDate} />}
    >
      <QueueError error={error} onClose={clearError} />
      {item && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <TicketNo no={item.orderNumber} big />
            <div className="min-w-0">
              <div className="text-lg font-semibold leading-tight">
                {linked ? serviceLabel(item.serviceId) : "Lístek bez pacienta"}
              </div>
              <div className="mt-1 text-[13px] text-ui-muted">
                {item.status === "called" ? `Vyvolán k ${counterLabel(item.counter)}` : "Čeká na vyvolání"}
                {kioskChoice && ` · na kiosku: ${kioskChoice === "booking" ? "chce se objednat" : "přišel na vyšetření"}`}
              </div>
              {kioskChoice === "booking" && canBook && (
                <Link href={`/reception/calendar?book=1&pid=${encodeURIComponent(pid)}`} className="mt-1 inline-block text-[13px] text-ui-primary hover:underline">
                  Objednat termín →
                </Link>
              )}
            </div>
          </div>

          {canRoute && (
          <div className="mt-4">
            <div className="mb-2 text-[13px] text-ui-muted">
              {linked ? "Přeřadit do" : "Po založení vyšetření se pošle sám, nebo ručně do"}
            </div>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((m) => {
                const target = WAITING_SERVICES[m];
                const current = linked && item.serviceId === target;
                return (
                  <QueueButton key={m} disabled={busy || !!current} onClick={() => sendTo(target)}>
                    Čekárna {m}
                  </QueueButton>
                );
              })}
              {linked && (
                <QueueButton
                  disabled={busy || item.serviceId === REPORT_SERVICE}
                  onClick={() => sendTo(REPORT_SERVICE)}
                >
                  Recepce – výdej zprávy
                </QueueButton>
              )}
            </div>
          </div>
          )}
        </>
      )}
    </BentoTile>
  );
}

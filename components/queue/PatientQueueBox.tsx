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

import { ArrowRightLeft, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queueApi } from "@/lib/call250v/browser";
import {
  ARRIVAL_SERVICES,
  MODALITIES,
  REPORT_SERVICE,
  WAITING_SERVICES,
  counterLabel,
  modalityOfService,
  serviceLabel,
} from "@/lib/call250v/config";
import { cn } from "@/lib/utils";
import { useQueue } from "./useQueue";
import { useWorkstation } from "./useWorkstation";
import { QueueButton, QueueError, TicketNo, WaitTime } from "./QueueUi";

const ARRIVALS = Object.values(ARRIVAL_SERVICES);

export default function PatientQueueBox({
  pid,
  ticketId,
}: {
  pid: string;
  ticketId?: string | null;
}) {
  const { ws } = useWorkstation();
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

  if (loading) return null;
  if (!linked && !unlinked && !error) {
    return (
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Ticket className="w-3.5 h-3.5" /> Pacient nemá lístek ve vyvolávacím systému.
      </p>
    );
  }

  const item = linked || unlinked || null;
  const kioskChoice = unlinked ? modalityOfService(unlinked.serviceId) : null;

  const sendTo = (serviceId: string) =>
    item &&
    run(() =>
      queueApi.patch(item.queueItemId, {
        serviceId,
        ...(linked ? {} : { externalIdentifier: pid }),
      })
    );

  return (
    <Card className="border-brand-300 dark:border-brand-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="w-5 h-5" /> Vyvolávací systém
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <QueueError error={error} onClose={clearError} />
        {item && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <TicketNo no={item.orderNumber} big />
              <div className="text-sm">
                <div className="font-semibold">
                  {linked ? serviceLabel(item.serviceId) : "Lístek zatím není přiřazený k pacientovi"}
                </div>
                <div className="text-gray-600 dark:text-gray-400 flex gap-2 items-center">
                  {item.status === "called"
                    ? `Vyvolán k ${counterLabel(item.counter)}`
                    : "Čeká"}
                  <WaitTime created={item.createdDate} />
                </div>
                {kioskChoice && (
                  <div className="text-xs text-gray-500">Na kiosku zvolil: {kioskChoice}</div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {linked
                  ? "Přeřadit do:"
                  : "Po založení vyšetření se pošle do čekárny sám, nebo ručně do:"}
              </div>
              <div className="flex gap-2 flex-wrap">
                {MODALITIES.map((m) => {
                  const target = WAITING_SERVICES[m];
                  const current = linked && item.serviceId === target;
                  return (
                    <span key={m} className={cn(m === kioskChoice && "ring-2 ring-brand-400 rounded-md")}>
                      <QueueButton
                        variant={m === kioskChoice ? "primary" : "default"}
                        disabled={busy || !!current}
                        onClick={() => sendTo(target)}
                      >
                        Čekárna {m}
                      </QueueButton>
                    </span>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

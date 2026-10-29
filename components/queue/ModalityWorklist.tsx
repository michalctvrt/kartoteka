"use client";

/**
 * Worklist modality (RTG / UZ / MRI) — pro laboranta i lékaře.
 *
 * Ukazuje pacienty v čekárně dané modality (fronta Call250V), doplněné
 * o jméno z kartotéky. Laborant vybírá KONKRÉTNÍHO pacienta (ne „další“),
 * vyvolá ho k dveřím 1/2 a po vyšetření ho pošle dál — na další modalitu,
 * nebo zpět na recepci pro zprávu. Lístek se tady nikdy neukončuje,
 * jinak by pacientovi přestal fungovat QR kód na dveřích.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, RotateCcw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientService } from "@/lib/api/generated/services/PatientService";
import { queueApi } from "@/lib/call250v/browser";
import {
  MODALITIES,
  MODALITY_COUNTERS,
  REPORT_SERVICE,
  WAITING_SERVICES,
  counterLabel,
  type Modality,
} from "@/lib/call250v/config";
import { useQueue, useQueueMock } from "./useQueue";
import { useWorkstation } from "./useWorkstation";
import { OperatorInput, QueueButton, QueueError, TicketNo, WaitTime } from "./QueueUi";

export default function ModalityWorklist() {
  const { ws, update } = useWorkstation();
  const modality = ws.modality;
  const mock = useQueueMock();
  const { items, error, clearError, busy, run, loading } = useQueue([WAITING_SERVICES[modality]]);
  const names = usePatientNames(items.map((i) => i.externalIdentifier ?? "").filter(Boolean));
  const counters = MODALITY_COUNTERS[modality];

  const moveTo = (id: string, serviceId: string) => run(() => queueApi.patch(id, { serviceId }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle>Worklist – čekárna {modality}</CardTitle>
          <div className="flex items-center gap-3">
            <select
              value={modality}
              onChange={(e) => update({ modality: e.target.value as Modality })}
              className="px-2 py-1 border rounded text-sm bg-white dark:bg-neutral-900"
            >
              {MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <OperatorInput value={ws.operatorId} onChange={(v) => update({ operatorId: v })} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mock && (
          <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
            SIMULACE – Call250V není připojený. Pacienty sem pošlete z karty pacienta na recepci.
          </p>
        )}
        <QueueError error={error} onClose={clearError} />

        {loading ? (
          <p className="text-sm text-gray-500">Načítám frontu…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">V čekárně {modality} nikdo není.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-neutral-700 border rounded-md">
            {items.map((it) => {
              const pid = it.externalIdentifier ?? "";
              const called = it.status === "called";
              return (
                <li
                  key={it.queueItemId}
                  className={`px-3 py-3 space-y-2 ${called ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <TicketNo no={it.orderNumber} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {pid ? (
                          <Link href={`/reception/patients/${encodeURIComponent(pid)}`} className="hover:underline">
                            {names[pid] ?? pid}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Nepřiřazený lístek</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        {called ? (
                          <span className="text-blue-700 dark:text-blue-300 font-semibold">
                            Vyvolán → {counterLabel(it.counter)}
                          </span>
                        ) : (
                          <span>Čeká</span>
                        )}
                        <WaitTime created={it.createdDate} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {called ? (
                      <QueueButton
                        disabled={busy}
                        onClick={() => run(() => queueApi.call(it.queueItemId, it.counter!))}
                      >
                        <RotateCcw className="w-4 h-4" /> Znovu vyvolat
                      </QueueButton>
                    ) : (
                      counters.map((c) => (
                        <QueueButton
                          key={c.id}
                          variant="primary"
                          disabled={busy}
                          onClick={() => run(() => queueApi.call(it.queueItemId, c.id))}
                        >
                          <Megaphone className="w-4 h-4" /> {counters.length > 1 ? c.label.split("–").pop()!.trim() : "Vyvolat"}
                        </QueueButton>
                      ))
                    )}

                    {called && (
                      <>
                        <span className="text-xs text-gray-500 self-center ml-2 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Hotovo, poslat:
                        </span>
                        {MODALITIES.filter((m) => m !== modality).map((m) => (
                          <QueueButton
                            key={m}
                            disabled={busy}
                            onClick={() => moveTo(it.queueItemId, WAITING_SERVICES[m])}
                          >
                            na {m}
                          </QueueButton>
                        ))}
                        <QueueButton
                          variant="success"
                          disabled={busy}
                          onClick={() => moveTo(it.queueItemId, REPORT_SERVICE)}
                        >
                          na recepci (zpráva)
                        </QueueButton>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Dohledá jména pacientů v kartotéce podle RČ (best-effort, s cache). */
function usePatientNames(pids: string[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = pids.join(",");

  useEffect(() => {
    const missing = (key ? key.split(",") : []).filter((p) => !(p in names));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (pid) => {
        try {
          const p = await PatientService.findByPid(pid);
          const d = p.patientDataInfo;
          return [pid, d ? `${d.lastName ?? ""} ${d.firstName ?? ""}`.trim() || pid : pid] as const;
        } catch {
          return [pid, pid] as const;
        }
      })
    ).then((pairs) => {
      if (!cancelled) setNames((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return names;
}

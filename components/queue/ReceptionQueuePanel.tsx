"use client";

/**
 * Recepce: vyvolání dalšího pacienta z kiosku, otevření/založení karty,
 * výdej zprávy na konci návštěvy.
 *
 * Tok lístku:  kiosk (Příchod RTG/UZ/MRI) → recepce vyvolá → karta + vyšetření
 *   → přeřazení do čekárny (na kartě pacienta) → modalita → … → Výdej zprávy → konec
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, RotateCcw, FileCheck2, UserRound, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queueApi } from "@/lib/call250v/browser";
import { cn } from "@/lib/utils";
import {
  MODALITIES,
  RECEPTION_COUNTERS,
  RECEPTION_SERVICES,
  REPORT_SERVICE,
  WAITING_SERVICES,
  counterLabel,
  serviceLabel,
} from "@/lib/call250v/config";
import type { QueueItem } from "@/lib/call250v/types";
import { useQueue, useQueueMock } from "./useQueue";
import { useWorkstation } from "./useWorkstation";
import { FULL, type WidgetSize } from "@/components/dashboard/size";
import {
  MockKiosk,
  OperatorInput,
  QueueButton,
  QueueError,
  TicketNo,
  WaitTime,
} from "./QueueUi";

/**
 * `embedded` = bez vlastního rámečku a nadpisu (okno na ploše má svůj).
 * `size` = podoba podle velikosti okna: S souhrn, M bez přehledu čekáren,
 * L vše; široké okno = dva sloupce (vlevo pult, vpravo čekající).
 */
export default function ReceptionQueuePanel({
  embedded = false,
  size = FULL,
}: { embedded?: boolean; size?: WidgetSize } = {}) {
  const router = useRouter();
  const { ws, update } = useWorkstation();
  const mock = useQueueMock();
  // Bez filtru = celá pobočka (potřebujeme i počty v čekárnách)
  const { items, error, clearError, busy, run, refresh } = useQueue([]);
  const counter = ws.receptionCounter;

  const atReception = items.filter((i) => RECEPTION_SERVICES.includes(i.serviceId ?? ""));
  const waiting = atReception.filter((i) => i.status !== "called");
  const mine = atReception.filter((i) => i.status === "called" && i.counter === counter);

  // Recepce bere „dalšího“ ze všech svých front najednou (příchody i výdej zpráv)
  // podle pořadí — proto ne /next, ale vybereme sami a zavoláme /call.
  const callNext = () => {
    const first = waiting[0];
    if (first) run(() => queueApi.call(first.queueItemId, counter));
  };

  const openCard = (it: QueueItem, pid: string) =>
    router.push(
      `/reception/patients/${encodeURIComponent(pid)}?ticket=${encodeURIComponent(it.queueItemId)}`
    );

  // ── S: souhrn ──
  if (size.size === "S") {
    return (
      <div className="h-full flex flex-col justify-center gap-2">
        <QueueError error={error} onClose={clearError} />
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-700 dark:text-brand-300 leading-none">
              {waiting.length}
            </div>
            <div className="text-[11px] text-ui-faint">čeká</div>
          </div>
          <QueueButton variant="primary" onClick={callNext} disabled={busy || waiting.length === 0}>
            <Megaphone className="w-4 h-4" /> Vyvolat dalšího
          </QueueButton>
        </div>
        {mine.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-ui-muted">
            U {counterLabel(counter)}:
            {mine.map((it) => (
              <TicketNo key={it.queueItemId} no={it.orderNumber} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const controls = (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={counter}
        onChange={(e) => update({ receptionCounter: e.target.value })}
        className="px-2 py-1 border rounded text-sm bg-ui-sheet"
      >
        {RECEPTION_COUNTERS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      {size.size === "L" && (
        <OperatorInput value={ws.operatorId} onChange={(v) => update({ operatorId: v })} />
      )}
    </div>
  );

  const counterPart = (
    <div className="space-y-3">
      {mock && <MockKiosk onDone={refresh} compact={size.size !== "L"} />}
      <QueueError error={error} onClose={clearError} />
      {/* U mého pultu */}
      {mine.map((it) => (
        <CalledHere
          key={it.queueItemId}
          item={it}
          busy={busy}
          onRecall={() => run(() => queueApi.call(it.queueItemId, counter))}
          onComplete={() => run(() => queueApi.complete(it.queueItemId))}
          onOpenCard={(pid) => openCard(it, pid)}
          compact={size.size !== "L"}
        />
      ))}
      <div className="flex items-center gap-3">
        <QueueButton variant="primary" onClick={callNext} disabled={busy || waiting.length === 0}>
          <Megaphone className="w-4 h-4" /> Vyvolat dalšího
        </QueueButton>
        <span className="text-sm text-ui-faint">
          {waiting.length === 0 ? "Na recepci nikdo nečeká." : `Čeká: ${waiting.length}`}
        </span>
      </div>
    </div>
  );

  const waitingPart = (
    <div className="space-y-3">
      {waiting.length > 0 && (
        <ul className="divide-y divide-gray-200 dark:divide-neutral-700 border rounded-md">
          {waiting.map((it) => (
            <li key={it.queueItemId} className="flex items-center justify-between px-3 py-2 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <TicketNo no={it.orderNumber} />
                {/* důvod příchodu nad dobou čekání – v úzkém okně musí být vidět celý */}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {serviceLabel(it.serviceId)}
                    {it.priority && <span className="ml-2 text-xs text-red-600 font-semibold">PRIORITA</span>}
                  </span>
                  <WaitTime created={it.createdDate} />
                </span>
              </div>
              <QueueButton disabled={busy} onClick={() => run(() => queueApi.call(it.queueItemId, counter))}>
                Vyvolat
              </QueueButton>
            </li>
          ))}
        </ul>
      )}
      {/* Přehled čekáren — jen ve velkém okně */}
      {size.size === "L" && (
        <div className="flex gap-2 flex-wrap text-xs">
          {MODALITIES.map((m) => {
            const n = items.filter((i) => i.serviceId === WAITING_SERVICES[m]).length;
            return (
              <span key={m} className="px-2 py-1 rounded bg-ui-raised">
                Čekárna {m}: <b>{n}</b>
              </span>
            );
          })}
          <span className="px-2 py-1 rounded bg-ui-raised">
            Na zprávu: <b>{items.filter((i) => i.serviceId === REPORT_SERVICE).length}</b>
          </span>
        </div>
      )}
    </div>
  );

  const content = size.wide ? (
    <div className="grid grid-cols-2 gap-4 items-start">
      {counterPart}
      {waitingPart}
    </div>
  ) : (
    <div className="space-y-3">
      {counterPart}
      {waitingPart}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        {controls}
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Vyvolávací systém
          </CardTitle>
          {controls}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function CalledHere({
  item,
  busy,
  compact = false,
  onRecall,
  onComplete,
  onOpenCard,
}: {
  item: QueueItem;
  busy: boolean;
  /** střední okno: menší číslo a hustší rozložení */
  compact?: boolean;
  onRecall: () => void;
  onComplete: () => void;
  onOpenCard: (pid: string) => void;
}) {
  const [rc, setRc] = useState(item.externalIdentifier ?? "");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isReport = item.serviceId === REPORT_SERVICE;
  const cleanRc = rc.replace(/\D/g, "");

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-brand-500 bg-brand-50 dark:bg-brand-950/40",
        compact ? "p-2 space-y-2" : "p-3 space-y-3"
      )}
    >
      <div className="flex items-center gap-3">
        <TicketNo no={item.orderNumber} big={!compact} />
        <div className="text-sm">
          <div className="font-semibold">Vyvolán k {counterLabel(item.counter)}</div>
          <div className="text-ui-muted">{serviceLabel(item.serviceId)}</div>
        </div>
      </div>

      {isReport ? (
        <div className="flex gap-2 flex-wrap">
          {item.externalIdentifier && (
            <QueueButton onClick={() => onOpenCard(item.externalIdentifier!)}>
              <UserRound className="w-4 h-4" /> Karta pacienta
            </QueueButton>
          )}
          <QueueButton variant="success" disabled={busy} onClick={onComplete}>
            <FileCheck2 className="w-4 h-4" /> Zpráva předána – ukončit lístek
          </QueueButton>
          <QueueButton disabled={busy} onClick={onRecall}>
            <RotateCcw className="w-4 h-4" /> Znovu vyvolat
          </QueueButton>
        </div>
      ) : (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (cleanRc.length >= 9) onOpenCard(cleanRc);
            }}
          >
            <input
              value={rc}
              onChange={(e) => setRc(e.target.value)}
              placeholder="Rodné číslo pacienta"
              className="flex-1 px-2 py-1.5 border rounded text-sm bg-ui-sheet"
            />
            <button
              type="submit"
              disabled={cleanRc.length < 9}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white disabled:opacity-50"
            >
              Otevřít / založit kartu
            </button>
          </form>
          <div className="flex gap-2 flex-wrap">
            <QueueButton disabled={busy} onClick={onRecall}>
              <RotateCcw className="w-4 h-4" /> Znovu vyvolat
            </QueueButton>
            {confirmLeave ? (
              <QueueButton variant="danger" disabled={busy} onClick={onComplete}>
                Opravdu ukončit lístek?
              </QueueButton>
            ) : (
              <QueueButton variant="danger" onClick={() => setConfirmLeave(true)}>
                <LogOut className="w-4 h-4" /> Nedostavil se / odešel
              </QueueButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}

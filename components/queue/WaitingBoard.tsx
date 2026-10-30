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
import { useState } from "react";
import { Check, ChevronDown, Megaphone, RotateCcw, Stethoscope, Users } from "lucide-react";
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
import { useElementSize } from "@/components/dashboard/useElementSize";
import { OperatorInput, QueueButton, QueueError, TicketNo, WaitTime } from "./QueueUi";
import { useSession } from "@/components/auth/SessionProvider";
import { patientHref } from "@/lib/routes";

/** Barvy modalit — stejné jako u vyšetření na kartě pacienta. */
export const MODALITY_STYLE: Record<
  Modality,
  { title: string; header: string; border: string; badge: string; soft: string }
> = {
  RTG: {
    title: "RTG",
    header: "border-t-orange-500",
    border: "border-ui-line",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    soft: "bg-orange-50 dark:bg-orange-950/30",
  },
  UZ: {
    title: "Ultrazvuk",
    header: "border-t-sky-600",
    border: "border-ui-line",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    soft: "bg-sky-50 dark:bg-sky-950/30",
  },
  MRI: {
    title: "MRI",
    header: "border-t-purple-600",
    border: "border-ui-line",
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
 *
 * Každý pacient = jeden kompaktní řádek (číslo, jméno, čas, tlačítka vpravo).
 * V okně na ploše se spočítá, kolik řádků se vejde do výšky, a tolik se
 * jich ukáže — nikdy posuvník; zbytek jako „+ N dalších čeká“.
 * Na samostatné stránce (Worklist) se ukážou všichni.
 * Všechny sloupce sdílejí jedno načítání fronty (viz useQueue).
 */
const ROW = 42; // výška řádku v px
const GAP = 5;
const SECTION = 22; // nadpis „Na vyšetření“
const FOOTER = 18; // „+ N dalších“

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
  const [listRef, list] = useElementSize<HTMLDivElement>();

  const inService = items.filter((i) => i.serviceId === WAITING_SERVICES[m]);
  const waiting = inService.filter((i) => i.status !== "called");
  const called = inService.filter((i) => i.status === "called");
  const st = MODALITY_STYLE[m];
  const fit = size !== FULL; // okno na ploše → jen co se vejde
  const slimHeader = fit && size.height < 260;
  const wide = size.wide;
  const counters = MODALITY_COUNTERS[m];

  // ── kolik řádků se vejde ──
  // Priorita: aspoň 1 čekající (koho volat), pak vyšetřovaní, pak další čekající.
  // V malém okně bez nadpisu „Na vyšetření“ (řádky jsou podbarvené).
  const showSection = !fit || list.height >= 300;
  let showCalled = called.length;
  let showWaiting = waiting.length;
  if (fit) {
    const rows = (px: number) => Math.max(0, Math.floor((px + GAP) / (ROW + GAP)));
    const total = rows(list.height - (called.length && showSection ? SECTION + GAP : 0));
    const plan = (cap: number) => {
      const w1 = Math.min(waiting.length, 1, cap);
      const c = Math.min(called.length, cap - w1);
      return { c, w: Math.min(waiting.length, cap - c) };
    };
    let r = plan(total);
    // nevejdou se všichni čekající → místo na řádek „+ N dalších“
    if (r.w < waiting.length) r = plan(rows(list.height - (called.length && showSection ? SECTION + GAP : 0) - FOOTER));
    showCalled = r.c;
    showWaiting = r.w;
  }
  const hiddenWaiting = waiting.length - showWaiting;
  const hiddenCalled = called.length - showCalled;

  const name = (it: QueueItem) => names[it.externalIdentifier ?? ""] ?? it.externalIdentifier ?? "";

  return (
    <section className={cn("rounded-lg border overflow-hidden flex flex-col bg-ui-sheet", st.border, className)}>
      <header
        className={cn(
          // barva modality jen jako horní hrana – na čekárnu se kouká celý den
          "flex items-center justify-between shrink-0 border-t-[3px]",
          slimHeader ? "px-3 py-1.5" : "px-4 py-2.5",
          st.header
        )}
      >
        <span className={cn("font-semibold", slimHeader ? "text-sm" : "text-base")}>{st.title}</span>
        <span
          className={cn(
            "min-w-[2rem] text-center rounded-md px-2 py-0.5 text-sm",
            waiting.length > 0 ? cn("font-semibold", st.badge) : "text-ui-muted"
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

      <div
        ref={listRef}
        className={cn("p-2 flex-1 min-h-0 flex flex-col", fit ? "overflow-hidden" : "")}
        style={{ gap: GAP }}
      >
        {loading ? (
          <p className="text-sm text-ui-faint text-center py-2">Načítám…</p>
        ) : inService.length === 0 ? (
          <p className="text-sm text-ui-faint text-center py-3">Nikdo nečeká</p>
        ) : (
          <>
            {waiting.slice(0, showWaiting).map((it) => (
              <Row key={it.queueItemId} item={it} name={name(it)}>
                {counters.length > 1 && size.width < 280 ? (
                  <MenuButton
                    disabled={busy}
                    variant="primary"
                    title="Vyvolat – vyberte dveře"
                    label={<Megaphone className="w-4 h-4" />}
                    options={counters.map((c) => ({
                      label: c.label,
                      cls: "bg-brand-600 text-white",
                      run: () => call(it.queueItemId, c.id),
                    }))}
                  />
                ) : (
                  counters.map((c) => (
                    <QueueButton
                      key={c.id}
                      variant="primary"
                      disabled={busy}
                      title={`Vyvolat – ${c.label}`}
                      onClick={() => call(it.queueItemId, c.id)}
                    >
                      <Megaphone className="w-4 h-4" />
                      {counters.length > 1
                        ? wide
                          ? c.label.split("–").pop()!.trim()
                          : c.label.match(/\d+$/)?.[0]
                        : wide && "Vyvolat"}
                    </QueueButton>
                  ))
                )}
              </Row>
            ))}
            {hiddenWaiting > 0 && (
              <div className="text-xs text-ui-faint px-1" style={{ height: FOOTER - GAP }}>
                + {hiddenWaiting} {hiddenWaiting === 1 ? "další čeká" : hiddenWaiting < 5 ? "další čekají" : "dalších čeká"}
              </div>
            )}

            {/* Na vyšetření */}
            {called.length > 0 && (
              <>
                {showSection && (
                <div
                  className={cn(
                    "mt-auto text-[11px] font-semibold uppercase tracking-wide text-ui-muted flex items-center gap-1 px-1",
                  )}
                  style={{ height: SECTION }}
                >
                  <Stethoscope className="w-3.5 h-3.5" /> Na vyšetření
                  {hiddenCalled > 0 && <span className="normal-case font-normal">(+{hiddenCalled})</span>}
                </div>
                )}
                {called.slice(0, showCalled).map((it) => (
                  <Row
                    key={it.queueItemId}
                    item={it}
                    name={name(it)}
                    status={counterLabel(it.counter).replace(/^.*–\s*/, "")}
                    tint={st.soft}
                    hideWait={size.width < 360}
                  >
                    {size.width >= 280 && (
                      <QueueButton disabled={busy} title="Znovu vyvolat" onClick={() => call(it.queueItemId, it.counter!)}>
                        <RotateCcw className="w-4 h-4" />
                      </QueueButton>
                    )}
                    {size.width >= 360 ? (
                      <>
                        {wide && <span className="text-xs text-ui-faint self-center px-1">Hotovo →</span>}
                        {MODALITIES.filter((x) => x !== m).map((x) => (
                          <button
                            key={x}
                            type="button"
                            disabled={busy}
                            title={`Hotovo – poslat na ${x}`}
                            onClick={() => moveTo(it.queueItemId, WAITING_SERVICES[x])}
                            className={cn(
                              "px-2 py-1.5 text-xs font-semibold rounded-md disabled:opacity-50",
                              MODALITY_STYLE[x].badge
                            )}
                          >
                            {x}
                          </button>
                        ))}
                        <QueueButton
                          variant="success"
                          disabled={busy}
                          title="Hotovo – zpět na recepci (zpráva)"
                          onClick={() => moveTo(it.queueItemId, REPORT_SERVICE)}
                        >
                          Recepce
                        </QueueButton>
                      </>
                    ) : (
                      <MenuButton
                        disabled={busy}
                        variant="success"
                        title="Hotovo – kam dál?"
                        label={
                          size.width < 340 ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            "Hotovo"
                          )
                        }
                        options={[
                          // nejužší okno: „Znovu vyvolat“ je tady v nabídce
                          ...(size.width < 280
                            ? [{ label: "Znovu vyvolat", cls: "bg-ui-raised", run: () => call(it.queueItemId, it.counter!) }]
                            : []),
                          ...MODALITIES.filter((x) => x !== m).map((x) => ({
                            label: `na ${x}`,
                            cls: MODALITY_STYLE[x].badge,
                            run: () => moveTo(it.queueItemId, WAITING_SERVICES[x]),
                          })),
                          {
                            label: "na recepci (zpráva)",
                            cls: "bg-green-600 text-white",
                            run: () => moveTo(it.queueItemId, REPORT_SERVICE),
                          },
                        ]}
                      />
                    )}
                  </Row>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Tlačítko s malou nabídkou (úzké okno: volba dveří, „Hotovo → kam“). */
function MenuButton({
  label,
  title,
  variant,
  options,
  disabled,
}: {
  label: React.ReactNode;
  title: string;
  variant: "primary" | "success";
  options: { label: string; cls: string; run: () => void }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <QueueButton variant={variant} disabled={disabled} onClick={() => setOpen((o) => !o)} title={title}>
        {label} <ChevronDown className="w-3.5 h-3.5" />
      </QueueButton>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border bg-ui-sheet shadow-lg p-1 space-y-1">
            {options.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  o.run();
                }}
                className={cn("w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-md", o.cls)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Kompaktní řádek pacienta: číslo · jméno + čas · tlačítka vpravo. */
function Row({
  item,
  name,
  status,
  tint,
  hideWait = false,
  children,
}: {
  item: QueueItem;
  name: string;
  status?: string;
  tint?: string;
  /** úzké okno: bez času čekání */
  hideWait?: boolean;
  children: React.ReactNode;
}) {
  const pid = item.externalIdentifier ?? "";
  // vyvolávat k ordinaci a posílat dál smí jen laborant / lékař / admin (lib/auth/roles.ts)
  const { can } = useSession();
  return (
    <div
      className={cn(
        "shrink-0 flex items-center gap-2 rounded-lg border px-2 bg-ui-sheet",
        tint
      )}
      style={{ height: ROW }}
    >
      <TicketNo no={item.orderNumber} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-sm font-medium truncate">
          {pid ? (
            <Link href={patientHref(pid)} className="hover:underline" title={name}>
              {name}
            </Link>
          ) : (
            <span className="text-ui-faint">Nepřiřazený lístek</span>
          )}
        </div>
        <div className="text-[11px] flex gap-1.5 truncate">
          {status && <span className="font-semibold text-brand-700 dark:text-brand-300">{status}</span>}
          {!hideWait && <WaitTime created={item.createdDate} />}
          {item.priority && <span className="text-red-600 font-semibold">PRIORITA</span>}
        </div>
      </div>
      {can("queue.call") && <div className="flex gap-1 shrink-0">{children}</div>}
    </div>
  );
}

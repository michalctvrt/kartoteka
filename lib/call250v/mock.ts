/**
 * Simulátor Call250V v paměti Next.js serveru.
 *
 * Zapíná se, když v .env.local chybí CALL250V_BASE_URL nebo je CALL250V_MOCK=1.
 * Slouží k proklikání celého toku ještě před instalací na Olomoucké.
 *
 * Chování ve sporných bodech je JEN NÁŠ PŘEDPOKLAD (viz otázky pro Kadlec):
 *  - PATCH se serviceId vrací pacienta do stavu "pending" a uvolní pult,
 *    pořadí v nové frontě zůstává podle původního času tisku lístku.
 *  - Pult není blokovaný (žádné 409 "counter busy").
 * Data zmizí při restartu dev serveru.
 */

import type {
  AddToServiceRequest,
  Call250VConfig,
  PatchQueueItemRequest,
  QueueItem,
} from "./types";
import { Call250VError } from "./errors";
import {
  ARRIVAL_SERVICES,
  REPORT_SERVICE,
  WAITING_SERVICES,
  serviceLabel,
} from "./config";

interface MockState {
  items: QueueItem[];
  seq: number;
  ticketNo: number;
}

const g = globalThis as unknown as { __call250vMock?: MockState };
const state: MockState = (g.__call250vMock ??= {
  items: [],
  seq: 1,
  ticketNo: 0,
});

function localNow(): string {
  // Stejný formát jako Call250V: bez časové zóny
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function find(id: string): QueueItem {
  const it = state.items.find((i) => i.queueItemId === id);
  if (!it) throw new Call250VError(400, `Lístek ${id} ve frontě není.`);
  return it;
}

const byOrder = (a: QueueItem, b: QueueItem) =>
  Number(!!b.priority) - Number(!!a.priority) ||
  (a.createdDate ?? "").localeCompare(b.createdDate ?? "");

export const mock = {
  async getConfig(): Promise<Call250VConfig> {
    const ids = [
      ...Object.values(ARRIVAL_SERVICES),
      ...Object.values(WAITING_SERVICES),
      REPORT_SERVICE,
    ];
    return {
      version: "mock",
      branch: "Olomoucká (SIMULACE)",
      activities: ids.map((serviceId) => ({
        serviceId,
        name: serviceLabel(serviceId),
      })),
      printers: [{ printerId: "T1", name: "Kiosk vstup" }],
    };
  },

  async list(serviceId?: string): Promise<QueueItem[]> {
    return state.items
      .filter((i) => !serviceId || i.serviceId === serviceId)
      .sort(byOrder)
      .map((i) => ({ ...i }));
  },

  async addToService(req: AddToServiceRequest): Promise<QueueItem> {
    if (!req.serviceId) throw new Call250VError(400, "Chybí serviceId.");
    state.ticketNo = (state.ticketNo % 999) + 1;
    const item: QueueItem = {
      queueItemId: String(state.seq++),
      serviceId: req.serviceId,
      orderNumber: req.orderNumber ?? String(state.ticketNo).padStart(3, "0"),
      externalIdentifier: req.externalIdentifier ?? null,
      name: req.name ?? null,
      note: req.note ?? null,
      priority: !!req.priority,
      createdDate: localNow(),
      status: "pending",
      counter: null,
    };
    state.items.push(item);
    return { ...item };
  },

  async next(counter: string, serviceId?: string): Promise<QueueItem> {
    const candidate = state.items
      .filter(
        (i) => i.status === "pending" && (!serviceId || i.serviceId === serviceId)
      )
      .sort(byOrder)[0];
    if (!candidate)
      throw new Call250VError(409, "Ve frontě nikdo nečeká.");
    return this.call(candidate.queueItemId, counter);
  },

  async call(id: string, counter: string): Promise<QueueItem> {
    const it = find(id);
    it.status = "called";
    it.counter = counter;
    return { ...it };
  },

  async patch(id: string, req: PatchQueueItemRequest): Promise<void> {
    const it = find(id);
    if (req.serviceId && req.serviceId !== it.serviceId) {
      it.serviceId = req.serviceId;
      it.status = "pending";
      it.counter = null;
    }
    if (req.externalIdentifier !== undefined)
      it.externalIdentifier = req.externalIdentifier;
    if (req.name !== undefined) it.name = req.name;
    if (req.note !== undefined) it.note = req.note;
  },

  async complete(id: string): Promise<void> {
    find(id);
    state.items = state.items.filter((i) => i.queueItemId !== id);
  },
};

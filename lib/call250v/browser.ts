/**
 * Volání vlastních API routes /api/queue/* z prohlížeče.
 * (Na Call250V se z prohlížeče NIKDY nevolá napřímo — Api-Key je jen na serveru.)
 */
import type { PatchQueueItemRequest, QueueItem } from "./types";
import { ARRIVAL_SERVICES, CATEGORY_TO_MODALITY, WAITING_SERVICES } from "./config";

let operatorId = "";
/** Nastaví ID operátora, které se posílá s každou akcí (z nastavení pracoviště). */
export function setQueueOperator(id: string) {
  operatorId = id;
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (operatorId) headers["x-operator-id"] = operatorId;

  const res = await fetch(`/api/queue${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Chyba ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const queueApi = {
  config: () => api<{ mock: boolean; branch?: string | null }>("GET", "/config"),
  list: (serviceIds: string[] = []) =>
    api<QueueItem[]>(
      "GET",
      serviceIds.length ? `?serviceId=${encodeURIComponent(serviceIds.join(","))}` : ""
    ),
  add: (serviceId: string) =>
    api<QueueItem>("POST", "/add", { serviceId, printTicket: true }),
  next: (counter: string, serviceId?: string) =>
    api<QueueItem>("POST", "/next", { counter, serviceId }),
  call: (id: string, counter: string) =>
    api<QueueItem>("POST", `/${encodeURIComponent(id)}/call`, { counter }),
  patch: (id: string, body: PatchQueueItemRequest) =>
    api<void>("PATCH", `/${encodeURIComponent(id)}`, body),
  complete: (id: string) =>
    api<void>("POST", `/${encodeURIComponent(id)}/complete`),
};

/** createdDate je bez časové zóny = lokální čas → parsovat jako lokální. */
export function waitingMinutes(createdDate?: string | null): number | null {
  if (!createdDate) return null;
  const m = createdDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

/** Pořadí jako ve frontě: priorita, pak čas tisku lístku. */
export function queueOrder(a: QueueItem, b: QueueItem) {
  return (
    Number(!!b.priority) - Number(!!a.priority) ||
    (a.createdDate ?? "").localeCompare(b.createdDate ?? "")
  );
}

/**
 * Po založení vyšetření: pokud pacient stojí s lístkem ještě v příchodové
 * frontě (recepce), propojí lístek s RČ a pošle ho do čekárny podle modality.
 * Když už je v nějaké čekárně (druhé vyšetření téhož dne), nic nemění —
 * pořadí modalit řídí laborant tlačítkem „Hotovo → na …“.
 *
 * Best-effort: chyba fronty nesmí zablokovat založení vyšetření.
 * Vrací text pro uživatele, nebo null když se nic nestalo.
 */
export async function sendTicketAfterStudy(
  pid: string,
  category: string,
  receptionCounter: string,
  ticketId?: string | null
): Promise<string | null> {
  const modality = CATEGORY_TO_MODALITY[category.toUpperCase()];
  if (!modality) return null;
  try {
    const items = await queueApi.list();
    const arrivals = Object.values(ARRIVAL_SERVICES);
    const ticket =
      items.find((i) => i.externalIdentifier === pid) ??
      items.find((i) => i.queueItemId === ticketId) ??
      items.find(
        (i) =>
          i.status === "called" &&
          i.counter === receptionCounter &&
          arrivals.includes(i.serviceId ?? "") &&
          !i.externalIdentifier
      );
    if (!ticket || !arrivals.includes(ticket.serviceId ?? "")) return null;
    await queueApi.patch(ticket.queueItemId, {
      externalIdentifier: pid,
      serviceId: WAITING_SERVICES[modality],
    });
    return `Lístek ${ticket.orderNumber ?? ""} poslán do čekárny ${modality}.`;
  } catch (e) {
    console.warn("[call250v] přeřazení po založení vyšetření selhalo", e);
    return null;
  }
}

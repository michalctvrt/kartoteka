/**
 * Spotřební materiál – volání z prohlížeče přes bránu /api/ops/spotreba/*.
 * Zápisy (a otevření objednávky, které ji založí) brána na ostrých datech blokuje (423),
 * dokud není SPOTREBA_WRITE=1 – viz app/api/ops/[...path]/route.ts.
 */

import type { Branch, Category, Item, LineInput, Order, OrderLine, Summary } from "./types";
import { bridge } from "@/lib/runtimeConfig";

const BASE = bridge("ops/spotreba");

export class SpotrebaError extends Error {
  constructor(message: string, public status: number, public locked = false) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { pin?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.pin) headers["x-admin-pin"] = init.pin;
  const res = await fetch(`${BASE}/${path}`, { ...init, headers, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { error?: string; locked?: boolean };
  if (!res.ok) throw new SpotrebaError(body.error ?? `Chyba ${res.status}`, res.status, !!body.locked || res.status === 423);
  return body as T;
}

export const spotreba = {
  branches: () => call<Branch[]>("branches"),
  items: (all = false) => call<Item[]>(`items${all ? "?all=1" : ""}`),
  periods: () => call<string[]>("periods"),
  summary: (period: string) => call<Summary>(`summary?period=${period}`),
  /** POZOR: založí objednávku, pokud neexistuje (proto ji brána na ostrých datech blokuje) */
  order: (branchId: number, period: string) =>
    call<{ order: Order; branch: Branch; lines: OrderLine[] }>(`order?branchId=${branchId}&period=${period}`),
  saveOrder: (id: number, lines: LineInput[]) =>
    call<{ order: Order; lines: OrderLine[] }>(`order/${id}`, { method: "PUT", body: JSON.stringify({ lines }) }),
  lock: (id: number, lockedBy: string) =>
    call<{ order: Order }>(`order/${id}/lock`, { method: "POST", body: JSON.stringify({ lockedBy }) }),
  unlock: (id: number, pin: string) => call<{ order: Order }>(`order/${id}/unlock`, { method: "POST", body: "{}", pin }),
  adminCheck: (pin: string) => call<{ ok: true }>("admin-check", { pin }),
  createItem: (pin: string, item: ItemInput) => call<Item>("items", { method: "POST", body: JSON.stringify(item), pin }),
  updateItem: (pin: string, id: number, item: Partial<ItemInput> & { active?: number }) =>
    call<Item>(`items/${id}`, { method: "PUT", body: JSON.stringify(item), pin }),
};

export type ItemInput = {
  category: Category;
  itemGroup: string;
  name: string;
  unit: string;
  packNote: string;
  packSize: number | "";
  pieceUnit: string;
  sortOrder: number;
};

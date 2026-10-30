/** Volání správy zaměstnanců z prohlížeče. Až bude backend, změnit STAFF_BASE. */

import type { Employee, EmployeeInput } from "./types";
import { bridge } from "@/lib/runtimeConfig";

const STAFF_BASE = bridge("staff");

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Chyba ${res.status}`);
  return body as T;
}

export const staffApi = {
  list: () => call<Employee[]>(STAFF_BASE),
  create: (e: EmployeeInput) => call<Employee>(STAFF_BASE, { method: "POST", body: JSON.stringify(e) }),
  update: (id: string, patch: Partial<EmployeeInput>) =>
    call<Employee>(`${STAFF_BASE}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
};

/**
 * SIMULACE úložiště zaměstnanců (jen server, dev) – soubor .data/staff.json.
 * Nahradí ho backend (kontrakt v lib/auth/types.ts). Vzorová data jsou zástupná
 * kromě účtů, které už v kartotéce existují (vera = lékařka podle studií).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Employee, EmployeeInput } from "./types";
import { CAPABILITY_IDS, ROLES, effectiveCaps, type Role } from "./roles";

const FILE = path.join(process.cwd(), ".data", "staff.json");

const now = () => new Date().toISOString();
const seed = (login: string, firstName: string, lastName: string, roles: Role[], title?: string): Employee => ({
  id: randomUUID(),
  login,
  firstName,
  lastName,
  title: title ?? null,
  email: null,
  roles,
  active: true,
  workingplace: null,
  createdAt: now(),
  updatedAt: now(),
});

async function read(): Promise<Employee[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Employee[];
  } catch {
    // první spuštění – vzorové účty (jeden na každou roli)
    const initial = [
      seed("michal", "Michal", "Čtvrtníček", ["admin"]),
      seed("vera", "Věra", "Čejková", ["doctor"], "MUDr."),
      seed("recepce", "Recepce", "Olomoucká", ["reception"]),
      seed("laborant", "Laborant", "RTG", ["lab"]),
    ];
    await write(initial);
    return initial;
  }
}

async function write(list: Employee[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf8");
}

/** Kontrola vstupu – vrací text chyby, nebo null. */
export function validate(input: Partial<EmployeeInput>, list: Employee[], selfId?: string): string | null {
  if (input.login !== undefined) {
    if (!/^[a-z0-9._-]{2,32}$/.test(input.login)) return "Přihlašovací jméno: 2–32 znaků, malá písmena, číslice, . _ -";
    if (list.some((e) => e.login === input.login && e.id !== selfId)) return "Toto přihlašovací jméno už má jiný zaměstnanec.";
  }
  if (input.firstName !== undefined && !input.firstName.trim()) return "Chybí jméno.";
  if (input.lastName !== undefined && !input.lastName.trim()) return "Chybí příjmení.";
  if (input.roles !== undefined) {
    if (!input.roles.length) return "Zaměstnanec musí mít aspoň jednu roli.";
    if (input.roles.some((r) => !ROLES.includes(r))) return "Neznámá role.";
  }
  if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) return "E-mail nemá platný tvar.";
  const caps = [...(input.grants ?? []), ...(input.denies ?? [])];
  if (caps.some((c) => !CAPABILITY_IDS.includes(c))) return "Neznámé oprávnění.";
  return null;
}

export async function listStaff() {
  return read();
}

export async function createStaff(input: EmployeeInput) {
  const list = await read();
  const err = validate(input, list);
  if (err) throw new Error(err);
  const e: Employee = { ...input, id: randomUUID(), createdAt: now(), updatedAt: now() };
  await write([...list, e]);
  return e;
}

export async function updateStaff(id: string, patch: Partial<EmployeeInput>) {
  const list = await read();
  const cur = list.find((e) => e.id === id);
  if (!cur) return null;
  const err = validate(patch, list, id);
  if (err) throw new Error(err);
  const next = { ...cur, ...patch, id, updatedAt: now() };
  // pojistka: musí zůstat aspoň jeden aktivní, kdo smí spravovat zaměstnance
  const managers = list
    .map((e) => (e.id === id ? next : e))
    .filter((e) => e.active && effectiveCaps(e).has("staff.manage"));
  if (managers.length === 0) throw new Error("Musí zůstat aspoň jeden aktivní zaměstnanec se správou zaměstnanců.");
  await write(list.map((e) => (e.id === id ? next : e)));
  return next;
}

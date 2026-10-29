/**
 * Kontrakt správy zaměstnanců – TAK, jak ho má dodat backend (Václav).
 * Zatím ho obsluhuje simulace v app/api/staff (soubor .data/staff.json).
 * Až bude backend, stačí přepnout STAFF_BASE v lib/auth/staffApi.ts.
 *
 *   GET    /staff            → Employee[]
 *   POST   /staff            ← EmployeeInput   → Employee
 *   PATCH  /staff/{id}       ← Partial<EmployeeInput> → Employee
 *   GET    /me               → Employee  (přihlášený uživatel – zatím simulace výběrem v /login)
 */

import type { Capability, Role } from "./roles";

export interface Employee {
  id: string;
  login: string; // přihlašovací jméno (např. "vera")
  firstName: string;
  lastName: string;
  title?: string | null;
  email?: string | null;
  roles: Role[];
  /** ruční výjimky proti rolím: oprávnění navíc / odebraná (ukládají se jen odchylky) */
  grants?: Capability[];
  denies?: Capability[];
  active: boolean;
  /** pracoviště / pobočka (kód z /workingplace, např. STRI) – nepovinné */
  workingplace?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeInput = Omit<Employee, "id" | "createdAt" | "updatedAt">;

export function employeeName(e: Pick<Employee, "title" | "firstName" | "lastName">): string {
  return [e.title, e.firstName, e.lastName].filter(Boolean).join(" ");
}

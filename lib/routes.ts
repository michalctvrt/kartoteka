/**
 * Adresy karet. Statický web (produkce v EARu) nemůže mít stránku pro každého pacienta / studii,
 * proto je číslo v parametru: /reception/patients/card?pid=…, /reception/studies/card?sid=…
 */

import { usePathname } from "next/navigation";

export const patientHref = (pid: string, extra?: Record<string, string>) =>
  `/reception/patients/card?${new URLSearchParams({ pid, ...extra })}`;

export const studyHref = (sid: number | string, opts?: { write?: boolean }) =>
  `/reception/studies/card?sid=${encodeURIComponent(String(sid))}${opts?.write ? "&write=1" : ""}`;

export const PATIENT_CARD_PATH = "/reception/patients/card";
export const STUDY_CARD_PATH = "/reception/studies/card";

/**
 * Aktuální adresa bez lomítka na konci. Statický web (trailingSlash) vrací „/reception/patients/“,
 * vývojový server „/reception/patients“ – porovnání adres musí fungovat v obou.
 */
export function usePath(): string {
  const p = usePathname() ?? "/";
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

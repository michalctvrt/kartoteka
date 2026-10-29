import type { PatientDataInfo } from "@/lib/api/generated/models/PatientDataInfo";

/**
 * Co musí být vyplněné na kartě pacienta, aby šlo založit vyšetření.
 * Backend (POST /study) jinak vrací 422 „patientData… is EMPTY“.
 * Telefon je povinný jen když je vyplněný e-mail (výsledky online chodí
 * přes SMS kód — bez telefonu se k nim pacient nedostane).
 */
export function missingForStudy(d?: Partial<PatientDataInfo> | null): string[] {
  if (!d) return ["údaje pacienta"];
  const missing: string[] = [];
  if (!d.firstName?.trim()) missing.push("jméno");
  if (!d.lastName?.trim()) missing.push("příjmení");
  if (!d.birthDate) missing.push("datum narození");
  if (d.gender !== "MALE" && d.gender !== "FEMALE") missing.push("pohlaví");
  if (d.email?.trim() && !d.phone?.trim()) missing.push("telefon (je vyplněný e-mail)");
  return missing;
}

/** Věk v celých letech k dnešku (pro informaci u dětských výkonů). */
export function ageYears(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

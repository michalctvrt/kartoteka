/**
 * SuperSaaS na serveru (jen API routes): přihlášení a POJISTKA ZÁPISU.
 * Zapisovat smí jen kalendář, který je zároveň `bookable` (typ „zdroje“) A je v SUPERSAAS_WRITE_SCHEDULES
 * (.env.local, čísla oddělená čárkou). Výchozí = nic. Ostré kalendáře přidávat jen se souhlasem Michala.
 * V demo režimu se zapisuje do paměti (lib/demo/bookings.ts).
 */

import { calendarById } from "./calendars";
import { DEMO_MODE } from "@/lib/demo/mode";

export const SS_BASE = "https://www.supersaas.com/api";

export function ssAuth(): string | null {
  const user = process.env.SUPERSAAS_USER;
  const key = process.env.SUPERSAAS_API_KEY;
  return user && key ? `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}` : null;
}

const WRITE = new Set(
  (process.env.SUPERSAAS_WRITE_SCHEDULES ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean)
);

/** Text chyby, když do kalendáře zapisovat nejde; null = smí. */
export function writeBlocked(scheduleId: number): string | null {
  const cal = calendarById(scheduleId);
  if (!cal) return "Tento kalendář Kartotéka nezná.";
  if (cal.mirrorOf) return `Kalendář ${cal.name} je navázaný na jiný kalendář – objednávejte do původního, přímo v SuperSaaS.`;
  if (!cal.bookable) return `Do kalendáře ${cal.name} SuperSaaS přes Kartotéku zapisovat neumí (kalendář typu „služby“) – objednejte přímo v SuperSaaS.`;
  if (!DEMO_MODE && !WRITE.has(scheduleId)) return `Zápis do kalendáře ${cal.name} je v Kartotéce vypnutý.`;
  return null;
}

/** Chyba ze SuperSaaS → text pro recepční (SuperSaaS vrací {errors:[{title}]}, česky). */
export async function ssError(r: Response): Promise<string> {
  try {
    const j = (await r.json()) as { errors?: { title?: string }[] };
    const t = j.errors?.map((e) => e.title).filter(Boolean).join(" · ");
    if (t) return t;
  } catch {}
  return `SuperSaaS odpověděl ${r.status}`;
}

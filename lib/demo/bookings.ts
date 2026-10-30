/**
 * DEMO objednávky (místo SuperSaaS) – dnešek a další 3 pracovní dny po 20 minutách.
 * Jména jsou z demo pacientů (lib/demo/data.ts), nic skutečného.
 */

import { buildPatients } from "./data";

const EXAMS = ["UZ břicha", "UZ štítné žlázy", "UZ kolene", "UZ ramene", "UZ žil DK", "UZ měkkých tkání"];

/** Místní čas ve tvaru, jaký vrací skutečná route (bez zóny). */
const local = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

import { CALENDARS } from "@/lib/supersaas/calendars";

/** Každý kalendář jiné objednávky (posun podle pořadí); kopie = stejné jako originál, testovací prázdný. */
// objednávky zapsané v demu (v paměti serveru, po restartu zmizí)
type DemoEvent = { id: number; title: string; start: string; end: string; allDay: boolean; type: "booked"; details: Record<string, string> };
const g = globalThis as unknown as { __demoCreated?: Map<number, DemoEvent[]>; __demoNextId?: number };
const created: Map<number, DemoEvent[]> = (g.__demoCreated ??= new Map());

export function demoBookings(scheduleId: number) {
  return [...demoGenerated(scheduleId), ...(created.get(scheduleId) ?? [])];
}

/** Zápis v demu – obsazený čas odmítne jako SuperSaaS. `form` = pole booking[...] z mostu. */
export function demoCreateBooking(scheduleId: number, form: Record<string, string>): { id: number } | { error: string } {
  const start = form["booking[start]"].replace(" ", "T") + ":00";
  const end = form["booking[finish]"].replace(" ", "T") + ":00";
  const cal = CALENDARS.find((c) => c.id === scheduleId);
  if (cal?.fields.includes("field_1") && !form["booking[field_1]"]) return { error: "Rok narození nemůže být prázdná" };
  if (demoBookings(scheduleId).some((b) => b.start < end && start < b.end)) return { error: "Tento slot už je obsazen" };
  const id = (g.__demoNextId = (g.__demoNextId ?? 990000) + 1);
  const list = created.get(scheduleId) ?? [];
  list.push({
    id,
    title: form["booking[full_name]"],
    start,
    end,
    allDay: false,
    type: "booked",
    details: {
      Jméno: form["booking[full_name]"],
      "Datum narození": form["booking[field_1]"] ?? "",
      Pohlaví: form["booking[field_2_r]"] ?? "",
      Mobil: form["booking[mobile]"] ?? "",
      Email: form["booking[email]"] ?? "",
      Vyšetření: form["booking[field_1_r]"] ?? "",
      "Typ služby": `${cal?.name ?? ""} (demo)`,
    },
  });
  created.set(scheduleId, list);
  return { id };
}

export function demoDeleteBooking(scheduleId: number, id: number): boolean {
  const list = created.get(scheduleId) ?? [];
  const next = list.filter((b) => b.id !== id);
  created.set(scheduleId, next);
  return next.length !== list.length;
}

function demoGenerated(scheduleId: number): DemoEvent[] {
  const cal = CALENDARS.find((c) => c.id === scheduleId);
  if (!cal || cal.test) return [];
  const base = cal.mirrorOf ?? scheduleId;
  const k = CALENDARS.findIndex((c) => c.id === base);
  const people = buildPatients();
  const out = [];
  let id = (cal.mirrorOf ? 900 + k : k + 1) * 10000;
  const day = new Date();
  for (let dayIdx = 0; out.length < 60 && dayIdx < 7; dayIdx++) {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate() + dayIdx);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // víkend
    for (let slot = 0; slot < 15; slot++) {
      if ((slot + dayIdx + k) % 4 === 3) continue; // pár volných termínů
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, slot * 20);
      const end = new Date(start.getTime() + 20 * 60e3);
      const p = people[(slot + dayIdx * 5 + k * 7) % people.length].patientDataInfo;
      const name = `${p.firstName} ${p.lastName}`;
      out.push({
        id: id++,
        title: name,
        start: local(start),
        end: local(end),
        allDay: false,
        type: "booked" as const,
        details: {
          Jméno: name,
          "Datum narození": p.birthDate,
          Pohlaví: p.gender === "FEMALE" ? "žena" : "muž",
          Mobil: p.phone || "",
          Email: p.email || "",
          Vyšetření: EXAMS[(slot + dayIdx + k) % EXAMS.length],
          "Typ služby": `${cal.name} (demo)`,
        },
      });
    }
  }
  return out;
}

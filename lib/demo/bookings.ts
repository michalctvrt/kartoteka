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
export function demoBookings(scheduleId: number) {
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

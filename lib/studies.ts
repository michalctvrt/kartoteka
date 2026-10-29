/**
 * Studie (vyšetření) – hledání a formátování pro vyhledávání i kartu studie.
 *
 * Backend (POST /study/:search) umí:
 *   - searchFilter: { id, uid, pid } – přesná shoda
 *   - browseFilter: pid / studyDate / idMedicalServiceCategory … s komparátorem (EQ, IN, BETWEEN…)
 * Jméno pacienta studie neznají → nejdřív najdeme pacienty (PatientService.search3 { name })
 * a pak jejich studie přes browseFilter.pid IN.
 * Datum musí jít jako ISO čas s časovou zónou, jinak backend porovnává v UTC
 * (ověřeno: "2026-10-19" nenašlo studii z 19. 10. 0:00:56 +02:00).
 */

import { PatientService } from "@/lib/api/generated/services/PatientService";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import { BrowseDateFilter } from "@/lib/api/generated/models/BrowseDateFilter";
import { BrowseStringFilter } from "@/lib/api/generated/models/BrowseStringFilter";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import type { StudyBrowseFilter } from "@/lib/api/generated/models/StudyBrowseFilter";

export type StudyQuery = {
  text: string; // číslo studie, RČ nebo příjmení
  modality: string | null; // RTG / UZ / MRI / null = vše
  dateFrom: string | null; // YYYY-MM-DD
  dateTo: string | null;
};

export const EMPTY_QUERY: StudyQuery = { text: "", modality: null, dateFrom: null, dateTo: null };

const LIMIT = 50;

/** Vyhledá studie. Vrací seřazené od nejnovějšího a celkový počet. */
export async function searchStudies(q: StudyQuery): Promise<{ rows: StudyInfo[]; total: number }> {
  const browse: Partial<StudyBrowseFilter> = {};
  if (q.modality) {
    browse.idMedicalServiceCategory = { comparator: BrowseStringFilter.comparator.EQ, values: [q.modality] };
  }
  if (q.dateFrom || q.dateTo) {
    const from = q.dateFrom ?? q.dateTo!;
    const to = q.dateTo ?? q.dateFrom!;
    browse.studyDate = {
      comparator: BrowseDateFilter.comparator.BETWEEN,
      values: [localMidnight(from), localMidnight(addDays(to, 1))],
    };
  }

  const text = q.text.trim();
  const digits = text.replace(/[\s/]/g, "");
  const base = {
    orderByFilter: { column: "studyDate", desc: true },
    limitFilter: { first: 0, count: LIMIT },
  };
  const run = (extra: object) =>
    StudyService.search4({ ...base, browseFilter: browse as StudyBrowseFilter, ...extra });

  if (!text) {
    const res = await run({});
    return { rows: res.data ?? [], total: res.totalCount ?? 0 };
  }

  if (/^\d+$/.test(digits)) {
    // Číslo studie (UID) i RČ mají 10 číslic → zkusíme obojí a sloučíme
    const tries = [run({ searchFilter: { uid: digits } })];
    if (digits.length >= 9) tries.push(run({ searchFilter: { pid: digits } }));
    if (digits.length <= 9) tries.push(run({ searchFilter: { id: Number(digits) } }));
    const results = await Promise.allSettled(tries);
    const rows = mergeById(
      results.flatMap((r) => (r.status === "fulfilled" ? r.value.data ?? [] : []))
    );
    return { rows, total: rows.length };
  }

  // Text → pacienti podle jména → jejich studie
  const patients = await PatientService.search3({
    searchFilter: { name: text },
    limitFilter: { first: 0, count: LIMIT },
  });
  const pids = (patients.data ?? [])
    .map((p) => p.pid)
    .filter((p): p is string => !!p);
  if (pids.length === 0) return { rows: [], total: 0 };
  const res = await run({
    browseFilter: {
      ...browse,
      pid: { comparator: BrowseStringFilter.comparator.IN, values: pids },
    } as StudyBrowseFilter,
  });
  return { rows: res.data ?? [], total: res.totalCount ?? 0 };
}

function mergeById(rows: StudyInfo[]): StudyInfo[] {
  const map = new Map<number, StudyInfo>();
  rows.forEach((r) => map.set(r.id, r));
  return [...map.values()].sort(
    (a, b) => new Date(b.studyDate ?? 0).getTime() - new Date(a.studyDate ?? 0).getTime()
  );
}

/** "2026-10-19" → "2026-10-19T00:00:00+02:00" (místní časová zóna). */
function localMidnight(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${day}T00:00:00${sign}${hh}:${mm}`;
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Formátování ───

export const MODALITY_NAME: Record<string, string> = {
  RTG: "Rentgen",
  UZ: "Ultrazvuk",
  MRI: "Magnetická rezonance",
  CT: "CT",
};

/** 6911103815 → 691110/3815 */
export function formatRc(rc?: string | null): string {
  if (!rc) return "—";
  return rc.length >= 9 ? `${rc.slice(0, 6)}/${rc.slice(6)}` : rc;
}

/** 19. 10. 2026 */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

/** 19. 10. 2026 0:02 */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${formatDate(iso)} ${d.toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })}`;
}

export function patientName(s: StudyInfo): string {
  const p = s.patientDataInfo;
  if (!p) return "—";
  return [p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ") || "—";
}

/** Popis je hotový, když má studie text popisu. */
export function hasReport(s: StudyInfo): boolean {
  return !!s.description?.trim();
}

/** První řádek popisu pro náhled v seznamu. */
export function reportPreview(s: StudyInfo, max = 90): string {
  const line = (s.description ?? "").trim().split(/\n+/)[0] ?? "";
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

// ─── Formulář (datetime-local ↔ ISO) ───

/** ISO → "YYYY-MM-DDTHH:mm" v místním čase (pro <input type="datetime-local">). */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" (místní) → ISO s časovou zónou, např. 2026-10-19T00:00:00+02:00. */
export function fromLocalInput(v: string): string {
  const d = new Date(v);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return `${v.length === 16 ? `${v}:00` : v}${sign}${p(off / 60)}:${p(off % 60)}`;
}

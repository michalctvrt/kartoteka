/**
 * Pracovní seznam lékaře „K popisu“ + fronta „Další na řadě“.
 *
 * Backend filtr „bez popisu“ nemá (description v StudyBrowseFilter chybí; usernameDescriptionChanged IS_NULL
 * nešlo na testovacích datech ověřit) → načteme studie za zvolené období (studyDate BETWEEN, ověřeno)
 * a nepopsané vybereme tady (hasReport). Pořadí: urgentní, pak nejstarší.
 * Fronta (pořadí id) se drží v sessionStorage, ať karta studie ví, co je další.
 */

import { StudyService } from "@/lib/api/generated/services/StudyService";
import { BrowseDateFilter } from "@/lib/api/generated/models/BrowseDateFilter";
import { BrowseStringFilter } from "@/lib/api/generated/models/BrowseStringFilter";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import type { StudyBrowseFilter } from "@/lib/api/generated/models/StudyBrowseFilter";
import { hasReport } from "@/lib/studies";

const MAX = 500;
const QUEUE_KEY = "kartoteka_report_queue";

export async function loadToReport(days: number, modality: string | null): Promise<{ rows: StudyInfo[]; truncated: boolean }> {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  const to = new Date();
  to.setDate(to.getDate() + 1);
  to.setHours(0, 0, 0, 0);
  const browse: Partial<StudyBrowseFilter> = {
    studyDate: { comparator: BrowseDateFilter.comparator.BETWEEN, values: [isoLocal(from), isoLocal(to)] },
  };
  if (modality) browse.idMedicalServiceCategory = { comparator: BrowseStringFilter.comparator.EQ, values: [modality] };
  const res = await StudyService.search4({
    browseFilter: browse as StudyBrowseFilter,
    orderByFilter: { column: "studyDate", desc: false },
    limitFilter: { first: 0, count: MAX },
  });
  const all = res.data ?? [];
  const rows = all
    .filter((s) => !hasReport(s) && !s.flagDeleted)
    .sort((a, b) => Number(!!b.flagUrgent) - Number(!!a.flagUrgent) || (a.studyDate ?? "").localeCompare(b.studyDate ?? ""));
  return { rows, truncated: (res.totalCount ?? all.length) > all.length };
}

/** Ostatní studie pacienta (bez té právě popisované), nejnovější první. */
export async function loadPriorStudies(pid: string, exceptId: number): Promise<StudyInfo[]> {
  const res = await StudyService.search4({
    searchFilter: { pid },
    orderByFilter: { column: "studyDate", desc: true },
    limitFilter: { first: 0, count: 50 },
  });
  return (res.data ?? []).filter((s) => s.id !== exceptId && !s.flagDeleted);
}

export function saveQueue(ids: number[]) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(ids));
  } catch {}
}

/** Další studie ve frontě po `id` (null = konec fronty / fronta neexistuje). */
export function nextInQueue(id: number): { next: number | null; position: number; total: number } | null {
  try {
    const ids = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? "null") as number[] | null;
    if (!ids?.length) return null;
    const i = ids.indexOf(id);
    if (i < 0) return null;
    return { next: ids[i + 1] ?? null, position: i + 1, total: ids.length };
  } catch {
    return null;
  }
}

/** Studii z fronty odebrat (popsaná) – další na řadě je pak ta po ní. */
export function dropFromQueue(id: number) {
  try {
    const ids = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? "[]") as number[];
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(ids.filter((x) => x !== id)));
  } catch {}
}

/** Jak dlouho studie čeká (od data vyšetření). */
export function waitingFor(iso?: string | null): string {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60e3));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "1 den" : d <= 4 ? `${d} dny` : `${d} dní`;
}

function isoLocal(d: Date): string {
  const off = -d.getTimezoneOffset();
  const p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return `${day}T${p(d.getHours())}:${p(d.getMinutes())}:00${off >= 0 ? "+" : "-"}${p(off / 60)}:${p(off % 60)}`;
}

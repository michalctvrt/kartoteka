/**
 * Pracovní seznam lékaře „K popisu“ + fronta „Další na řadě“.
 *
 * Backend filtr „bez popisu“ nemá (description v StudyBrowseFilter chybí; usernameDescriptionChanged IS_NULL
 * nešlo na testovacích datech ověřit) → načteme studie za zvolené období (studyDate BETWEEN, ověřeno)
 * a nepopsané vybereme tady (hasReport). Pořadí: urgentní, pak nejstarší.
 * Fronta (pořadí „pobočka:id“) se drží v sessionStorage, ať karta studie ví, co je další.
 * Víc poboček (lib/branches.ts): studie ze všech poboček najednou, každá s `branchCode`.
 */

import { useSyncExternalStore } from "react";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";
import { request as __request } from "@/lib/api/generated/core/request";
import type { SearchRequestStudySearchFilterStudyBrowseFilter } from "@/lib/api/generated/models/SearchRequestStudySearchFilterStudyBrowseFilter";
import type { SearchResponseStudyInfo } from "@/lib/api/generated/models/SearchResponseStudyInfo";
import { BRANCHES, activeBranch, type Branch } from "@/lib/branches";
import { BrowseDateFilter } from "@/lib/api/generated/models/BrowseDateFilter";
import { BrowseStringFilter } from "@/lib/api/generated/models/BrowseStringFilter";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import type { StudyBrowseFilter } from "@/lib/api/generated/models/StudyBrowseFilter";
import { hasReport } from "@/lib/studies";

const MAX = 500;
const QUEUE_KEY = "kartoteka_report_queue";

/** Studie s pobočkou, ze které je (víc poboček – lib/branches.ts). */
export type BranchStudy = StudyInfo & { branchCode: string };

/** POST /study/:search na konkrétní pobočce (ne přes globální OpenAPI.BASE – dotazy běží souběžně). */
function searchAt(branch: Branch, body: SearchRequestStudySearchFilterStudyBrowseFilter) {
  return __request<SearchResponseStudyInfo>({ ...OpenAPI, BASE: branch.apiBase }, {
    method: "POST",
    url: "/study/:search",
    body,
    mediaType: "application/json",
  });
}

/**
 * Nepopsané studie ze všech poboček (nebo jen `only`). Pobočka, která neodpoví, se jen ohlásí v `failed`
 * – ostatní se ukážou (výpadek jedné pobočky nesmí zastavit práci).
 */
export async function loadToReport(
  days: number,
  modality: string | null,
  only?: string | null
): Promise<{ rows: BranchStudy[]; truncated: boolean; failed: string[] }> {
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
  const branches = BRANCHES.filter((b) => !only || b.code === only);
  const res = await Promise.allSettled(
    branches.map((b) =>
      searchAt(b, {
        browseFilter: browse as StudyBrowseFilter,
        orderByFilter: { column: "studyDate", desc: false },
        limitFilter: { first: 0, count: MAX },
      })
    )
  );
  let truncated = false;
  const rows: BranchStudy[] = [];
  const failed: string[] = [];
  res.forEach((r, i) => {
    if (r.status === "rejected") return void failed.push(branches[i].name || branches[i].code);
    const all = r.value.data ?? [];
    if ((r.value.totalCount ?? all.length) > all.length) truncated = true;
    all.filter((s) => !hasReport(s) && !s.flagDeleted).forEach((s) => rows.push({ ...s, branchCode: branches[i].code }));
  });
  rows.sort((a, b) => Number(!!b.flagUrgent) - Number(!!a.flagUrgent) || (a.studyDate ?? "").localeCompare(b.studyDate ?? ""));
  if (failed.length === branches.length && failed.length) throw new Error((res[0] as PromiseRejectedResult).reason?.message ?? "nedostupné");
  return { rows, truncated, failed };
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

const qKey = (branch: string, id: number) => `${branch}:${id}`;

/** Fronta „Další na řadě“ – položky „POBOČKA:id“ (čísla studií se mezi pobočkami můžou opakovat). */
export function saveQueue(rows: { id: number; branchCode: string }[]) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(rows.map((r) => qKey(r.branchCode, r.id))));
  } catch {}
}

function readQueue(): string[] {
  try {
    const q = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? "null") as unknown;
    return Array.isArray(q) ? q.filter((x): x is string => typeof x === "string" && x.includes(":")) : [];
  } catch {
    return [];
  }
}

/** Další studie ve frontě po studii `id` aktivní pobočky (null = konec fronty / fronta neexistuje). */
export function nextInQueue(id: number): { next: { branch: string; id: number } | null; position: number; total: number } | null {
  const ids = readQueue();
  const i = ids.indexOf(qKey(activeBranch().code, id));
  if (i < 0) return null;
  const n = ids[i + 1];
  return { next: n ? { branch: n.split(":")[0], id: Number(n.split(":")[1]) } : null, position: i + 1, total: ids.length };
}

/** Studii z fronty odebrat (popsaná) – další na řadě je pak ta po ní. */
export function dropFromQueue(id: number) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(readQueue().filter((x) => x !== qKey(activeBranch().code, id))));
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

// ─── Filtr pracovního seznamu (období, modalita) – sdílí stránka K popisu i okno na ploše ───

export type Days = "1" | "3" | "7" | "14" | "30";
const PREF = "kartoteka_reports_filter";

export type Filter = { days: Days; modality: string | null };
const DEFAULT = '{"days":"7","modality":null}';
const EVENT = "kartoteka-reports-filter";
// filtr si pamatuje prohlížeč; useSyncExternalStore = bez nesouladu se serverovým vykreslením
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const readRaw = () => {
  try {
    return localStorage.getItem(PREF) ?? DEFAULT;
  } catch {
    return DEFAULT;
  }
};

function parseFilter(raw: string): Filter {
  try {
    const v = { ...JSON.parse(DEFAULT), ...JSON.parse(raw) } as Filter;
    return ["1", "3", "7", "14", "30"].includes(v.days) ? v : (JSON.parse(DEFAULT) as Filter);
  } catch {
    return JSON.parse(DEFAULT) as Filter;
  }
}

export function useReportFilter(): [Filter, (p: Partial<Filter>) => void] {
  const f = parseFilter(useSyncExternalStore(subscribe, readRaw, () => DEFAULT));
  const set = (p: Partial<Filter>) => {
    try {
      localStorage.setItem(PREF, JSON.stringify({ ...f, ...p }));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [f, set];
}

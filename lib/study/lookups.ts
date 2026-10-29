/**
 * Číselníky a vyhledávání pro formulář „Nové vyšetření“.
 * Vše jde přes vygenerovaného klienta (→ /api/cardfile proxy → CardFileWebWS).
 *
 * Pozn.: vygenerované typy filtrů mají všechna pole povinná (tak to je ve
 * swaggeru), backend ale bere i částečné filtry — proto `as unknown as`.
 */
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { MedicalDefinitionsService } from "@/lib/api/generated/services/MedicalDefinitionsService";
import { MedicalInstitutionService } from "@/lib/api/generated/services/MedicalInstitutionService";
import { WorkingplaceService } from "@/lib/api/generated/services/WorkingplaceService";
import type { SearchRequestMedicalServiceSearchFilterMedicalServiceBrowseFilter as ServiceSearch } from "@/lib/api/generated/models/SearchRequestMedicalServiceSearchFilterMedicalServiceBrowseFilter";
import type { SearchRequestMedicalInstitutionSearchFilterMedicalInstitutionBrowseFilter as InstitutionSearch } from "@/lib/api/generated/models/SearchRequestMedicalInstitutionSearchFilterMedicalInstitutionBrowseFilter";
import type { SearchRequestMedicalDiagnosisSearchFilterMedicalDiagnosisBrowseFilter as DiagnosisSearch } from "@/lib/api/generated/models/SearchRequestMedicalDiagnosisSearchFilterMedicalDiagnosisBrowseFilter";

export interface Option {
  id: string;
  label: string;
  sub?: string;
}

const like = (v: string) => ({ comparator: "LIKE", values: [`%${v}%`] });

/** Čitelná chybová hláška z ApiError (včetně těla odpovědi backendu). */
export function apiErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    // přednostně čitelný text z těla odpovědi ({ error } z dev proxy, { errorMessage } z backendu)
    const b = e.body as { error?: string; errorMessage?: string } | string | undefined;
    const text =
      typeof b === "string" ? b : b?.error ?? b?.errorMessage ?? (b ? JSON.stringify(b) : "");
    return `Backend (${e.status}): ${text || e.message}`.slice(0, 400);
  }
  return (e as Error)?.message ?? "Neznámá chyba";
}

export async function listWorkingplaces(): Promise<Option[]> {
  const list = await WorkingplaceService.list3();
  return list.map((w) => ({
    id: w.id,
    label: w.medicalInstitutionInfo?.description || w.id,
    sub: w.id,
  }));
}

export async function listCategories(): Promise<Option[]> {
  const list = await MedicalDefinitionsService.list1();
  return list.map((c) => ({ id: c.id, label: c.description || c.id }));
}

/** Všechny výkony dané modality (filtruje se pak v prohlížeči). */
export async function listServices(category: string): Promise<Option[]> {
  const req = {
    browseFilter: { idMedicalServiceCategory: { comparator: "EQ", values: [category] } },
    orderByFilter: { column: "description", desc: false },
    limitFilter: { first: 0, count: 1000 },
  } as unknown as ServiceSearch;
  const res = await MedicalDefinitionsService.search2(req);
  return (res.data ?? []).map((s) => ({
    id: s.id,
    label: s.descriptionLong || s.description,
  }));
}

function dedupe(opts: Option[], max = 20): Option[] {
  const seen = new Set<string>();
  return opts.filter((o) => !seen.has(o.id) && seen.add(o.id)).slice(0, max);
}

/** Žádající lékař: podle IČP (přesně), popisu nebo jména lékaře. */
export async function searchDoctors(q: string): Promise<Option[]> {
  const t = q.trim();
  const tasks: Promise<Option[]>[] = [];

  if (/^\d{6,}$/.test(t)) {
    tasks.push(
      MedicalInstitutionService.findById3(t)
        .then((m) => [{ id: m.id, label: m.description, sub: m.descriptionLong }])
        .catch(() => [])
    );
  }
  // LIKE v DB rozlišuje velikost písmen → zkusíme i verzi velkými
  for (const field of ["description", "doctorName"] as const) {
    for (const v of new Set([t, t.toUpperCase()])) {
      const req = {
        browseFilter: { [field]: like(v) },
        limitFilter: { first: 0, count: 20 },
      } as unknown as InstitutionSearch;
      tasks.push(
        MedicalInstitutionService.search1(req)
          .then((r) =>
            (r.data ?? []).map((m) => ({
              id: m.id,
              label: m.description,
              sub: [m.id, m.descriptionLong].filter(Boolean).join(" · "),
            }))
          )
          .catch(() => [])
      );
    }
  }
  return dedupe((await Promise.all(tasks)).flat());
}

/** Diagnóza: přesně podle kódu (např. M25.5) nebo podle popisu. */
export async function searchDiagnoses(q: string): Promise<Option[]> {
  const t = q.trim();
  const tasks: Promise<Option[]>[] = [];
  const code = t.toUpperCase();
  for (const c of new Set([code, code.replace(".", "")])) {
    tasks.push(
      MedicalDefinitionsService.findById2(c)
        .then((d) => [{ id: d.id, label: `${d.id} – ${d.description}` }])
        .catch(() => [])
    );
  }
  for (const v of new Set([t, t.toUpperCase()])) {
    const req = {
      browseFilter: { description: like(v) },
      limitFilter: { first: 0, count: 20 },
    } as unknown as DiagnosisSearch;
    tasks.push(
      MedicalDefinitionsService.search(req)
        .then((r) =>
          (r.data ?? []).map((d) => ({ id: d.id, label: `${d.id} – ${d.description}` }))
        )
        .catch(() => [])
    );
  }
  return dedupe((await Promise.all(tasks)).flat());
}

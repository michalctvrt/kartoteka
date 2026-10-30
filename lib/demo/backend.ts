/**
 * DEMO BACKEND – odpovídá místo CardFileWebWS, když je v .env.local DEMO_MODE=1
 * (napojeno v app/api/cardfile/[...path]/route.ts). Umí jen endpointy, které
 * frontend opravdu volá; filtry napodobují skutečný backend (searchFilter =
 * přesná shoda, browseFilter EQ / IN / BETWEEN / LIKE). Jen server, jen vývoj.
 */

import type { PatientInfo } from "@/lib/api/generated/models/PatientInfo";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import {
  CATEGORIES,
  DIAGNOSES,
  INSTITUTIONS,
  INSURANCE,
  SERVICES,
  WORKINGPLACES,
  buildPatients,
  buildStudies,
  demoPdf,
} from "./data";

type Db = { patients: PatientInfo[]; studies: StudyInfo[]; nextId: number };
// jeden stav pro celý proces dev serveru (přežije i hot reload)
const g = globalThis as unknown as { __kartotekaDemo?: Db; __kartotekaDemoBranches?: Map<string, Db> };
/** Sdílený stav demo dat (používá i lib/demo/ops.ts). */
export function demoDb(): Db {
  return db();
}
/** Jiná pobočka (lib/branches.ts) = stejní pacienti, jiné studie (jiná čísla, jiné nepopsané). */
function db(branch?: string): Db {
  if (branch) {
    const m = (g.__kartotekaDemoBranches ??= new Map());
    if (!m.has(branch)) {
      const patients = buildPatients();
      const seed = ["LESNA", "DOBR", "VIDE"].indexOf(branch) + 1 || 9;
      m.set(branch, { patients, studies: buildStudies(patients, seed), nextId: 59000000 + seed * 100000 });
    }
    return m.get(branch)!;
  }
  if (!g.__kartotekaDemo) {
    const patients = buildPatients();
    g.__kartotekaDemo = { patients, studies: buildStudies(patients), nextId: 59000000 };
  }
  return g.__kartotekaDemo;
}

type Filter = { comparator?: string; values?: (string | number)[] };
type SearchBody = {
  searchFilter?: Record<string, string | number | undefined>;
  browseFilter?: Record<string, Filter | undefined>;
  orderByFilter?: { column?: string; desc?: boolean };
  limitFilter?: { first?: number; count?: number };
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const notFound = (what: string) => json({ errorCode: "notFound", errorMessage: `${what} nenalezen (demo)` }, 404);

/** Hodnota pole – podporuje i vnořené (patientDataInfo.lastName). */
const field = (o: unknown, key: string) =>
  key.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), o);

function matches(value: unknown, f: Filter): boolean {
  const vals = f.values ?? [];
  const v = value == null ? null : String(value);
  switch (f.comparator) {
    case "EQ":
      return v === String(vals[0]);
    case "IN":
      return v !== null && vals.map(String).includes(v);
    case "LIKE": {
      const needle = String(vals[0] ?? "").replace(/%/g, "").toLowerCase();
      return v !== null && v.toLowerCase().includes(needle);
    }
    case "BETWEEN": {
      const t = v ? new Date(v).getTime() : NaN;
      return t >= new Date(String(vals[0])).getTime() && t <= new Date(String(vals[1])).getTime();
    }
    case "GE":
      return v !== null && new Date(v).getTime() >= new Date(String(vals[0])).getTime();
    case "IS_NULL":
      return v === null;
    case "IS_NOT_NULL":
      return v !== null;
    default:
      return true;
  }
}

function search<T>(rows: T[], body: SearchBody, exact: (row: T, key: string, value: string | number) => boolean) {
  let out = rows;
  for (const [k, v] of Object.entries(body.searchFilter ?? {})) {
    if (v !== undefined && v !== "") out = out.filter((r) => exact(r, k, v));
  }
  for (const [k, f] of Object.entries(body.browseFilter ?? {})) {
    if (f) out = out.filter((r) => matches(field(r, k), f));
  }
  const col = body.orderByFilter?.column;
  if (col) {
    const dir = body.orderByFilter?.desc ? -1 : 1;
    out = [...out].sort((a, b) => String(field(a, col) ?? "").localeCompare(String(field(b, col) ?? ""), "cs") * dir);
  }
  const first = body.limitFilter?.first ?? 0;
  const count = body.limitFilter?.count ?? 50;
  const data = out.slice(first, first + count);
  return { totalCount: out.length, count: data.length, data };
}

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function demoBackend(method: string, path: string[], body: unknown, branch?: string): Promise<Response> {
  const d = db(branch);
  const [res, a, b] = path[0] === "rest" ? path.slice(1) : path;
  const B = (body ?? {}) as SearchBody;

  // ─── pacienti ───
  if (res === "patient") {
    if (a === ":search" && method === "POST") {
      return json(
        search(d.patients, B, (p, k, v) => {
          if (k === "pid") return p.pid === String(v);
          if (k === "id") return p.id === Number(v);
          if (k === "name") {
            const q = norm(String(v));
            const pd = p.patientDataInfo;
            return norm(`${pd?.firstName ?? ""} ${pd?.lastName ?? ""}`).includes(q) || norm(`${pd?.lastName ?? ""} ${pd?.firstName ?? ""}`).includes(q);
          }
          return true;
        })
      );
    }
    const p = d.patients.find((x) => x.pid === a);
    if (method === "GET") return p ? json(p) : notFound("Pacient");
    if (method === "POST") {
      // storeNewPatientData = upsert
      const data = body as Record<string, unknown>;
      if (p) Object.assign(p.patientDataInfo, data, { whoEdit: "demo", dateEdit: new Date().toISOString() });
      else d.patients.push({ id: d.nextId++, pid: a, patientDataInfo: { ...(data as object), id: d.nextId++ } } as unknown as PatientInfo);
      return json(d.patients.find((x) => x.pid === a));
    }
  }

  // ─── studie ───
  if (res === "study") {
    if (a === ":search" && method === "POST") {
      return json(
        search(d.studies, B, (s, k, v) =>
          k === "id" ? s.id === Number(v) : k === "uid" ? s.uid === String(v) : k === "pid" ? s.pid === String(v) : true
        )
      );
    }
    if (!a && method === "POST") {
      const input = body as Record<string, unknown>;
      const p = d.patients.find((x) => x.pid === input.pid);
      const id = d.nextId++ * 100;
      const s = {
        ...input,
        id,
        uid: String(3400000000 + (id % 100000)),
        dicomUid: `1.2.410.200049.2.99999.${id}`,
        patientDataInfo: p?.patientDataInfo,
        studyServiceInfo: Object.entries((input.medicalServices as Record<string, number>) ?? {}).map(([c, n], i) => ({
          id: id + i,
          idStudy: id,
          idMedicalService: c,
          serviceCount: n,
        })),
        studyDate: (input.studyDate as string) ?? new Date().toISOString(),
        idWorkingplaceCreated: input.idWorkingplace,
        whoCr: "demo",
        dateCr: new Date().toISOString(),
        dateEdit: new Date().toISOString(),
        correctionNumber: 0,
      };
      d.studies.unshift(s as unknown as StudyInfo);
      return json(s);
    }
    const s = d.studies.find((x) => x.id === Number(a));
    if (!s) return notFound("Studie");
    if (b === "documentData.pdf") {
      const lines = [
        `Pacient: ${s.patientDataInfo?.firstName ?? ""} ${s.patientDataInfo?.lastName ?? ""}`,
        `Vysetreni: ${s.idMedicalServiceCategory} ${s.studyDate?.slice(0, 10)}`,
        "",
        ...(s.description ?? "Studie zatim neni popsana.").split("\n"),
        "",
        "DEMO – smyslena data",
      ];
      return new Response(demoPdf(`Zprava ze studie ${s.uid}`, lines) as unknown as BodyInit, {
        headers: { "content-type": "application/pdf" },
      });
    }
    if (method === "GET" && !b) return json(s);
    if (method === "PUT" && !b) {
      const sb = ((body ?? {}) as { studySaveBasicInfo?: Record<string, unknown> }).studySaveBasicInfo ?? {};
      const mr = (sb.medicalRequest ?? {}) as Record<string, string>;
      Object.assign(s, {
        studyDate: sb.studyDate ?? s.studyDate,
        remark: sb.remark,
        flagUrgent: sb.flagUrgent,
        flagSelfPay: sb.flagSelfPay,
        flagRemoteAccessAfterCompleted: sb.flagRemoteAccessAfterCompleted,
        idMedicalServiceCategory: sb.idMedicalServiceCategory ?? s.idMedicalServiceCategory,
        studyServiceInfo: Object.entries((sb.medicalServices as Record<string, number>) ?? {}).map(([c, n], i) => ({
          id: s.id + i,
          idStudy: s.id,
          idMedicalService: c,
          serviceCount: n,
        })),
        idMedicalDiagnosisRequested: mr.idMedicalDiagnosisRequested || s.idMedicalDiagnosisRequested,
        medicalDiagnosisRequestedInfo: DIAGNOSES.find((x) => x.id === mr.idMedicalDiagnosisRequested) ?? s.medicalDiagnosisRequestedInfo,
        idMedicalInstitutionRequested: mr.idMedicalInstitutionRequested || s.idMedicalInstitutionRequested,
        medicalInstitutionRequestedInfo:
          INSTITUTIONS.find((x) => x.id === mr.idMedicalInstitutionRequested) ?? s.medicalInstitutionRequestedInfo,
        requestDate: mr.requestDate ?? s.requestDate,
        whoEdit: "demo",
        dateEdit: new Date().toISOString(),
      });
      return json(s);
    }
    if (b?.startsWith(":")) return json(s); // :emailStudy, :createRemoteAccess… – v demu jen potvrdit
  }

  // ─── číselníky ───
  if (res === "insurance-company") {
    if (!a) return json(INSURANCE);
    const x = INSURANCE.find((i) => i.id === a);
    return x ? json(x) : notFound("Pojišťovna");
  }
  if (res === "medical-service-category") {
    if (a === ":listLocal") return json(CATEGORIES);
    const x = CATEGORIES.find((c) => c.id === a);
    return x ? json(x) : notFound("Modalita");
  }
  if (res === "medical-service") {
    if (a === ":search") return json(search(SERVICES, B, (s, k, v) => String(field(s, k)) === String(v)));
    const x = SERVICES.find((s) => s.id === a);
    return x ? json(x) : notFound("Výkon");
  }
  if (res === "medical-diagnosis") {
    if (a === ":search") return json(search(DIAGNOSES, B, (s, k, v) => String(field(s, k)) === String(v)));
    const x = DIAGNOSES.find((s) => s.id === a);
    return x ? json(x) : notFound("Diagnóza");
  }
  if (res === "medical-institution") {
    if (a === ":search") return json(search(INSTITUTIONS, B, (s, k, v) => String(field(s, k)) === String(v)));
    const x = INSTITUTIONS.find((s) => s.id === a);
    return x ? json(x) : notFound("Zdravotnické zařízení");
  }
  if (res === "medical-skill") return json([]);
  if (res === "workingplace") {
    if (!a) return json(WORKINGPLACES);
    const x = WORKINGPLACES.find((w) => w.id === a);
    return x ? json(x) : notFound("Pracoviště");
  }
  if (res === "ezadanka") return a ? notFound("E-žádanka") : json([]);

  return json({ errorCode: "demo", errorMessage: `Demo režim tenhle endpoint neumí: ${method} /${path.join("/")}` }, 501);
}

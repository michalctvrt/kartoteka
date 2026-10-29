/**
 * DEMO odpovědi provozní aplikace (/opt/testapp) pro DEMO_MODE=1 – hromadný tisk aj.
 * Bere smyšlené studie z demo backendu (lib/demo/backend.ts).
 */

import { demoDb } from "./backend";
import { INSTITUTIONS, INSURANCE, demoPdf } from "./data";

const WORKPLACES: Record<string, string> = { BRDO: "Dobrák", BRLE: "Lesná" };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

const localDay = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function demoOps(method: string, path: string, q: URLSearchParams, body?: string): Promise<Response> {
  const { studies } = demoDb();

  if (path === "tisk-studies") {
    const wp = q.get("workplace") ?? "";
    const date = q.get("date") ?? "";
    if (!WORKPLACES[wp]) return json({ error: "Neplatné pracoviště. Použij BRDO nebo BRLE." }, 400);
    const icpList = INSTITUTIONS.map((i) => i.id);
    const doctorMap = Object.fromEntries(INSTITUTIONS.map((i) => [i.id, i.description]));
    // v demu: Dobrák = lichá IČP, Lesná = sudá – ať se pracoviště liší
    const mine = icpList.filter((_, i) => (wp === "BRDO" ? i % 2 === 0 : i % 2 === 1));
    const list = studies
      .filter((s) => s.flagCompleted && s.idMedicalInstitutionRequested && mine.includes(s.idMedicalInstitutionRequested))
      .filter((s) => localDay(s.studyDate) === date)
      .map((s) => ({
        id: s.id,
        uid: s.uid,
        study_date: s.studyDate,
        icp: s.idMedicalInstitutionRequested,
        doctor_name: doctorMap[s.idMedicalInstitutionRequested],
        category: s.idMedicalServiceCategory,
        description: (s.description ?? "").slice(0, 100),
        workplace: WORKPLACES[wp],
        patient_name: `${s.patientDataInfo?.lastName ?? ""} ${s.patientDataInfo?.firstName ?? ""}`.trim(),
        pid: s.pid,
      }));
    return json({
      workplace: WORKPLACES[wp],
      date,
      total: list.length,
      icpList: mine,
      doctorMap,
      summary: mine.map((icp) => ({ icp, doctor_name: doctorMap[icp], count: list.filter((s) => s.icp === icp).length })),
      studies: list,
    });
  }

  if (path === "tisk-pdf" || path.startsWith("study-pdf/")) {
    const ids = path === "tisk-pdf" ? (q.get("ids") ?? "").split(",").map(Number) : [Number(path.split("/")[1])];
    const picked = studies.filter((s) => ids.includes(s.id));
    if (!picked.length) return json({ error: "Studie nenalezena" }, 404);
    const lines = picked.flatMap((s) => [
      `${s.patientDataInfo?.lastName ?? ""} ${s.patientDataInfo?.firstName ?? ""} – ${s.idMedicalServiceCategory} ${localDay(s.studyDate)} – ICP ${s.idMedicalInstitutionRequested}`,
      ...(s.description ?? "").split("\n").slice(0, 3),
      "",
    ]);
    return new Response(demoPdf(`Hromadny tisk (demo) – ${picked.length} zprav`, lines.slice(0, 44)) as unknown as BodyInit, {
      headers: { "content-type": "application/pdf" },
    });
  }

  if (path === "vzp") {
    // demo: pojištěn u pojišťovny z karty, kromě pacientů s RČ končícím lichou stovkou → nepojištěn
    const { cisloPojistence } = JSON.parse(body || "{}") as { cisloPojistence?: string };
    const p = demoDb().patients.find((x) => x.pid === String(cisloPojistence).replace("/", ""));
    if (!p) return json({ stav: "neznamy" });
    const ins = INSURANCE.find((i) => i.id === p.patientDataInfo.idInsuranceCompany);
    return json(Number(p.pid.slice(-3, -2)) % 2 ? { stav: "nepojisten" } : { stav: "pojisten", kodPojistovny: ins?.id, nazevPojistovny: ins?.descriptionLong });
  }

  if (path === "medical_institution") {
    const systems = ["CGM", "E-zpráva", "LIVEcom"];
    return json(
      INSTITUTIONS.flatMap((i, n) => [
        { id: i.id, description: i.description, system: systems[n % 3] },
        ...(n === 0 ? [{ id: i.id, description: i.description, system: "LIVEcom" }] : []),
      ])
    );
  }

  if (path === "check-study") {
    const s = studies.find((x) => x.uid === q.get("uid"));
    if (!s) return json({ found: false, message: "Studie nenalezena" });
    const till = s.studyRemoteAccessInfo?.dateValidTill;
    return json({
      found: true,
      uid: s.uid,
      email: s.patientDataInfo?.email || "—",
      sent_at: s.dateCr,
      valid_until: till ?? null,
      expired: till ? new Date(till) < new Date() : false,
    });
  }

  if (path === "extend-validity") {
    const { uid, days } = JSON.parse(body || "{}") as { uid?: string; days?: number };
    const s = studies.find((x) => x.uid === uid);
    if (!s) return json({ success: false, error: "Studie nenalezena" });
    if (!s.studyRemoteAccessInfo) return json({ success: false, error: "Odkaz nebyl vygenerován" });
    const till = new Date(Date.now() + (days ?? 3) * 864e5);
    s.studyRemoteAccessInfo.dateValidTill = till.toISOString().slice(0, 10);
    return json({ success: true, new_valid_until: till.toISOString() });
  }

  return json({ error: `Demo režim tuto adresu provozní aplikace neumí: ${method} ${path}` }, 501);
}

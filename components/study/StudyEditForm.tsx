"use client";

/**
 * Úprava studie přes API (PUT /study/{id}).
 *
 * Backend přijímá jen StudySaveBasicInfo: datum, modalitu, výkony, příznaky,
 * žádanku a poznámku. POPIS (description) v něm NENÍ → upravuje se dál ve
 * staré kartotéce, dokud ho Václav do API nepřidá.
 * Údaje pacienta posíláme beze změny tak, jak je studie vrátila (backend je
 * vyžaduje); pacient se upravuje na kartě pacienta.
 * lastTsEdit = dateEdit studie → backend odmítne uložit, když ji mezitím
 * změnil někdo jiný.
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile } from "@/components/ui/bento";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import type { PatientDataSaveInfo } from "@/lib/api/generated/models/PatientDataSaveInfo";
import type { StudySaveBasicInfo } from "@/lib/api/generated/models/StudySaveBasicInfo";
import {
  apiErrorText,
  listCategories,
  searchDiagnoses,
  searchDoctors,
  type Option,
} from "@/lib/study/lookups";
import { useInsuranceCompanies } from "@/components/hooks/useInsuranceCompanies";
import { legacyStudyEditUrl } from "@/lib/legacy";
import { fromLocalInput, toLocalInput } from "@/lib/studies";
import Lookup from "./Lookup";
import ServicesEditor from "./ServicesEditor";

type Form = {
  studyDate: string; // datetime-local
  category: string;
  services: Record<string, number>;
  selfPay: boolean;
  urgent: boolean;
  remoteAccess: boolean;
  doctor: Option | null;
  diagnosis: Option | null;
  requestDate: string; // YYYY-MM-DD
  insurance: string;
  remark: string;
};

function fromStudy(s: StudyInfo): Form {
  const inst = s.medicalInstitutionRequestedInfo;
  return {
    studyDate: toLocalInput(s.studyDate),
    category: s.idMedicalServiceCategory ?? "",
    services: Object.fromEntries(
      (s.studyServiceInfo ?? []).map((v) => [v.idMedicalService, v.serviceCount ?? 1])
    ),
    selfPay: !!s.flagSelfPay,
    urgent: !!s.flagUrgent,
    remoteAccess: !!s.flagRemoteAccessAfterCompleted,
    doctor: s.idMedicalInstitutionRequested
      ? { id: s.idMedicalInstitutionRequested, label: inst?.description ?? s.idMedicalInstitutionRequested, sub: inst?.doctorName }
      : null,
    diagnosis: s.idMedicalDiagnosisRequested
      ? {
          id: s.idMedicalDiagnosisRequested,
          label: `${s.idMedicalDiagnosisRequested} – ${s.medicalDiagnosisRequestedInfo?.description ?? ""}`,
        }
      : null,
    requestDate: s.requestDate?.slice(0, 10) ?? "",
    insurance: s.idInsuranceCompany ?? s.patientDataInfo?.idInsuranceCompany ?? "",
    remark: s.remark ?? "",
  };
}

/** Sestaví tělo PUT /study/{id}. Exportováno kvůli kontrole bez zápisu. */
export function buildUpdate(s: StudyInfo, f: Form) {
  const p = s.patientDataInfo;
  const patientData: PatientDataSaveInfo = {
    firstName: p?.firstName,
    middleName: p?.middleName || null,
    lastName: p?.lastName,
    title: p?.title || null,
    birthDate: p?.birthDate,
    gender: p?.gender as PatientDataSaveInfo.gender,
    idInsuranceCompany: p?.idInsuranceCompany || null,
    email: p?.email || null,
    phone: p?.phone || null,
    weight: p?.weight ?? null,
    height: p?.height ?? null,
  };
  // Samoplátce: žádanku posíláme, jen když je v ní něco vyplněné (prázdná pole jako "").
  // PŘEDPOKLAD – neověřeno na backendu: že samoplátce bez lékaře projde s prázdným IČP.
  const withRequest = !f.selfPay || !!f.doctor || !!f.diagnosis || !!f.requestDate;
  const body: StudySaveBasicInfo = {
    pid: s.pid,
    patientData,
    idWorkingplace: s.idWorkingplaceCreated,
    idMedicalServiceCategory: f.category,
    medicalServices: f.services,
    flagSelfPay: f.selfPay,
    flagUrgent: f.urgent,
    flagRemoteAccessAfterCompleted: f.remoteAccess,
    // nezměněné datum posíláme původní (input má jen minuty, ztratily by se sekundy)
    studyDate: f.studyDate && f.studyDate !== toLocalInput(s.studyDate) ? fromLocalInput(f.studyDate) : s.studyDate,
    remark: f.remark.trim() || undefined,
    medicalRequest: (withRequest
      ? {
          requestDate: f.requestDate || (undefined as unknown as string), // prázdné = neposílat
          idMedicalInstitutionRequested: f.doctor?.id ?? "",
          idMedicalDiagnosisRequested: f.diagnosis?.id ?? "",
          idInsuranceCompany: f.insurance.trim(),
          idCatInsuranceType: s.idCatInsuranceType ?? 1,
        }
      : undefined) as StudySaveBasicInfo["medicalRequest"],
  };
  return { lastTsEdit: s.dateEdit, studySaveBasicInfo: body };
}

export default function StudyEditForm({
  study,
  onCancel,
  onSaved,
}: {
  study: StudyInfo;
  onCancel: () => void;
  onSaved: (s: StudyInfo) => void;
}) {
  const initial = useMemo(() => fromStudy(study), [study]);
  const [f, setF] = useState<Form>(initial);
  const [categories, setCategories] = useState<Option[]>([]);
  const insurances = useInsuranceCompanies();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ text: string; conflict?: boolean } | null>(null);

  const set = (patch: Partial<Form>) => setF((p) => ({ ...p, ...patch }));
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((c) => !cancelled && setCategories(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // neuložené změny – varovat před zavřením okna
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const missing: string[] = [];
  if (!f.category) missing.push("modalita");
  if (Object.keys(f.services).length === 0) missing.push("aspoň jeden výkon");
  if (!f.studyDate) missing.push("datum vyšetření");
  // u samoplátce je žádanka nepovinná (stará kartotéka to tak má)
  if (!f.selfPay) {
    if (!f.doctor) missing.push("žádající lékař");
    if (!f.diagnosis) missing.push("diagnóza");
    if (!f.requestDate) missing.push("datum žádanky");
    if (!f.insurance.trim()) missing.push("pojišťovna");
  }

  const cancel = () => {
    if (dirty && !window.confirm("Zahodit neuložené změny?")) return;
    onCancel();
  };

  const save = async () => {
    if (missing.length || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await StudyService.update(study.id, buildUpdate(study, f));
      onSaved(saved);
    } catch (e) {
      // 409/412 = studii mezitím změnil někdo jiný (kontrola přes lastTsEdit)
      const conflict = e instanceof ApiError && (e.status === 409 || e.status === 412);
      // 422 „Error deserializing…“ = backend úpravu studie zatím nepřijímá vůbec (viz lib/legacy.ts)
      const unsupported = e instanceof ApiError && e.status === 422 && /deserializ/i.test(apiErrorText(e));
      setError({
        text: conflict
          ? "Studii mezitím upravil někdo jiný. Načtěte ji znovu a změny zadejte ještě jednou."
          : unsupported
          ? "Backend zatím úpravu studie nepřijímá (chyba na serveru). Upravte ji prosím ve staré kartotéce."
          : apiErrorText(e),
        conflict,
      });
      setSaving(false);
    }
  };

  const changeCategory = (c: string) => {
    if (c === f.category) return;
    if (Object.keys(f.services).length && !window.confirm("Změna modality smaže vybrané výkony. Pokračovat?")) return;
    set({ category: c, services: {} });
  };

  const field = "ui-input";
  const label = "mb-1 block text-[13px] text-ui-muted";

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Bento>
          {/* Vyšetření */}
          <BentoTile span={2} index={0} title="Vyšetření">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ed-date" className={label}>Datum a čas vyšetření</label>
                <input
                  id="ed-date"
                  type="datetime-local"
                  value={f.studyDate}
                  onChange={(e) => set({ studyDate: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="ed-cat" className={label}>Modalita</label>
                <select id="ed-cat" value={f.category} onChange={(e) => changeCategory(e.target.value)} className={field}>
                  {!categories.some((c) => c.id === f.category) && f.category && (
                    <option value={f.category}>{f.category}</option>
                  )}
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <ServicesEditor category={f.category} value={f.services} onChange={(services) => set({ services })} />
            </div>
            <fieldset className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <legend className="sr-only">Příznaky</legend>
              <Check label="Akutní" checked={f.urgent} onChange={(urgent) => set({ urgent })} />
              <Check label="Samoplátce" checked={f.selfPay} onChange={(selfPay) => set({ selfPay })} />
              <Check
                label="Online přístup pro pacienta po dokončení"
                checked={f.remoteAccess}
                onChange={(remoteAccess) => set({ remoteAccess })}
              />
            </fieldset>
          </BentoTile>
        {/* Žádanka */}
        <BentoTile
          span={2}
          index={1}
          title={<>Žádanka{f.selfPay && <span className="text-ui-faint"> · u samoplátce nepovinná</span>}</>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Lookup
              label="Žádající lékař"
              placeholder="IČP, jméno nebo název"
              value={f.doctor}
              onChange={(doctor) => set({ doctor })}
              search={searchDoctors}
            />
            <Lookup
              label="Diagnóza"
              placeholder="Kód (M25.5) nebo popis"
              value={f.diagnosis}
              onChange={(diagnosis) => set({ diagnosis })}
              search={searchDiagnoses}
            />
            <div>
              <label htmlFor="ed-req" className={label}>Datum žádanky</label>
              <input id="ed-req" type="date" value={f.requestDate} onChange={(e) => set({ requestDate: e.target.value })} className={field} />
            </div>
            <div>
              <label htmlFor="ed-ins" className={label}>Pojišťovna</label>
              <select id="ed-ins" value={f.insurance} onChange={(e) => set({ insurance: e.target.value })} className={field}>
                <option value="">— vyberte —</option>
                {!insurances.some((i) => i.id === f.insurance) && f.insurance && (
                  <option value={f.insurance}>{f.insurance}</option>
                )}
                {insurances.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.id} {i.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </BentoTile>

        {/* Poznámka */}
        <BentoTile
          span={4}
          index={2}
          title="Poznámka"
          action={
            <a
              href={legacyStudyEditUrl(study.id, study.pid)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[13px] text-ui-primary hover:underline"
              title="Popis lékaře backend přes API upravit neumí"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Popis upravit ve staré kartotéce
            </a>
          }
        >
          <label htmlFor="ed-remark" className="sr-only">Poznámka</label>
          <textarea
            id="ed-remark"
            value={f.remark}
            onChange={(e) => set({ remark: e.target.value })}
            rows={3}
            className="ui-input h-auto py-2"
          />
        </BentoTile>
      </Bento>

      {error && (
        <div role="alert" className="flex gap-2 rounded-lg border border-red-200 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-words">{error.text}</span>
        </div>
      )}

      {/* Akce – vždy na konci formuláře */}
      <div className="ui-tile flex flex-wrap items-center justify-end gap-3 px-4 py-3">
        <p className="mr-auto text-[13px] text-ui-muted">
          {missing.length ? `Chybí: ${missing.join(", ")}` : dirty ? "Neuložené změny" : "Beze změn"}
        </p>
        <Button type="button" variant="outline" onClick={cancel} disabled={saving}>
          Zrušit
        </Button>
        <Button type="submit" disabled={saving || !dirty || missing.length > 0}>
          {saving && <Loader2 className="animate-spin" />}
          Uložit změny
        </Button>
      </div>
    </form>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--ui-primary)]"
      />
      {label}
    </label>
  );
}

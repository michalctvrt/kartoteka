"use client";

/**
 * Založení nového vyšetření z karty pacienta.
 *
 * Stejný postup jako v e-žádance:
 *   1) POST /study (data z karty + co recepční vybere tady),
 *   2) pokud má pacient lístek z vyvolávacího systému v příchodové frontě,
 *      pošle se do čekárny podle modality,
 *   3) přesměrování do staré kartotéky na edit.xhtml?sid=<id>, kde se
 *      vyšetření dokončí.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import type { PatientDataInfo } from "@/lib/api/generated/models/PatientDataInfo";
import type { PatientDataSaveInfo } from "@/lib/api/generated/models/PatientDataSaveInfo";
import type { StudySaveBasicInfo } from "@/lib/api/generated/models/StudySaveBasicInfo";
import {
  apiErrorText,
  listCategories,
  listWorkingplaces,
  searchDiagnoses,
  searchDoctors,
  type Option,
} from "@/lib/study/lookups";
import { ageYears } from "@/lib/study/card-check";
import { legacyStudyEditUrl } from "@/lib/legacy";
import { sendTicketAfterStudy } from "@/lib/call250v/browser";
import { useWorkstation } from "@/components/queue/useWorkstation";
import Lookup from "./Lookup";
import ServicesEditor from "./ServicesEditor";

/**
 * Pracoviště (idWorkingplace) = kód ordinace v kartotéce (např. BRLE = Lesná).
 * Backend ho u POST /study vyžaduje. Nastavuje se jednou pro pobočku v
 * .env.local (NEXT_PUBLIC_WORKINGPLACE) — recepční ho nevybírá. Výběr ve
 * formuláři se ukáže jen když chybí v konfiguraci.
 */
const CONFIG_WORKINGPLACE = process.env.NEXT_PUBLIC_WORKINGPLACE ?? "";
const WP_KEY = "kartoteka_workingplace_v1";
const today = () => new Date().toISOString().slice(0, 10);

function readWorkingplace(): string {
  try {
    return localStorage.getItem(WP_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function NewStudyDialog({
  open,
  onOpenChange,
  pid,
  patient,
  ticketId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pid: string;
  patient: PatientDataInfo;
  ticketId?: string | null;
}) {
  const { ws } = useWorkstation();

  const [workingplaces, setWorkingplaces] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pracoviště si pamatuje každý počítač zvlášť
  const [workingplace, setWorkingplace] = useState(() => CONFIG_WORKINGPLACE || readWorkingplace());
  const [category, setCategory] = useState("");
  const [services, setServices] = useState<Record<string, number>>({});
  const [selfPay, setSelfPay] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [doctor, setDoctor] = useState<Option | null>(null);
  const [diagnosis, setDiagnosis] = useState<Option | null>(null);
  const [requestDate, setRequestDate] = useState(today);
  const [insurance, setInsurance] = useState(patient.idInsuranceCompany ?? "");
  const [remark, setRemark] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([CONFIG_WORKINGPLACE ? Promise.resolve([]) : listWorkingplaces(), listCategories()])
      .then(([w, c]) => {
        if (cancelled) return;
        setWorkingplaces(w);
        setCategories(c);
      })
      .catch((e) => !cancelled && setLoadError(apiErrorText(e)));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const chooseWorkingplace = (id: string) => {
    setWorkingplace(id);
    try {
      localStorage.setItem(WP_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const age = ageYears(patient.birthDate);

  const missing: string[] = [];
  if (!workingplace) missing.push("pracoviště");
  if (!category) missing.push("modalita");
  if (Object.keys(services).length === 0) missing.push("aspoň jeden výkon");
  if (!selfPay) {
    if (!doctor) missing.push("žádající lékař");
    if (!diagnosis) missing.push("diagnóza");
    if (!insurance.trim()) missing.push("pojišťovna");
  }

  const submit = async () => {
    if (missing.length) return;
    setSaving(true);
    setError(null);

    const patientData: PatientDataSaveInfo = {
      firstName: patient.firstName,
      middleName: patient.middleName || null,
      lastName: patient.lastName,
      title: patient.title || null,
      birthDate: patient.birthDate,
      gender: patient.gender as PatientDataSaveInfo.gender,
      idInsuranceCompany: insurance.trim() || patient.idInsuranceCompany || null,
      email: patient.email || null,
      phone: patient.phone || null,
      weight: patient.weight ?? null,
      height: patient.height ?? null,
    };

    const body: StudySaveBasicInfo = {
      pid,
      patientData,
      idWorkingplace: workingplace,
      idMedicalServiceCategory: category,
      medicalServices: services,
      flagSelfPay: selfPay,
      flagUrgent: urgent,
      flagRemoteAccessAfterCompleted: false,
      studyDate: new Date().toISOString(),
      remark: remark.trim() || undefined,
      // U samoplátce bez lékaře žádanku neposíláme (backend ji vyžaduje jen u pojišťovny)
      medicalRequest: (doctor || !selfPay
        ? {
            requestDate,
            idMedicalInstitutionRequested: doctor?.id ?? "",
            idMedicalDiagnosisRequested: diagnosis?.id ?? "",
            idInsuranceCompany: insurance.trim(),
            idCatInsuranceType: 1,
          }
        : undefined) as StudySaveBasicInfo["medicalRequest"],
    };

    try {
      const study = await StudyService.create(body);
      await sendTicketAfterStudy(pid, category, ws.receptionCounter, ticketId);
      window.location.href = legacyStudyEditUrl(study.id, pid);
    } catch (e) {
      setError(apiErrorText(e));
      setSaving(false);
    }
  };

  const field = "w-full px-3 py-2 border rounded-md text-sm bg-ui-sheet";
  const lbl = "text-xs font-medium text-ui-muted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nové vyšetření</DialogTitle>
          <DialogDescription>
            {patient.lastName} {patient.firstName}
            {age !== null && ` · ${age} let`} · po založení se otevře ve staré kartotéce
          </DialogDescription>
        </DialogHeader>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          {!CONFIG_WORKINGPLACE && (
          <div className="space-y-1">
            <label className={lbl}>Pracoviště (kód ordinace – nastavte v .env.local)</label>
            <select value={workingplace} onChange={(e) => chooseWorkingplace(e.target.value)} className={field}>
              <option value="">— vyberte —</option>
              {workingplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} – {w.label}
                </option>
              ))}
            </select>
          </div>
          )}
          <div className="space-y-1">
            <label className={lbl}>Modalita</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setServices({});
              }}
              className={field}
            >
              <option value="">— vyberte —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ServicesEditor category={category} value={services} onChange={setServices} />

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={selfPay} onChange={(e) => setSelfPay(e.target.checked)} />
            Samoplátce
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            Urgentní
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Lookup
            label={selfPay ? "Žádající lékař (nepovinné)" : "Žádající lékař"}
            placeholder="IČP, jméno nebo název"
            value={doctor}
            onChange={setDoctor}
            search={searchDoctors}
          />
          <Lookup
            label={selfPay ? "Diagnóza (nepovinné)" : "Diagnóza"}
            placeholder="Kód (M25.5) nebo popis"
            value={diagnosis}
            onChange={setDiagnosis}
            search={searchDiagnoses}
          />
          <div className="space-y-1">
            <label className={lbl}>Datum žádanky</label>
            <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label className={lbl}>Pojišťovna (kód)</label>
            <input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="např. 111" className={field} />
          </div>
        </div>

        <div className="space-y-1">
          <label className={lbl}>Poznámka</label>
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} className={field} />
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-md p-2 text-sm text-red-700 dark:text-red-300 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-all">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-ui-faint">
            {missing.length ? `Chybí: ${missing.join(", ")}` : "Vše vyplněno."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Zrušit
            </Button>
            <Button onClick={submit} disabled={saving || missing.length > 0} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Založit a otevřít
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

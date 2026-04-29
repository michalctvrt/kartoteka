"use client";

/**
 * Detail karty pacienta.
 *
 * URL: /reception/patients/{pid}    pid = rodné číslo bez lomítka.
 * Volitelný query: ?ezadanka={uuid}  (informativně, jen pro recepční)
 *
 * Flow:
 *   - Načte pacienta přes PatientService.findByPid(pid)
 *   - 404 → ukáže nabídku "Pacient neexistuje, založit?" s linkem na /new
 *   - Při edit režimu: autosave do localStorage (usePatientDraft).
 *   - Save volá storeNewPatientData (slouží jako upsert) a vyčistí draft.
 */

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Save,
  X,
  UserPlus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientService } from "@/lib/api/generated/services/PatientService";
import { InsuranceCompanyService } from "@/lib/api/generated/services/InsuranceCompanyService";
import { StorePatientDataRequest } from "@/lib/api/generated/models/StorePatientDataRequest";
import type { PatientInfo } from "@/lib/api/generated/models/PatientInfo";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { usePatientDraft } from "@/components/hooks/usePatientDraft";
import ExaminationsSection from "@/components/ExaminationsSection";
import EzadankyList from "@/components/ezadanka/EzadankyList";
import { parseRc } from "@/lib/rc";

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  title: string;
  birthDate: string;
  gender: "MALE" | "FEMALE" | "";
  idInsuranceCompany: string;
  phone: string;
  email: string;
  weight: string;
  height: string;
}

const EMPTY: FormState = {
  firstName: "",
  middleName: "",
  lastName: "",
  title: "",
  birthDate: "",
  gender: "",
  idInsuranceCompany: "",
  phone: "",
  email: "",
  weight: "",
  height: "",
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ pid: string }>;
}) {
  const { pid } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const ezadankaId = searchParams.get("ezadanka");

  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "loaded" | "not-found" | "error"
  >("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pojišťovna — paralelně dohledáme název podle ID (např. "111" → "VZP")
  const [insuranceName, setInsuranceName] = useState<string>("");

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    draft,
    setDraft,
    discardDraft,
    hasDraft,
    saveDraftLocally,
  } = usePatientDraft<FormState>(pid, EMPTY);

  // Pacient může v DB existovat jen jako PID bez "patientDataInfo" — to
  // znamená, že byl založen e.g. při importu, ale nikdo zatím neuložil
  // jméno/datum/atd. Pak chceme rovnou skočit do editace a auto-vyplnit z RČ.
  const hasNoData =
    loadState === "loaded" &&
    patient !== null &&
    !patient.patientDataInfo;

  useEffect(() => {
    if (!hasNoData) return;
    if (draft) return; // už něco máme rozeditované
    const rcInfo = parseRc(pid);
    setDraft({
      ...EMPTY,
      birthDate: rcInfo.birthDate ?? "",
      gender: rcInfo.gender ?? "",
    });
    setIsEditing(true);
  }, [hasNoData, draft, pid, setDraft]);

  // ─── Načti pacienta z backendu (+ paralelně název pojišťovny) ───
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);
    setInsuranceName("");

    PatientService.findByPid(pid)
      .then(async (res) => {
        if (cancelled) return;
        setPatient(res);
        setLoadState("loaded");

        // Pojišťovna — best-effort lookup, chybu ignorujeme (zobrazí jen kód)
        const insId = res.patientDataInfo?.idInsuranceCompany;
        if (insId) {
          try {
            const ins = await InsuranceCompanyService.findById(insId);
            if (!cancelled) {
              setInsuranceName(ins.description ?? ins.descriptionLong ?? "");
            }
          } catch {
            /* nech prázdné — UI ukáže jen kód */
          }
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setLoadState("not-found");
          return;
        }
        setLoadState("error");
        setLoadError(
          e instanceof ApiError
            ? `Backend (${e.status}): ${e.message}`
            : (e as Error).message ?? "Chyba při načítání pacienta."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [pid]);

  // Hodnota formuláře = draft (rozeditované) NEBO data z backendu.
  // Pozor: backend může vrátit patientDataInfo === null/undefined,
  // pokud pacient v DB existuje jen jako PID bez uložených dat.
  const formValue: FormState = useMemo(() => {
    if (draft) return draft;
    if (!patient) return EMPTY;
    const d = patient.patientDataInfo;
    if (!d) return EMPTY;
    return {
      firstName: d.firstName ?? "",
      middleName: d.middleName ?? "",
      lastName: d.lastName ?? "",
      title: d.title ?? "",
      birthDate: d.birthDate ?? "",
      gender:
        d.gender === "MALE" || d.gender === "FEMALE" ? d.gender : "",
      idInsuranceCompany: d.idInsuranceCompany ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      weight: d.weight != null ? String(d.weight) : "",
      height: d.height != null ? String(d.height) : "",
    };
  }, [draft, patient]);

  const updateForm = (patch: Partial<FormState>) => {
    setDraft({ ...formValue, ...patch });
  };

  // ─── Save ───
  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);

    const request: StorePatientDataRequest = {
      firstName: formValue.firstName.trim(),
      middleName: formValue.middleName.trim() || null,
      lastName: formValue.lastName.trim(),
      title: formValue.title.trim() || null,
      birthDate: formValue.birthDate,
      gender:
        formValue.gender === "MALE" || formValue.gender === "FEMALE"
          ? (formValue.gender as StorePatientDataRequest.gender)
          : undefined,
      idInsuranceCompany: formValue.idInsuranceCompany.trim() || null,
      phone: formValue.phone.trim() || null,
      email: formValue.email.trim() || null,
      weight: formValue.weight ? Number(formValue.weight) : null,
      height: formValue.height ? Number(formValue.height) : null,
    };

    try {
      await PatientService.storeNewPatientData(pid, request);
      saveDraftLocally(); // smaže draft
      setIsEditing(false);
      // Reload aktuálních dat z backendu
      const fresh = await PatientService.findByPid(pid);
      setPatient(fresh);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? `Backend (${e.status}): ${e.message}`
          : (e as Error).message ?? "Chyba při ukládání.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    discardDraft();
    setIsEditing(false);
    setSaveError(null);
  };

  // ─── Render ───

  // Stavy načítání
  if (loadState === "loading") {
    return (
      <div className="space-y-4">
        <BackButton />
        <p className="text-sm text-gray-500">Načítám pacienta…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Chyba při načítání</p>
              <p className="text-xs text-gray-500 mt-1">{loadError}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => router.refresh()}
              >
                Zkusit znovu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Pacient s rodným číslem <strong>{formatRc(pid)}</strong> nebyl
              v kartotéce nalezen.
            </p>
            <Link
              href={`/reception/patients/new?rc=${encodeURIComponent(pid)}${
                ezadankaId
                  ? `&ezadanka=${encodeURIComponent(ezadankaId)}`
                  : ""
              }`}
            >
              <Button className="mt-4 gap-2">
                <UserPlus className="w-4 h-4" />
                Založit nového pacienta
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loaded
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <BackButton />
          <h1 className="text-xl font-semibold mt-2 flex items-center gap-2">
            {formValue.firstName} {formValue.lastName}
            {hasDraft && (
              <span
                title="Neuložené změny"
                className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"
              />
            )}
          </h1>
          <p className="text-sm text-gray-500">
            RČ <strong>{formatRc(pid)}</strong>
            {ezadankaId && (
              <>
                {" "}
                · ze e-žádanky{" "}
                <code className="text-xs">{ezadankaId}</code>
              </>
            )}
          </p>
          {hasNoData && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pacient je v kartotéce, ale nemá uložené žádné údaje. Doplň
              jméno, příjmení a další informace a uložením je vytvoř.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleDiscard}
                disabled={saving}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Zahodit
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Ukládám…" : "Uložit"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Editovat</Button>
          )}
        </div>
      </header>

      {/* SEKCE: Identifikace */}
      <Card>
        <CardHeader>
          <CardTitle>Identifikace</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Rodné číslo"
            value={formatRc(pid)}
            editing={isEditing}
            readOnly
            onChange={() => {}}
            hint="RČ je primary key, nelze měnit"
          />
          <Field
            label="Jméno"
            value={formValue.firstName}
            editing={isEditing}
            onChange={(v) => updateForm({ firstName: v })}
          />
          <Field
            label="Příjmení"
            value={formValue.lastName}
            editing={isEditing}
            onChange={(v) => updateForm({ lastName: v })}
          />
          <Field
            label="Druhé jméno"
            value={formValue.middleName}
            editing={isEditing}
            onChange={(v) => updateForm({ middleName: v })}
          />
          <Field
            label="Titul"
            value={formValue.title}
            editing={isEditing}
            onChange={(v) => updateForm({ title: v })}
          />
          <Field
            label="Datum narození"
            type="date"
            value={formValue.birthDate}
            editing={isEditing}
            onChange={(v) => updateForm({ birthDate: v })}
          />
          <SelectField
            label="Pohlaví"
            value={formValue.gender}
            editing={isEditing}
            onChange={(v) =>
              updateForm({ gender: v as FormState["gender"] })
            }
            options={[
              { value: "", label: "—" },
              { value: "MALE", label: "Muž" },
              { value: "FEMALE", label: "Žena" },
            ]}
            displayValue={
              formValue.gender === "MALE"
                ? "Muž"
                : formValue.gender === "FEMALE"
                ? "Žena"
                : ""
            }
          />
        </CardContent>
      </Card>

      {/* SEKCE: Pojištění a kontakt */}
      <Card>
        <CardHeader>
          <CardTitle>Pojišťovna a kontakt</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Pojišťovna (kód)"
            value={formValue.idInsuranceCompany}
            editing={isEditing}
            onChange={(v) =>
              updateForm({ idInsuranceCompany: v.replace(/\D/g, "") })
            }
            hint={
              !isEditing && insuranceName ? insuranceName : undefined
            }
          />
          <Field
            label="Telefon"
            value={formValue.phone}
            editing={isEditing}
            onChange={(v) => updateForm({ phone: v })}
          />
          <Field
            label="E-mail"
            type="email"
            value={formValue.email}
            editing={isEditing}
            onChange={(v) => updateForm({ email: v })}
          />
        </CardContent>
      </Card>

      {/* SEKCE: Fyzické údaje */}
      <Card>
        <CardHeader>
          <CardTitle>Fyzické údaje</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Váha (kg)"
            type="number"
            value={formValue.weight}
            editing={isEditing}
            onChange={(v) => updateForm({ weight: v })}
          />
          <Field
            label="Výška (cm)"
            type="number"
            value={formValue.height}
            editing={isEditing}
            onChange={(v) => updateForm({ height: v })}
          />
        </CardContent>
      </Card>

      {saveError && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      {/* SEKCE: Aktivní eŽádanky pacienta */}
      <EzadankyList rid={pid} />

      {/* SEKCE: Vyšetření — komponenta si studie tahá sama přes StudyService */}
      <ExaminationsSection pid={pid} />
    </div>
  );
}

// ─── Helpery & sub-komponenty ────────────────────────────

function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/reception/patients")}
      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"
    >
      <ArrowLeft className="w-4 h-4" />
      Zpět na seznam pacientů
    </button>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
  type = "text",
  readOnly = false,
  hint,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: "text" | "email" | "date" | "number";
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </span>
      {editing && !readOnly ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-sm"
        />
      ) : (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {value || "—"}
        </span>
      )}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}

function SelectField({
  label,
  value,
  editing,
  onChange,
  options,
  displayValue,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  displayValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </span>
      {editing ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {displayValue || value || "—"}
        </span>
      )}
    </div>
  );
}

function formatRc(rc: string): string {
  if (rc.length <= 6) return rc;
  return `${rc.substring(0, 6)}/${rc.substring(6)}`;
}

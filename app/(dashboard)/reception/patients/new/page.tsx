"use client";

/**
 * Založení nového pacienta.
 *
 * Flow (podle NewPatientBox):
 *   1) Recepční zadá RČ nebo ID e-žádanky.
 *   2) NewPatientBox volá PatientService.findByPid — pokud pacient neexistuje,
 *      redirectne sem s ?rc=...&ezadanka=... (ezadanka je volitelná).
 *   3) Tato stránka:
 *      - Z RČ odvodí birthDate + gender (helper lib/rc.ts).
 *      - Pokud je ?ezadanka=..., natáhne data z /api/ezadanka/{id} a doplní formulář.
 *      - Recepční doplní zbytek a uloží přes PatientService.storeNewPatientData.
 *      - Po úspěchu redirect na /reception/patients/{rc}.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientService } from "@/lib/api/generated/services/PatientService";
import { StorePatientDataRequest } from "@/lib/api/generated/models/StorePatientDataRequest";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import EzadankyList from "@/components/ezadanka/EzadankyList";
import type { ZadankaDetail } from "@/lib/ezadanka/types";
import { parseRc } from "@/lib/rc";

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  title: string;
  birthDate: string; // YYYY-MM-DD
  gender: "MALE" | "FEMALE" | "";
  idInsuranceCompany: string;
  phone: string;
  email: string;
  weight: string; // držíme jako string kvůli inputu
  height: string;
}

const EMPTY_FORM: FormState = {
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

export default function NewPatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rcParam = searchParams.get("rc") ?? "";
  const ezadankaId = searchParams.get("ezadanka") ?? "";

  // Z RČ odvodíme birthDate + gender pro auto-fill
  const rcInfo = useMemo(() => parseRc(rcParam), [rcParam]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false); // submit
  const [loadingEzadanka, setLoadingEzadanka] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Init formuláře z RČ + e-žádanky ───
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      birthDate: rcInfo.birthDate ?? prev.birthDate,
      gender: rcInfo.gender ?? prev.gender,
    }));
  }, [rcInfo.birthDate, rcInfo.gender]);

  useEffect(() => {
    if (!ezadankaId) return;

    let cancelled = false;
    setLoadingEzadanka(true);

    fetch(`/api/ezadanka/${encodeURIComponent(ezadankaId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("E-žádanka nenalezena.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const p = data.pacient ?? {};
        setForm((prev) => ({
          ...prev,
          firstName: prev.firstName || p.jmeno || "",
          lastName: prev.lastName || p.prijmeni || "",
          birthDate: prev.birthDate || p.datumNarozeni || "",
          gender: prev.gender || (p.pohlavi as FormState["gender"]) || "",
          idInsuranceCompany: prev.idInsuranceCompany || p.pojistovna || "",
          phone: prev.phone || p.telefon || "",
          email: prev.email || p.email || "",
        }));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingEzadanka(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ezadankaId]);

  // ─── Import dat z eŽádanky → předvyplnit formulář ───
  // Volá se z EzadankyList → EzadankaDetail po kliknutí "Použít data pro novou kartu".
  const handleImportFromEzadanka = (z: ZadankaDetail) => {
    setForm((prev) => ({
      ...prev,
      firstName: prev.firstName || z.pacient.jmeno,
      lastName: prev.lastName || z.pacient.prijmeni,
      birthDate: prev.birthDate || z.pacient.datumNarozeni || "",
      gender:
        prev.gender ||
        (z.pacient.pohlavi === "MALE" || z.pacient.pohlavi === "FEMALE"
          ? z.pacient.pohlavi
          : ""),
      idInsuranceCompany:
        prev.idInsuranceCompany || z.pacient.pojistovnaKod || "",
      phone: prev.phone || z.pacient.telefon || "",
      email: prev.email || z.pacient.email || "",
    }));
  };

  // ─── Submit ───
  const canSubmit =
    rcInfo.validFormat &&
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.birthDate !== "" &&
    (form.gender === "MALE" || form.gender === "FEMALE") &&
    !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    const request: StorePatientDataRequest = {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || null,
      lastName: form.lastName.trim(),
      title: form.title.trim() || null,
      birthDate: form.birthDate,
      gender: form.gender as StorePatientDataRequest.gender,
      idInsuranceCompany: form.idInsuranceCompany.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
    };

    try {
      await PatientService.storeNewPatientData(rcInfo.normalized, request);
      // Po založení redirect na detail karty pacienta
      router.push(`/reception/patients/${rcInfo.normalized}`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `Backend (${e.status}): ${e.message}`
          : (e as Error).message ?? "Chyba při ukládání pacienta.";
      setError(msg);
      setLoading(false);
    }
  };

  // ─── Render ───

  if (!rcParam) {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Stránka pro založení nového pacienta vyžaduje rodné číslo
              v parametru <code>?rc=...</code>. Pro založení použij box
              &quot;Nový pacient&quot; na hlavní stránce recepce.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rcInfo.validFormat) {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Neplatné rodné číslo</p>
              <p className="text-xs text-gray-500 mt-1">
                Zadané RČ {rcInfo.normalized}: {rcInfo.error}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Založení nového pacienta</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rodné číslo: <strong>{formatRc(rcInfo.normalized)}</strong>
            {ezadankaId && (
              <>
                {" "}
                · ze e-žádanky <code className="text-xs">{ezadankaId}</code>
              </>
            )}
          </p>
          {!rcInfo.validChecksum && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pozor: kontrolní cifra RČ nesedí. Před uložením ověř s pacientem.
            </p>
          )}
        </div>
      </header>

      {loadingEzadanka && (
        <p className="text-xs text-gray-500">Načítám data z e-žádanky…</p>
      )}

      {/* SEKCE: eŽádanky pacienta — recepční může importovat data do formuláře */}
      <EzadankyList
        rid={rcInfo.normalized}
        onImport={handleImportFromEzadanka}
      />

      {/* SEKCE: Identifikace */}
      <Card>
        <CardHeader>
          <CardTitle>Identifikace</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Jméno *"
            value={form.firstName}
            onChange={(v) => setForm({ ...form, firstName: v })}
            autoFocus
          />
          <Field
            label="Příjmení *"
            value={form.lastName}
            onChange={(v) => setForm({ ...form, lastName: v })}
          />
          <Field
            label="Druhé jméno"
            value={form.middleName}
            onChange={(v) => setForm({ ...form, middleName: v })}
          />
          <Field
            label="Titul"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder="MUDr., Mgr., …"
          />
          <Field
            label="Datum narození *"
            type="date"
            value={form.birthDate}
            onChange={(v) => setForm({ ...form, birthDate: v })}
            hint={
              rcInfo.birthDate
                ? `Z RČ odvozeno na ${rcInfo.birthDate}`
                : undefined
            }
          />
          <SelectField
            label="Pohlaví *"
            value={form.gender}
            onChange={(v) => setForm({ ...form, gender: v as FormState["gender"] })}
            options={[
              { value: "", label: "—" },
              { value: "MALE", label: "Muž" },
              { value: "FEMALE", label: "Žena" },
            ]}
            hint={
              rcInfo.gender
                ? `Z RČ odvozeno (${rcInfo.gender === "MALE" ? "Muž" : "Žena"})`
                : undefined
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
            value={form.idInsuranceCompany}
            onChange={(v) =>
              setForm({ ...form, idInsuranceCompany: v.replace(/\D/g, "") })
            }
            placeholder="111, 207, 211, 213, 201, 205, 209"
          />
          <Field
            label="Telefon"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            placeholder="+420 …"
          />
          <Field
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
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
            value={form.weight}
            onChange={(v) => setForm({ ...form, weight: v })}
          />
          <Field
            label="Výška (cm)"
            type="number"
            value={form.height}
            onChange={(v) => setForm({ ...form, height: v })}
          />
        </CardContent>
      </Card>

      {/* CHYBA */}
      {error && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* AKCE */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Zrušit
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Ukládám…" : "Založit pacienta"}
        </Button>
      </div>
    </div>
  );
}

// ─── Helpery & sub-komponenty ────────────────────────────

function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/reception")}
      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"
    >
      <ArrowLeft className="w-4 h-4" />
      Zpět na recepci
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "date" | "number";
  placeholder?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-sm"
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
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
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

/** RČ s lomítkem před posledními 3-4 ciframi pro hezčí zobrazení. */
function formatRc(rc: string): string {
  if (rc.length <= 6) return rc;
  return `${rc.substring(0, 6)}/${rc.substring(6)}`;
}

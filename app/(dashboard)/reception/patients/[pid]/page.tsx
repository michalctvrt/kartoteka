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
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Pencil,
  Save,
  X,
  UserPlus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bento } from "@/components/ui/bento";
import { PatientService } from "@/lib/api/generated/services/PatientService";
import { InsuranceCompanyService } from "@/lib/api/generated/services/InsuranceCompanyService";
import { PatientDataSaveInfo } from "@/lib/api/generated/models/PatientDataSaveInfo";
import type { PatientInfo } from "@/lib/api/generated/models/PatientInfo";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { usePatientDraft } from "@/components/hooks/usePatientDraft";
import ExaminationsSection from "@/components/ExaminationsSection";
import EzadankyList from "@/components/ezadanka/EzadankyList";
import { parseRc } from "@/lib/rc";
import PatientQueueBox from "@/components/queue/PatientQueueBox";
import NewStudyDialog from "@/components/study/NewStudyDialog";
import { useInsuranceCompanies } from "@/components/hooks/useInsuranceCompanies";
import { usePatientStudies } from "@/components/hooks/usePatientStudies";
import { EMPTY_FORM as EMPTY, GENDER_LABEL, type PatientForm as FormState } from "@/components/patient/form";
import {
  BodyTile,
  ContactTile,
  IdentityTile,
  InsuranceTile,
  LastStudyTile,
  PatientCardSkeleton,
  StudiesCountTile,
} from "@/components/patient/PatientTiles";
import { ageYears } from "@/lib/study/card-check";
import { missingForStudy } from "@/lib/study/card-check";
import {
  legacyNewStudyUrl,
  legacyStudyListUrl,
  STUDY_VIA_API,
} from "@/lib/legacy";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ pid: string }>;
}) {
  const { pid } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const ezadankaId = searchParams.get("ezadanka");
  // Lístek z vyvolávacího systému (přechod z panelu recepce)
  const ticketId = searchParams.get("ticket");

  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "loaded" | "not-found" | "error"
  >("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pojišťovna — paralelně dohledáme název podle ID (např. "111" → "VZP")
  const [insuranceName, setInsuranceName] = useState<string>("");

  const [isEditing, setIsEditing] = useState(false);
  const [newStudyOpen, setNewStudyOpen] = useState(false);
  const insuranceCompanies = useInsuranceCompanies();
  const { studies, loading: studiesLoading, error: studiesError } = usePatientStudies(pid);
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

  // Pacient v kartotéce není → případný draft pro toto RČ je k ničemu
  // (jinak by v menu navždy svítil puntík „rozpracovaná karta“)
  useEffect(() => {
    if (loadState === "not-found" && hasDraft) discardDraft();
  }, [loadState, hasDraft, discardDraft]);

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
            const ins = await InsuranceCompanyService.findById1(insId);
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

    const request: PatientDataSaveInfo = {
      firstName: formValue.firstName.trim(),
      middleName: formValue.middleName.trim() || null,
      lastName: formValue.lastName.trim(),
      title: formValue.title.trim() || null,
      birthDate: formValue.birthDate,
      gender:
        formValue.gender === "MALE" || formValue.gender === "FEMALE"
          ? (formValue.gender as PatientDataSaveInfo.gender)
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
  if (loadState === "loading") return <PatientCardSkeleton />;

  if (loadState === "error") {
    return (
      <div className="space-y-4">
        <BackButton />
        <div className="ui-tile flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium">Kartu se nepodařilo načíst</p>
            <p className="mt-1 text-[13px] text-ui-muted">{loadError}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => router.refresh()}>
              Zkusit znovu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="space-y-4">
        <BackButton />
        <div className="ui-tile p-5">
          <p className="text-sm">
            Pacient s rodným číslem <strong>{formatRc(pid)}</strong> nebyl v kartotéce nalezen.
          </p>
          <Button className="mt-4" asChild>
            <Link
              href={`/reception/patients/new?rc=${encodeURIComponent(pid)}${
                ezadankaId ? `&ezadanka=${encodeURIComponent(ezadankaId)}` : ""
              }`}
            >
              <UserPlus /> Založit nového pacienta
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Co chybí na (uložené) kartě pro založení vyšetření
  const studyMissing = missingForStudy(patient?.patientDataInfo);
  const age = ageYears(formValue.birthDate);
  const name = [formValue.title, formValue.firstName, formValue.middleName, formValue.lastName]
    .filter(Boolean)
    .join(" ");
  const form = { value: formValue, editing: isEditing, onChange: updateForm };

  return (
    <div className="space-y-5">
      {/* Hlavička: kdo to je + hlavní akce */}
      <motion.header
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <BackButton />
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {name || <span className="text-ui-faint">Bez jména</span>}
            {hasDraft && (
              <span title="Neuložené změny" className="inline-block h-2 w-2 rounded-full bg-red-600" />
            )}
          </h1>
          <p className="mt-1 text-sm text-ui-muted">
            RČ {formatRc(pid)}
            {age !== null && ` · ${age} let`}
            {formValue.gender && ` · ${GENDER_LABEL[formValue.gender]}`}
            {ezadankaId && ` · ze e-žádanky ${ezadankaId}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleDiscard} disabled={saving}>
                <X /> Zahodit
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save /> {saving ? "Ukládám…" : "Uložit"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <a href={legacyStudyListUrl(pid)} title="Seznam vyšetření ve staré kartotéce">
                  <ExternalLink /> Stará kartotéka
                </a>
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil /> Upravit
              </Button>
              {STUDY_VIA_API || studyMissing.length > 0 ? (
                <Button
                  onClick={() => setNewStudyOpen(true)}
                  disabled={studyMissing.length > 0}
                  title={studyMissing.length ? `Na kartě chybí: ${studyMissing.join(", ")}` : "Založit nové vyšetření"}
                >
                  <Plus /> Nové vyšetření
                </Button>
              ) : (
                // Dočasně: formulář nového vyšetření ve staré kartotéce
                // (POST /study zatím vyžaduje ezadankaId — viz lib/legacy.ts)
                <Button asChild>
                  <a href={legacyNewStudyUrl(pid)} title="Otevře formulář ve staré kartotéce">
                    <Plus /> Nové vyšetření
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
      </motion.header>

      {hasNoData && (
        <Notice>Pacient je v kartotéce bez údajů. Doplňte jméno a další údaje a uložte.</Notice>
      )}
      {!isEditing && !hasNoData && studyMissing.length > 0 && (
        <Notice>Pro založení vyšetření doplňte: {studyMissing.join(", ")}.</Notice>
      )}
      {saveError && <Notice tone="error">{saveError}</Notice>}

      {STUDY_VIA_API && patient?.patientDataInfo && (
        <NewStudyDialog
          open={newStudyOpen}
          onOpenChange={setNewStudyOpen}
          pid={pid}
          patient={patient.patientDataInfo}
          ticketId={ticketId}
        />
      )}

      <Bento>
        {/* 1. řada: kde je pacient teď (nebo poslední vyšetření) · počet vyšetření · pojišťovna */}
        <PatientQueueBox
          pid={pid}
          ticketId={ticketId}
          index={0}
          fallback={<LastStudyTile study={studies[0]} loading={studiesLoading} index={0} />}
        />
        <StudiesCountTile studies={studies} loading={studiesLoading} index={1} />
        <InsuranceTile {...form} index={2} companies={insuranceCompanies} name={insuranceName} />

        {/* 2. řada: osobní údaje · kontakt · tělo */}
        <IdentityTile {...form} pid={pid} index={3} />
        <ContactTile {...form} index={4} />
        <BodyTile {...form} index={5} />

        <ExaminationsSection studies={studies} loading={studiesLoading} error={studiesError} index={6} />
      </Bento>

      {/* e-žádanky jen když nějaké jsou */}
      <EzadankyList rid={pid} hideEmpty />
    </div>
  );
}

// ─── Helpery & sub-komponenty ────────────────────────────

function BackButton() {
  return (
    <Link
      href="/reception/patients"
      className="inline-flex items-center gap-1.5 text-sm text-ui-muted transition-colors hover:text-ui-ink"
    >
      <ArrowLeft className="h-4 w-4" /> Vyhledat pacienta
    </Link>
  );
}

function Notice({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "error" }) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={
        tone === "error"
          ? "flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-[13px] text-red-800 dark:border-red-900 dark:text-red-200"
          : "flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-[13px] text-amber-800 dark:border-amber-900 dark:text-amber-200"
      }
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function formatRc(rc: string): string {
  if (rc.length <= 6) return rc;
  return `${rc.substring(0, 6)}/${rc.substring(6)}`;
}

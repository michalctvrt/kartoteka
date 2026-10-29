"use client";

/**
 * Karta studie – vše, co backend o studii ví (GET /study/{id}), jen ke čtení.
 *
 * Hlavní otázka obrazovky: „Co je v popisu?“ → popis je největší blok vlevo.
 * Vpravo pacient, žádanka, výkony a záznam (kdo/kdy). Úpravy zatím dělá
 * stará kartotéka (edit.xhtml?sid=) – backend PUT /study existuje, ale
 * formulář přepíšeme až v dalším kroku.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, FileDown, Pencil, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import { MedicalDefinitionsService } from "@/lib/api/generated/services/MedicalDefinitionsService";
import { WorkingplaceService } from "@/lib/api/generated/services/WorkingplaceService";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { STUDY_EDIT_VIA_API, legacyStudyEditUrl } from "@/lib/legacy";
import { writeLastStudyId } from "@/lib/lastStudy";
import {
  MODALITY_NAME,
  formatDate,
  formatDateTime,
  formatRc,
  hasReport,
  patientName,
} from "@/lib/studies";
import { Flag, ModalityTag } from "@/components/study/StudyBits";
import StudyEditForm from "@/components/study/StudyEditForm";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string; notFound?: boolean }
  | { state: "ok"; study: StudyInfo };

export default function StudyCardPage({ params }: { params: Promise<{ sid: string }> }) {
  const { sid } = use(params);
  // výsledek si pamatuje, ke kterému načtení patří → jiný klíč = zase „načítám“
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [workplace, setWorkplace] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const id = Number(sid);
  const valid = /^\d+$/.test(sid);
  const key = `${sid}:${attempt}`;
  const load: Load = !valid
    ? { state: "error", message: `„${decodeURIComponent(sid)}“ není číslo studie.`, notFound: true }
    : result?.key === key
    ? result.load
    : { state: "loading" };

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const done = (l: Load) => !cancelled && setResult({ key, load: l });
    StudyService.findById6(id)
      .then((study) => {
        if (cancelled) return;
        done({ state: "ok", study });
        writeLastStudyId(study.id);

        // Názvy výkonů a pracoviště – jen doplněk, chyba nevadí
        loadServiceNames(study).then((names) => !cancelled && setServiceNames(names));
        if (study.idWorkingplaceCreated) {
          WorkingplaceService.findById7(study.idWorkingplaceCreated)
            .then((w) => !cancelled && setWorkplace(w.medicalInstitutionInfo?.description ?? null))
            .catch(() => {});
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          done({ state: "error", message: `Studie ${sid} v kartotéce není.`, notFound: true });
        } else if (e instanceof ApiError && e.status === 401) {
          done({ state: "error", message: "Přihlášení k backendu vypršelo (401)." });
        } else {
          done({ state: "error", message: "Studii se nepodařilo načíst." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, key, sid, valid]);

  if (load.state === "loading") return <StudySkeleton />;

  if (load.state === "error") {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-ui-line p-5 text-sm">
          <p>{load.message}</p>
          {!load.notFound && (
            <button type="button" className="mt-2 text-ui-primary hover:underline" onClick={() => setAttempt((a) => a + 1)}>
              Zkusit znovu
            </button>
          )}
        </div>
      </div>
    );
  }

  const s = load.study;

  const onSaved = (saved: StudyInfo) => {
    setResult({ key, load: { state: "ok", study: saved } });
    setEditing(false);
    setSavedAt(new Date().toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }));
    loadServiceNames(saved).then(setServiceNames);
  };
  const p = s.patientDataInfo;
  const done = hasReport(s);
  const services = s.studyServiceInfo ?? [];
  const attachments = s.studyAttachmentInfo ?? [];
  const inst = s.medicalInstitutionRequestedInfo;
  const pdfUrl = `${OpenAPI.BASE}/study/${s.id}/documentData.pdf`;

  return (
    <div className="space-y-6">
      {/* Titulek */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <BackLink />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Studie {s.uid}</h1>
            <ModalityTag modality={s.idMedicalServiceCategory} className="h-6 px-2 text-[13px]" />
            {s.flagUrgent && <Flag tone="negative">Akutní</Flag>}
            {s.flagSelfPay && <Flag tone="neutral">Samoplátce</Flag>}
            {s.flagDeleted && <Flag tone="negative">Smazaná</Flag>}
          </div>
          <p className="mt-1 text-sm text-ui-muted">
            <span className="text-ui-ink">{patientName(s)}</span> · RČ {formatRc(s.pid)} ·{" "}
            {MODALITY_NAME[s.idMedicalServiceCategory] ?? s.idMedicalServiceCategory ?? "Vyšetření"}{" "}
            {formatDateTime(s.studyDate)}
          </p>
        </div>
        {!editing && (
          <div className="flex flex-wrap items-center gap-2">
            {savedAt && (
              <span className="mr-1 inline-flex items-center gap-1 text-[13px] text-ui-muted" role="status">
                <Check className="h-4 w-4 text-emerald-600" /> Uloženo {savedAt}
              </span>
            )}
            <Button variant="outline" asChild>
              <Link href={`/reception/patients/${encodeURIComponent(s.pid)}`}>
                <UserRound /> Karta pacienta
              </Link>
            </Button>
            {STUDY_EDIT_VIA_API ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Upravit
              </Button>
            ) : (
              // backend zatím PUT /study neumí → úprava ve staré kartotéce (viz lib/legacy.ts)
              <Button variant="outline" asChild>
                <a href={legacyStudyEditUrl(s.id, s.pid)} target="_blank" rel="noreferrer">
                  <Pencil /> Upravit
                </a>
              </Button>
            )}
            <Button asChild>
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <FileDown /> Zpráva PDF
              </a>
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <StudyEditForm study={s} onCancel={() => setEditing(false)} onSaved={onSaved} />
      ) : (

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* POPIS – hlavní blok */}
        <section className="rounded-lg border border-ui-line" aria-labelledby="popis">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ui-rule px-5 py-3">
            <h2 id="popis" className="flex items-center gap-3 text-base font-semibold">
              Popis
              <a
                href={legacyStudyEditUrl(s.id, s.pid)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-normal text-ui-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Upravit ve staré kartotéce
              </a>
            </h2>
            {done ? (
              <p className="text-[13px] text-ui-muted">
                <span className="text-ui-ink">{s.nameDescriptionChanged ?? s.usernameDescriptionChanged ?? "—"}</span>
                {" · "}
                {formatDateTime(s.dateDescriptionChanged)}
                {s.correctionNumber > 0 && ` · ${s.correctionNumber}. oprava`}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[13px] text-ui-muted">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Čeká na popis
              </p>
            )}
          </header>
          <div className="px-5 py-4">
            {done ? (
              <p className="max-w-[75ch] whitespace-pre-wrap text-[15px] leading-7">{s.description}</p>
            ) : (
              <p className="text-sm text-ui-muted">
                Studie zatím není popsaná. Popis se zde objeví, jakmile ho lékař uloží.
              </p>
            )}
            {s.remark && (
              <div className="mt-5 rounded-lg bg-ui-raised px-4 py-3">
                <h3 className="text-[13px] font-medium text-ui-muted">Poznámka</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{s.remark}</p>
              </div>
            )}
          </div>

          {/* Výkony pod popisem – patří k vyšetření */}
          <div className="border-t border-ui-rule px-5 py-4">
            <h3 className="text-sm font-semibold">Výkony</h3>
            {services.length === 0 ? (
              <p className="mt-1 text-sm text-ui-muted">Bez vykázaných výkonů.</p>
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead className="text-left text-xs text-ui-muted">
                  <tr>
                    <th className="w-20 py-1 font-normal">Kód</th>
                    <th className="py-1 font-normal">Výkon</th>
                    <th className="w-16 py-1 text-right font-normal">Počet</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((v) => (
                    <tr key={v.id} className="border-t border-ui-rule">
                      <td className="py-2">{v.idMedicalService}</td>
                      <td className="py-2">{serviceNames[v.idMedicalService] ?? "—"}</td>
                      <td className="py-2 text-right">{v.serviceCount ?? 1}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(s.rtgKap != null || s.rtgSeries != null) && (
              <dl className="mt-3 flex gap-8 text-sm">
                <KV inline label="KAP" value={s.rtgKap != null ? `${s.rtgKap.toLocaleString("cs-CZ")} µGy·m²` : null} />
                <KV inline label="Počet expozic" value={s.rtgSeries} />
              </dl>
            )}
          </div>
        </section>

        {/* Pravý sloupec – fakta */}
        <div className="space-y-4">
          <Panel title="Pacient">
            <KV label="Jméno" value={patientName(s)} />
            <KV
              label="Rodné číslo"
              value={
                <Link href={`/reception/patients/${encodeURIComponent(s.pid)}`} className="text-ui-primary hover:underline">
                  {formatRc(s.pid)}
                </Link>
              }
            />
            <KV label="Narozen(a)" value={p?.birthDate ? formatDate(p.birthDate) : null} />
            <KV label="Pojišťovna" value={s.insuranceCompanyInfo ? `${s.idInsuranceCompany} ${s.insuranceCompanyInfo.description}` : s.idInsuranceCompany} />
            <KV label="Výška / váha" value={p?.height || p?.weight ? `${p?.height ?? "—"} cm / ${p?.weight ?? "—"} kg` : null} />
            <KV label="Telefon" value={p?.phone} />
            <KV label="E-mail" value={p?.email} />
          </Panel>

          <Panel title="Žádanka">
            <KV label="Diagnóza" value={s.idMedicalDiagnosisRequested ? `${s.idMedicalDiagnosisRequested} ${s.medicalDiagnosisRequestedInfo?.description ?? ""}` : null} />
            <KV label="Odesílající" value={inst ? inst.description ?? inst.id : s.idMedicalInstitutionRequested} />
            <KV label="Lékař" value={inst?.doctorName} />
            <KV label="Odbornost" value={inst?.medicalSkillInfo?.name} />
            <KV label="IČZ" value={inst?.icz} />
            <KV label="Datum žádanky" value={s.requestDate ? formatDate(s.requestDate) : null} />
          </Panel>

          <Panel title="Záznam">
            <KV label="Pracoviště" value={workplace ? `${s.idWorkingplaceCreated} · ${workplace}` : s.idWorkingplaceCreated} />
            <KV label="Založil" value={s.whoCr ? `${s.whoCr} · ${formatDateTime(s.dateCr)}` : null} />
            <KV label="Upravil" value={s.whoEdit ? `${s.whoEdit} · ${formatDateTime(s.dateEdit)}` : null} />
            <KV label="Odesláno" value={s.dateEmailed ? formatDateTime(s.dateEmailed) : "Ne"} />
            <KV
              label="Online přístup"
              value={s.studyRemoteAccessInfo ? `do ${formatDate(s.studyRemoteAccessInfo.dateValidTill)}` : "Nevytvořen"}
            />
            <KV label="DICOM UID" value={<span className="break-all text-[13px]">{s.dicomUid}</span>} />
          </Panel>

          <Panel title={`Přílohy (${attachments.length})`}>
            {attachments.length === 0 ? (
              <p className="py-1 text-sm text-ui-muted">Žádné přílohy.</p>
            ) : (
              attachments.map((a) => (
                <KV
                  key={a.id}
                  label={a.documentDataInfo?.catMimetypeName ?? "Soubor"}
                  value={a.documentDataInfo?.name}
                />
              ))
            )}
          </Panel>
        </div>
      </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/reception/studies/search" className="inline-flex items-center gap-1.5 text-sm text-ui-muted hover:text-ui-ink">
      <ArrowLeft className="h-4 w-4" /> Vyhledat studii
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-ui-line px-4 py-3">
      <h2 className="mb-1 text-sm font-semibold">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

/** Řádek popisek – hodnota. Chybějící hodnota = šedá pomlčka. */
function KV({ label, value, inline }: { label: string; value: React.ReactNode; inline?: boolean }) {
  const empty = value === null || value === undefined || value === "";
  if (inline) {
    return (
      <div>
        <dt className="text-xs text-ui-muted">{label}</dt>
        <dd>{empty ? <span className="text-ui-faint">—</span> : value}</dd>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-1 text-sm">
      <dt className="text-ui-muted">{label}</dt>
      <dd className="min-w-0 break-words">{empty ? <span className="text-ui-faint">—</span> : value}</dd>
    </div>
  );
}

/** Načítání: konečné rozložení, místo hodnot šedé pruhy. */
function StudySkeleton() {
  const bar = "rounded bg-ui-raised";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Načítám studii">
      <div>
        <BackLink />
        <div className={`mt-2 h-7 w-64 ${bar}`} />
        <div className={`mt-2 h-4 w-96 ${bar}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3 rounded-lg border border-ui-line p-5">
          {[90, 80, 85, 60].map((w) => (
            <div key={w} className={`h-4 ${bar}`} style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-ui-line p-4">
              <div className={`h-4 w-24 ${bar}`} />
              <div className={`h-4 w-full ${bar}`} />
              <div className={`h-4 w-2/3 ${bar}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Názvy výkonů podle kódů (89131 → RTG HRUDNÍKU); chybějící se vynechají. */
async function loadServiceNames(study: StudyInfo): Promise<Record<string, string>> {
  const codes = [...new Set((study.studyServiceInfo ?? []).map((v) => v.idMedicalService))];
  const res = await Promise.allSettled(codes.map((c) => MedicalDefinitionsService.findById5(c)));
  const names: Record<string, string> = {};
  res.forEach((r, i) => {
    if (r.status === "fulfilled") names[codes[i]] = r.value.description;
  });
  return names;
}

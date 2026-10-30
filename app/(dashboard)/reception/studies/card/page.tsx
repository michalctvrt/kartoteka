"use client";

/**
 * Karta studie – vše, co backend o studii ví (GET /study/{id}), jen ke čtení.
 *
 * Hlavní otázka obrazovky: „Co je v popisu?“ → popis je největší dlaždice
 * (2 sloupce × 2 řádky), vedle pacient, žádanka, výkony a záznam (bento).
 * Úpravy: StudyEditForm (PUT /study) – zatím vypnuto, viz lib/legacy.ts.
 */

import { Suspense, useEffect, useState } from "react";
import { activeBranch, branchByCode, setActiveBranch } from "@/lib/branches";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, FileDown, Pencil, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/generated/core/ApiError";
import { OpenAPI } from "@/lib/api/generated/core/OpenAPI";
import { StudyService } from "@/lib/api/generated/services/StudyService";
import { MedicalDefinitionsService } from "@/lib/api/generated/services/MedicalDefinitionsService";
import { WorkingplaceService } from "@/lib/api/generated/services/WorkingplaceService";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { STUDY_EDIT_VIA_API, legacyStudyEditUrl } from "@/lib/legacy";
import { writeLastStudyId } from "@/lib/lastStudy";
import { MODALITY_NAME, formatDateTime, patientName } from "@/lib/studies";
import { Bento } from "@/components/ui/bento";
import { Flag, ModalityTag } from "@/components/study/StudyBits";
import {
  AccessTile,
  AttachmentsTile,
  PatientTile,
  RecordTile,
  ReportTile,
  RequestTile,
  ServicesTile,
  StudyCardSkeleton,
} from "@/components/study/StudyTiles";
import StudyEditForm from "@/components/study/StudyEditForm";
import ReportEditor from "@/components/study/ReportEditor";
import { useSession } from "@/components/auth/SessionProvider";
import { patientHref, studyHref } from "@/lib/routes";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string; notFound?: boolean }
  | { state: "ok"; study: StudyInfo };

/**
 * Adresa /reception/studies/card?sid=…[&write=1] (statický web – lib/routes.ts).
 * key = sid → „Další na řadě“ načte další studii od nuly.
 */
export default function StudyCardRoute() {
  return (
    <Suspense>
      <StudyCardByQuery />
    </Suspense>
  );
}

function StudyCardByQuery() {
  const q = useSearchParams();
  const sid = q.get("sid") ?? "";
  // studie jiné pobočky (?branch=…) → přepnout kartotéku na ni JEDNOU a parametr z adresy uklidit
  // (jinak by ruční přepnutí pobočky v liště karta hned vrátila zpátky)
  const want = q.get("branch");
  const router = useRouter();
  useEffect(() => {
    if (!want) return;
    if (branchByCode(want) && activeBranch().code !== want) setActiveBranch(want);
    router.replace(studyHref(sid, { write: q.get("write") === "1" }));
  }, [want, sid, q, router]);
  if (want) return null;
  return <StudyCardPage key={sid} sid={sid} />;
}

function StudyCardPage({ sid }: { sid: string }) {
  // výsledek si pamatuje, ke kterému načtení patří → jiný klíč = zase „načítám“
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null);
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [workplace, setWorkplace] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  // psací plocha popisu (?write=1 = rovnou psát – z pracovního seznamu „K popisu“)
  const [writing, setWriting] = useState(useSearchParams().get("write") === "1");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const canEditStudy = useSession().can("study.edit");

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

  if (load.state === "loading") return <StudyCardSkeleton />;

  if (load.state === "error") {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="ui-tile p-5 text-sm">
          <p>{load.message}</p>
          {!load.notFound && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setAttempt((a) => a + 1)}>
              Zkusit znovu
            </Button>
          )}
        </div>
      </div>
    );
  }

  const s = load.study;
  const pdfUrl = `${OpenAPI.BASE}/study/${s.id}/documentData.pdf`;

  const onSaved = (saved: StudyInfo) => {
    setResult({ key, load: { state: "ok", study: saved } });
    setEditing(false);
    setSavedAt(new Date().toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }));
    loadServiceNames(saved).then(setServiceNames);
  };

  return (
    <div className="space-y-5">
      {/* Hlavička */}
      <motion.header
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <BackLink />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Studie {s.uid}</h1>
            <ModalityTag modality={s.idMedicalServiceCategory} className="h-6 px-2 text-[13px]" />
            {s.flagUrgent && <Flag tone="negative">Akutní</Flag>}
            {s.flagSelfPay && <Flag tone="neutral">Samoplátce</Flag>}
            {s.flagDeleted && <Flag tone="negative">Smazaná</Flag>}
          </div>
          <p className="mt-1 text-sm text-ui-muted">
            {MODALITY_NAME[s.idMedicalServiceCategory] ?? s.idMedicalServiceCategory ?? "Vyšetření"}{" "}
            {formatDateTime(s.studyDate)} ·{" "}
            <Link href={patientHref(s.pid)} className="text-ui-ink hover:text-ui-primary">
              {patientName(s)}
            </Link>
          </p>
        </div>
        {!editing && !writing && (
          <div className="flex flex-wrap items-center gap-2">
            {savedAt && (
              <span className="mr-1 inline-flex items-center gap-1 text-[13px] text-ui-muted" role="status">
                <Check className="h-4 w-4 text-emerald-600" /> Uloženo {savedAt}
              </span>
            )}
            <Button variant="ghost" asChild>
              <Link href={patientHref(s.pid)}>
                <UserRound /> Karta pacienta
              </Link>
            </Button>
            {!canEditStudy ? null : STUDY_EDIT_VIA_API ? (
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
      </motion.header>

      {writing ? (
        <ReportEditor study={s} serviceNames={serviceNames} onClose={() => setWriting(false)} />
      ) : editing ? (
        <StudyEditForm study={s} onCancel={() => setEditing(false)} onSaved={onSaved} />
      ) : (
        <Bento className="xl:grid-flow-row-dense">
          <ReportTile study={s} index={0} onWrite={() => setWriting(true)} />
          <PatientTile study={s} index={1} />
          <RequestTile study={s} index={2} />
          <ServicesTile study={s} names={serviceNames} index={3} />
          <RecordTile study={s} workplace={workplace} index={4} />
          <AccessTile
            study={s}
            index={5}
            onExtended={(until) =>
              s.studyRemoteAccessInfo &&
              setResult({
                key,
                load: { state: "ok", study: { ...s, studyRemoteAccessInfo: { ...s.studyRemoteAccessInfo, dateValidTill: until } } },
              })
            }
          />
          <AttachmentsTile study={s} index={6} />
        </Bento>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/reception/studies/search" className="inline-flex items-center gap-1.5 text-sm text-ui-muted transition-colors hover:text-ui-ink">
      <ArrowLeft className="h-4 w-4" /> Vyhledat studii
    </Link>
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

"use client";

/**
 * Psaní popisu studie – plocha stavěná na dlouhé čtení a přepisování:
 *   „papír“ s plným kontrastem (žádné šedé pole), řádek max ~72 znaků, řádkování 1,75,
 *   velikost písma S/M/L (pamatuje se – lib/prefs.ts), pole roste s textem, kontrola pravopisu česky,
 *   vedle souvislosti (pacient, vyšetření, diagnóza, výkony, poznámka).
 * Koncept se průběžně ukládá v prohlížeči (nic se neztratí při zavření).
 *
 * Uložení: backend popis (description) zatím přes API neumí (viz lib/legacy.ts STUDY_EDIT_VIA_API) →
 * „Zkopírovat a otevřít ve staré kartotéce“ – lékař text jen vloží (Ctrl+V) a uloží tam.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ClipboardCopy, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DataRow } from "@/components/ui/bento";
import { ModalityTag } from "@/components/study/StudyBits";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { legacyStudyEditUrl } from "@/lib/legacy";
import { ageYears } from "@/lib/study/card-check";
import { formatDateTime, formatRc, patientName } from "@/lib/studies";
import { REPORT_TEXT, usePrefs, type ReportSize } from "@/lib/prefs";

const draftKey = (id: number) => `report-draft:${id}`;

function readDraft(id: number): { text: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as { text: string; ts: number }) : null;
  } catch {
    return null;
  }
}

export default function ReportEditor({
  study: s,
  serviceNames,
  onClose,
}: {
  study: StudyInfo;
  serviceNames: Record<string, string>;
  onClose: () => void;
}) {
  const original = s.description ?? "";
  const [text, setText] = useState(() => readDraft(s.id)?.text ?? original);
  const [draftAt, setDraftAt] = useState<number | null>(() => readDraft(s.id)?.ts ?? null);
  const [copied, setCopied] = useState(false);
  const { prefs, update } = usePrefs();
  const ref = useRef<HTMLTextAreaElement>(null);
  const changed = text !== original;

  // pole roste s textem – žádné malé okénko s posuvníkem
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 360)}px`;
  }, [text, prefs.reportSize]);

  // koncept do prohlížeče 600 ms po psaní
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (changed) {
          const ts = Date.now();
          localStorage.setItem(draftKey(s.id), JSON.stringify({ text, ts }));
          setDraftAt(ts);
        } else {
          localStorage.removeItem(draftKey(s.id));
          setDraftAt(null);
        }
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [text, changed, s.id]);

  useEffect(() => ref.current?.focus(), []);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const p = s.patientDataInfo;
  const age = ageYears(p?.birthDate);

  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      ref.current?.select(); // bez oprávnění ke schránce aspoň označit text
    }
    window.open(legacyStudyEditUrl(s.id, s.pid), "_blank", "noreferrer");
  };

  const close = () => {
    if (changed && !copied && !window.confirm("Popis je jen v konceptu tohoto prohlížeče. Zavřít? (Koncept zůstane uložený.)")) return;
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <section aria-label="Popis studie" className="min-w-0">
        {/* lišta */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-base font-semibold">{original ? "Upravit popis" : "Popsat studii"}</h2>
          <Segmented<ReportSize>
            size="sm"
            label="Velikost písma"
            value={prefs.reportSize}
            onChange={(reportSize) => update({ reportSize })}
            options={[
              { value: "s", label: <span className="text-[12px]">A</span> },
              { value: "m", label: <span className="text-[14px]">A</span> },
              { value: "l", label: <span className="text-[16px]">A</span> },
            ]}
          />
          <span className="text-[12px] text-ui-muted tabular-nums" aria-live="polite">
            {words} {words === 1 ? "slovo" : words >= 2 && words <= 4 ? "slova" : "slov"} · {text.length} znaků
            {draftAt && ` · koncept uložen ${new Date(draftAt).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })}`}
          </span>
          {changed && original && (
            <button
              type="button"
              onClick={() => window.confirm("Vrátit původní popis a zahodit úpravy?") && setText(original)}
              className="inline-flex items-center gap-1 text-[12px] text-ui-primary hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Vrátit původní
            </button>
          )}
        </div>

        {/* papír – sloupec ~72 znaků, ať se dlouhý text dobře čte */}
        <div className="ui-paper cursor-text px-4 py-5 sm:px-8 sm:py-7" onClick={() => ref.current?.focus()}>
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCopied(false);
            }}
            lang="cs"
            spellCheck
            aria-label="Text popisu"
            placeholder="Popis vyšetření…"
            className={cn("ui-paper-text mx-auto max-w-[72ch]", REPORT_TEXT[prefs.reportSize])}
          />
        </div>

        {/* akce */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-[16rem] flex-1 text-[12px] text-ui-muted">
            {copied ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700 dark:text-emerald-300" role="status">
                <Check className="h-4 w-4" /> Zkopírováno – ve staré kartotéce vložte Ctrl + V a uložte
              </span>
            ) : (
              "Uložení přímo z Kartotéky čeká na backend – zatím popis vložte do staré kartotéky (Ctrl + V)."
            )}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={close}>
              <X /> Zavřít
            </Button>
            <Button onClick={copyAndOpen} disabled={!text.trim()}>
              <ClipboardCopy /> Zkopírovat a otevřít ve staré kartotéce
            </Button>
          </div>
        </div>
      </section>

      {/* souvislosti při psaní */}
      <aside aria-label="Souvislosti" className="ui-tile h-fit space-y-3 p-4 xl:sticky xl:top-4">
        <div>
          <div className="text-[15px] font-semibold leading-snug">{patientName(s)}</div>
          <div className="text-[13px] text-ui-muted">
            {formatRc(s.pid)}
            {age !== null && ` · ${age} let`}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <ModalityTag modality={s.idMedicalServiceCategory} /> {formatDateTime(s.studyDate)}
        </div>
        <dl className="divide-y divide-ui-rule">
          <DataRow label="Diagnóza">
            {s.idMedicalDiagnosisRequested && (
              <span title={s.medicalDiagnosisRequestedInfo?.description}>
                {s.idMedicalDiagnosisRequested} {s.medicalDiagnosisRequestedInfo?.description}
              </span>
            )}
          </DataRow>
          <DataRow label="Odesílající">{s.medicalInstitutionRequestedInfo?.description}</DataRow>
        </dl>
        {(s.studyServiceInfo ?? []).length > 0 && (
          <div>
            <div className="mb-1 text-[12px] text-ui-muted">Výkony</div>
            <ul className="space-y-0.5 text-[13px]">
              {(s.studyServiceInfo ?? []).map((v) => (
                <li key={v.id} className="flex gap-2">
                  <span className="text-ui-muted">{v.idMedicalService}</span>
                  <span className="min-w-0 truncate">{serviceNames[v.idMedicalService] ?? ""}</span>
                  {(v.serviceCount ?? 1) > 1 && <span className="text-ui-muted">{v.serviceCount}×</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.remark && (
          <div className="rounded-md border border-ui-line bg-ui-raised px-3 py-2 text-[13px]">
            <div className="text-[12px] text-ui-muted">Poznámka</div>
            <p className="whitespace-pre-wrap">{s.remark}</p>
          </div>
        )}
      </aside>
    </motion.div>
  );
}

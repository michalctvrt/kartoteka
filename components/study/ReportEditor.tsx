"use client";

/**
 * Psaní popisu studie – plocha stavěná na dlouhé čtení a přepisování:
 *   krémový „papír“ s psacími linkami (ne bílý – neoslňuje), teplý tmavý text, řádek max ~72 znaků,
 *   řádkování 1,75, písmo S/M/L (pamatuje se – lib/prefs.ts), pole roste s textem, pravopis česky.
 * Vedle panel: Šablony (ReportTemplates) · Předchozí vyšetření (PriorStudies) · Pacient (souvislosti).
 * Rychlé vkládání: „//“ + název šablony, nebo zkratka + Tab.
 * Koncept se průběžně ukládá v prohlížeči. Z pracovního seznamu „K popisu“ → „Další na řadě“.
 *
 * Uložení: backend popis (description) zatím přes API neumí (viz lib/legacy.ts) →
 * „Zkopírovat a otevřít ve staré kartotéce“ – lékař text jen vloží (Ctrl+V) a uloží tam.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, ClipboardCopy, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DataRow } from "@/components/ui/bento";
import { ModalityTag } from "@/components/study/StudyBits";
import ReportTemplates from "@/components/study/ReportTemplates";
import PriorStudies from "@/components/study/PriorStudies";
import { useSession } from "@/components/auth/SessionProvider";
import type { StudyInfo } from "@/lib/api/generated/models/StudyInfo";
import { legacyStudyEditUrl } from "@/lib/legacy";
import { ageYears } from "@/lib/study/card-check";
import { formatDateTime, formatRc, patientName } from "@/lib/studies";
import { REPORT_TEXT, usePrefs, type ReportSize } from "@/lib/prefs";
import { dropFromQueue, nextInQueue } from "@/lib/reportQueue";
import { fold, matchTemplate, useTemplates } from "@/lib/templates/useTemplates";
import type { ReportTemplate } from "@/lib/templates/types";
import { studyHref } from "@/lib/routes";

const draftKey = (id: number) => `report-draft:${id}`;
type Panel = "templates" | "prior" | "patient";

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
  const router = useRouter();
  const { user } = useSession();
  const original = s.description ?? "";
  const [text, setText] = useState(() => readDraft(s.id)?.text ?? original);
  const [draftAt, setDraftAt] = useState<number | null>(() => readDraft(s.id)?.ts ?? null);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<Panel>("templates");
  const [priorCount, setPriorCount] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ at: number } | null>(null); // „//“ rychlé hledání šablony
  const { prefs, update } = usePrefs();
  const { templates } = useTemplates();
  const ref = useRef<HTMLTextAreaElement>(null);
  const sel = useRef({ start: text.length, end: text.length }); // poslední pozice kurzoru (panel bere fokus)
  const [queue] = useState(() => nextInQueue(s.id));
  const changed = text !== original;

  // pole roste s textem – žádné malé okénko s posuvníkem (min. 10 řádků)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const min = parseFloat(getComputedStyle(el).lineHeight) * 10;
    el.style.height = `${Math.max(el.scrollHeight, min)}px`;
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

  const remember = () => {
    const el = ref.current;
    if (el) sel.current = { start: el.selectionStart, end: el.selectionEnd };
  };

  /** Vloží text na místo kurzoru (nebo místo `range`); zachová Ctrl+Z. */
  const insert = useCallback((t: string, range?: { start: number; end: number }) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const { start, end } = range ?? sel.current;
    el.setSelectionRange(start, end);
    // víceřádková šablona doprostřed řádku → začít na novém řádku
    const before = el.value.slice(0, start);
    const piece = t.includes("\n") && before && !before.endsWith("\n") ? `\n${t}` : t;
    if (!document.execCommand("insertText", false, piece)) {
      setText(el.value.slice(0, start) + piece + el.value.slice(end));
      requestAnimationFrame(() => el.setSelectionRange(start + piece.length, start + piece.length));
    }
    sel.current = { start: start + piece.length, end: start + piece.length };
    setCopied(false);
  }, []);

  const byShortcut = useMemo(() => {
    const m = new Map<string, ReportTemplate>();
    // vlastní šablony mají přednost před společnými (zapíšou se poslední)
    (templates ?? [])
      .filter((t) => t.shortcut)
      .sort((a, b) => Number(a.owner === user?.id) - Number(b.owner === user?.id))
      .forEach((t) => m.set(fold(t.shortcut!), t));
    return m;
  }, [templates, user?.id]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    const el = e.currentTarget;
    const start = el.selectionStart;
    const word = /(\S+)$/.exec(el.value.slice(0, start))?.[1];
    const t = word && byShortcut.get(fold(word));
    if (!word || !t) return; // bez zkratky – Tab normálně přejde dál
    e.preventDefault();
    insert(t.text, { start: start - word.length, end: start });
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const age = ageYears(s.patientDataInfo?.birthDate);

  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      dropFromQueue(s.id);
    } catch {
      ref.current?.select(); // bez oprávnění ke schránce aspoň označit text
    }
    window.open(legacyStudyEditUrl(s.id, s.pid), "_blank", "noreferrer");
  };

  const confirmLeave = () => !changed || copied || window.confirm("Popis je zatím jen v konceptu tohoto prohlížeče (koncept zůstane uložený). Pokračovat?");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,52rem)_minmax(20rem,26rem)]"
    >
      <section aria-label="Popis studie" className="min-w-0">
        {/* lišta */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-base font-semibold">{original ? "Upravit popis" : "Popsat studii"}</h2>
          {queue && (
            <span className="rounded-md border border-ui-line px-2 py-0.5 text-[12px] text-ui-muted">
              Zbývá popsat {queue.total - queue.position + 1}
            </span>
          )}
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
            {words} {words === 1 ? "slovo" : words >= 2 && words <= 4 ? "slova" : "slov"}
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

        {/* papír s linkami – sloupec ~72 znaků */}
        <div className="ui-paper relative cursor-text px-5 py-4 sm:px-8 sm:py-6" onClick={(e) => e.target === e.currentTarget && ref.current?.focus()}>
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              const at = e.target.selectionStart;
              setText(v);
              setCopied(false);
              // „//“ na začátku slova → rychlé hledání šablony (http:// apod. ne)
              if (v.slice(at - 2, at) === "//" && (at === 2 || /\s/.test(v[at - 3]))) setPicker({ at });
            }}
            onKeyDown={onKeyDown}
            onSelect={remember}
            onBlur={remember}
            lang="cs"
            spellCheck
            aria-label="Text popisu"
            placeholder="Popis vyšetření…   (// = šablona)"
            className={cn("ui-paper-text ui-paper-lines max-w-[72ch]", REPORT_TEXT[prefs.reportSize])}
          />
          {picker && (
            <QuickPicker
              templates={templates ?? []}
              modality={s.idMedicalServiceCategory ?? null}
              userId={user?.id}
              onClose={() => {
                setPicker(null);
                ref.current?.focus();
              }}
              onPick={(t) => {
                setPicker(null);
                insert(t.text, { start: picker.at - 2, end: picker.at });
              }}
            />
          )}
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
          <div className="flex shrink-0 flex-wrap gap-2">
            {queue ? (
              <Button variant="outline" asChild>
                <Link href="/doctor/reports" onClick={(e) => !confirmLeave() && e.preventDefault()}>
                  <X /> Seznam
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => confirmLeave() && onClose()}>
                <X /> Zavřít
              </Button>
            )}
            <Button onClick={copyAndOpen} disabled={!text.trim()} variant={copied && queue?.next ? "outline" : "default"}>
              <ClipboardCopy /> Zkopírovat a otevřít ve staré kartotéce
            </Button>
            {queue?.next && (
              <Button variant={copied ? "default" : "outline"} onClick={() => confirmLeave() && queue.next && router.push(studyHref(queue.next, { write: true }))}>
                Další na řadě <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* panel vedle psaní */}
      <aside aria-label="Pomocník k popisu" className="ui-tile space-y-3 p-4 xl:sticky xl:top-4">
        <Segmented<Panel>
          size="sm"
          label="Panel"
          value={panel}
          onChange={setPanel}
          options={[
            { value: "templates", label: "Šablony" },
            { value: "prior", label: `Předchozí${priorCount ? ` ${priorCount}` : ""}` },
            { value: "patient", label: "Pacient" },
          ]}
        />
        {/* předchozí se načítají hned (kvůli počtu), jen se skrývají */}
        <div hidden={panel !== "prior"}>
          <PriorStudies study={s} onInsert={insert} onCount={setPriorCount} />
        </div>
        {panel === "templates" && (
          <ReportTemplates
            modality={s.idMedicalServiceCategory ?? null}
            onInsert={insert}
            takeText={() => {
              const { start, end } = sel.current;
              return end > start ? text.slice(start, end) : text;
            }}
          />
        )}
        {panel === "patient" && <PatientContext study={s} serviceNames={serviceNames} age={age} />}
      </aside>
    </motion.div>
  );
}

/** „//“ v textu → malé hledání šablony; šipky + Enter, Esc zavře. */
function QuickPicker({
  templates,
  modality,
  userId,
  onPick,
  onClose,
}: {
  templates: ReportTemplate[];
  modality: string | null;
  userId?: string;
  onPick: (t: ReportTemplate) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const hits = templates
    .filter((t) => (!t.modality || !modality || t.modality === modality) && matchTemplate(t, q.trim()))
    .sort((a, b) => Number(b.owner === userId) - Number(a.owner === userId))
    .slice(0, 8);
  return (
    <div className="absolute inset-x-4 top-3 z-20 overflow-hidden rounded-lg border border-ui-line bg-ui-sheet shadow-xl sm:inset-x-auto sm:right-4 sm:w-96">
      <input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setI(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            setI((x) => Math.min(x + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setI((x) => Math.max(x - 1, 0));
          } else if (e.key === "Enter" && hits[i]) {
            e.preventDefault();
            onPick(hits[i]);
          }
        }}
        onBlur={onClose}
        placeholder={`Šablona${modality ? ` ${modality}` : ""}…`}
        aria-label="Rychlé hledání šablony"
        className="w-full border-b border-ui-line bg-transparent px-3 py-2 text-sm outline-none"
      />
      {hits.length ? (
        <ul role="listbox" aria-label="Nalezené šablony" className="max-h-72 overflow-y-auto py-1 text-[13px]">
          {hits.map((t, k) => (
            <li key={t.id} role="option" aria-selected={k === i}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(t);
                }}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left", k === i ? "bg-ui-active" : "hover:bg-ui-raised")}
              >
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                {t.shortcut && <kbd className="rounded border border-ui-line px-1 font-sans text-[11px] text-ui-muted">{t.shortcut}</kbd>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-2 text-[13px] text-ui-faint">Nic nenalezeno</p>
      )}
    </div>
  );
}

function PatientContext({ study: s, serviceNames, age }: { study: StudyInfo; serviceNames: Record<string, string>; age: number | null }) {
  return (
    <div className="space-y-3">
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
    </div>
  );
}

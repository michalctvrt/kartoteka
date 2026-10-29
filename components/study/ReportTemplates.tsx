"use client";

/**
 * Panel šablon v psaní popisu.
 *   Filtr modality (výchozí = modalita studie), Moje / Všechny, hledání (název, zkratka, text).
 *   Klik → náhled. „Vložit“ vloží celou šablonu na místo kurzoru, „Vložit označené“ jen část,
 *   kterou lékař v náhledu označí myší (šablony ze staré kartotéky mají často víc variant za sebou).
 *   Úpravy: název, modalita, zkratka (zkratka + Tab v textu šablonu rozbalí), text. „Uložit jako šablonu“
 *   vezme označený text popisu (nebo celý).
 */

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/components/auth/SessionProvider";
import { employeeName } from "@/lib/auth/types";
import { matchTemplate, useTemplates } from "@/lib/templates/useTemplates";
import { SHORTCUT_RE, type ReportTemplate, type TemplateInput } from "@/lib/templates/types";

type Scope = "mine" | "all";

export default function ReportTemplates({
  modality,
  onInsert,
  takeText,
}: {
  modality: string | null;
  onInsert: (text: string) => void;
  /** text pro „Uložit jako šablonu“ (označený, jinak celý popis) */
  takeText: () => string;
}) {
  const { user } = useSession();
  const { templates, error, save, remove } = useTemplates();
  const [mod, setMod] = useState<string | null>(modality);
  const [scope, setScope] = useState<Scope | null>(null);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<ReportTemplate> | null>(null);
  const preview = useRef<HTMLDivElement>(null);

  const mineCount = (templates ?? []).filter((t) => t.owner && t.owner === user?.id).length;
  const sc: Scope = scope ?? (mineCount ? "mine" : "all");
  const list = useMemo(
    () =>
      (templates ?? []).filter(
        (t) => (!mod || !t.modality || t.modality === mod) && (sc === "all" || t.owner === user?.id) && matchTemplate(t, q.trim())
      ),
    [templates, mod, sc, q, user?.id]
  );

  const selectedPart = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !preview.current?.contains(sel.anchorNode)) return "";
    return sel.toString();
  };
  const canEdit = (t: ReportTemplate) => !t.owner || t.owner === user?.id || !!user?.roles.includes("admin");

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<string | null>
          size="sm"
          label="Modalita šablon"
          value={mod}
          onChange={setMod}
          options={[
            { value: null, label: "Vše" },
            { value: "RTG", label: "RTG" },
            { value: "UZ", label: "UZ" },
            { value: "MRI", label: "MRI" },
          ]}
        />
        <Segmented<Scope>
          size="sm"
          label="Čí šablony"
          value={sc}
          onChange={setScope}
          options={[
            { value: "mine", label: `Moje${mineCount ? ` ${mineCount}` : ""}` },
            { value: "all", label: "Všechny" },
          ]}
        />
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat šablonu (název, zkratka, text)" aria-label="Hledat šablonu" className="ui-input pl-8" />
      </label>

      {error ? (
        <p className="text-[13px] text-red-700 dark:text-red-300">Šablony se nepodařilo načíst: {error}</p>
      ) : !templates ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : !list.length ? (
        <Ghost label={sc === "mine" ? "Zatím žádné vlastní šablony" : "Nic nenalezeno"} />
      ) : (
        <ul className="-mx-1 max-h-[60vh] space-y-0.5 overflow-y-auto px-1">
          {list.map((t, i) => {
            const open = openId === t.id;
            return (
              <motion.li key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.012 }}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : t.id)}
                  onDoubleClick={() => onInsert(t.text)}
                  aria-expanded={open}
                  title="Klik = náhled, dvojklik = vložit"
                  className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-ui-raised", open && "bg-ui-active")}
                >
                  {!mod && t.modality && <span className="w-8 shrink-0 text-[11px] text-ui-muted">{t.modality}</span>}
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  {t.shortcut && <kbd className="shrink-0 rounded border border-ui-line px-1 font-sans text-[11px] text-ui-muted">{t.shortcut}</kbd>}
                </button>
                {open && (
                  <div className="mb-2 mt-1 space-y-2">
                    <div ref={preview} className="ui-paper max-h-72 overflow-y-auto whitespace-pre-wrap px-3 py-2 text-[13px] leading-relaxed">
                      {t.text}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" onClick={() => onInsert(t.text)}>
                        Vložit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onMouseDown={(e) => e.preventDefault() /* nezrušit označení v náhledu */}
                        onClick={() => {
                          const part = selectedPart();
                          if (part) onInsert(part);
                          else window.alert("Nejdřív v náhledu označte myší část textu, kterou chcete vložit.");
                        }}
                      >
                        Vložit označené
                      </Button>
                      <span className="ml-auto flex">
                        {canEdit(t) && (
                          <>
                            <Button size="sm" variant="ghost" aria-label={`Upravit šablonu ${t.name}`} onClick={() => setEditing(t)}>
                              <Pencil />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Smazat šablonu ${t.name}`}
                              onClick={() => window.confirm(`Smazat šablonu „${t.name}“?`) && remove(t.id).catch((e: Error) => window.alert(e.message))}
                            >
                              <Trash2 />
                            </Button>
                          </>
                        )}
                      </span>
                    </div>
                    {t.ownerName && <p className="text-[11px] text-ui-faint">{t.ownerName}</p>}
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setEditing({ text: takeText(), modality, owner: user?.id ?? null, ownerName: user ? employeeName(user) : null })}
      >
        <Plus /> Uložit jako šablonu
      </Button>
      <p className="text-[11px] leading-snug text-ui-faint">
        Rychle: v textu napište <kbd className="font-sans">{"//"}</kbd> a název šablony, nebo zkratku a <kbd className="font-sans">Tab</kbd>.
      </p>

      {editing && (
        <TemplateDialog
          key={editing.id ?? "new"}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            await save(input, editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateDialog({ initial, onClose, onSave }: { initial: Partial<ReportTemplate>; onClose: () => void; onSave: (i: TemplateInput) => Promise<void> }) {
  const [f, setF] = useState<TemplateInput>({
    owner: initial.owner ?? null,
    ownerName: initial.ownerName ?? null,
    modality: initial.modality ?? null,
    name: initial.name ?? "",
    shortcut: initial.shortcut ?? "",
    text: initial.text ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<TemplateInput>) => setF((x) => ({ ...x, ...p }));
  const badShortcut = !!f.shortcut && !SHORTCUT_RE.test(f.shortcut);
  const label = "mb-1 block text-[13px] text-ui-muted";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial.id ? "Upravit šablonu" : "Nová šablona"}</DialogTitle>
          <DialogDescription>Šablona se vloží na místo kurzoru v popisu.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              await onSave({ ...f, shortcut: f.shortcut?.trim() || null });
            } catch (x) {
              setErr((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_9rem]">
            <label className="block">
              <span className={label}>Název</span>
              <input className="ui-input" value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
            </label>
            <div>
              <span className={label}>Modalita</span>
              <Segmented<string | null>
                size="sm"
                label="Modalita"
                value={f.modality}
                onChange={(modality) => set({ modality })}
                options={[
                  { value: null, label: "Vše" },
                  { value: "RTG", label: "RTG" },
                  { value: "UZ", label: "UZ" },
                  { value: "MRI", label: "MRI" },
                ]}
              />
            </div>
            <label className="block">
              <span className={label}>Zkratka</span>
              <input className="ui-input" value={f.shortcut ?? ""} onChange={(e) => set({ shortcut: e.target.value.replace(/\s/g, "") })} placeholder="např. rtgs" aria-invalid={badShortcut} />
            </label>
          </div>
          <label className="block">
            <span className={label}>Text</span>
            <textarea className="ui-paper ui-paper-text ui-paper-lines min-h-[16rem] px-4 py-3 text-[15px] leading-[1.75em]" value={f.text} onChange={(e) => set({ text: e.target.value })} lang="cs" spellCheck />
          </label>
          {(badShortcut || err) && <p className="text-[13px] text-red-700 dark:text-red-300">{err ?? "Zkratka: 2–16 znaků bez mezer (písmena, číslice, tečka, pomlčka)."}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit" disabled={busy || badShortcut || !f.name.trim() || !f.text.trim()}>
              {busy && <Loader2 className="animate-spin" />} Uložit šablonu
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

/**
 * Spotřební materiál – katalog položek (převzato z /opt/testapp → /spotreba/katalog).
 * Jen admin (oprávnění supplies.catalog) + PIN správy, který ověří backend (PIN si drží jen tato záložka).
 * Úpravy jdou přes bránu – na ostrých datech je zápis zatím vypnutý (423 → upozornění).
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SuppliesTabs from "@/components/supplies/SuppliesTabs";
import { SpotrebaError, spotreba, type ItemInput } from "@/lib/spotreba/api";
import { CATEGORIES, CATEGORY_NAME, GROUPS, GROUP_NAME, type Category, type Item } from "@/lib/spotreba/types";

const PIN_KEY = "kartoteka_spotreba_pin";
const lockedMsg = "Úpravy katalogu jsou v Kartotéce zatím vypnuté – katalog se dál spravuje v původní aplikaci.";

export default function SuppliesCatalogPage() {
  const [pin, setPin] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(PIN_KEY);
    } catch {
      return null;
    }
  });
  const [items, setItems] = useState<Item[] | null>(null);
  const [tab, setTab] = useState<Category>("MAKRO");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!pin) return;
    spotreba.items(true).then(setItems).catch(() => setItems([]));
  }, [pin]);

  if (!pin) return <PinGate onOk={(p) => setPin(p)} />;

  const list = (items ?? []).filter((i) => i.category === tab);
  const toggle = async (it: Item) => {
    setNotice(null);
    try {
      const upd = await spotreba.updateItem(pin, it.id, { active: it.active ? 0 : 1 });
      setItems((l) => l?.map((x) => (x.id === upd.id ? upd : x)) ?? l);
    } catch (e) {
      handleErr(e);
    }
  };
  const handleErr = (e: unknown) => {
    if (e instanceof SpotrebaError && e.status === 401) {
      try {
        sessionStorage.removeItem(PIN_KEY);
      } catch {}
      setPin(null);
    } else setNotice(e instanceof SpotrebaError && e.locked ? lockedMsg : (e as Error).message);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Katalog materiálu</h1>
          <p className="mt-1 text-sm text-ui-muted">Co si pobočky můžou objednat</p>
        </div>
        <SuppliesTabs />
      </header>

      {notice && (
        <p role="status" className="rounded-lg border border-amber-200 px-3 py-2 text-[13px] text-amber-800 dark:border-amber-900 dark:text-amber-200">
          {notice}
        </p>
      )}

      <Bento>
        {CATEGORIES.map((c, i) => {
          const all = (items ?? []).filter((x) => x.category === c);
          return (
            <BentoTile key={c} index={i} className={cn("transition-colors", tab === c && "border-ui-primary")}>
              <button type="button" onClick={() => setTab(c)} aria-pressed={tab === c} className="block w-full text-left">
                <div className="mb-2 text-[13px] font-medium text-ui-muted">{CATEGORY_NAME[c]}</div>
                {!items ? <Skeleton className="h-7 w-10" /> : <Metric value={all.filter((x) => x.active).length} sub={all.some((x) => !x.active) ? `${all.filter((x) => !x.active).length} skrytých` : "aktivních položek"} />}
              </button>
            </BentoTile>
          );
        })}
        <BentoTile index={3} title="Nová položka">
          <Button className="mt-1 w-full" onClick={() => setEditing("new")}>
            <Plus /> Přidat do katalogu
          </Button>
        </BentoTile>

        <BentoTile span={4} index={4} title={<span className="text-ui-ink">{CATEGORY_NAME[tab]}</span>} bodyClassName="px-0 pb-1">
          {!items ? (
            <div className="space-y-2 px-4 py-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !list.length ? (
            <Ghost label="Kategorie je prázdná" className="px-4 py-4" />
          ) : (
            GROUPS.map((g) => {
              const rows = list.filter((i) => (i.item_group ?? "OSTATNI") === g).sort((a, b) => a.sort_order - b.sort_order);
              if (!rows.length) return null;
              return (
                <section key={g} aria-label={GROUP_NAME[g]}>
                  <h3 className="bg-ui-raised px-4 py-1.5 text-[12px] font-medium text-ui-muted">{GROUP_NAME[g]}</h3>
                  <ul className="divide-y divide-ui-rule">
                    {rows.map((it, i) => (
                      <motion.li
                        key={it.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + Math.min(i, 15) * 0.015 }}
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-2 text-sm md:grid-cols-[minmax(12rem,28rem)_8rem_12rem_auto] md:justify-start",
                          "relative transition-colors hover:bg-ui-raised focus-within:bg-ui-raised before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-r before:bg-transparent before:transition-colors hover:before:bg-brand-400 focus-within:before:bg-brand-500",
                          !it.active && "opacity-55"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{it.name}</span>
                          {it.pack_note && <span className="block truncate text-[12px] text-ui-muted">{it.pack_note}</span>}
                        </span>
                        <span className="hidden text-ui-muted md:block">{it.unit}</span>
                        <span className="hidden text-[13px] text-ui-muted md:block">{it.pack_size ? `${it.pack_size} ${it.piece_unit || "ks"} v balení` : ""}</span>
                        <span className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(it)} aria-label={`Upravit ${it.name}`}>
                            <Pencil />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggle(it)} aria-label={it.active ? `Skrýt ${it.name}` : `Vrátit ${it.name}`}>
                            {it.active ? <EyeOff /> : <Eye />}
                          </Button>
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </BentoTile>
      </Bento>

      {editing && (
        <ItemDialog
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          category={tab}
          nextSort={Math.max(0, ...list.map((i) => i.sort_order)) + 10}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            try {
              const saved = editing === "new" ? await spotreba.createItem(pin, input) : await spotreba.updateItem(pin, editing.id, input);
              setItems((l) => (l ? (l.some((x) => x.id === saved.id) ? l.map((x) => (x.id === saved.id ? saved : x)) : [...l, saved]) : [saved]));
              setEditing(null);
            } catch (e) {
              setEditing(null);
              handleErr(e);
            }
          }}
        />
      )}
    </div>
  );
}

function PinGate({ onOk }: { onOk: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Katalog materiálu</h1>
        <SuppliesTabs />
      </header>
      <form
        className="ui-tile mx-auto mt-6 max-w-sm space-y-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await spotreba.adminCheck(pin);
            try {
              sessionStorage.setItem(PIN_KEY, pin);
            } catch {}
            onOk(pin);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex items-center gap-2 font-medium">
          <KeyRound className="h-4 w-4 text-ui-muted" /> PIN správy katalogu
        </div>
        <p className="text-[13px] text-ui-muted">Stejný PIN jako v původní aplikaci. Platí jen do zavření této záložky.</p>
        <input type="password" autoFocus inputMode="numeric" aria-label="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="ui-input" />
        {error && <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy || !pin}>
          {busy && <Loader2 className="animate-spin" />} Pokračovat
        </Button>
      </form>
    </div>
  );
}

function ItemDialog({
  item,
  category,
  nextSort,
  onClose,
  onSave,
}: {
  item: Item | null;
  category: Category;
  nextSort: number;
  onClose: () => void;
  onSave: (i: ItemInput) => Promise<void>;
}) {
  const [f, setF] = useState<ItemInput>({
    category: item?.category ?? category,
    itemGroup: item?.item_group ?? "OSTATNI",
    name: item?.name ?? "",
    unit: item?.unit ?? "ks",
    packNote: item?.pack_note ?? "",
    packSize: item?.pack_size ?? "",
    pieceUnit: item?.piece_unit ?? "",
    sortOrder: item?.sort_order ?? nextSort,
  });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<ItemInput>) => setF((x) => ({ ...x, ...p }));
  const label = "mb-1 block text-[13px] text-ui-muted";
  const dupNote = f.packSize && f.packNote.includes(String(f.packSize));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Upravit položku" : "Nová položka"}</DialogTitle>
          <DialogDescription>Náhled: {f.name || "…"} – {f.packSize ? `balení po ${f.packSize} ${f.pieceUnit || "ks"}` : f.unit}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await onSave(f);
            setBusy(false);
          }}
        >
          <label className="block">
            <span className={label}>Název</span>
            <input className="ui-input" value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className={label}>Kategorie</span>
              <Segmented<Category> size="sm" label="Kategorie" value={f.category} onChange={(category) => set({ category })} options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_NAME[c] }))} />
            </div>
            <label className="block">
              <span className={label}>Skupina</span>
              <select className="ui-input" value={f.itemGroup} onChange={(e) => set({ itemGroup: e.target.value })}>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_NAME[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Jednotka</span>
              <input className="ui-input" value={f.unit} onChange={(e) => set({ unit: e.target.value })} />
            </label>
            <label className="block">
              <span className={label}>Poznámka k balení</span>
              <input className="ui-input" value={f.packNote} onChange={(e) => set({ packNote: e.target.value })} placeholder="např. 500 ml" />
            </label>
            <label className="block">
              <span className={label}>Kusů v balení</span>
              <input className="ui-input" inputMode="numeric" value={f.packSize} onChange={(e) => set({ packSize: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : "" })} placeholder="nechte prázdné" />
            </label>
            <label className="block">
              <span className={label}>Jak se jmenuje kus</span>
              <input className="ui-input" value={f.pieceUnit} onChange={(e) => set({ pieceUnit: e.target.value })} placeholder="např. role" disabled={!f.packSize} />
            </label>
          </div>
          {dupNote && <p className="text-[12px] text-amber-800 dark:text-amber-200">Poznámka opakuje počet kusů v balení – stačí jedno.</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit" disabled={busy || !f.name.trim()}>
              {busy && <Loader2 className="animate-spin" />} {item ? "Uložit" : "Přidat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

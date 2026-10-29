"use client";

/**
 * Spotřební materiál – objednávka pobočky na měsíc (převzato z /opt/testapp → /spotreba).
 *   Bento: kroky Makro / Sklad Vídeňská / Objednat online (= záložky s počty) · Stav + Dokončit
 *          → položky kroku po skupinách (hledání, balení/kusy, poznámka) + položky mimo katalog
 * Ukládá se samo (900 ms po změně). Uzavřít může kdokoli, odemknout jen admin (Souhrn, PIN).
 * Na ostrých datech je zápis zatím vypnutý (brána vrací 423) → ukáže se upozornění.
 * Oprava proti originálu: řádky s položkou, která se mezitím skryla z katalogu, se při uložení neztratí.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Lock, Minus, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SuppliesTabs, { WriteLockedNotice } from "@/components/supplies/SuppliesTabs";
import { useSession } from "@/components/auth/SessionProvider";
import { employeeName } from "@/lib/auth/types";
import { SpotrebaError, spotreba } from "@/lib/spotreba/api";
import {
  CATEGORIES,
  CATEGORY_HINT,
  CATEGORY_NAME,
  GROUPS,
  GROUP_NAME,
  currentPeriod,
  formatPeriod,
  type Branch,
  type Category,
  type Item,
  type LineInput,
  type Order,
  type OrderLine,
  type UnitMode,
} from "@/lib/spotreba/types";

const BRANCH_KEY = "kartoteka_spotreba_branch";
type Entry = { qty: number; unitMode: UnitMode; note: string };
type Custom = { key: string; name: string; category: Category; qty: number; note: string };

export default function SuppliesOrderPage() {
  const { user } = useSession();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [period, setPeriod] = useState(currentPeriod);
  const [order, setOrder] = useState<Order | null>(null);
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [customs, setCustoms] = useState<Custom[]>([]);
  const [hiddenLines, setHiddenLines] = useState<OrderLine[]>([]); // řádky skrytých položek – zachovat
  const [loadState, setLoadState] = useState<"loading" | "ok" | "locked-write" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Category>("MAKRO");
  const [q, setQ] = useState("");
  const [save, setSave] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [finishOpen, setFinishOpen] = useState(false);
  const dirty = useRef(false);

  // pobočky a katalog (čtení – na ostrých datech v pořádku)
  useEffect(() => {
    Promise.all([spotreba.branches(), spotreba.items()])
      .then(([b, it]) => {
        setBranches(b);
        setItems(it);
        let saved: number | null = null;
        try {
          saved = Number(localStorage.getItem(BRANCH_KEY)) || null;
        } catch {}
        setBranchId(b.some((x) => x.id === saved) ? saved : b[0]?.id ?? null);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoadState("error");
      });
  }, []);

  const branch = branches?.find((b) => b.id === branchId) ?? null;
  const steps = CATEGORIES.filter((c) => !(c === "SKLAD" && branch?.is_warehouse)); // sklad si sám neobjednává

  // objednávka pobočky na měsíc
  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    dirty.current = false;
    spotreba
      .order(branchId, period)
      .then(({ order: o, lines }) => {
        if (cancelled) return;
        const activeIds = new Set(items.map((i) => i.id));
        const e: Record<number, Entry> = {};
        const c: Custom[] = [];
        const hidden: OrderLine[] = [];
        for (const l of lines) {
          if (l.item_id && activeIds.has(l.item_id)) e[l.item_id] = { qty: l.qty, unitMode: l.unit_mode, note: l.note ?? "" };
          else if (l.item_id) hidden.push(l);
          else c.push({ key: `c${l.id}`, name: l.custom_name ?? "", category: l.category, qty: l.qty, note: l.note ?? "" });
        }
        setOrder(o);
        setEntries(e);
        setCustoms(c);
        setHiddenLines(hidden);
        setSave("idle");
        setLoadState("ok");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SpotrebaError && err.locked) setLoadState("locked-write");
        else {
          setError((err as Error).message);
          setLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, period, items]);

  const payload = useCallback((): LineInput[] => {
    const lines: LineInput[] = [];
    for (const [id, e] of Object.entries(entries)) if (e.qty > 0) lines.push({ itemId: Number(id), qty: e.qty, unitMode: e.unitMode, note: e.note || null });
    for (const c of customs) if (c.qty > 0 && c.name.trim()) lines.push({ customName: c.name.trim(), category: c.category, qty: c.qty, note: c.note || null });
    for (const h of hiddenLines) lines.push({ itemId: h.item_id!, qty: h.qty, unitMode: h.unit_mode, note: h.note }); // oprava originálu
    return lines;
  }, [entries, customs, hiddenLines]);

  const persist = useCallback(async () => {
    if (!order) return;
    setSave("saving");
    try {
      await spotreba.saveOrder(order.id, payload());
      dirty.current = false;
      setSave("saved");
    } catch (e) {
      setSave("error");
      setError((e as Error).message);
    }
  }, [order, payload]);

  // autosave 900 ms po poslední změně
  useEffect(() => {
    if (!dirty.current || order?.status !== "open") return;
    const t = setTimeout(persist, 900);
    return () => clearTimeout(t);
  }, [entries, customs, persist, order?.status]);

  // varovat při zavření s neuloženou změnou
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const touch = () => {
    dirty.current = true;
    setSave("pending");
  };
  const setEntry = (id: number, patch: Partial<Entry>) => {
    touch();
    setEntries((p) => {
      const base: Entry = p[id] ?? { qty: 0, unitMode: "pack", note: "" };
      return { ...p, [id]: { ...base, ...patch } };
    });
  };

  const locked = order?.status === "locked";
  const countIn = (c: Category) =>
    items.filter((i) => i.category === c && (entries[i.id]?.qty ?? 0) > 0).length + customs.filter((x) => x.category === c && x.qty > 0).length;
  const total = steps.reduce((n, c) => n + countIn(c), 0);

  const chooseBranch = (id: number) => {
    if (dirty.current) void persist();
    setBranchId(id);
    try {
      localStorage.setItem(BRANCH_KEY, String(id));
    } catch {}
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Spotřební materiál</h1>
          <p className="mt-1 text-sm text-ui-muted">Měsíční objednávka pobočky</p>
        </div>
        <SuppliesTabs />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {branches ? (
          <Segmented<string>
            label="Pobočka"
            value={String(branchId)}
            onChange={(v) => chooseBranch(Number(v))}
            options={branches.map((b) => ({
              value: String(b.id),
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: b.color ?? "#19768E" }} />
                  {b.name}
                </span>
              ),
            }))}
          />
        ) : (
          <Skeleton className="h-10 w-72" />
        )}
        <input
          type="month"
          aria-label="Měsíc objednávky"
          value={period}
          onChange={(e) => e.target.value && setPeriod(e.target.value)}
          className="ui-input w-[170px]"
        />
      </div>

      {loadState === "locked-write" ? (
        <WriteLockedNotice what="Vyplňování objednávky" />
      ) : loadState === "error" ? (
        <div className="ui-tile p-4 text-sm">Objednávku se nepodařilo načíst: {error}</div>
      ) : (
        <Bento>
          {/* kroky = záložky s počty */}
          {steps.map((c, i) => (
            <BentoTile key={c} index={i} className={cn("transition-colors", tab === c && "border-ui-primary")}>
              <button type="button" onClick={() => setTab(c)} aria-pressed={tab === c} className="block w-full text-left">
                <div className="mb-2 text-[13px] font-medium text-ui-muted">
                  {i + 1}. {CATEGORY_NAME[c]}
                </div>
                {loadState === "loading" ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <Metric value={countIn(c)} unit={countIn(c) === 1 ? "položka" : countIn(c) >= 2 && countIn(c) <= 4 ? "položky" : "položek"} sub={CATEGORY_HINT[c]} />
                )}
              </button>
            </BentoTile>
          ))}
          <StatusTile
            index={steps.length}
            span={steps.length === 2 ? 2 : 1}
            loading={loadState === "loading"}
            order={order}
            branch={branch}
            period={period}
            total={total}
            save={save}
            onFinish={() => setFinishOpen(true)}
            onPrint={() => printOrder(branch, period, steps, items, entries, customs)}
          />

          {/* položky kroku */}
          <BentoTile
            span={4}
            index={steps.length + 1}
            bodyClassName="px-0 pb-2"
            title={<span className="text-ui-ink">{CATEGORY_NAME[tab]}</span>}
            action={
              <label className="relative">
                <span className="sr-only">Hledat položku</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat položku" className="ui-input h-8 w-52 pl-8 text-[13px]" />
              </label>
            }
          >
            {loadState === "loading" ? (
              <div className="space-y-2 px-4 py-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}>
                  <ItemsTable
                    items={items.filter((i) => i.category === tab)}
                    q={q}
                    entries={entries}
                    locked={locked}
                    onChange={setEntry}
                  />
                  <CustomItems
                    category={tab}
                    list={customs.filter((c) => c.category === tab)}
                    locked={locked}
                    onAdd={(c) => {
                      touch();
                      setCustoms((p) => [...p, c]);
                    }}
                    onChange={(key, patch) => {
                      touch();
                      setCustoms((p) => p.map((c) => (c.key === key ? { ...c, ...patch } : c)));
                    }}
                    onRemove={(key) => {
                      touch();
                      setCustoms((p) => p.filter((c) => c.key !== key));
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </BentoTile>
        </Bento>
      )}

      {finishOpen && order && (
        <FinishDialog
          defaultName={user ? employeeName(user) : ""}
          steps={steps}
          counts={Object.fromEntries(steps.map((c) => [c, countIn(c)])) as Record<Category, number>}
          onClose={() => setFinishOpen(false)}
          onConfirm={async (by) => {
            await spotreba.saveOrder(order.id, payload());
            dirty.current = false;
            const { order: o } = await spotreba.lock(order.id, by);
            setOrder(o);
            setFinishOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Stav objednávky ───

function StatusTile({
  index,
  span,
  loading,
  order,
  branch,
  period,
  total,
  save,
  onFinish,
  onPrint,
}: {
  index: number;
  span: 1 | 2;
  loading: boolean;
  order: Order | null;
  branch: Branch | null;
  period: string;
  total: number;
  save: "idle" | "pending" | "saving" | "saved" | "error";
  onFinish: () => void;
  onPrint: () => void;
}) {
  const locked = order?.status === "locked";
  return (
    <BentoTile index={index} span={span} title={`${branch?.name ?? ""} · ${formatPeriod(period)}`}>
      {loading || !order ? (
        <Skeleton className="h-7 w-32" />
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
            {locked ? <Lock className="h-4 w-4 text-ui-muted" /> : <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />}
            {locked ? `Uzavřel(a) ${order.locked_by}` : total ? "Rozepsaná" : "Zatím prázdná"}
          </div>
          <p className="mt-1 h-5 text-[12px] text-ui-muted" role="status">
            {locked
              ? order.locked_at && new Date(order.locked_at.replace(" ", "T")).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" })
              : save === "pending" || save === "saving"
              ? "Ukládám…"
              : save === "saved"
              ? "Uloženo"
              : save === "error"
              ? "Uložení se nepovedlo"
              : ""}
          </p>
          <div className="mt-2 flex gap-2">
            {!locked && (
              <Button size="sm" onClick={onFinish} disabled={!total}>
                <Check /> Dokončit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onPrint} disabled={!total}>
              <Printer /> Tisk
            </Button>
          </div>
        </>
      )}
    </BentoTile>
  );
}

// ─── Položky katalogu ───

function ItemsTable({
  items,
  q,
  entries,
  locked,
  onChange,
}: {
  items: Item[];
  q: string;
  entries: Record<number, Entry>;
  locked: boolean;
  onChange: (id: number, patch: Partial<Entry>) => void;
}) {
  const t = q.trim().toLowerCase();
  const shown = items.filter((i) => !t || i.name.toLowerCase().includes(t));
  if (!shown.length) return <Ghost label="Žádná položka" className="px-4 py-4" />;
  return (
    <div>
      {GROUPS.map((g) => {
        const list = shown.filter((i) => (i.item_group ?? "OSTATNI") === g).sort((a, b) => a.sort_order - b.sort_order);
        if (!list.length) return null;
        return (
          <section key={g} aria-label={GROUP_NAME[g]}>
            <h3 className="bg-ui-raised px-4 py-1.5 text-[12px] font-medium text-ui-muted">{GROUP_NAME[g]}</h3>
            <ul className="divide-y divide-ui-rule">
              {list.map((it) => {
                const e = entries[it.id];
                const filled = (e?.qty ?? 0) > 0;
                return (
                  <li
                    key={it.id}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2 md:grid-cols-[minmax(0,1fr)_8.5rem_9rem_minmax(0,14rem)]",
                      filled && "bg-brand-50/60 dark:bg-brand-950/30"
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm", filled && "font-medium")}>{it.name}</span>
                      {it.pack_note && <span className="block truncate text-[12px] text-ui-muted">{it.pack_note}</span>}
                    </span>
                    <Stepper value={e?.qty ?? 0} disabled={locked} onChange={(qty) => onChange(it.id, { qty })} label={it.name} />
                    <span className="col-span-2 md:col-span-1">
                      {it.pack_size ? (
                        <Segmented<UnitMode>
                          size="sm"
                          label={`Jednotka – ${it.name}`}
                          value={e?.unitMode ?? "pack"}
                          onChange={(unitMode) => !locked && onChange(it.id, { unitMode })}
                          options={[
                            { value: "pack", label: it.unit },
                            { value: "piece", label: it.piece_unit || "ks" },
                          ]}
                        />
                      ) : (
                        <span className="text-[13px] text-ui-muted">{it.unit}</span>
                      )}
                    </span>
                    <input
                      aria-label={`Poznámka – ${it.name}`}
                      value={e?.note ?? ""}
                      disabled={locked}
                      placeholder="Poznámka"
                      onChange={(ev) => onChange(it.id, { note: ev.target.value })}
                      className="ui-input col-span-2 h-8 text-[13px] md:col-span-1"
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange, disabled, label }: { value: number; onChange: (v: number) => void; disabled?: boolean; label: string }) {
  return (
    <span className="inline-flex h-8 items-center rounded-lg border border-ui-control bg-ui-sheet">
      <button type="button" disabled={disabled || value <= 0} onClick={() => onChange(Math.max(0, value - 1))} className="ui-press flex h-full w-8 items-center justify-center rounded-l-lg text-ui-muted hover:bg-ui-raised disabled:opacity-40" aria-label={`Méně – ${label}`}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        inputMode="numeric"
        aria-label={`Počet – ${label}`}
        value={value || ""}
        placeholder="0"
        disabled={disabled}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value.replace(/\D/g, "")) || 0)))}
        className="h-full w-11 border-x border-ui-rule bg-transparent text-center text-sm tabular-nums outline-none"
      />
      <button type="button" disabled={disabled} onClick={() => onChange(value + 1)} className="ui-press flex h-full w-8 items-center justify-center rounded-r-lg text-ui-muted hover:bg-ui-raised disabled:opacity-40" aria-label={`Více – ${label}`}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

// ─── Mimo katalog ───

function CustomItems({
  category,
  list,
  locked,
  onAdd,
  onChange,
  onRemove,
}: {
  category: Category;
  list: Custom[];
  locked: boolean;
  onAdd: (c: Custom) => void;
  onChange: (key: string, patch: Partial<Custom>) => void;
  onRemove: (key: string) => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  return (
    <section aria-label="Mimo katalog" className="mt-1">
      <h3 className="bg-ui-raised px-4 py-1.5 text-[12px] font-medium text-ui-muted">Mimo katalog</h3>
      <ul className="divide-y divide-ui-rule">
        {list.map((c) => (
          <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2 md:grid-cols-[minmax(0,1fr)_8.5rem_9rem_minmax(0,14rem)_auto]">
            <input aria-label="Název" value={c.name} disabled={locked} onChange={(e) => onChange(c.key, { name: e.target.value })} className="ui-input h-8 text-[13px]" />
            <Stepper value={c.qty} disabled={locked} onChange={(v) => onChange(c.key, { qty: v })} label={c.name} />
            <span className="hidden text-[13px] text-ui-muted md:block">ks</span>
            <input aria-label={`Poznámka – ${c.name}`} placeholder="Poznámka" value={c.note} disabled={locked} onChange={(e) => onChange(c.key, { note: e.target.value })} className="ui-input hidden h-8 text-[13px] md:block" />
            {!locked && (
              <button type="button" onClick={() => onRemove(c.key)} className="rounded p-1.5 text-ui-faint hover:bg-ui-raised hover:text-red-700" aria-label={`Odebrat ${c.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!locked && (
        <form
          className="flex flex-wrap items-center gap-2 px-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || qty < 1) return;
            onAdd({ key: `n${Date.now()}`, name: name.trim(), category, qty, note: "" });
            setName("");
            setQty(1);
          }}
        >
          <input aria-label="Nová položka mimo katalog" value={name} onChange={(e) => setName(e.target.value)} placeholder="Něco, co v katalogu není…" className="ui-input h-8 min-w-[220px] flex-1 text-[13px]" />
          <Stepper value={qty} onChange={setQty} label="nová položka" />
          <Button size="sm" variant="outline" type="submit" disabled={!name.trim()}>
            <Plus /> Přidat
          </Button>
        </form>
      )}
    </section>
  );
}

// ─── Dokončení ───

function FinishDialog({
  defaultName,
  steps,
  counts,
  onClose,
  onConfirm,
}: {
  defaultName: string;
  steps: Category[];
  counts: Record<Category, number>;
  onClose: () => void;
  onConfirm: (by: string) => Promise<void>;
}) {
  const [by, setBy] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dokončit objednávku</DialogTitle>
          <DialogDescription>Po uzavření ji už nepůjde měnit – odemknout ji může jen administrátor.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-ui-rule rounded-lg border border-ui-line text-sm">
          {steps.map((c) => (
            <li key={c} className="flex justify-between px-3 py-2">
              <span>{CATEGORY_NAME[c]}</span>
              <span className={cn(counts[c] ? "font-medium" : "text-ui-faint")}>{counts[c] || "—"}</span>
            </li>
          ))}
        </ul>
        <label className="block">
          <span className="mb-1 block text-[13px] text-ui-muted">Kdo uzavírá</span>
          <input className="ui-input" value={by} onChange={(e) => setBy(e.target.value)} autoFocus />
        </label>
        {error && <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <X /> Zpět
          </Button>
          <Button
            disabled={busy || !by.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm(by.trim());
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Lock />} Uzavřít objednávku
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tisk (seznam k nákupu se zaškrtávátky) ───

function printOrder(
  branch: Branch | null,
  period: string,
  steps: Category[],
  items: Item[],
  entries: Record<number, Entry>,
  customs: Custom[]
) {
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const sections = steps
    .map((c) => {
      const rows = [
        ...items
          .filter((i) => i.category === c && (entries[i.id]?.qty ?? 0) > 0)
          .map((i) => [i.name, `${entries[i.id].qty} ${entries[i.id].unitMode === "piece" ? i.piece_unit || "ks" : i.unit}`, entries[i.id].note]),
        ...customs.filter((x) => x.category === c && x.qty > 0).map((x) => [`${x.name} (mimo katalog)`, `${x.qty} ks`, x.note]),
      ];
      if (!rows.length) return "";
      return `<h2>${CATEGORY_NAME[c]}</h2><table><tbody>${rows
        .map(([n, qty, note]) => `<tr><td class="c">☐</td><td>${esc(n)}</td><td class="q">${esc(qty)}</td><td class="n">${esc(note || "")}</td></tr>`)
        .join("")}</tbody></table>`;
    })
    .join("");
  w.document.write(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Objednávka ${esc(branch?.name ?? "")}</title>
    <style>body{font:12px Montserrat,Arial,sans-serif;color:#0f2a33;margin:24px}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px}
    table{width:100%;border-collapse:collapse}td{padding:5px 6px;border-bottom:1px solid #e1e9eb}.c{width:18px}.q{white-space:nowrap;width:120px}.n{color:#4f646b}</style></head><body>
    <h1>Spotřební materiál – ${esc(branch?.name ?? "")}, ${esc(formatPeriod(period))}</h1>
    ${sections}<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

"use client";

/**
 * Spotřební materiál – souhrn měsíce (převzato z /opt/testapp → /spotreba/souhrn). JEN ČTE.
 *   Bento: stav poboček (nezaložena / rozepsaná / uzavřel X) · položek celkem
 *          → Makro (položka × pobočka) · Objednat online (položka × pobočka) · Výdej ze skladu po pobočkách
 *   CSV (středník, BOM – jako originál) a tisk: Makro / Objednat online / Výdej ze skladu / Vše.
 * Odemknutí uzavřené objednávky (admin + PIN) jde přes bránu – na ostrých datech je zatím vypnuté.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Lock, LockOpen, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import SuppliesTabs from "@/components/supplies/SuppliesTabs";
import { useSession } from "@/components/auth/SessionProvider";
import { SpotrebaError, spotreba } from "@/lib/spotreba/api";
import {
  CATEGORY_NAME,
  GROUPS,
  GROUP_NAME,
  currentPeriod,
  formatPeriod,
  formatQty,
  type Branch,
  type Category,
  type Summary,
  type SummaryItem,
} from "@/lib/spotreba/types";

const cell = (it: SummaryItem, branchId: number) => formatQty(it.byBranch[branchId]?.base ?? 0, it.packSize, it.unit, it.pieceUnit);
const total = (it: SummaryItem) => formatQty(it.totalBase, it.packSize, it.unit, it.pieceUnit);

export default function SuppliesSummaryPage() {
  const { can } = useSession();
  const [period, setPeriod] = useState(currentPeriod);
  const [periods, setPeriods] = useState<string[]>([]);
  const [data, setData] = useState<{ period: string; s?: Summary; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const s = data?.period === period ? data.s : undefined;
  const loading = data?.period !== period;

  useEffect(() => {
    spotreba.periods().then(setPeriods).catch(() => {});
  }, []);
  useEffect(() => {
    let cancelled = false;
    spotreba
      .summary(period)
      .then((r) => !cancelled && setData({ period, s: r }))
      .catch((e: Error) => !cancelled && setData({ period, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [period, attempt]);

  const byCat = (c: Category) => (s?.items ?? []).filter((i) => i.category === c);
  // „neuzavřená“ = otevřená objednávka, ve které už něco je
  const openCount = s
    ? s.branches.filter((b) => s.orders.find((o) => o.branch_id === b.id)?.status === "open" && s.items.some((it) => it.byBranch[b.id])).length
    : 0;

  const unlock = async (orderId: number, name: string) => {
    const pin = window.prompt(`Odemknout objednávku – ${name}\nZadejte PIN správy:`);
    if (!pin) return;
    try {
      await spotreba.unlock(orderId, pin);
      setAttempt((a) => a + 1);
    } catch (e) {
      setNotice(e instanceof SpotrebaError && e.locked ? "Odemknutí je v Kartotéce zatím vypnuté – udělejte ho v původní aplikaci." : (e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Souhrn objednávek</h1>
          <p className="mt-1 text-sm text-ui-muted">Co nakoupit a vydat za všechny pobočky</p>
        </div>
        <SuppliesTabs />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input type="month" aria-label="Měsíc" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="ui-input w-[170px]" />
        {periods.slice(0, 4).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn("h-8 rounded-md px-2.5 text-[13px] transition-colors", p === period ? "bg-ui-active font-medium" : "text-ui-muted hover:bg-ui-raised hover:text-ui-ink")}
          >
            {formatPeriod(p)}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => s && exportCsv(s)} disabled={!s?.items.length}>
            <Download /> CSV
          </Button>
          <PrintMenu s={s} />
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-amber-200 px-3 py-2 text-[13px] text-amber-800 dark:border-amber-900 dark:text-amber-200">
          {notice}
        </p>
      )}
      {data?.error && data.period === period && <div className="ui-tile p-4 text-sm">Souhrn se nepodařilo načíst: {data.error}</div>}

      <Bento>
        {/* stav poboček */}
        {(s?.branches ?? [null, null, null]).map((b, i) => (
          <BranchTile key={b?.id ?? i} index={i} branch={b} s={s} canUnlock={can("staff.manage")} onUnlock={unlock} />
        ))}
        <BentoTile index={3} title="Položek k vyřízení">
          {loading ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <Metric
              value={s?.items.length ?? 0}
              sub={openCount ? `${openCount} ${openCount === 1 ? "pobočka ještě nemá" : "pobočky ještě nemají"} uzavřeno` : s?.allLocked ? "vše uzavřeno" : undefined}
            />
          )}
        </BentoTile>

        <MatrixTile index={4} title={CATEGORY_NAME.MAKRO} items={byCat("MAKRO")} branches={s?.branches ?? []} loading={loading} />
        <MatrixTile index={5} title={CATEGORY_NAME.OBJEDNAT} items={byCat("OBJEDNAT")} branches={s?.branches ?? []} loading={loading} />
        <WarehouseTile index={6} items={byCat("SKLAD")} branches={(s?.branches ?? []).filter((b) => !b.is_warehouse)} loading={loading} />
      </Bento>
    </div>
  );
}

function BranchTile({
  index,
  branch: b,
  s,
  canUnlock,
  onUnlock,
}: {
  index: number;
  branch: Branch | null;
  s?: Summary;
  canUnlock: boolean;
  onUnlock: (orderId: number, name: string) => void;
}) {
  const o = b && s?.orders.find((x) => x.branch_id === b.id);
  const lines = b && s ? s.items.filter((it) => it.byBranch[b.id]).length : 0;
  return (
    <BentoTile index={index} title={b ? <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: b.color ?? "#19768E" }} />{b.name}</span> : " "}>
      {!b || !s ? (
        <Skeleton className="mt-1 h-6 w-28" />
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm font-medium">
            {!o ? (
              <span className="text-ui-faint">Nezaložena</span>
            ) : o.status === "locked" ? (
              <>
                <Lock className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Uzavřel(a) {o.locked_by}
              </>
            ) : !lines ? (
              // otevřená, ale nic v ní (originál ji založí už samotným zobrazením)
              <span className="text-ui-faint">Prázdná</span>
            ) : (
              <>
                <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" /> Rozepsaná
              </>
            )}
          </div>
          <p className="mt-1 text-[12px] text-ui-muted">{o ? `${lines} ${lines === 1 ? "položka" : lines >= 2 && lines <= 4 ? "položky" : "položek"}` : "pobočka zatím nic nevyplnila"}</p>
          {o?.status === "locked" && canUnlock && (
            <button type="button" onClick={() => onUnlock(o.id, b.name)} className="mt-2 inline-flex items-center gap-1 text-[12px] text-ui-primary hover:underline">
              <LockOpen className="h-3.5 w-3.5" /> Odemknout
            </button>
          )}
        </>
      )}
    </BentoTile>
  );
}

/** Položka × pobočka (Makro, Objednat online) – po skupinách, s poznámkami a „mimo katalog“. */
function MatrixTile({ index, title, items, branches, loading }: { index: number; title: string; items: SummaryItem[]; branches: Branch[]; loading: boolean }) {
  const cols = branches.filter((b) => items.some((it) => it.byBranch[b.id]));
  return (
    <BentoTile span={4} index={index} title={`${title}${loading ? "" : ` · ${items.length}`}`} bodyClassName="px-0 pb-1">
      {loading ? (
        <div className="space-y-2 px-4 py-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : !items.length ? (
        <Ghost label={`${title}: nic objednáno`} className="px-4 py-4" />
      ) : (
        <div className="overflow-x-auto">
          {/* tabulka jen tak široká, jak potřebuje → čísla jsou hned u názvu (široké monitory) */}
          <table className="w-full text-sm xl:w-auto">
            <thead className="text-left text-[12px] text-ui-muted">
              <tr className="border-b border-ui-line">
                <th className="px-4 py-2 font-normal xl:min-w-[22rem]">Položka</th>
                {cols.map((b) => (
                  <th key={b.id} className="w-36 whitespace-nowrap px-3 py-2 text-right font-normal">
                    {b.name}
                  </th>
                ))}
                <th className="w-36 whitespace-nowrap px-4 py-2 text-right font-medium text-ui-ink">Celkem</th>
              </tr>
            </thead>
            {GROUPS.map((g) => {
              const list = items.filter((i) => i.itemGroup === g);
              if (!list.length) return null;
              return (
                <tbody key={g}>
                  <tr>
                    <td colSpan={cols.length + 2} className="bg-ui-raised px-4 py-1 text-[12px] font-medium text-ui-muted">
                      {GROUP_NAME[g]}
                    </td>
                  </tr>
                  {list.map((it, i) => (
                    <motion.tr
                      key={`${it.name}|${it.unit}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 + Math.min(i, 20) * 0.015 }}
                      className="border-b border-ui-rule align-top transition-colors last:border-0 hover:bg-ui-raised"
                    >
                      <td className="px-4 py-2">
                        <span className="font-medium">{it.name}</span>
                        {it.isCustom && <span className="ml-2 rounded bg-amber-50 px-1.5 text-[11px] text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">mimo katalog – doplnit</span>}
                        {it.packNote && <span className="block text-[12px] text-ui-muted">{it.packNote}</span>}
                        {it.notes.length > 0 && (
                          <span className="block text-[12px] text-ui-muted">{it.notes.map((n) => `${n.branch}: ${n.note}`).join(" · ")}</span>
                        )}
                      </td>
                      {cols.map((b) => (
                        <td key={b.id} className={cn("whitespace-nowrap px-3 py-2 text-right tabular-nums", !it.byBranch[b.id] && "text-ui-faint")}>
                          {cell(it, b.id)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums">{total(it)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </BentoTile>
  );
}

/** Výdej ze skladu Vídeňská – po pobočkách (co komu připravit). */
function WarehouseTile({ index, items, branches, loading }: { index: number; items: SummaryItem[]; branches: Branch[]; loading: boolean }) {
  return (
    <BentoTile span={4} index={index} title={`${CATEGORY_NAME.SKLAD} – výdej po pobočkách`}>
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : !items.length ? (
        <Ghost label="Ze skladu nic" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {branches.map((b) => {
            const mine = items.filter((it) => it.byBranch[b.id]);
            return (
              <div key={b.id} className="rounded-lg border border-ui-line">
                <div className="flex items-center gap-1.5 border-b border-ui-rule px-3 py-2 text-[13px] font-medium">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: b.color ?? "#19768E" }} /> {b.name}
                </div>
                {mine.length ? (
                  <ul className="divide-y divide-ui-rule text-sm">
                    {mine.map((it) => (
                      <li key={it.name} className="flex justify-between gap-3 px-3 py-1.5 transition-colors hover:bg-ui-raised">
                        <span className="truncate">{it.name}</span>
                        <span className="shrink-0 tabular-nums">{cell(it, b.id)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-[13px] text-ui-faint">nic</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </BentoTile>
  );
}

// ─── Export a tisk ───

function exportCsv(s: Summary) {
  const cols = s.branches;
  const rows = [["Kategorie", "Skupina", "Položka", ...cols.map((b) => b.name), "Celkem"]].concat(
    s.items.map((it) => [CATEGORY_NAME[it.category], GROUP_NAME[it.itemGroup] ?? it.itemGroup, it.name, ...cols.map((b) => (it.byBranch[b.id] ? cell(it, b.id) : "")), total(it)])
  );
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `spotrebni-material-${s.period}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function PrintMenu({ s }: { s?: Summary }) {
  const [open, setOpen] = useState(false);
  const opts: [string, Category[] | "ALL"][] = [
    ["Makro", ["MAKRO"]],
    ["Objednat online", ["OBJEDNAT"]],
    ["Výdej ze skladu", ["SKLAD"]],
    ["Vše", "ALL"],
  ];
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((o) => !o)} disabled={!s?.items.length} aria-expanded={open}>
        <Printer /> Tisk
      </Button>
      {open && s && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-ui-line bg-ui-sheet py-1 text-sm shadow-xl">
            {opts.map(([label, cats]) => (
              <li key={label}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-ui-raised"
                  onClick={() => {
                    setOpen(false);
                    printSummary(s, cats === "ALL" ? ["MAKRO", "OBJEDNAT", "SKLAD"] : cats);
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function printSummary(s: Summary, cats: Category[]) {
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const html = cats
    .map((c) => {
      const items = s.items.filter((i) => i.category === c);
      if (!items.length) return "";
      if (c === "SKLAD") {
        return `<h2>${CATEGORY_NAME.SKLAD} – výdej</h2>${s.branches
          .filter((b) => !b.is_warehouse)
          .map((b) => {
            const mine = items.filter((it) => it.byBranch[b.id]);
            return mine.length ? `<h3>${esc(b.name)}</h3><table>${mine.map((it) => `<tr><td class="c">☐</td><td>${esc(it.name)}</td><td class="q">${esc(cell(it, b.id))}</td></tr>`).join("")}</table>` : "";
          })
          .join("")}`;
      }
      const cols = s.branches.filter((b) => items.some((it) => it.byBranch[b.id]));
      return `<h2>${CATEGORY_NAME[c]}</h2><table><thead><tr><th></th><th>Položka</th>${cols.map((b) => `<th class="q">${esc(b.name)}</th>`).join("")}<th class="q">Celkem</th></tr></thead><tbody>${items
        .map((it) => `<tr><td class="c">☐</td><td>${esc(it.name)}${it.isCustom ? " <i>(mimo katalog)</i>" : ""}${it.notes.length ? `<div class="n">${esc(it.notes.map((n) => `${n.branch}: ${n.note}`).join(" · "))}</div>` : ""}</td>${cols.map((b) => `<td class="q">${it.byBranch[b.id] ? esc(cell(it, b.id)) : ""}</td>`).join("")}<td class="q"><b>${esc(total(it))}</b></td></tr>`)
        .join("")}</tbody></table>`;
    })
    .join("");
  w.document.write(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Spotřební materiál ${esc(s.period)}</title>
    <style>body{font:12px Montserrat,Arial,sans-serif;color:#0f2a33;margin:24px}h1{font-size:18px;margin:0}h2{font-size:14px;margin:18px 0 6px}h3{font-size:13px;margin:12px 0 4px}
    table{width:100%;border-collapse:collapse}th,td{padding:4px 6px;border-bottom:1px solid #e1e9eb;text-align:left}th{font-weight:600;color:#4f646b}.c{width:18px}.q{text-align:right;white-space:nowrap}.n{color:#4f646b;font-size:11px}</style></head><body>
    <h1>Spotřební materiál – ${esc(formatPeriod(s.period))}</h1>${html}<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

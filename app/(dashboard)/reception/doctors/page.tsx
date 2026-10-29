"use client";

/**
 * Připojení lékaři (převzato z /opt/testapp → Připojení lékaři, data přes /api/ops).
 * Lékaři, kterým chodí zprávy elektronicky: CGM, E-zpráva, LIVEcom.
 * Lékař připojený víc systémy je jednou se štítky (testapp ho vypisoval víckrát).
 *   Bento: Celkem + dlaždice systémů (= filtr)  →  seznam s hledáním, tisk/PDF, CSV
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Printer, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Ghost, Skeleton } from "@/components/ui/skeleton";

type System = "CGM" | "E-zpráva" | "LIVEcom";
const SYSTEMS: System[] = ["CGM", "E-zpráva", "LIVEcom"];
const HINT: Record<System, string> = {
  CGM: "zprávy do ambulantního systému CGM",
  "E-zpráva": "elektronická zpráva (eZpráva)",
  LIVEcom: "zprávy přes LIVEcom",
};
const DOT: Record<System, string> = { CGM: "bg-brand-500", "E-zpráva": "bg-emerald-600", LIVEcom: "bg-amber-500" };

type Doctor = { id: string; name: string; systems: System[] };

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function DoctorsPage() {
  const [list, setList] = useState<Doctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [system, setSystem] = useState<System | null>(null);

  useEffect(() => {
    fetch("/api/ops/medical_institution?limit=10000", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !Array.isArray(d)) throw new Error(d?.error ?? `Chyba ${r.status}`);
        // sloučit podle IČP: jeden lékař, víc systémů
        const map = new Map<string, Doctor>();
        for (const row of d as { id: string; description: string; system: string }[]) {
          if (!SYSTEMS.includes(row.system as System)) continue; // testapp skrývá „Neznámý“
          const cur = map.get(row.id) ?? { id: row.id, name: row.description, systems: [] };
          if (!cur.systems.includes(row.system as System)) cur.systems.push(row.system as System);
          map.set(row.id, cur);
        }
        setList([...map.values()].sort((a, b) => a.name.localeCompare(b.name, "cs", { sensitivity: "base" })));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    const t = norm(q.trim());
    return (list ?? [])
      .filter((d) => !system || d.systems.includes(system))
      .filter((d) => !t || norm(`${d.id} ${d.name}`).includes(t));
  }, [list, q, system]);

  const count = (s: System) => (list ?? []).filter((d) => d.systems.includes(s)).length;
  const label = system ? `${system} · ${shown.length}` : `Všichni · ${shown.length}`;

  const exportCsv = () => {
    const rows = [["IČP", "Lékař / zařízení", ...SYSTEMS]].concat(
      shown.map((d) => [d.id, d.name, ...SYSTEMS.map((s) => (d.systems.includes(s) ? "ano" : ""))])
    );
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `pripojeni-lekari-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printList = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    w.document.write(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Připojení lékaři</title>
      <style>body{font:12px Montserrat,Arial,sans-serif;color:#0f2a33;margin:24px}h1{font-size:18px;margin:0}
      p{color:#4f646b;margin:4px 0 14px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #e1e9eb}
      th{font-weight:600;color:#4f646b}td:first-child{white-space:nowrap}</style></head><body>
      <h1>Připojení lékaři${system ? ` – ${system}` : ""}</h1>
      <p>Vygenerováno ${new Date().toLocaleString("cs-CZ")} · celkem ${shown.length}</p>
      <table><thead><tr><th>IČP</th><th>Lékař / zařízení</th><th>Systém</th></tr></thead><tbody>
      ${shown.map((d) => `<tr><td>${esc(d.id)}</td><td>${esc(d.name)}</td><td>${d.systems.join(", ")}</td></tr>`).join("")}
      </tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const pending = <Skeleton className="mt-1 h-7 w-14" />;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Připojení lékaři</h1>
          <p className="mt-1 text-sm text-ui-muted">Lékaři, kterým zprávy chodí elektronicky</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!shown.length}>
            <Download /> CSV
          </Button>
          <Button variant="outline" onClick={printList} disabled={!shown.length}>
            <Printer /> Tisk / PDF
          </Button>
        </div>
      </header>

      {error && <div className="ui-tile p-4 text-sm">Seznam se nepodařilo načíst: {error}</div>}

      <Bento>
        <BentoTile index={0} title="Připojených lékařů">
          {!list ? (
            pending
          ) : (
            <>
              <Metric value={list.length} sub={`${list.filter((d) => d.systems.length > 1).length} ve více systémech`} />
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-ui-raised" aria-hidden>
                {SYSTEMS.map((s) => (
                  <span key={s} className={DOT[s]} style={{ width: `${(count(s) / Math.max(1, SYSTEMS.reduce((n, x) => n + count(x), 0))) * 100}%` }} />
                ))}
              </div>
            </>
          )}
        </BentoTile>
        {SYSTEMS.map((s, i) => (
          <SystemTile key={s} s={s} i={i} active={system === s} count={list ? count(s) : null} onClick={() => setSystem(system === s ? null : s)} />
        ))}

        <BentoTile
          span={4}
          index={4}
          title={label}
          bodyClassName="px-0 pb-1"
          action={
            <div className="flex items-center gap-2">
              {system && (
                <button type="button" onClick={() => setSystem(null)} className="text-[13px] text-ui-primary hover:underline">
                  Zrušit filtr
                </button>
              )}
              <label className="relative">
                <span className="sr-only">Hledat IČP nebo název</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="IČP nebo název"
                  className="ui-input h-8 w-56 pl-8 pr-7 text-[13px]"
                />
                {q && (
                  <button type="button" onClick={() => setQ("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ui-faint" aria-label="Vymazat">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
            </div>
          }
        >
          {!list ? (
            <div className="space-y-2 px-4 py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <Ghost label="Žádný lékař neodpovídá hledání" className="px-4 py-4" />
          ) : (
            <ul className="divide-y divide-ui-rule">
              {shown.map((d, i) => (
                <motion.li
                  key={d.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + Math.min(i, 15) * 0.02 }}
                  className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-sm"
                >
                  <span className="text-ui-muted">{d.id}</span>
                  <span className="truncate" title={d.name}>
                    {d.name}
                  </span>
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {d.systems.map((s) => (
                      <span key={s} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-ui-line px-2 text-[12px]">
                        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT[s])} />
                        {s}
                      </span>
                    ))}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </BentoTile>
      </Bento>
    </div>
  );
}

/** Dlaždice systému = filtr seznamu (vybraná má zvýrazněný okraj). */
function SystemTile({
  s,
  i,
  active,
  count,
  onClick,
}: {
  s: System;
  i: number;
  active: boolean;
  count: number | null;
  onClick: () => void;
}) {
  return (
    <BentoTile index={i + 1} className={cn("transition-colors", active && "border-ui-primary")}>
      <button type="button" onClick={onClick} aria-pressed={active} className="block w-full text-left">
        <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ui-muted">
          <span aria-hidden className={cn("h-2 w-2 rounded-full", DOT[s])} /> {s}
        </div>
        {count === null ? <Skeleton className="h-7 w-12" /> : <Metric value={count} sub={HINT[s]} />}
      </button>
    </BentoTile>
  );
}

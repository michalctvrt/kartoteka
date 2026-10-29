"use client";

/**
 * Výběr výkonů pro vyšetření (kód → počet).
 * Načte všechny výkony zvolené modality a filtruje je v prohlížeči podle
 * kódu i názvu (stejně jako VykonyEditor v e-žádance).
 * Dětské výkony (např. 09556) doplňuje backend sám při uložení.
 */

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, Search } from "lucide-react";
import { apiErrorText, listServices, type Option } from "@/lib/study/lookups";

export default function ServicesEditor({
  category,
  value,
  onChange,
}: {
  category: string;
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  // Výkony + pro jakou modalitu jsou načtené (loading = nesedí s aktuální)
  const [loaded, setLoaded] = useState<{ category: string; all: Option[]; error: string | null }>({
    category: "",
    all: [],
    error: null,
  });
  const loading = !!category && loaded.category !== category;
  const all = useMemo(
    () => (loaded.category === category ? loaded.all : []),
    [loaded, category]
  );
  const error = loaded.category === category ? loaded.error : null;
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    listServices(category)
      .then((r) => !cancelled && setLoaded({ category, all: r, error: null }))
      .catch((e) => !cancelled && setLoaded({ category, all: [], error: apiErrorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [category]);

  const names = useMemo(() => Object.fromEntries(all.map((o) => [o.id, o.label])), [all]);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return all
      .filter((o) => !(o.id in value))
      .filter((o) => o.id.toLowerCase().includes(t) || o.label.toLowerCase().includes(t))
      .slice(0, 30);
  }, [q, all, value]);

  const setCount = (id: string, n: number) => {
    const next = { ...value };
    if (n <= 0) delete next[id];
    else next[id] = n;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Výkony</label>

      {Object.keys(value).length > 0 && (
        <ul className="divide-y divide-ui-rule rounded-lg border border-ui-line">
          {Object.entries(value).map(([id, n]) => (
            <li key={id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <code className="text-xs w-14 shrink-0">{id}</code>
              <span className="flex-1 truncate" title={names[id]}>{names[id] ?? ""}</span>
              <button type="button" onClick={() => setCount(id, n - 1)} aria-label="Méně">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-5 text-center">{n}</span>
              <button type="button" onClick={() => setCount(id, n + 1)} aria-label="Více">
                <Plus className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setCount(id, 0)} aria-label="Odebrat" className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-3 text-ui-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={!category || loading}
          placeholder={
            !category ? "Nejdřív vyberte modalitu" : loading ? "Načítám výkony…" : "Kód nebo název výkonu"
          }
          className="h-10 w-full rounded-lg border border-ui-control bg-ui-sheet pl-8 pr-3 text-sm disabled:opacity-60"
        />
        {matches.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-ui-line bg-ui-sheet shadow-lg text-sm">
            {matches.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCount(o.id, 1);
                    setQ("");
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-ui-raised flex gap-2"
                >
                  <code className="text-xs w-14 shrink-0 pt-0.5">{o.id}</code>
                  <span>{o.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

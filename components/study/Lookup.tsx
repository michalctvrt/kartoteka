"use client";

/** Vyhledávací pole s našeptávačem (lékař, diagnóza). */

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { Option } from "@/lib/study/lookups";

export default function Lookup({
  label,
  placeholder,
  value,
  onChange,
  search,
}: {
  label: string;
  placeholder: string;
  value: Option | null;
  onChange: (o: Option | null) => void;
  search: (q: string) => Promise<Option[]>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await search(q).catch(() => []);
      if (!cancelled) {
        setResults(r);
        setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, search]);

  const showResults = q.trim().length >= 2;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      {value ? (
        <div className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-ui-line bg-ui-raised px-3 py-1.5 text-sm">
          <div className="min-w-0">
            <div className="font-medium truncate">{value.label}</div>
            {value.sub && <div className="text-xs text-ui-faint truncate">{value.sub}</div>}
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="Zrušit výběr" className="rounded p-1 text-ui-muted hover:bg-ui-active hover:text-ui-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-3 text-ui-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-ui-control bg-ui-sheet pl-8 pr-3 text-sm"
          />
          {showResults && (
            <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-ui-line bg-ui-sheet shadow-lg text-sm">
              {loading && <li className="px-3 py-2 text-ui-faint">Hledám…</li>}
              {!loading && results.length === 0 && (
                <li className="px-3 py-2 text-ui-faint">Nic nenalezeno.</li>
              )}
              {!loading &&
                results.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o);
                        setQ("");
                        setResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-ui-raised"
                    >
                      <div className="font-medium">{o.label}</div>
                      {o.sub && <div className="text-xs text-ui-faint">{o.sub}</div>}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

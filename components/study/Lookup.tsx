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
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {value ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border rounded-md bg-blue-50 dark:bg-blue-950/40 text-sm">
          <div className="min-w-0">
            <div className="font-medium truncate">{value.label}</div>
            {value.sub && <div className="text-xs text-gray-500 truncate">{value.sub}</div>}
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="Zrušit výběr">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-3 py-2 border rounded-md text-sm bg-white dark:bg-neutral-900"
          />
          {showResults && (
            <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto border rounded-md bg-white dark:bg-neutral-900 shadow-lg text-sm">
              {loading && <li className="px-3 py-2 text-gray-500">Hledám…</li>}
              {!loading && results.length === 0 && (
                <li className="px-3 py-2 text-gray-500">Nic nenalezeno.</li>
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
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800"
                    >
                      <div className="font-medium">{o.label}</div>
                      {o.sub && <div className="text-xs text-gray-500">{o.sub}</div>}
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

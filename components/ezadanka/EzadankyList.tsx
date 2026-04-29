"use client";

/**
 * Tabulka aktivních eŽádanek pro daného pacienta.
 *
 * Použití:
 *   <EzadankyList rid="9882826031" />
 *   <EzadankyList rid={pid} onImport={(detail) => fillFormFromZadanka(detail)} />
 *
 * Komponenta si data sama fetchne z `/api/ezadanka/by-rid/{rid}` (mock),
 * při kliknutí na řádek otevře `EzadankaDetail` modal s plnými údaji.
 *
 * Volitelný `onImport` callback se zavolá, když uživatel klikne na "Importovat data"
 * v detail modalu — předá detail žádanky komponentě výše (např. pro předvyplnění
 * formuláře nového pacienta).
 */

import { useEffect, useState } from "react";
import { AlertTriangle, FileText, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EzadankaDetail from "./EzadankaDetail";
import type {
  Modalita,
  SearchByRidResponse,
  ZadankaDetail as ZadankaDetailT,
  ZadankaListItem,
} from "@/lib/ezadanka/types";

interface Props {
  rid: string;
  /** Po kliknutí na "Importovat data" v detail modalu — pro předvyplnění formuláře nového pacienta */
  onImport?: (detail: ZadankaDetailT) => void;
}

const MODALITA_BARVY: Record<Modalita, string> = {
  RTG: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  UZ: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  SONO: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  MR: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  MRI: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  CT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  OTHER:
    "bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300",
};

const URGENTNOST_BARVY: Record<string, string> = {
  rutinní: "text-gray-600 dark:text-gray-400",
  urgentní: "text-amber-600 dark:text-amber-400 font-medium",
  statim: "text-red-600 dark:text-red-400 font-semibold",
};

export default function EzadankyList({ rid, onImport }: Props) {
  const [data, setData] = useState<ZadankaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openKod, setOpenKod] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ezadanka/by-rid/${encodeURIComponent(rid)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as SearchByRidResponse;
        if (!cancelled) setData(body.zadanky);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rid]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Aktivní eŽádanky
          {!loading && data.length > 0 && (
            <span className="text-xs font-normal text-gray-500 ml-2">
              ({data.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading && (
          <p className="p-6 text-sm text-gray-500">Načítám eŽádanky…</p>
        )}

        {error && (
          <div className="m-4 p-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Nepodařilo se načíst eŽádanky: {error}</span>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <p className="p-6 text-sm text-gray-500">
            Pacient nemá žádné aktivní eŽádanky.
          </p>
        )}

        {!loading && !error && data.length > 0 && (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Modalita</th>
                <th className="px-4 py-2 font-medium">Vyšetření</th>
                <th className="px-4 py-2 font-medium">Urgentnost</th>
                <th className="px-4 py-2 font-medium">Žadatel</th>
                <th className="px-4 py-2 font-medium">Datum</th>
                <th className="px-4 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((z) => (
                <tr
                  key={z.id}
                  onClick={() => setOpenKod(z.kod)}
                  className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer transition"
                >
                  <td className="px-4 py-3">
                    {z.modalita ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          MODALITA_BARVY[z.modalita] ?? MODALITA_BARVY.OTHER
                        }`}
                      >
                        {z.modalita}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {z.vysetreniNazev ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      URGENTNOST_BARVY[z.urgentnost.nazev] ??
                      URGENTNOST_BARVY.rutinní
                    }`}
                  >
                    {z.urgentnost.nazev}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {z.zadatel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {formatDate(z.datumVytvoreni)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <ChevronRight className="w-4 h-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      {openKod && (
        <EzadankaDetail
          kod={openKod}
          onClose={() => setOpenKod(null)}
          onImport={onImport}
        />
      )}
    </Card>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

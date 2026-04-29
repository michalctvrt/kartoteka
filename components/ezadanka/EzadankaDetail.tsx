"use client";

/**
 * Modal s detailem konkrétní eŽádanky.
 *
 * Sám si fetchne data z `/api/ezadanka/by-kod/{kod}` (mock).
 * Při kliknutí na "Importovat data" zavolá `onImport(detail)` — typicky
 * pro předvyplnění formuláře nového pacienta na `/reception/patients/new`.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Download, Stethoscope } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  EzadankaErrorResponse,
  ZadankaDetail as ZadankaDetailT,
} from "@/lib/ezadanka/types";

interface Props {
  kod: string;
  onClose: () => void;
  onImport?: (detail: ZadankaDetailT) => void;
}

export default function EzadankaDetail({ kod, onClose, onImport }: Props) {
  const [data, setData] = useState<ZadankaDetailT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/ezadanka/by-kod/${encodeURIComponent(kod)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = (await res.json()) as EzadankaErrorResponse;
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<ZadankaDetailT>;
      })
      .then((detail) => {
        if (!cancelled) setData(detail);
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
  }, [kod]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            eŽádanka <code className="text-sm">{kod}</code>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="py-6 text-sm text-gray-500">Načítám detail…</p>
        )}

        {error && (
          <div className="my-4 p-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="space-y-6 mt-2">
            {/* Hlavička: stav + urgentnost */}
            <div className="flex items-center gap-3">
              <Badge>{data.stav.nazev}</Badge>
              <Badge variant={urgentnostVariant(data.urgentnost.nazev)}>
                {data.urgentnost.nazev}
              </Badge>
              <span className="text-sm text-gray-500">
                vystaveno {formatDate(data.datumVytvoreni)}
              </span>
            </div>

            <Section title="Vyšetření">
              <Row label="Název" value={data.vysetreni.nazev} />
              <Row label="Modalita" value={data.vysetreni.modalita} />
              <Row label="Část těla" value={data.vysetreni.castTela} />
              <Row label="Lateralita" value={data.vysetreni.lateralita} />
              {data.vysetreni.poznamka && (
                <Row label="Poznámka" value={data.vysetreni.poznamka} />
              )}
              {data.vysetreni.instrukceProPacienta && (
                <Row
                  label="Instrukce pro pacienta"
                  value={data.vysetreni.instrukceProPacienta}
                  highlight
                />
              )}
            </Section>

            <Section title="Diagnóza a klinická otázka">
              <Row
                label="Diagnóza"
                value={
                  data.diagnoza.kod && data.diagnoza.nazev
                    ? `${data.diagnoza.kod} — ${data.diagnoza.nazev}`
                    : data.diagnoza.nazev ?? data.diagnoza.kod ?? null
                }
              />
              <Row
                label="Klinická otázka"
                value={data.diagnoza.klinickaOtazka}
              />
            </Section>

            <Section title="Pacient">
              <Row
                label="Jméno"
                value={`${data.pacient.jmeno} ${data.pacient.prijmeni}`}
              />
              <Row
                label="Datum narození"
                value={data.pacient.datumNarozeni}
              />
              <Row
                label="Pohlaví"
                value={
                  data.pacient.pohlavi === "MALE"
                    ? "Muž"
                    : data.pacient.pohlavi === "FEMALE"
                    ? "Žena"
                    : null
                }
              />
              <Row label="RČ" value={formatRc(data.pacient.rid)} />
              <Row
                label="Pojišťovna"
                value={
                  data.pacient.pojistovnaKod && data.pacient.pojistovnaNazev
                    ? `${data.pacient.pojistovnaKod} — ${data.pacient.pojistovnaNazev}`
                    : data.pacient.pojistovnaKod ??
                      data.pacient.pojistovnaNazev ??
                      null
                }
              />
              <Row label="Adresa" value={data.pacient.adresa} />
              <Row label="Telefon" value={data.pacient.telefon} />
              <Row label="E-mail" value={data.pacient.email} />
            </Section>

            <Section title="Stav pacienta">
              <Row
                label="Mobilita"
                value={
                  data.pacientStav.popisOmezeniMobility
                    ? `${data.pacientStav.omezeniMobility ?? ""} (${
                        data.pacientStav.popisOmezeniMobility
                      })`
                    : data.pacientStav.omezeniMobility
                }
              />
              <Row label="Výška" value={data.pacientStav.vyska} />
              <Row label="Váha" value={data.pacientStav.vaha} />
              <Row
                label="Implantát"
                value={
                  data.pacientStav.implantat === null
                    ? null
                    : data.pacientStav.implantat
                    ? "ano"
                    : "ne"
                }
              />
              <Row
                label="Samoplátce"
                value={
                  data.pacientStav.samoplatce === null
                    ? null
                    : data.pacientStav.samoplatce
                    ? "ano"
                    : "ne"
                }
              />
              <Row label="Úhrada" value={data.uhrada} />
            </Section>

            <Section title="Žadatel">
              <Row label="Lékař" value={data.zadatel.jmeno} />
              <Row
                label="Pracoviště"
                value={data.zadatel.poskytovatel}
              />
              <Row label="IČO" value={data.zadatel.ico} />
              <Row label="ICP" value={data.zadatel.icp} />
            </Section>

            {/* Akce */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-neutral-700">
              <Button variant="outline" onClick={onClose}>
                Zavřít
              </Button>
              {onImport && (
                <Button
                  onClick={() => {
                    onImport(data);
                    onClose();
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Použít data pro novou kartu
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-komponenty ──────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
        {title}
      </h3>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`${
          highlight
            ? "text-amber-700 dark:text-amber-300 font-medium"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "warning" | "danger";
}) {
  const cls =
    variant === "warning"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : variant === "danger"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function urgentnostVariant(
  urgentnost: string
): "default" | "warning" | "danger" {
  if (urgentnost.includes("statim")) return "danger";
  if (urgentnost.includes("urgent")) return "warning";
  return "default";
}

// ─── Helpery ─────────────────────────────────────────────────────────────

function formatRc(rc: string): string {
  if (!rc || rc.length <= 6) return rc ?? "";
  return `${rc.substring(0, 6)}/${rc.substring(6)}`;
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

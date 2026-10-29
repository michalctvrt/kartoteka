"use client";

/**
 * Hromadný tisk zpráv (převzato z /opt/testapp → /tisk, data přes /api/ops).
 * Dokončené studie za den pro lékaře (IČP) vybrané pobočky; jedno sloučené PDF
 * se jménem lékaře a IČP v rohu každé stránky (dělá backend testappu).
 *   Bento: Ke tisku (2 sl.) · Lékaři · Den  →  studie po lékařích
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import { ModalityTag } from "@/components/study/StudyBits";
import { formatRc } from "@/lib/studies";

type Workplace = "BRDO" | "BRLE";
const WORKPLACES: { value: Workplace; label: string }[] = [
  { value: "BRDO", label: "Dobrovského" },
  { value: "BRLE", label: "Lesná" },
];
const WP_KEY = "kartoteka_print_workplace";

type PrintStudy = {
  id: number;
  uid: string;
  study_date: string;
  icp: string;
  doctor_name: string;
  category: string;
  description: string;
  patient_name: string;
  pid: string;
};
type PrintData = {
  workplace: string;
  date: string;
  total: number;
  summary: { icp: string; doctor_name: string; count: number }[];
  studies: PrintStudy[];
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** České státní svátky v roce (pevné + Velký pátek a Velikonoční pondělí). */
function holidays(y: number): Set<string> {
  // Velikonoční neděle – anonymní gregoriánský algoritmus
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(y, month - 1, day);
  const shift = (n: number) => iso(new Date(y, easter.getMonth(), easter.getDate() + n));
  const fixed = ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"];
  return new Set([...fixed.map((md) => `${y}-${md}`), shift(-2), shift(1)]);
}
/** Předchozí pracovní den – přeskočí víkend i státní svátek (v pondělí pátek, po 28. 10. den předtím). */
function previousWorkday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6 || holidays(d.getFullYear()).has(iso(d))) d.setDate(d.getDate() - 1);
  return iso(d);
}
const plural = (n: number) => (n === 1 ? "zpráva" : n >= 2 && n <= 4 ? "zprávy" : "zpráv");
const pdfUrl = (ids: number[]) => `/api/ops/tisk-pdf?ids=${ids.join(",")}`;

export default function PrintPage() {
  const [workplace, setWorkplace] = useState<Workplace>(() => {
    try {
      return (localStorage.getItem(WP_KEY) as Workplace) || "BRDO";
    } catch {
      return "BRDO";
    }
  });
  const [date, setDate] = useState(() => previousWorkday());
  const [result, setResult] = useState<{ key: string; data?: PrintData; error?: string } | null>(null);
  const key = `${workplace}|${date}`;
  const current = result?.key === key ? result : null;
  const loading = !current;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ops/tisk-studies?workplace=${workplace}&date=${date}`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? `Chyba ${r.status}`);
        if (!cancelled) setResult({ key, data: body as PrintData });
      })
      .catch((e: Error) => !cancelled && setResult({ key, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [key, workplace, date]);

  const chooseWorkplace = (w: Workplace) => {
    setWorkplace(w);
    try {
      localStorage.setItem(WP_KEY, w);
    } catch {}
  };

  const data = current?.data;
  const byDoctor = useMemo(() => {
    const m = new Map<string, PrintStudy[]>();
    data?.studies.forEach((s) => m.set(s.icp, [...(m.get(s.icp) ?? []), s]));
    return m;
  }, [data]);
  const withStudies = data?.summary.filter((d) => d.count > 0) ?? [];
  const without = data?.summary.filter((d) => d.count === 0) ?? [];
  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });
  const isDefault = date === previousWorkday();

  const pending = (
    <div className="space-y-3 pt-1">
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Hromadný tisk zpráv</h1>
        <p className="mt-1 text-sm text-ui-muted">Dokončené studie za den pro lékaře pobočky – jedno PDF k vytištění</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Workplace> label="Pracoviště" value={workplace} onChange={chooseWorkplace} options={WORKPLACES} />
        <input
          type="date"
          aria-label="Den vyšetření"
          value={date}
          max={iso(new Date())}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="ui-input w-[160px]"
        />
        {!isDefault && (
          <button type="button" onClick={() => setDate(previousWorkday())} className="h-10 px-2 text-sm text-ui-primary hover:underline">
            Předchozí pracovní den
          </button>
        )}
      </div>

      {current?.error ? (
        <div className="ui-tile p-4 text-sm">Seznam se nepodařilo načíst: {current.error}</div>
      ) : (
        <Bento>
          <BentoTile
            span={2}
            index={0}
            title="Ke tisku"
            action={
              data && data.total > 0 && (
                <Button asChild>
                  <a href={pdfUrl(data.studies.map((s) => s.id))} target="_blank" rel="noreferrer">
                    <Printer /> Tisknout vše ({data.total})
                  </a>
                </Button>
              )
            }
          >
            {loading ? (
              pending
            ) : (
              <Metric value={data?.total ?? 0} unit={plural(data?.total ?? 0)} sub={WORKPLACES.find((w) => w.value === workplace)?.label} />
            )}
          </BentoTile>
          <BentoTile index={1} title="Lékaři">
            {loading ? (
              pending
            ) : (
              <Metric value={withStudies.length} unit={`z ${data?.summary.length ?? 0}`} sub="s vyšetřením za den" />
            )}
          </BentoTile>
          <BentoTile index={2} title="Den">
            <Metric value={<span className="text-[20px] first-letter:uppercase">{dayLabel}</span>} />
          </BentoTile>

          <BentoTile span={4} index={3} title="Zprávy po lékařích" bodyClassName="px-0 pb-1">
            {loading ? (
              <div className="space-y-2 px-4 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : withStudies.length === 0 ? (
              <Ghost label="Za tento den nejsou žádné dokončené studie" className="px-4 py-4" />
            ) : (
              <div className="divide-y divide-ui-line">
                {withStudies.map((doc, di) => (
                  <motion.section
                    key={doc.icp}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + di * 0.04 }}
                    aria-label={doc.doctor_name}
                  >
                    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-ui-raised px-4 py-2">
                      <span className="text-sm font-semibold">{doc.doctor_name}</span>
                      <span className="text-[12px] text-ui-muted">IČP {doc.icp}</span>
                      <span className="text-[12px] text-ui-muted">· {doc.count} {plural(doc.count)}</span>
                      <Button size="sm" variant="outline" className="ml-auto" asChild>
                        <a href={pdfUrl((byDoctor.get(doc.icp) ?? []).map((s) => s.id))} target="_blank" rel="noreferrer">
                          <Printer /> Tisk
                        </a>
                      </Button>
                    </header>
                    <ul className="divide-y divide-ui-rule">
                      {(byDoctor.get(doc.icp) ?? []).map((s) => (
                        <li
                          key={s.id}
                          className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-2 text-sm md:grid-cols-[minmax(0,14rem)_7rem_4rem_3.5rem_minmax(0,1fr)_auto]"
                        >
                          <Link href={`/reception/studies/${s.id}`} className="truncate font-medium hover:text-ui-primary">
                            {s.patient_name}
                          </Link>
                          <span className="hidden text-ui-muted md:block">{formatRc(s.pid)}</span>
                          <span className="hidden text-ui-muted md:block">
                            {new Date(s.study_date).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="hidden md:block">
                            <ModalityTag modality={s.category} />
                          </span>
                          <span className="col-span-2 truncate text-[13px] text-ui-muted md:col-span-1">{s.description}</span>
                          <a
                            href={`/api/ops/study-pdf/${s.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden items-center gap-1 text-[13px] text-ui-primary hover:underline md:inline-flex"
                          >
                            <FileDown className="h-3.5 w-3.5" /> PDF
                          </a>
                        </li>
                      ))}
                    </ul>
                  </motion.section>
                ))}
              </div>
            )}
            {!loading && without.length > 0 && (
              <details className="border-t border-ui-rule px-4 py-2.5 text-[13px] text-ui-muted">
                <summary className="flex cursor-pointer list-none items-center gap-1 hover:text-ui-ink">
                  <ChevronRight className="h-3.5 w-3.5" /> Bez vyšetření za den: {without.length} lékařů
                </summary>
                <p className="mt-1.5">{without.map((d) => `${d.doctor_name} (${d.icp})`).join(" · ")}</p>
              </details>
            )}
          </BentoTile>
        </Bento>
      )}
    </div>
  );
}

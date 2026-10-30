"use client";

/**
 * Nová objednávka – PANEL vedle kalendáře (ne vyskakovací okno: recepční musí při objednávání vidět
 * kalendář a hledat volné místo). Termín se vybírá kliknutím do volného místa v kalendáři, jde i ručně.
 * Stav (Draft) drží stránka kalendáře – klik do mřížky jen změní termín, vyplněné údaje zůstanou.
 *
 * Zapisovat jde jen do kalendářů typu „zdroje“ (lib/supersaas/calendars.ts BOOKABLE); jestli opravdu smí,
 * rozhodne server (SUPERSAAS_WRITE_SCHEDULES). Obsazený čas a povinná pole hlídá SuperSaaS – jeho hlášku
 * ukážeme tak, jak přišla (je česky).
 */

import { useState } from "react";
import { CalendarPlus, Loader2, MousePointerClick, X } from "lucide-react";
import { BentoTile } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { BOOKABLE, calendarById } from "@/lib/supersaas/calendars";
import { createBooking, hm, ssTime } from "./useBookings";

export type Len = "20" | "40" | "60";

export type Draft = {
  calendarId: number;
  start: Date | null; // null = zatím nevybráno (klik do kalendáře)
  len: Len;
  fullName: string;
  birthYear: string;
  gender: "" | "Žena" | "Muž";
  exam: string;
  mobile: string;
  email: string;
};

export const emptyDraft = (p: Partial<Draft> = {}): Draft => ({
  calendarId: BOOKABLE[0]?.id ?? 0,
  start: null,
  len: "20",
  fullName: "",
  birthYear: "",
  gender: "",
  exam: "",
  mobile: "",
  email: "",
  ...p,
});

export const draftEnd = (d: Draft) => (d.start ? new Date(d.start.getTime() + Number(d.len) * 60_000) : null);

const p2 = (n: number) => String(n).padStart(2, "0");
const dayStr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const timeStr = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;

export default function BookingPanel({
  draft: f,
  onChange,
  onCalendar,
  onClose,
  onCreated,
  index,
}: {
  draft: Draft;
  onChange: (p: Partial<Draft>) => void;
  /** jiný kalendář → stránka ho i zobrazí (aby šlo hledat volná místa právě v něm) */
  onCalendar: (id: number) => void;
  onClose: () => void;
  onCreated: (r: { id: number | null; calendarId: number; start: Date }) => void;
  index: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => {
    onChange(p);
    setError(null);
  };

  const cal = calendarById(f.calendarId);
  const has = (k: "field_1" | "field_2_r") => !!cal?.fields.includes(k);
  const end = draftEnd(f);
  const valid =
    !!cal && !!f.start && f.fullName.trim().length > 2 && f.exam.trim().length > 1 && (!has("field_1") || /^\d{4}$/.test(f.birthYear));
  const label = "mb-1 block text-[13px] text-ui-muted";

  const setDayTime = (day: string, time: string) => {
    const d = new Date(`${day}T${time || "07:00"}:00`);
    if (!isNaN(d.getTime())) set({ start: d });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !cal || !f.start || !end) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createBooking({
        schedule_id: cal.id,
        start: ssTime(f.start),
        finish: ssTime(end),
        full_name: f.fullName.trim(),
        mobile: f.mobile,
        email: f.email,
        field_1_r: f.exam.trim(), // na jaké vyšetření (v SuperSaaS „Požadované vyšetření“)
        ...(has("field_1") ? { field_1: f.birthYear } : {}),
        ...(has("field_2_r") && f.gender ? { field_2_r: f.gender } : {}),
      });
      onCreated({ id: r.id, calendarId: cal.id, start: f.start });
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BentoTile
      index={index}
      // ne sticky: formulář je vyšší než obrazovka a tlačítko Objednat by se nedalo odscrollovat
      className="xl:self-start"
      title={<span className="text-ui-ink">Nová objednávka</span>}
      action={
        <button type="button" onClick={onClose} aria-label="Zavřít novou objednávku" className="text-ui-muted hover:text-ui-ink">
          <X className="h-4 w-4" />
        </button>
      }
    >
      <form className="space-y-3" onSubmit={submit}>
        <label className="block">
          <span className={label}>Kalendář</span>
          <select
            className="ui-input"
            value={f.calendarId}
            onChange={(e) => {
              set({ calendarId: Number(e.target.value) });
              onCalendar(Number(e.target.value));
            }}
          >
            {BOOKABLE.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* termín – hlavně kliknutím do kalendáře */}
        <div className="rounded-md border border-ui-line bg-ui-raised p-2.5">
          {f.start && end ? (
            <>
              <div className="text-[15px] font-semibold">
                {f.start.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" })} · {hm(f.start)}–{hm(end)}
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                <input type="date" aria-label="Den" className="ui-input h-9" value={dayStr(f.start)} onChange={(e) => setDayTime(e.target.value, timeStr(f.start!))} />
                <input type="time" aria-label="Čas" step={300} className="ui-input h-9" value={timeStr(f.start)} onChange={(e) => setDayTime(dayStr(f.start!), e.target.value)} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[13px] text-ui-muted">
              <MousePointerClick className="h-4 w-4 shrink-0" /> Klikněte do volného místa v kalendáři vlevo.
            </div>
          )}
          <div className="mt-2">
            <Segmented<Len>
              size="sm"
              label="Délka"
              value={f.len}
              onChange={(len) => set({ len })}
              options={[
                { value: "20", label: "20 min" },
                { value: "40", label: "40 min" },
                { value: "60", label: "60 min" },
              ]}
            />
          </div>
        </div>

        <label className="block">
          <span className={label}>Na jaké vyšetření</span>
          <textarea
            className="ui-input min-h-[3.5rem] resize-y py-2"
            rows={2}
            value={f.exam}
            onChange={(e) => set({ exam: e.target.value })}
            placeholder="např. UZ krku, vyšetření vazu v kotníku…"
            required
          />
        </label>
        <label className="block">
          <span className={label}>Jméno a příjmení</span>
          <input className="ui-input" value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {has("field_1") && (
            <label className="block">
              <span className={label}>Rok narození</span>
              <input
                className="ui-input"
                inputMode="numeric"
                maxLength={4}
                value={f.birthYear}
                onChange={(e) => set({ birthYear: e.target.value.replace(/\D/g, "") })}
                placeholder="např. 1975"
              />
            </label>
          )}
          {has("field_2_r") && (
            <div>
              <span className={label}>Pohlaví</span>
              <Segmented<string>
                size="sm"
                label="Pohlaví"
                value={f.gender}
                onChange={(gender) => set({ gender: gender as Draft["gender"] })}
                options={[
                  { value: "Žena", label: "Žena" },
                  { value: "Muž", label: "Muž" },
                ]}
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Mobil</span>
            <input className="ui-input" inputMode="tel" value={f.mobile} onChange={(e) => set({ mobile: e.target.value })} />
          </label>
          <label className="block">
            <span className={label}>E-mail</span>
            <input className="ui-input" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </label>
        </div>
        {(f.mobile || f.email) && <p className="text-[12px] text-ui-faint">SuperSaaS může podle nastavení kalendáře poslat pacientovi potvrzení.</p>}
        {error && (
          <p role="alert" className="rounded-md border border-red-200 px-3 py-2 text-[13px] text-red-700 dark:border-red-900 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" disabled={busy || !valid} title={!f.start ? "Nejdřív vyberte termín v kalendáři" : undefined}>
            {busy ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Objednat
          </Button>
        </div>
      </form>
    </BentoTile>
  );
}

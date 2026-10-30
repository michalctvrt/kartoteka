"use client";

/**
 * Nová objednávka do kalendáře SuperSaaS (jen kalendáře typu „zdroje“ – lib/supersaas/calendars.ts BOOKABLE;
 * jestli do nich smí zapisovat, rozhodne server – SUPERSAAS_WRITE_SCHEDULES).
 * Předvyplnění: čas z kliknutí do kalendáře, údaje z karty pacienta. Obsazený čas a chybějící povinná pole
 * hlídá SuperSaaS – jeho hlášku ukážeme tak, jak přišla (je česky).
 */

import { useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BOOKABLE, calendarById } from "@/lib/supersaas/calendars";
import { createBooking, hm, ssTime } from "./useBookings";

export type BookingPrefill = {
  calendarId?: number;
  start?: Date;
  fullName?: string;
  birthYear?: string;
  gender?: "Žena" | "Muž" | "";
  mobile?: string;
  email?: string;
};

type Len = "20" | "40" | "60";
const p2 = (n: number) => String(n).padStart(2, "0");
const dayStr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Výchozí čas: nejbližší celých 20 minut, nejdřív 7:00 a nejpozději 15:00 (jinak zítra 7:00). */
function defaultStart(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 20) * 20);
  if (d.getHours() < 7) d.setHours(7, 0);
  if (d.getHours() >= 15) {
    d.setDate(d.getDate() + 1);
    d.setHours(7, 0);
  }
  return d;
}

export default function BookingDialog({
  prefill,
  onClose,
  onCreated,
}: {
  prefill: BookingPrefill;
  onClose: () => void;
  onCreated: (r: { id: number | null; calendarId: number; start: Date }) => void;
}) {
  const start0 = prefill.start ?? defaultStart();
  const [f, setF] = useState({
    calendarId: prefill.calendarId && calendarById(prefill.calendarId)?.bookable ? prefill.calendarId : BOOKABLE[0]?.id ?? 0,
    day: dayStr(start0),
    time: `${p2(start0.getHours())}:${p2(start0.getMinutes())}`,
    len: "20" as Len,
    fullName: prefill.fullName ?? "",
    birthYear: prefill.birthYear ?? "",
    gender: prefill.gender ?? "",
    exam: "",
    mobile: prefill.mobile ?? "",
    email: prefill.email ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => {
    setF((x) => ({ ...x, ...p }));
    setError(null);
  };

  const cal = calendarById(f.calendarId);
  const has = (k: "field_1" | "field_1_r" | "field_2_r") => !!cal?.fields.includes(k);
  const start = new Date(`${f.day}T${f.time || "00:00"}:00`);
  const end = new Date(start.getTime() + Number(f.len) * 60_000);
  const valid = !!cal && !isNaN(start.getTime()) && f.fullName.trim().length > 2 && (!has("field_1") || /^\d{4}$/.test(f.birthYear));
  const label = "mb-1 block text-[13px] text-ui-muted";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !cal) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createBooking({
        schedule_id: cal.id,
        start: ssTime(start),
        finish: ssTime(end),
        full_name: f.fullName.trim(),
        mobile: f.mobile,
        email: f.email,
        ...(has("field_1") ? { field_1: f.birthYear } : {}),
        ...(has("field_2_r") && f.gender ? { field_2_r: f.gender } : {}),
        ...(has("field_1_r") && f.exam.trim() ? { field_1_r: f.exam.trim() } : {}),
      });
      onCreated({ id: r.id, calendarId: cal.id, start });
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nová objednávka</DialogTitle>
          <DialogDescription>
            {cal && !isNaN(start.getTime())
              ? `${start.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" })} · ${hm(start)}–${hm(end)} · ${cal.name}`
              : "Vyberte kalendář a čas"}
          </DialogDescription>
        </DialogHeader>

        {!BOOKABLE.length ? (
          <p className="text-sm text-ui-muted">Do žádného kalendáře zatím nejde z Kartotéky zapisovat – objednávejte v SuperSaaS.</p>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            <label className="block">
              <span className={label}>Kalendář</span>
              <select className="ui-input" value={f.calendarId} onChange={(e) => set({ calendarId: Number(e.target.value) })}>
                {BOOKABLE.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <label className="block">
                <span className={label}>Den</span>
                <input type="date" className="ui-input" value={f.day} onChange={(e) => set({ day: e.target.value })} required />
              </label>
              <label className="block">
                <span className={label}>Čas</span>
                <input type="time" step={300} className="ui-input" value={f.time} onChange={(e) => set({ time: e.target.value })} required />
              </label>
            </div>
            <div>
              <span className={label}>Délka</span>
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
            <label className="block">
              <span className={label}>Jméno a příjmení</span>
              <input className="ui-input" value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} autoFocus={!f.fullName} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {has("field_1") && (
                <label className="block">
                  <span className={label}>Rok narození</span>
                  <input className="ui-input" inputMode="numeric" maxLength={4} value={f.birthYear} onChange={(e) => set({ birthYear: e.target.value.replace(/\D/g, "") })} placeholder="např. 1975" />
                </label>
              )}
              {has("field_2_r") && (
                <div>
                  <span className={label}>Pohlaví</span>
                  <Segmented<string>
                    size="sm"
                    label="Pohlaví"
                    value={f.gender}
                    onChange={(gender) => set({ gender: gender as "Žena" | "Muž" })}
                    options={[
                      { value: "Žena", label: "Žena" },
                      { value: "Muž", label: "Muž" },
                    ]}
                  />
                </div>
              )}
            </div>
            {has("field_1_r") && (
              <label className="block">
                <span className={label}>Požadované vyšetření</span>
                <input className="ui-input" value={f.exam} onChange={(e) => set({ exam: e.target.value })} placeholder="např. UZ břicha" />
              </label>
            )}
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
            {(f.mobile || f.email) && (
              <p className="text-[12px] text-ui-faint">SuperSaaS může podle nastavení kalendáře poslat pacientovi potvrzení.</p>
            )}
            {error && (
              <p role="alert" className="rounded-md border border-red-200 px-3 py-2 text-[13px] text-red-700 dark:border-red-900 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>
                Zrušit
              </Button>
              <Button type="submit" disabled={busy || !valid}>
                {busy ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Objednat
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

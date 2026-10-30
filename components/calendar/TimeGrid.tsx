"use client";

/**
 * Časová mřížka kalendáře. Sloupce = dny (den / týden), nebo `columns` = cokoli jiného
 * (pohled „Vše“ ve dni: jeden sloupec na kalendář pobočky).
 * Objednávky jsou bloky podle času; souběžné se rozdělí vedle sebe.
 * Uplynulé jsou ztlumené, dnes je vidět čára „teď“. `colorOf` = barva proužku (z kterého kalendáře).
 */

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type Booking, hm, isBlock, sameDay } from "./useBookings";

const PPM = 2.3; // pixelů na minutu → 20 min = 46 px (vejde se jméno + popis vyšetření)

/** Rozdělí souběžné objednávky do „pruhů“ vedle sebe. */
function lanes(list: Booking[]) {
  const out = new Map<number, { lane: number; of: number }>();
  let group: Booking[] = [];
  let groupEnd = 0;
  const flush = () => {
    const ends: number[] = [];
    const assigned = group.map((b) => {
      let lane = ends.findIndex((e) => e <= b.start.getTime());
      if (lane === -1) lane = ends.length;
      ends[lane] = b.end.getTime();
      return [b.id, lane] as const;
    });
    assigned.forEach(([id, lane]) => out.set(id, { lane, of: ends.length }));
    group = [];
  };
  for (const b of list) {
    if (group.length && b.start.getTime() >= groupEnd) flush();
    group.push(b);
    groupEnd = Math.max(groupEnd, b.end.getTime());
  }
  if (group.length) flush();
  return out;
}

export type GridColumn = { key: string; date: Date; label?: ReactNode; filter?: (b: Booking) => boolean; calendarId?: number };

export default function TimeGrid({
  days,
  columns: given,
  bookings,
  selectedId,
  onSelect,
  now,
  colorOf,
  onEmptyClick,
  pending,
}: {
  days?: Date[];
  columns?: GridColumn[];
  bookings: Booking[];
  selectedId: number | null;
  onSelect: (b: Booking) => void;
  now: Date;
  colorOf?: (b: Booking) => string | undefined;
  /** klik do volného místa → nová objednávka (jen sloupce, kam jde zapisovat – vrací null, když ne) */
  onEmptyClick?: (start: Date, col: GridColumn) => void;
  /** vybraný termín rozepsané nové objednávky – ukáže se jako čárkovaný blok */
  pending?: { start: Date; end: Date };
}) {
  const [hover, setHover] = useState<{ key: string; min: number } | null>(null);
  const columns: GridColumn[] = given ?? (days ?? []).map((d) => ({ key: d.toISOString(), date: d }));
  const inCol = (b: Booking, c: GridColumn) => sameDay(c.date, b.start) && (c.filter?.(b) ?? true);
  const inRange = bookings.filter((b) => columns.some((c) => inCol(b, c)));
  const fromH = Math.min(7, ...inRange.map((b) => b.start.getHours()));
  const toH = Math.max(17, ...inRange.map((b) => b.end.getHours() + (b.end.getMinutes() ? 1 : 0)));
  const minutes = (toH - fromH) * 60;
  const top = (d: Date) => ((d.getHours() - fromH) * 60 + d.getMinutes()) * PPM;
  const hours = Array.from({ length: toH - fromH + 1 }, (_, i) => fromH + i);
  const cols = `3.25rem repeat(${columns.length}, minmax(0, 1fr))`;

  return (
    <div>
      {/* záhlaví dnů */}
      <div className="sticky top-0 z-10 grid border-b border-ui-line bg-ui-sheet" style={{ gridTemplateColumns: cols }}>
        <span />
        {columns.map((c) => {
          const d = c.date;
          const today = sameDay(d, now);
          const count = inRange.filter((b) => inCol(b, c)).length;
          return (
            <div key={c.key} className="min-w-0 truncate px-2 py-2 text-[13px]">
              <span className={cn("font-medium", today && !c.label ? "text-ui-primary" : "text-ui-ink")}>
                {c.label ?? d.toLocaleDateString("cs-CZ", { weekday: columns.length > 1 ? "short" : "long", day: "numeric", month: "numeric" })}
              </span>
              <span className="ml-1.5 text-ui-faint">{count || ""}</span>
            </div>
          );
        })}
      </div>

      {/* mřížka */}
      <div className="relative grid" style={{ gridTemplateColumns: cols, height: minutes * PPM }}>
        {/* hodiny */}
        <div className="relative">
          {hours.slice(0, -1).map((h) => (
            <span
              key={h}
              className={cn("absolute right-2 text-[11px] text-ui-faint", h === fromH ? "translate-y-0" : "-translate-y-1/2")}
              style={{ top: (h - fromH) * 60 * PPM }}
            >
              {h}:00
            </span>
          ))}
        </div>
        {columns.map((c, di) => {
          const list = inRange.filter((b) => inCol(b, c));
          const lane = lanes(list);
          const today = sameDay(c.date, now);
          const nowTop = top(now);
          // pozice myši → začátek slotu (po 20 minutách od začátku mřížky)
          const slotAt = (e: React.MouseEvent<HTMLDivElement>) =>
            Math.max(0, Math.min(minutes - 20, Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / PPM / 20) * 20));
          const onFree = (e: React.MouseEvent<HTMLDivElement>) => !(e.target as HTMLElement).closest("button");
          return (
            <div
              key={c.key}
              className={cn("relative border-l border-ui-rule", today && !c.label && "bg-ui-raised", onEmptyClick && "cursor-copy")}
              onMouseMove={onEmptyClick ? (e) => setHover(onFree(e) ? { key: c.key, min: slotAt(e) } : null) : undefined}
              onMouseLeave={onEmptyClick ? () => setHover(null) : undefined}
              onClick={
                onEmptyClick
                  ? (e) => {
                      if (!onFree(e)) return;
                      const d = new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate(), fromH, 0);
                      onEmptyClick(new Date(d.getTime() + slotAt(e) * 60_000), c);
                    }
                  : undefined
              }
            >
              {pending && sameDay(pending.start, c.date) && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-1 z-[4] rounded-md border-2 border-dashed border-ui-primary bg-ui-sheet/80 px-2 py-1 text-[12px] font-medium text-ui-primary"
                  style={{ top: top(pending.start) + 1, height: Math.max(22, ((pending.end.getTime() - pending.start.getTime()) / 60000) * PPM - 2) }}
                >
                  {hm(pending.start)} nová objednávka
                </div>
              )}
              {hover?.key === c.key && !(pending && sameDay(pending.start, c.date) && top(pending.start) === hover.min * PPM) && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-1 z-[2] flex items-start rounded-md border border-dashed border-ui-primary px-2 py-1 text-[12px] text-ui-primary"
                  style={{ top: hover.min * PPM + 1, height: 20 * PPM - 2 }}
                >
                  + {String(fromH + Math.floor(hover.min / 60))}:{String(hover.min % 60).padStart(2, "0")}
                </div>
              )}
              {hours.map((h) => (
                <div key={h} aria-hidden className="absolute inset-x-0 border-t border-ui-rule" style={{ top: (h - fromH) * 60 * PPM }} />
              ))}
              {list.map((b, i) => {
                const l = lane.get(b.id) ?? { lane: 0, of: 1 };
                const h = Math.max(22, (b.end.getTime() - b.start.getTime()) / 60000 * PPM - 2);
                const past = b.end < now;
                const selected = b.id === selectedId;
                const block = isBlock(b); // blokace rozvrhu, ne objednávka pacienta
                return (
                  <motion.button
                    key={b.id}
                    type="button"
                    onClick={() => onSelect(b)}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: past && !selected ? 0.55 : 1, x: 0 }}
                    transition={{ delay: 0.05 + Math.min(i, 20) * 0.012 + di * 0.03, duration: 0.18 }}
                    whileHover={{ y: -1 }}
                    className={cn(
                      "absolute flex flex-col justify-start overflow-hidden rounded-md border px-2 py-1 text-left text-[12px] leading-tight transition-shadow",
                      block
                        ? "z-0 border-dashed border-ui-control bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--ui-rule)_6px_7px)] text-ui-muted"
                        : "z-[1] border-ui-line border-l-[3px] border-l-brand-500 bg-ui-active",
                      selected && "z-[5] ring-2 ring-ui-primary"
                    )}
                    style={{
                      ...(colorOf && !block ? { borderLeftColor: colorOf(b) } : null),
                      top: top(b.start) + 1,
                      height: h,
                      left: `calc(${(l.lane / l.of) * 100}% + 2px)`,
                      width: `calc(${100 / l.of}% - 4px)`,
                    }}
                    title={`${hm(b.start)}–${hm(b.end)} ${b.title}${b.exam ? ` · ${b.exam}` : ""}`}
                  >
                    <span className="block w-full truncate font-medium">
                      <span className="mr-1 font-normal text-ui-muted">{block ? `${hm(b.start)}–${hm(b.end)}` : hm(b.start)}</span>
                      {block ? `Blokace · ${b.title}` : b.title}
                    </span>
                    {/* popis vyšetření z objednávky (např. „UZ břicha“, „dopler“) – vždy, když není blokace */}
                    {!block && b.exam && (
                      // delší objednávka má místo → popis na víc řádků (zbytek „…“)
                      <span
                        className={cn("block w-full text-ui-muted", h < 60 ? "truncate" : "overflow-hidden")}
                        style={
                          h < 60
                            ? undefined
                            : { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: Math.max(1, Math.floor((h - 22) / 15)) }
                        }
                      >
                        {b.exam}
                      </span>
                    )}
                  </motion.button>
                );
              })}
              {today && nowTop >= 0 && nowTop <= minutes * PPM && (
                <div aria-hidden className="pointer-events-none absolute inset-x-0 z-[6]" style={{ top: nowTop }}>
                  <div className="h-px bg-red-500" />
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

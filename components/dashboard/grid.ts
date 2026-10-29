/**
 * Pravidla mřížky plochy: povolené velikosti oken a „vejde se do mezery“.
 *
 * Mřížka má 12 sloupců. Okna mají jen pár šířek a výšek, aby do sebe
 * zapadala (čtvrtina, třetina, polovina … celá šířka).
 */
import type { Layout } from "react-grid-layout";

export const COLS = 12;
/** Šířky: ¼, ⅓, ½, ⅔, ¾, celá */
export const WIDTHS = [3, 4, 6, 8, 9, 12];
/** Výšky v řádcích (řádek ≈ 46 px): malá … extra velká */
export const HEIGHTS = [4, 6, 9, 13, 18];

interface Mins {
  minW?: number;
  minH?: number;
}

const allowedW = (m: Mins) => WIDTHS.filter((w) => w >= (m.minW ?? 0));
const allowedH = (m: Mins) => HEIGHTS.filter((h) => h >= (m.minH ?? 0));

/** Nejbližší povolená hodnota (při shodě vzdálenosti ta větší). */
function nearest(values: number[], v: number) {
  return values.reduce((best, x) =>
    Math.abs(x - v) < Math.abs(best - v) || (Math.abs(x - v) === Math.abs(best - v) && x > best)
      ? x
      : best
  );
}

export function snapSize(w: number, h: number, m: Mins) {
  return { w: nearest(allowedW(m), w), h: nearest(allowedH(m), h) };
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Největší povolená velikost (nejvýš preferovaná w×h), která se na pozici
 * x,y vejde mezi ostatní okna. null = nevejde se ani nejmenší.
 */
export function fitAt(others: Layout[], x: number, y: number, prefW: number, prefH: number, m: Mins) {
  const ws = allowedW(m).filter((w) => w <= Math.max(prefW, allowedW(m)[0]) && x + w <= COLS);
  const hs = allowedH(m).filter((h) => h <= Math.max(prefH, allowedH(m)[0]));
  const candidates = ws
    .flatMap((w) => hs.map((h) => ({ w, h })))
    .sort((a, b) => b.w * b.h - a.w * a.h || b.w - a.w);
  for (const c of candidates) {
    const r = { x, y, ...c };
    if (!others.some((o) => overlaps(r, o))) return c;
  }
  return null;
}

/** Je okno v kolizi s jiným? */
export function collides(item: Layout, others: Layout[]) {
  return others.some((o) => overlaps(item, o));
}

/** První volné místo pro nové okno (od shora, zleva). */
export function findSpot(layout: Layout[], w: number, h: number) {
  const bottom = layout.reduce((b, l) => Math.max(b, l.y + l.h), 0);
  for (let y = 0; y <= bottom; y++) {
    for (let x = 0; x + w <= COLS; x++) {
      if (!layout.some((o) => overlaps({ x, y, w, h }, o))) return { x, y };
    }
  }
  return { x: 0, y: bottom };
}

/** Uložená rozložení ze starší verze zaokrouhlit na povolené velikosti. */
export function normalize(layout: Layout[], mins: (i: string) => Mins): Layout[] {
  const out: Layout[] = [];
  for (const l of layout) {
    const s = snapSize(l.w, l.h, mins(l.i));
    let item = { ...l, ...s, x: Math.min(l.x, COLS - s.w) };
    if (collides(item, out)) item = { ...item, ...findSpot(out, s.w, s.h) };
    out.push(item);
  }
  return out;
}

/**
 * „Udělej místo“: okno puštěné mezi okna v jedné řadě → okna v té řadě
 * (vč. nového) se rozdělí rovnoměrně na šířku (2 → ½, 3 → ⅓, 4 → ¼).
 * Vrací nové rozložení (ostatní okna + přetahované), nebo null když to nejde
 * (moc oken v řadě, okno by bylo pod svou min. šířku, nebo by se něco
 * překrylo).
 */
export function makeRoom(
  others: Layout[],
  drag: { i: string; x: number; y: number; prefW: number; prefH: number },
  mins: (i: string) => Mins
): Layout[] | null {
  const row = others.filter((o) => o.y <= drag.y && drag.y < o.y + o.h).sort((a, b) => a.x - b.x);
  if (row.length === 0) return null;
  const n = row.length + 1;
  const w = { 2: 6, 3: 4, 4: 3 }[n];
  if (!w) return null;
  if ([...row.map((r) => r.i), drag.i].some((i) => (mins(i).minW ?? 0) > w)) return null;

  // kam se nové okno zařadí: podle středu přetahovaného okna
  const center = drag.x + Math.min(drag.prefW, w) / 2;
  const k = row.filter((o) => o.x + o.w / 2 < center).length;

  const rowIds = new Set(row.map((r) => r.i));
  const rest = others.filter((o) => !rowIds.has(o.i));
  const order: (Layout | null)[] = [...row.slice(0, k), null, ...row.slice(k)];

  const moved: Layout[] = [];
  let dragX = 0;
  order.forEach((o, idx) => {
    if (o) moved.push({ ...o, x: idx * w, w });
    else dragX = idx * w;
  });
  const placed = [...rest, ...moved];
  if (moved.some((m) => collides(m, placed.filter((p) => p.i !== m.i)))) return null;

  // výška nového okna: co největší (do preferované), co se vejde
  const hs = HEIGHTS.filter((h) => h >= (mins(drag.i).minH ?? 0) && h <= Math.max(drag.prefH, 0)).reverse();
  // zarovnat na horní hranu řady (když to jde), jinak tam, kde bylo puštěno
  const rowTop = Math.min(...row.map((r) => r.y));
  for (const y of [...new Set([rowTop, drag.y])]) {
    for (const h of hs) {
      const item = { i: drag.i, x: dragX, y, w, h };
      if (!collides(item, placed)) return [...placed, item];
    }
  }
  return null;
}

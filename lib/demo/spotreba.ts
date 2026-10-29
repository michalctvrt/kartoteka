/**
 * DEMO spotřebního materiálu – celé API originálu (/opt/testapp/backend/spotreba) v paměti.
 * Jen pro DEMO_MODE=1 / testy; ostrá data se tu nikdy nečtou ani nemění.
 * PIN správy katalogu v demu: 1234.
 */

import type { Branch, Category, Item, ItemGroup, LineInput, Order, OrderLine } from "@/lib/spotreba/types";

export const DEMO_PIN = "1234";

const SEED_ITEMS: [Category, ItemGroup, string, string, string | null, number | null, string | null][] = [
  ["MAKRO", "PAPIRNICTVI", "Papír do tiskárny A4", "balení", "500 listů", null, null],
  ["MAKRO", "PAPIRNICTVI", "Příjmové doklady", "blok", null, null, null],
  ["MAKRO", "PAPIRNICTVI", "Trhací bločky", "ks", null, null, null],
  ["MAKRO", "PAPIRNICTVI", "Bločky v plastové krabičce – lékaři", "ks", null, null, null],
  ["MAKRO", "PAPIRNICTVI", "Samolepicí bločky", "ks", null, null, null],
  ["MAKRO", "PAPIRNICTVI", "Provaz na skartaci", "ks", null, null, null],
  ["MAKRO", "DROGERIE", "TORK ubrousky N4/N12", "balení", "5 ks v balení", 5, "ks"],
  ["MAKRO", "DROGERIE", "TORK ubrousky H2", "balení", null, null, null],
  ["MAKRO", "DROGERIE", "Kapesníky", "balení", "10 balíčků", 10, "balíček"],
  ["MAKRO", "DROGERIE", "Dětské vlhčené ubrousky (Linteo / Pampers)", "balení", null, null, null],
  ["MAKRO", "DROGERIE", "Domestos WC", "lahev", "750 ml", null, null],
  ["MAKRO", "DROGERIE", "Dezinfekce na stoly Sanytol", "lahev", "500 ml", null, null],
  ["MAKRO", "DROGERIE", "Dezinfekce na ruce", "lahev", "500 ml", null, null],
  ["MAKRO", "DROGERIE", "Indulona olivová", "ks", "tuba 100 ml", null, null],
  ["MAKRO", "DROGERIE", "Mýdlo TORK – náhradní náplň", "ks", "475 ml", null, null],
  ["MAKRO", "DROGERIE", "Mýdlo tekuté", "lahev", "500 ml", null, null],
  ["MAKRO", "DROGERIE", "Bref závěs do WC", "ks", null, null, null],
  ["MAKRO", "DROGERIE", "Vonný olej do vysoušeče rukou", "ks", null, null, null],
  ["MAKRO", "DROGERIE", "Osvěžovač vzduchu sprej", "ks", null, null, null],
  ["MAKRO", "DROGERIE", "Jar", "lahev", "900 ml", null, null],
  ["MAKRO", "DROGERIE", "Houbičky na nádobí", "balení", "10 ks v balení", 10, "ks"],
  ["MAKRO", "DROGERIE", "Kyselina citronová", "balení", null, null, null],
  ["MAKRO", "POTRAVINY", "Káva Jacobs Gold rozpustná", "ks", "sklenice 200 g", null, null],
  ["MAKRO", "POTRAVINY", "Mléko", "litr", null, null, null],
  ["MAKRO", "POTRAVINY", "Cukr", "kg", null, null, null],
  ["MAKRO", "POTRAVINY", "Sirup YO lesní směs", "lahev", "0,7 l", null, null],
  ["MAKRO", "POTRAVINY", "Čaj zelený", "krabička", "20 sáčků", null, null],
  ["MAKRO", "POTRAVINY", "Čaj ovocný", "krabička", "20 sáčků", null, null],
  ["MAKRO", "POTRAVINY", "Čaj mátový", "krabička", "20 sáčků", null, null],
  ["MAKRO", "POTRAVINY", "Čaj s chilli", "krabička", "20 sáčků", null, null],
  ["MAKRO", "POTRAVINY", "Čaj bylinkový", "krabička", "20 sáčků", null, null],
  ["MAKRO", "POTRAVINY", "Trolli Mini Burger", "balení", "60 × 10 g", 60, "ks"],
  ["MAKRO", "POTRAVINY", "Haribo Mini Goldbären", "balení", "100 × 10 g", 100, "ks"],
  ["MAKRO", "POTRAVINY", "Kukuřičné tyčinky", "balení", "6 × 70 g", 6, "ks"],
  ["MAKRO", "POTRAVINY", "Mandle ve skořici", "balení", null, null, null],
  ["MAKRO", "POTRAVINY", "Fidorky pro personál", "balení", null, null, null],
  ["SKLAD", "DROGERIE", "WC papír", "balení", "12 rolí", 12, "role"],
  ["SKLAD", "DROGERIE", "TORK role – ručník", "ks", null, null, null],
  ["SKLAD", "PAPIRNICTVI", "Role do tiskárny", "ks", null, null, null],
  ["SKLAD", "OSTATNI", "UZ gel", "lahev", "500 ml", null, null],
  ["OBJEDNAT", "PAPIRNICTVI", "Propustky", "blok", null, null, null],
  ["OBJEDNAT", "PAPIRNICTVI", "Prospektové folie A4", "balení", "100 ks", 100, "ks"],
  ["OBJEDNAT", "PAPIRNICTVI", "Papír do tiskárny účtenek", "role", null, null, null],
  ["OBJEDNAT", "PAPIRNICTVI", "Pero Pentel EnerGel", "ks", null, null, null],
  ["OBJEDNAT", "PAPIRNICTVI", "Náplň do pera Pentel EnerGel", "ks", null, null, null],
  ["OBJEDNAT", "PAPIRNICTVI", "Náplň do propisky – pacienti", "ks", null, null, null],
  ["OBJEDNAT", "PAPIRNICTVI", "Fix na CD", "ks", null, null, null],
  ["OBJEDNAT", "OSTATNI", "CD", "ks", null, null, null],
  ["OBJEDNAT", "OSTATNI", "CD obaly", "ks", null, null, null],
  ["OBJEDNAT", "OSTATNI", "Toner", "ks", "doplň typ do poznámky", null, null],
  ["OBJEDNAT", "OSTATNI", "Ofsetový válec", "ks", null, null, null],
];

type Db = { branches: Branch[]; items: Item[]; orders: Order[]; lines: OrderLine[]; seq: number };
const g = globalThis as unknown as { __kartotekaSpotreba?: Db };

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const period = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function db(): Db {
  if (g.__kartotekaSpotreba) return g.__kartotekaSpotreba;
  const branches: Branch[] = [
    { id: 1, code: "BRDO", name: "Dobrovského", is_warehouse: 0, active: 1, sort_order: 10, color: "#B95B42", color_light: "#D59D8E" },
    { id: 2, code: "BRLE", name: "Lesná", is_warehouse: 0, active: 1, sort_order: 20, color: "#4A743D", color_light: "#8BB38D" },
    { id: 3, code: "BRVI", name: "Vídeňská", is_warehouse: 1, active: 1, sort_order: 30, color: "#E8A900", color_light: "#DBBF5E" },
  ];
  const items: Item[] = SEED_ITEMS.map(([category, item_group, name, unit, pack_note, pack_size, piece_unit], i) => ({
    id: i + 1,
    category,
    item_group,
    name,
    unit,
    pack_note,
    pack_size,
    piece_unit,
    active: 1,
    sort_order: (i + 1) * 10,
  }));
  const d: Db = { branches, items, orders: [], lines: [], seq: 1000 };
  // ukázka: minulý měsíc uzavřený na obou pobočkách, tento měsíc Lesná rozepsaná
  const mk = (branchId: number, per: string, locked: boolean, picks: [number, number, string?][]) => {
    const o: Order = {
      id: d.seq++,
      branch_id: branchId,
      period: per,
      status: locked ? "locked" : "open",
      note: null,
      created_at: now(),
      updated_at: now(),
      locked_at: locked ? now() : null,
      locked_by: locked ? (branchId === 1 ? "Recepce Dobrovského" : "Recepce Lesná") : null,
    };
    d.orders.push(o);
    picks.forEach(([itemId, qty, note]) => {
      const it = items[itemId - 1];
      d.lines.push({ id: d.seq++, order_id: o.id, item_id: it.id, custom_name: null, category: it.category, qty, note: note ?? null, unit_mode: "pack" });
    });
  };
  mk(1, period(-1), true, [[1, 4], [7, 2], [23, 3], [37, 2], [50, 1, "HP 305A"]]);
  mk(2, period(-1), true, [[1, 3], [9, 2], [24, 6], [37, 3], [42, 1]]);
  mk(2, period(0), false, [[1, 2], [23, 2], [37, 1]]);
  g.__kartotekaSpotreba = d;
  return d;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const err = (status: number, error: string) => json({ error }, status);
const validPeriod = (p: string | null) => !!p && /^\d{4}-(0[1-9]|1[0-2])$/.test(p);

export function demoSpotreba(method: string, sub: string, q: URLSearchParams, body: string | undefined, pin: string | null): Response {
  const d = db();
  const B = body ? (JSON.parse(body) as Record<string, unknown>) : {};
  const admin = () => (pin ?? (B.pin as string | undefined)) === DEMO_PIN;
  const parts = sub.split("/");

  if (sub === "admin-check") return admin() ? json({ ok: true }) : err(401, "Neplatný PIN.");
  if (sub === "branches") return json(d.branches.filter((b) => b.active).sort((a, b) => a.sort_order - b.sort_order));
  if (sub === "periods") return json([...new Set(d.orders.map((o) => o.period))].sort().reverse());

  if (parts[0] === "items") {
    if (method === "GET") {
      const list = q.get("all") === "1" ? d.items : d.items.filter((i) => i.active);
      return json([...list].sort((a, b) => a.category.localeCompare(b.category) || String(a.item_group).localeCompare(String(b.item_group)) || a.sort_order - b.sort_order));
    }
    if (!admin()) return err(401, "Neplatný PIN.");
    if (method === "POST") {
      if (!["MAKRO", "SKLAD", "OBJEDNAT"].includes(String(B.category)) || !String(B.name ?? "").trim()) return err(400, "Neplatná kategorie nebo název.");
      const ps = Math.round(Number(B.packSize));
      const it: Item = {
        id: d.seq++,
        category: B.category as Category,
        item_group: (["PAPIRNICTVI", "DROGERIE", "POTRAVINY", "OSTATNI"].includes(String(B.itemGroup)) ? B.itemGroup : "OSTATNI") as ItemGroup,
        name: String(B.name).trim(),
        unit: String(B.unit || "ks"),
        pack_note: (B.packNote as string) || null,
        pack_size: ps > 1 ? ps : null,
        piece_unit: (B.pieceUnit as string) || null,
        active: 1,
        sort_order: Number(B.sortOrder) || 9999,
      };
      d.items.push(it);
      return json(it);
    }
    const it = d.items.find((x) => x.id === Number(parts[1]));
    if (!it) return err(404, "Položka nenalezena.");
    if (method === "DELETE") {
      it.active = 0;
      return json({ ok: true });
    }
    if (method === "PUT") {
      const map: [string, keyof Item][] = [["category", "category"], ["itemGroup", "item_group"], ["name", "name"], ["unit", "unit"], ["packNote", "pack_note"], ["pieceUnit", "piece_unit"], ["sortOrder", "sort_order"], ["active", "active"]];
      map.forEach(([k, f]) => {
        if (B[k] !== undefined) (it as unknown as Record<string, unknown>)[f] = B[k];
      });
      if (B.packSize !== undefined) {
        const ps = Math.round(Number(B.packSize));
        it.pack_size = B.packSize === "" || !(ps > 1) ? null : ps;
      }
      return json(it);
    }
  }

  if (parts[0] === "order") {
    if (method === "GET" && parts.length === 1) {
      const branchId = Number(q.get("branchId"));
      const per = q.get("period");
      if (!branchId) return err(400, "Chybí pobočka.");
      if (!validPeriod(per)) return err(400, "Období musí být ve tvaru RRRR-MM.");
      const branch = d.branches.find((b) => b.id === branchId);
      if (!branch) return err(404, "Pobočka nenalezena.");
      let order = d.orders.find((o) => o.branch_id === branchId && o.period === per);
      if (!order) {
        order = { id: d.seq++, branch_id: branchId, period: per!, status: "open", note: null, created_at: now(), updated_at: null, locked_at: null, locked_by: null };
        d.orders.push(order);
      }
      return json({ order, branch, lines: d.lines.filter((l) => l.order_id === order!.id) });
    }
    const order = d.orders.find((o) => o.id === Number(parts[1]));
    if (!order) return err(404, "Objednávka nenalezena.");
    if (method === "PUT") {
      if (order.status === "locked") return err(409, "Objednávka je uzavřená.");
      const lines = (B.lines as LineInput[]) ?? [];
      d.lines = d.lines.filter((l) => l.order_id !== order.id);
      for (const l of lines) {
        const qty = Math.round(Number(l.qty));
        if (!(qty > 0)) continue;
        if (l.itemId) {
          const it = d.items.find((x) => x.id === l.itemId);
          if (!it) continue;
          d.lines.push({ id: d.seq++, order_id: order.id, item_id: it.id, custom_name: null, category: it.category, qty, note: l.note ?? null, unit_mode: it.pack_size && l.unitMode === "piece" ? "piece" : "pack" });
        } else if (l.customName?.trim()) {
          d.lines.push({ id: d.seq++, order_id: order.id, item_id: null, custom_name: l.customName.trim(), category: l.category ?? "MAKRO", qty, note: l.note ?? null, unit_mode: "pack" });
        }
      }
      if (B.note !== undefined) order.note = (B.note as string) || null;
      order.updated_at = now();
      return json({ order, lines: d.lines.filter((l) => l.order_id === order.id) });
    }
    if (method === "POST" && parts[2] === "lock") {
      if (order.status === "locked") return err(409, "Objednávka už je uzavřená.");
      if (!String(B.lockedBy ?? "").trim()) return err(400, "Vyplňte, kdo objednávku uzavírá.");
      if (!d.lines.some((l) => l.order_id === order.id)) return err(400, "Objednávka je prázdná.");
      Object.assign(order, { status: "locked", locked_at: now(), locked_by: String(B.lockedBy).trim() });
      return json({ order });
    }
    if (method === "POST" && parts[2] === "unlock") {
      if (!admin()) return err(401, "Neplatný PIN.");
      Object.assign(order, { status: "open", locked_at: null, locked_by: null });
      return json({ order });
    }
  }

  if (sub === "summary") {
    const per = q.get("period");
    if (!validPeriod(per)) return err(400, "Období musí být ve tvaru RRRR-MM.");
    const branches = d.branches.filter((b) => b.active);
    const orders = d.orders
      .filter((o) => o.period === per)
      .map((o) => {
        const b = d.branches.find((x) => x.id === o.branch_id)!;
        return { ...o, branch_code: b.code, branch_name: b.name };
      });
    const map = new Map<string, ReturnType<typeof entry>>();
    function entry(l: OrderLine) {
      const it = l.item_id ? d.items.find((x) => x.id === l.item_id) : undefined;
      return {
        category: l.category,
        itemGroup: (it?.item_group ?? "OSTATNI") as ItemGroup,
        name: it?.name ?? l.custom_name ?? "",
        unit: it?.unit ?? "ks",
        packNote: it?.pack_note ?? null,
        packSize: it?.pack_size ?? null,
        pieceUnit: it?.piece_unit ?? null,
        sortOrder: it?.sort_order ?? 99999,
        isCustom: !it,
        byBranch: {} as Record<string, { pack: number; piece: number; base: number }>,
        notes: [] as { branch: string; note: string }[],
        totalBase: 0,
      };
    }
    for (const o of orders) {
      for (const l of d.lines.filter((x) => x.order_id === o.id)) {
        const e0 = entry(l);
        const key = `${e0.category}||${e0.name}||${e0.unit}`;
        const e = map.get(key) ?? (map.set(key, e0), e0);
        const pieces = l.unit_mode === "piece" ? l.qty : l.qty * (e.packSize || 1);
        const cell = (e.byBranch[o.branch_id] ??= { pack: 0, piece: 0, base: 0 });
        if (l.unit_mode === "piece") cell.piece += l.qty;
        else cell.pack += l.qty;
        cell.base += pieces;
        e.totalBase += pieces;
        if (l.note) e.notes.push({ branch: o.branch_code, note: l.note });
      }
    }
    const items = [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "cs"));
    return json({ period: per, branches, orders, items, allLocked: orders.length > 0 && orders.every((o) => o.status === "locked") });
  }

  return err(501, `Demo spotřeby tuto adresu neumí: ${method} ${sub}`);
}

/**
 * Spotřební materiál – tvary dat přesně podle backendu provozní aplikace
 * (/opt/testapp/backend/spotreba, viz docs/TESTAPP.md). Sdílí klient i demo.
 */

export type Category = "MAKRO" | "SKLAD" | "OBJEDNAT";
export type ItemGroup = "PAPIRNICTVI" | "DROGERIE" | "POTRAVINY" | "OSTATNI";
export type UnitMode = "pack" | "piece";

export const CATEGORIES: Category[] = ["MAKRO", "SKLAD", "OBJEDNAT"];
export const CATEGORY_NAME: Record<Category, string> = {
  MAKRO: "Makro",
  SKLAD: "Sklad Vídeňská",
  OBJEDNAT: "Objednat online",
};
export const CATEGORY_HINT: Record<Category, string> = {
  MAKRO: "Nakupuje se osobně v Makru – sečte se za všechny pobočky",
  SKLAD: "Výdej z centrálního skladu na Vídeňské",
  OBJEDNAT: "Objednává se přes e-shop (Alza apod.)",
};
export const GROUPS: ItemGroup[] = ["PAPIRNICTVI", "DROGERIE", "POTRAVINY", "OSTATNI"];
export const GROUP_NAME: Record<ItemGroup, string> = {
  PAPIRNICTVI: "Papírnictví",
  DROGERIE: "Drogerie",
  POTRAVINY: "Potraviny",
  OSTATNI: "Ostatní",
};

export interface Branch {
  id: number;
  code: string;
  name: string;
  is_warehouse: number;
  active: number;
  sort_order: number;
  color?: string | null;
  color_light?: string | null;
}

export interface Item {
  id: number;
  category: Category;
  item_group: ItemGroup | null;
  name: string;
  unit: string;
  pack_note: string | null;
  pack_size: number | null;
  piece_unit: string | null;
  active: number;
  sort_order: number;
}

export interface Order {
  id: number;
  branch_id: number;
  period: string; // RRRR-MM
  status: "open" | "locked";
  note: string | null;
  created_at: string;
  updated_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
}

export interface OrderLine {
  id: number;
  order_id: number;
  item_id: number | null; // null = mimo katalog
  custom_name: string | null;
  category: Category;
  qty: number;
  note: string | null;
  unit_mode: UnitMode;
}

/** Řádek posílaný při uložení (PUT /order/:id) */
export interface LineInput {
  itemId?: number;
  customName?: string;
  category?: Category;
  qty: number;
  unitMode?: UnitMode;
  note?: string | null;
}

export interface SummaryItem {
  category: Category;
  itemGroup: ItemGroup;
  name: string;
  unit: string;
  packNote: string | null;
  packSize: number | null;
  pieceUnit: string | null;
  sortOrder: number;
  isCustom: boolean;
  byBranch: Record<string, { pack: number; piece: number; base: number }>;
  notes: { branch: string; note: string }[];
  totalBase: number;
}

export interface Summary {
  period: string;
  branches: Branch[];
  orders: (Order & { branch_code: string; branch_name: string })[];
  items: SummaryItem[];
  allLocked: boolean;
}

/** Kusy zpět na „N balení + M kusů“ (stejně jako originál). */
export function formatQty(base: number, packSize: number | null, unit: string, pieceUnit: string | null): string {
  if (!base) return "—";
  if (!packSize || packSize <= 1) return `${base} ${unit}`;
  const packs = Math.floor(base / packSize);
  const rest = base % packSize;
  const parts = [];
  if (packs) parts.push(`${packs} ${unit}`);
  if (rest) parts.push(`${rest} ${pieceUnit || "ks"}`);
  return parts.join(" + ");
}

/** „2026-10“ → „říjen 2026“ */
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
}

export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Role a oprávnění Kartotéky – JEDINÉ místo, kde se rozhoduje, kdo co smí.
 *
 * Role jsou PŘEDVOLBY oprávnění:
 *   Admin     – vše + správa zaměstnanců a jejich rolí
 *   Recepční  – rozřazování příchozích (fronta recepce), zakládání a úprava pacientů i vyšetření
 *   Laborant  – worklist a vyvolávání pacientů do ordinace; pacienty jen čte
 *   Lékař     – worklist, studie (popis), vyvolání pacienta; pacienty jen čte
 *
 * U každého zaměstnance pak admin může jednotlivá oprávnění přidat (`grants`) nebo
 * odebrat (`denies`). Ukládají se jen odchylky → změna výchozích práv role se
 * propíše všem, kdo na dané oprávnění nemají ruční výjimku.
 * Uživatel může mít víc rolí – oprávnění rolí se sčítají.
 * Backend (Václav) dnes zná role admin / doctor / administrativa → viz BACKEND_ROLE.
 */

export type Role = "admin" | "reception" | "lab" | "doctor";

export const ROLES: Role[] = ["admin", "reception", "lab", "doctor"];

export const ROLE_NAME: Record<Role, string> = {
  admin: "Administrátor",
  reception: "Recepční",
  lab: "Laborant",
  doctor: "Lékař",
};

export const ROLE_HINT: Record<Role, string> = {
  admin: "Vše + správa zaměstnanců a rolí",
  reception: "Příchozí pacienti, pacienti a vyšetření",
  lab: "Worklist a vyvolávání do ordinace",
  doctor: "Worklist, popis studií, vyvolání pacienta",
};

/** Domovská plocha role (adresa = pracovní prostor). */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  reception: "/reception",
  lab: "/lab",
  doctor: "/doctor",
};

const ALL: Role[] = ["admin", "reception", "lab", "doctor"];

/**
 * Všechna oprávnění: skupina a popis pro administraci + výchozí role.
 * Nové oprávnění = nový řádek tady (a jeho použití v UI přes can("…")).
 */
export const CAPABILITIES = {
  // Plocha – okna, která si zaměstnanec smí zapnout
  "widget.waiting": { group: "Plocha", label: "Okna čekáren RTG / UZ / MRI", roles: ALL },
  "widget.messages": { group: "Plocha", label: "Okno Aktuality a provozní zprávy", roles: ALL },
  "widget.newPatient": { group: "Plocha", label: "Okno Nový pacient", roles: ["admin", "reception"] },
  "widget.todayOrders": { group: "Plocha", label: "Okno Dnešní objednávky", roles: ["admin", "reception"] },

  // Vyvolávací systém
  "queue.reception": {
    group: "Vyvolávací systém",
    label: "Recepce: vyvolat, přiřadit lístek, rozřadit do čekáren",
    roles: ["admin", "reception"],
  },
  "queue.call": { group: "Vyvolávací systém", label: "Vyvolat do ordinace a poslat dál („Hotovo →“)", roles: ["admin", "lab", "doctor"] },
  "worklist.view": { group: "Vyvolávací systém", label: "Worklist (čekárny přes celou obrazovku)", roles: ["admin", "lab", "doctor"] },

  // Pacienti
  "patient.view": { group: "Pacienti", label: "Vyhledat a zobrazit kartu pacienta", roles: ALL },
  "patient.create": { group: "Pacienti", label: "Založit nového pacienta", roles: ["admin", "reception"] },
  "patient.edit": { group: "Pacienti", label: "Upravit údaje pacienta", roles: ["admin", "reception"] },
  "insurance.check": { group: "Pacienti", label: "Ověřit pojištění v registru", roles: ["admin", "reception"] },

  // Studie
  "study.view": { group: "Studie", label: "Vyhledat a zobrazit studii", roles: ALL },
  "study.create": { group: "Studie", label: "Založit vyšetření", roles: ["admin", "reception"] },
  "study.edit": { group: "Studie", label: "Upravit vyšetření (žádanka, výkony)", roles: ["admin", "reception"] },
  "report.write": { group: "Studie", label: "Popsat studii", roles: ["admin", "doctor"] },
  "remoteAccess.extend": { group: "Studie", label: "Prodloužit online přístup ke zprávě", roles: ["admin", "reception"] },
  "print.batch": { group: "Studie", label: "Hromadný tisk zpráv za den", roles: ["admin", "reception"] },

  // Spolupráce
  "doctors.view": { group: "Spolupráce", label: "Připojení lékaři (CGM, E-zpráva, LIVEcom)", roles: ALL },

  // Objednávky
  "calendar.view": { group: "Objednávky", label: "Kalendář objednávek", roles: ["admin", "reception"] },

  // Administrace
  "staff.manage": { group: "Administrace", label: "Spravovat zaměstnance a jejich oprávnění", roles: ["admin"] },
} as const satisfies Record<string, { group: string; label: string; roles: readonly Role[] }>;

export type Capability = keyof typeof CAPABILITIES;

export const CAPABILITY_IDS = Object.keys(CAPABILITIES) as Capability[];

/** Oprávnění seskupená pro zobrazení (pořadí podle CAPABILITIES). */
export const CAPABILITY_GROUPS: { group: string; caps: Capability[] }[] = CAPABILITY_IDS.reduce<
  { group: string; caps: Capability[] }[]
>((acc, id) => {
  const g = CAPABILITIES[id].group;
  const found = acc.find((x) => x.group === g);
  if (found) found.caps.push(id);
  else acc.push({ group: g, caps: [id] });
  return acc;
}, []);

/** Výchozí oprávnění podle rolí (bez výjimek). */
export function roleCaps(roles: readonly Role[] | undefined): Set<Capability> {
  return new Set(CAPABILITY_IDS.filter((c) => roles?.some((r) => (CAPABILITIES[c].roles as readonly Role[]).includes(r))));
}

export type Access = { roles?: readonly Role[]; grants?: readonly Capability[] | null; denies?: readonly Capability[] | null };

/** Skutečná oprávnění zaměstnance = role + přidané − odebrané. */
export function effectiveCaps(a: Access | null | undefined): Set<Capability> {
  const set = roleCaps(a?.roles);
  a?.grants?.forEach((c) => set.add(c));
  a?.denies?.forEach((c) => set.delete(c));
  return set;
}

export function can(caps: ReadonlySet<Capability> | undefined, cap: Capability): boolean {
  return !!caps?.has(cap);
}

/**
 * Pracovní prostor podle adresy (/reception…, /lab…, /doctor…, /admin…).
 * Do prostoru role smí jen ta role (a admin, který smí všude).
 */
export function workspaceOf(pathname: string): Role | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/doctor")) return "doctor";
  if (pathname.startsWith("/lab")) return "lab";
  if (pathname.startsWith("/reception")) return "reception";
  return null;
}

/**
 * Stránky, které nepatří jedné roli, ale oprávnění (karta pacienta/studie leží
 * pod /reception, ale číst je smí i laborant a lékař).
 */
const ROUTE_CAPS: [RegExp, Capability][] = [
  [/^\/reception\/patients\/new/, "patient.create"],
  [/^\/reception\/patients/, "patient.view"],
  [/^\/reception\/print/, "print.batch"],
  [/^\/reception\/doctors/, "doctors.view"],
  [/^\/reception\/studies/, "study.view"],
  [/^\/reception\/calendar/, "calendar.view"],
  [/^\/(lab|doctor)\/worklist/, "worklist.view"],
  [/^\/admin/, "staff.manage"],
];

/** Smí uživatel na tuto adresu? */
export function canVisit(roles: readonly Role[] | undefined, caps: ReadonlySet<Capability>, pathname: string): boolean {
  if (!roles?.length) return false;
  const rule = ROUTE_CAPS.find(([re]) => re.test(pathname));
  if (rule) return caps.has(rule[1]);
  const ws = workspaceOf(pathname);
  return ws ? roles.includes(ws) || roles.includes("admin") : true;
}

/**
 * Role ze stávajícího backendu → naše role. „Laborant“ v backendu zatím není
 * (PŘEDPOKLAD: Václav ji přidá jako "laborant"; do té doby ji přiděluje jen naše správa).
 */
export const BACKEND_ROLE: Record<string, Role> = {
  admin: "admin",
  administrativa: "reception",
  doctor: "doctor",
  laborant: "lab",
};

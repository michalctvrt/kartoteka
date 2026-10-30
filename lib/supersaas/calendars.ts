/**
 * Kalendáře SuperSaaS, které Kartotéka zobrazuje (účet DC Flipper). Nic tajného – jen čísla a názvy.
 * Most (app/api/supersaas/booking) pustí jen tyto kalendáře; „spankovka“ záměrně chybí (Michal, 2026-10-30).
 *
 *   mirrorOf – kalendář je přesná kopie jiného (UZLESNA20 = stejné objednávky jako UZLesna, ověřeno 2026-10-30)
 *              → zobrazit jde, ale do „Vše“ se nepočítá (jinak by byla každá objednávka dvakrát)
 *   test     – zkušební kalendář; do „Vše“ se nepočítá
 *
 * Zápis objednávek: SuperSaaS u kalendářů typu „služby“ (všechny ostré) založení přes API NEPODPORUJE
 * (POST /api/bookings → 501 „Not yet implemented for service schedule“, ověřeno na TESTOVACI 2026-10-30).
 * U typu „zdroje“ ano (ověřeno na „Testovaci zdroj“: vytvoření 201, obsazený čas 422 „Tento slot už je obsazen“,
 * smazání DELETE /api/bookings/{id}?schedule_id=…). `bookable` = typ „zdroje“; skutečný zápis navíc musí povolit
 * server (SUPERSAAS_WRITE_SCHEDULES v .env.local) – ostré kalendáře jen se souhlasem Michala.
 *
 *   fields – která pole formuláře kalendář má (field_1 = rok narození, field_1_r = požadované vyšetření, field_2_r = pohlaví)
 */

export type SsField = "field_1" | "field_1_r" | "field_2_r";
const REAL_FIELDS: SsField[] = ["field_1", "field_1_r", "field_2_r"];

export type SsCalendar = {
  id: number;
  name: string;
  short: string;
  /** barva proužku u objednávky v pohledu „Vše“ */
  color: string;
  mirrorOf?: number;
  test?: boolean;
  bookable?: boolean;
  fields: SsField[];
};

export const CALENDARS: SsCalendar[] = [
  { id: 268518, name: "UZ Vídeňská", short: "Vídeňská", color: "#0284c7", fields: REAL_FIELDS },
  { id: 661481, name: "UZ Vídeňská 2", short: "Vídeňská 2", color: "#4f46e5", fields: REAL_FIELDS },
  { id: 375564, name: "UZ Lesná", short: "Lesná", color: "#059669", fields: REAL_FIELDS },
  { id: 807781, name: "UZ Lesná 2", short: "Lesná 2", color: "#65a30d", fields: REAL_FIELDS },
  { id: 268498, name: "UZ Dobrovského", short: "Dobrovského", color: "#d97706", fields: REAL_FIELDS },
  // typ „zdroje“ – PŘEDPOKLAD (neověřeno): zdroj pod UZLesna, zápis sem by se ukázal i v Lesné → NEzapisovat bez souhlasu
  { id: 375563, name: "UZ Lesná (UZLESNA20 – kopie)", short: "Lesná – kopie", color: "#059669", mirrorOf: 375564, fields: REAL_FIELDS },
  { id: 829050, name: "Testovací", short: "Testovací", color: "#64748b", test: true, fields: REAL_FIELDS },
  { id: 856112, name: "Testovací zdroj", short: "Test – zdroj", color: "#94a3b8", test: true, bookable: true, fields: ["field_1", "field_1_r"] },
];

/** Kalendáře v pohledu „Vše“ (bez kopií a testovacího). */
export const ALL_REAL = CALENDARS.filter((c) => !c.mirrorOf && !c.test);

export const DEFAULT_CALENDAR = 268518;

export const calendarById = (id: number) => CALENDARS.find((c) => c.id === id);

/** Kalendáře, do kterých jde zapisovat (typ „zdroje“). Jestli opravdu smí, rozhodne server. */
export const BOOKABLE = CALENDARS.filter((c) => c.bookable);

/** Vstup nové objednávky (most POST supersaas/booking). Čas = místní, „YYYY-MM-DD HH:MM“. */
export type NewBooking = {
  schedule_id: number;
  start: string;
  finish: string;
  full_name: string;
  mobile?: string;
  email?: string;
  field_1?: string; // rok narození
  field_1_r?: string; // požadované vyšetření
  field_2_r?: string; // pohlaví (Žena / Muž)
};

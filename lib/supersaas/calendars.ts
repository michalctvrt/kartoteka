/**
 * Kalendáře SuperSaaS, které Kartotéka zobrazuje (účet DC Flipper). Nic tajného – jen čísla a názvy.
 * Most (app/api/supersaas/booking) pustí jen tyto kalendáře; „spankovka“ záměrně chybí (Michal, 2026-10-30).
 *
 *   mirrorOf – kalendář je přesná kopie jiného (UZLESNA20 = stejné objednávky jako UZLesna, ověřeno 2026-10-30)
 *              → zobrazit jde, ale do „Vše“ se nepočítá (jinak by byla každá objednávka dvakrát)
 *   test     – zkušební kalendář; do „Vše“ se nepočítá
 *
 * Zápis objednávek: SuperSaaS u kalendářů typu „služby“ (všechny naše) založení přes API NEPODPORUJE
 * (POST /api/bookings → 501 „Not yet implemented for service schedule“, ověřeno na TESTOVACI 2026-10-30).
 */

export type SsCalendar = {
  id: number;
  name: string;
  short: string;
  /** barva proužku u objednávky v pohledu „Vše“ */
  color: string;
  mirrorOf?: number;
  test?: boolean;
};

export const CALENDARS: SsCalendar[] = [
  { id: 268518, name: "UZ Vídeňská", short: "Vídeňská", color: "#0284c7" },
  { id: 661481, name: "UZ Vídeňská 2", short: "Vídeňská 2", color: "#4f46e5" },
  { id: 375564, name: "UZ Lesná", short: "Lesná", color: "#059669" },
  { id: 807781, name: "UZ Lesná 2", short: "Lesná 2", color: "#65a30d" },
  { id: 268498, name: "UZ Dobrovského", short: "Dobrovského", color: "#d97706" },
  { id: 375563, name: "UZ Lesná (UZLESNA20 – kopie)", short: "Lesná – kopie", color: "#059669", mirrorOf: 375564 },
  { id: 829050, name: "Testovací", short: "Testovací", color: "#64748b", test: true },
];

/** Kalendáře v pohledu „Vše“ (bez kopií a testovacího). */
export const ALL_REAL = CALENDARS.filter((c) => !c.mirrorOf && !c.test);

export const DEFAULT_CALENDAR = 268518;

export const calendarById = (id: number) => CALENDARS.find((c) => c.id === id);

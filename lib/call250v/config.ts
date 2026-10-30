/**
 * Mapování pobočky Olomoucká na činnosti (A1…) a pulty/dveře (P1…) v Call250V.
 *
 * ⚠️ ID JSOU ZATÍM ODHAD. Skutečné hodnoty dodá Kadlec (činnosti a tiskárny
 * vrací GET /queue/config, pulty je potřeba získat od technika). Po instalaci
 * stačí přepsat tenhle soubor — zbytek aplikace s ID přímo nepracuje.
 *
 * Soubor neobsahuje nic tajného, importuje ho frontend i backend.
 */

export type Modality = "RTG" | "UZ" | "MRI";

/**
 * Výběr na kiosku u vstupu – modalitu pacient NEVOLÍ , jen proč přišel:
 *   exam    = přišel na vyšetření (objednaný / se žádankou na teď)
 *   booking = chce se jen objednat (často přijde se žádankou a chce termín např. na UZ)
 * Modalitu určí recepce založením vyšetření (→ čekárna RTG/UZ/MRI).
 */
export type ArrivalKind = "exam" | "booking";

export const ARRIVAL_SERVICES: Record<ArrivalKind, string> = {
  exam: "A1",
  booking: "A2",
};

export const ARRIVAL_KINDS: ArrivalKind[] = ["exam", "booking"];

export const ARRIVAL_LABEL: Record<ArrivalKind, string> = {
  exam: "Na vyšetření",
  booking: "Objednat se",
};

/** Čekárny za zamčenými dveřmi — sem pacienta přeřadí recepce. */
export const WAITING_SERVICES: Record<Modality, string> = {
  RTG: "A4",
  UZ: "A5",
  MRI: "A6",
};

/** Návrat na recepci pro zprávu po posledním vyšetření. */
export const REPORT_SERVICE = "A7";

/** Vše, co si vyvolává recepce. */
export const RECEPTION_SERVICES = [
  ...Object.values(ARRIVAL_SERVICES),
  REPORT_SERVICE,
];

export interface CounterDef {
  id: string;
  label: string;
}

export const RECEPTION_COUNTERS: CounterDef[] = [
  { id: "P1", label: "Recepce 1" },
  { id: "P2", label: "Recepce 2" },
];

/** Dveře kabinek podle modality. */
export const MODALITY_COUNTERS: Record<Modality, CounterDef[]> = {
  RTG: [
    { id: "P3", label: "RTG – dveře 1" },
    { id: "P4", label: "RTG – dveře 2" },
  ],
  UZ: [{ id: "P5", label: "UZ" }],
  MRI: [
    { id: "P6", label: "MRI – dveře 1" },
    { id: "P7", label: "MRI – dveře 2" },
  ],
};

export const MODALITIES: Modality[] = ["RTG", "UZ", "MRI"];

const SERVICE_LABELS: Record<string, string> = {
  [ARRIVAL_SERVICES.exam]: ARRIVAL_LABEL.exam, // krátce – v seznamu na recepci musí být vidět celé
  [ARRIVAL_SERVICES.booking]: ARRIVAL_LABEL.booking,
  [WAITING_SERVICES.RTG]: "Čekárna RTG",
  [WAITING_SERVICES.UZ]: "Čekárna UZ",
  [WAITING_SERVICES.MRI]: "Čekárna MRI",
  [REPORT_SERVICE]: "Výdej zprávy",
};

export function serviceLabel(serviceId?: string | null): string {
  if (!serviceId) return "—";
  return SERVICE_LABELS[serviceId] ?? serviceId;
}

export function counterLabel(counterId?: string | null): string {
  if (!counterId) return "—";
  const all = [
    ...RECEPTION_COUNTERS,
    ...Object.values(MODALITY_COUNTERS).flat(),
  ];
  return all.find((c) => c.id === counterId)?.label ?? counterId;
}

export function modalityOfService(serviceId?: string | null): Modality | null {
  return MODALITIES.find((m) => WAITING_SERVICES[m] === serviceId) ?? null;
}

/** Proč pacient přišel (podle lístku z kiosku); null = lístek už není na příchodu. */
export function arrivalKindOf(serviceId?: string | null): ArrivalKind | null {
  return ARRIVAL_KINDS.find((k) => ARRIVAL_SERVICES[k] === serviceId) ?? null;
}

/**
 * Kategorie vyšetření v kartotéce (idMedicalServiceCategory) → modalita
 * vyvolávacího systému. Kategorie, které tu nejsou, se do čekárny neposílají.
 */
export const CATEGORY_TO_MODALITY: Record<string, Modality> = {
  RTG: "RTG",
  SONO: "UZ",
  UZ: "UZ",
  MR: "MRI",
  MRI: "MRI",
};

/**
 * TypeScript kontrakt pro eŽádanka API.
 *
 * Tento soubor slouží jako:
 *   1) typový základ pro frontend (mock + UI komponenty)
 *   2) **kontrakt pro Václava** — Java backend `/CardFileWebWS/rest/ezadanka/*`
 *      musí vracet JSON přesně v tomto tvaru, jinak nám UI nesedne.
 *
 * Pole odvozená z funkčního Node klienta `ezadanka-client` (otec Roman dělal Java
 * verzi, Michal ji přepsal do Node, Václav teď dělá produkční Java verzi).
 *
 * Když se kontrakt změní, aktualizuj zároveň:
 *   - mock data v `app/api/ezadanka/by-rid/[rid]/route.ts`
 *   - mock data v `app/api/ezadanka/by-kod/[kod]/route.ts`
 *   - UI komponenty v `components/ezadanka/`
 */

// ─── Domény / číselníky ──────────────────────────────────────────────────

/**
 * Modalita zobrazovacího vyšetření.
 * V realitě může přijít cokoliv jako string — `OTHER` je fallback.
 */
export type Modalita = "RTG" | "UZ" | "SONO" | "MRI" | "MR" | "CT" | "OTHER";

/**
 * Stav žádanky. Hodnoty odpovídají číselníku MZČR `stav-zadanky`.
 * Backend nám pošle český `nazev`; `kod` může mít interní význam.
 */
export interface Stav {
  /** např. "0" / "1" / "2" — interní MZČR kód */
  kod?: string;
  /** lidsky čitelný — např. "Nová", "Přijatá", "Vyřízená", "Stornovaná" */
  nazev: string;
}

/** Urgentnost (rutinní / urgentní / statim / život ohrožující...) */
export interface Urgentnost {
  kod?: string;
  /** např. "rutinní", "urgentní" */
  nazev: string;
}

// ─── Vyhledávání podle RČ (seznam aktivních žádanek pacienta) ────────────

/**
 * Jedna položka v seznamu aktivních žádanek. Obsahuje jen základní data
 * potřebná pro tabulkový přehled. Detail se načte zvlášť přes `getZadankaByKod`.
 */
export interface ZadankaListItem {
  /** alfanumerický kód žádanky, 8 znaků, např. "RNYC3TWF" */
  kod: string;
  /** UUID interní v MZČR — pro načtení detailu */
  id: string;
  stav: Stav;
  urgentnost: Urgentnost;
  /** ISO 8601 datetime, kdy žádanka vznikla */
  datumVytvoreni: string;
  /** typ žádanky — "žádanka o zobrazovací vyšetření", "...laboratoř", "...konzilium" */
  typ: string;
  /** Modalita (jen u zobrazovacích žádanek) — RTG / SONO / MR / CT */
  modalita: Modalita | null;
  /** Krátký popis vyšetření, např. "RTG snímek (DX) koleno vpravo" */
  vysetreniNazev: string | null;
  pacient: {
    /** Rodné číslo bez lomítka */
    rid: string;
    jmeno: string;
    prijmeni: string;
  };
  /** Název poskytovatele, který žádanku vystavil — např. "MEDIGRAFO s.r.o." */
  zadatel: string | null;
}

/** Odpověď API na vyhledávání podle RČ. */
export interface SearchByRidResponse {
  /** Celkový počet žádanek (může být víc než ve `zadanky`, kvůli stránkování) */
  totalCount: number;
  /** Počet vrácených v této stránce */
  pocetVrazenych: number;
  /** Aktuální stránka (1-based) */
  pageNumber: number;
  /** Celkem stran */
  pageCount: number;
  /** Seznam žádanek */
  zadanky: ZadankaListItem[];
}

// ─── Detail žádanky (po kliknutí na konkrétní řádek) ─────────────────────

export interface ZadankaPacient {
  /** Rodné číslo bez lomítka */
  rid: string;
  jmeno: string;
  prijmeni: string;
  /** ISO 8601 datum (YYYY-MM-DD) */
  datumNarozeni: string | null;
  /** "MALE" | "FEMALE" — z MZČR API */
  pohlavi: "MALE" | "FEMALE" | null;
  /** Číslo pojištěnce (může se lišit od RČ u cizinců) */
  cisloPojistence: string | null;
  /** Krátký kód pojišťovny (111, 207, ...) */
  pojistovnaKod: string | null;
  /** Lidský název pojišťovny — např. "VZP" */
  pojistovnaNazev: string | null;
  adresa: string | null;
  email: string | null;
  telefon: string | null;
}

export interface ZadankaZadatel {
  /** Plné jméno s tituly, např. "MUDr. Jana Neugebauerová" */
  jmeno: string;
  /** Název poskytovatele */
  poskytovatel: string;
  /** IČO poskytovatele */
  ico: string | null;
  /** ICP — identifikátor pracoviště */
  icp: string | null;
}

export interface ZadankaVysetreni {
  /** Plný popis vyšetření — "RTG snímek (DX) koleno vpravo" */
  nazev: string;
  /** Skupina/modalita */
  modalita: Modalita | null;
  /** Část těla — "koleno", "břicho", "hlava"... */
  castTela: string | null;
  /** Lateralita — "vpravo", "vlevo", "oboustranně"... */
  lateralita: string | null;
  /** Volný text poznámka pro vyšetřujícího */
  poznamka: string | null;
  /** Volný text instrukcí pro pacienta (např. "nalačno") */
  instrukceProPacienta: string | null;
}

export interface ZadankaDiagnoza {
  /** ICD-10 kód, např. "M255" */
  kod: string | null;
  /** Slovní popis — např. "Bolest v kloubu" */
  nazev: string | null;
  /** Volný text klinické otázky lékaře */
  klinickaOtazka: string | null;
}

export interface ZadankaPacientStav {
  /** "chodící", "ležící", "vozíčkář"... */
  omezeniMobility: string | null;
  /** Doplňující popis omezení mobility */
  popisOmezeniMobility: string | null;
  /** Výška jako lidský string s jednotkou — "191 CM" */
  vyska: string | null;
  /** Váha jako lidský string s jednotkou — "112 KG" */
  vaha: string | null;
  /** Má pacient implantát (kov v těle)? Důležité pro MR */
  implantat: boolean | null;
  /** Je pacient samoplátce? */
  samoplatce: boolean | null;
}

/** Plný detail jedné žádanky. Vrácený endpointem `/api/ezadanka/by-kod/{kod}`. */
export interface ZadankaDetail {
  kod: string;
  id: string;
  stav: Stav;
  urgentnost: Urgentnost;
  datumVytvoreni: string;
  /** Typ žádanky — viz ZadankaListItem.typ */
  typ: string;

  pacient: ZadankaPacient;
  zadatel: ZadankaZadatel;
  vysetreni: ZadankaVysetreni;
  diagnoza: ZadankaDiagnoza;
  pacientStav: ZadankaPacientStav;

  /** "zdravotní pojištění", "samoplátce"... */
  uhrada: string | null;
}

// ─── Chyby ───────────────────────────────────────────────────────────────

/** Standardní chybová odpověď z naší API vrstvy (Next route nebo Java BE). */
export interface EzadankaErrorResponse {
  error: string;
  /** Volitelný technický detail — pro logy, ne pro recepční */
  detail?: string;
}

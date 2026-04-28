/**
 * Pomocné funkce pro práci s českým rodným číslem (RČ).
 *
 * Formát:
 *   - 9 cifer: pacienti narození před 1.1.1954 (bez kontrolní cifry, modulo se neověřuje)
 *   - 10 cifer: novější RČ s kontrolní cifrou (modulo 11 musí sedět)
 *   - Měsíc + 50 = žena
 *   - Měsíc + 20 (od r. 2004 také + 70) = překlopený rok kvůli kapacitě
 *
 * Funkce vrací typed result, ne hází exception — chyby jsou součástí výsledku.
 */

export interface RcParseResult {
  /** vstupní RČ po normalizaci (bez lomítka, bez bílých znaků) */
  normalized: string;
  /** RČ má platný tvar (9 nebo 10 cifer) */
  validFormat: boolean;
  /** kontrolní cifra modulo 11 sedí (relevantní jen u 10cif RČ) */
  validChecksum: boolean;
  /** datum narození ve formátu YYYY-MM-DD (jen pokud validFormat) */
  birthDate: string | null;
  /** pohlaví — odvozeno z měsíce */
  gender: "MALE" | "FEMALE" | null;
  /** chybová hláška pro UI (nebo null pokud OK) */
  error: string | null;
}

/** Normalizuje RČ: odstraní bílé znaky a lomítko. */
export function normalizeRc(input: string): string {
  return input.trim().replace(/\s+/g, "").replace("/", "");
}

/** Rozparsuje RČ a vrátí strukturovaný výsledek. */
export function parseRc(input: string): RcParseResult {
  const rc = normalizeRc(input);

  // Tvar
  if (!/^\d{9,10}$/.test(rc)) {
    return {
      normalized: rc,
      validFormat: false,
      validChecksum: false,
      birthDate: null,
      gender: null,
      error: "Rodné číslo musí mít 9 nebo 10 cifer.",
    };
  }

  // 1. yymmddxxx[x]
  const yy = parseInt(rc.substring(0, 2), 10);
  let mm = parseInt(rc.substring(2, 4), 10);
  const dd = parseInt(rc.substring(4, 6), 10);

  // Pohlaví podle měsíce + případný posun
  let gender: "MALE" | "FEMALE";
  if (mm > 50 && mm <= 62) {
    gender = "FEMALE";
    mm -= 50;
  } else if (mm > 70 && mm <= 82) {
    // Od r. 2004, přetečení kapacity → ženy +70
    gender = "FEMALE";
    mm -= 70;
  } else if (mm > 20 && mm <= 32) {
    // Od r. 2004 → muži +20
    gender = "MALE";
    mm -= 20;
  } else if (mm >= 1 && mm <= 12) {
    gender = "MALE";
  } else {
    return {
      normalized: rc,
      validFormat: false,
      validChecksum: false,
      birthDate: null,
      gender: null,
      error: "Rodné číslo má neplatný měsíc.",
    };
  }

  // Rok: 9-cifrová RČ jsou před 1954, 10-cifrová po. Hranice:
  // 10 cifer → buď 1900–1953 (vzácné), nebo 1954+ (typické)
  // Použijeme heuristiku: 10cif s yy <= 53 → 2000+yy, jinak 1900+yy
  // 9cif → vždy 1900+yy (lidé před 1954)
  const fullYear =
    rc.length === 9 ? 1900 + yy : yy <= 53 ? 2000 + yy : 1900 + yy;

  // Validace data (vyhodí, kdyby vyšlo 31.2.)
  const date = new Date(Date.UTC(fullYear, mm - 1, dd));
  const isValidDate =
    date.getUTCFullYear() === fullYear &&
    date.getUTCMonth() === mm - 1 &&
    date.getUTCDate() === dd;

  if (!isValidDate) {
    return {
      normalized: rc,
      validFormat: false,
      validChecksum: false,
      birthDate: null,
      gender: null,
      error: "Rodné číslo obsahuje neplatné datum narození.",
    };
  }

  const birthDate = `${fullYear}-${String(mm).padStart(2, "0")}-${String(
    dd
  ).padStart(2, "0")}`;

  // Kontrolní cifra (jen u 10cif RČ)
  let validChecksum = true;
  if (rc.length === 10) {
    const num = parseInt(rc, 10);
    // Modulo 11. Když mod = 10, kontrolní cifra je 0 (zvláštní případ pro stará RČ).
    const mod = num % 11;
    const checkDigit = parseInt(rc[9], 10);
    if (mod === 10) {
      validChecksum = checkDigit === 0;
    } else {
      validChecksum = mod === 0;
    }
  }

  if (!validChecksum) {
    return {
      normalized: rc,
      validFormat: true,
      validChecksum: false,
      birthDate,
      gender,
      error: "Kontrolní cifra rodného čísla nesedí.",
    };
  }

  return {
    normalized: rc,
    validFormat: true,
    validChecksum: true,
    birthDate,
    gender,
    error: null,
  };
}

/** Krátký helper — vrátí jen birthDate nebo null bez celé struktury. */
export function rcToBirthDate(input: string): string | null {
  return parseRc(input).birthDate;
}

/** Krátký helper — vrátí jen pohlaví nebo null. */
export function rcToGender(input: string): "MALE" | "FEMALE" | null {
  return parseRc(input).gender;
}

/** Naposledy otevřená studie – pro položku menu „Karta studie“. */

const KEY = "kartoteka_last_study";

export function readLastStudyId(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && v !== "undefined" && v !== "null" ? v : null;
  } catch {
    return null;
  }
}

export function writeLastStudyId(sid: string | number) {
  try {
    localStorage.setItem(KEY, String(sid));
  } catch {
    /* ignore */
  }
}

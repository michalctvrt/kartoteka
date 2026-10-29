/**
 * Odkazy do staré (JSF) kartotéky.
 *
 * V produkci běží nové UI na stejné doméně jako stará kartotéka, takže stačí
 * relativní /CFLocalSyncWeb. Ve vývoji (localhost:4001) je stará kartotéka
 * jinde — nastav v .env.local NEXT_PUBLIC_LEGACY_BASE_URL, výchozí je
 * http://localhost:8080 (Payara na test serveru).
 */
const LEGACY_HOST =
  process.env.NEXT_PUBLIC_LEGACY_BASE_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:8080" : "");

export const legacyBase = `${LEGACY_HOST}/CFLocalSyncWeb`;

/** Seznam vyšetření pacienta ve staré kartotéce. */
export const legacyStudyListUrl = (pid: string) =>
  `${legacyBase}/secured/study/list.xhtml?pid=${encodeURIComponent(pid)}`;

/**
 * Detail/editace vyšetření ve staré kartotéce.
 * POZOR: parametr je `sid`, ne `id` (JSF `id` ignoruje). `prev` = kam vede „Zpět“.
 */
export const legacyStudyEditUrl = (studyId: number, pid: string) =>
  `${legacyBase}/secured/study/edit.xhtml?sid=${studyId}&prev=${encodeURIComponent(
    legacyStudyListUrl(pid)
  )}`;

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

/** Formulář nového vyšetření ve staré kartotéce s předvyplněným pacientem. */
export const legacyNewStudyUrl = (pid: string) =>
  `${legacyBase}/secured/study/edit.xhtml?pid=${encodeURIComponent(pid)}`;

/**
 * Zakládat vyšetření přes náš formulář (POST /study)?
 * Zatím vypnuto: backend vyžaduje ezadankaId i u vyšetření bez e-žádanky.
 * Až to Václav uvolní, stačí v .env.local NEXT_PUBLIC_STUDY_VIA_API=1.
 */
export const STUDY_VIA_API = process.env.NEXT_PUBLIC_STUDY_VIA_API === "1";

/**
 * Upravovat studii přes náš formulář (PUT /study/{id})?
 * Zatím vypnuto: backend na PUT /study/{id} vrací 422 „Error deserializing
 * object from entity stream“ na jakékoli tělo (i na {}), ověřeno 2026-10-29.
 * Až to Václav opraví: NEXT_PUBLIC_STUDY_EDIT_VIA_API=1 v .env.local.
 */
export const STUDY_EDIT_VIA_API = process.env.NEXT_PUBLIC_STUDY_EDIT_VIA_API === "1";

/**
 * Šablony popisu (texty, které si lékař vkládá do popisu).
 * Ve staré kartotéce tabulka study_description_template (user_id, id_medical_service_category, name, description).
 * Backend je zatím přes API nemá → SIMULACE v .data/templates.json (lib/templates/store.ts).
 */

export type ReportTemplate = {
  id: string;
  /** zaměstnanec (id z /api/staff); null = šablona převzatá ze staré kartotéky / společná */
  owner: string | null;
  /** jméno autora pro zobrazení (u převzatých ze staré kartotéky) */
  ownerName: string | null;
  /** RTG / UZ / MRI; null = pro všechny modality */
  modality: string | null;
  name: string;
  /** zkratka: napíše se do textu a Tab ji rozbalí (např. „rtgs“) */
  shortcut: string | null;
  text: string;
  /** id ve staré kartotéce (study_description_template.id) */
  legacyId?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateInput = Pick<ReportTemplate, "owner" | "ownerName" | "modality" | "name" | "shortcut" | "text">;

/** Zkratka: 2–16 znaků bez mezer (písmena, číslice, tečka, pomlčka). */
export const SHORTCUT_RE = /^[\p{L}\p{N}.\-]{2,16}$/u;

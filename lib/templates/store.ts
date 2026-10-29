/**
 * SIMULACE úložiště šablon popisu (jen server, dev) – soubor .data/templates.json (mimo git).
 * Nahradí ho backend (tabulka study_description_template). Při prvním spuštění bez souboru
 * se založí pár vzorových šablon (lib/demo/templates.ts), ať jde funkce vyzkoušet i doma.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SHORTCUT_RE, type ReportTemplate, type TemplateInput } from "./types";
import { DEMO_TEMPLATES } from "@/lib/demo/templates";

const FILE = path.join(process.cwd(), ".data", "templates.json");

async function read(): Promise<ReportTemplate[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as ReportTemplate[];
  } catch {
    const now = new Date().toISOString();
    const initial = DEMO_TEMPLATES.map((t) => ({ ...t, id: randomUUID(), createdAt: now, updatedAt: now }));
    await write(initial);
    return initial;
  }
}

async function write(list: ReportTemplate[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf8");
}

function validate(input: Partial<TemplateInput>, list: ReportTemplate[], self?: ReportTemplate): string | null {
  if (input.name !== undefined && !input.name.trim()) return "Chybí název šablony.";
  if (input.text !== undefined && !input.text.trim()) return "Šablona je prázdná.";
  const sc = input.shortcut?.trim();
  if (sc) {
    if (!SHORTCUT_RE.test(sc)) return "Zkratka: 2–16 znaků bez mezer (písmena, číslice, tečka, pomlčka).";
    const owner = input.owner !== undefined ? input.owner : self?.owner ?? null;
    if (list.some((t) => t.id !== self?.id && t.owner === owner && t.shortcut?.toLowerCase() === sc.toLowerCase()))
      return `Zkratku „${sc}“ už má jiná šablona.`;
  }
  return null;
}

export async function listTemplates(): Promise<ReportTemplate[]> {
  return (await read()).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

export async function createTemplate(input: TemplateInput): Promise<ReportTemplate> {
  const list = await read();
  const err = validate(input, list);
  if (err) throw new Error(err);
  const now = new Date().toISOString();
  const t: ReportTemplate = {
    id: randomUUID(),
    owner: input.owner ?? null,
    ownerName: input.ownerName ?? null,
    modality: input.modality || null,
    name: input.name.trim(),
    shortcut: input.shortcut?.trim() || null,
    text: input.text,
    createdAt: now,
    updatedAt: now,
  };
  await write([...list, t]);
  return t;
}

export async function updateTemplate(id: string, patch: Partial<TemplateInput>): Promise<ReportTemplate | null> {
  const list = await read();
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const err = validate(patch, list, list[i]);
  if (err) throw new Error(err);
  const next: ReportTemplate = {
    ...list[i],
    ...patch,
    name: patch.name?.trim() ?? list[i].name,
    shortcut: patch.shortcut !== undefined ? patch.shortcut?.trim() || null : list[i].shortcut,
    modality: patch.modality !== undefined ? patch.modality || null : list[i].modality,
    updatedAt: new Date().toISOString(),
  };
  list[i] = next;
  await write(list);
  return next;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const list = await read();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  await write(next);
  return true;
}

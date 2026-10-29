"use client";

/** Šablony popisu – jedno načtení pro celou aplikaci (sdílené mezi kartami studií). */

import { useCallback, useEffect, useState } from "react";
import { templatesApi } from "./api";
import type { ReportTemplate, TemplateInput } from "./types";

let cache: ReportTemplate[] | null = null;
let pending: Promise<ReportTemplate[]> | null = null;
const listeners = new Set<(l: ReportTemplate[]) => void>(); // všechna místa, která šablony používají

export function useTemplates() {
  const [list, setList] = useState<ReportTemplate[] | null>(cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  useEffect(() => {
    if (cache) return;
    pending ??= templatesApi.list();
    pending
      .then((l) => {
        cache = l;
        setList(l);
      })
      .catch((e: Error) => {
        pending = null;
        setError(e.message);
      });
  }, []);

  const set = (l: ReportTemplate[]) => {
    cache = l.sort((a, b) => a.name.localeCompare(b.name, "cs"));
    listeners.forEach((fn) => fn([...cache!]));
  };

  const save = useCallback(async (input: TemplateInput, id?: string) => {
    const t = id ? await templatesApi.update(id, input) : await templatesApi.create(input);
    set([...(cache ?? []).filter((x) => x.id !== t.id), t]);
    return t;
  }, []);

  const remove = useCallback(async (id: string) => {
    await templatesApi.remove(id);
    set((cache ?? []).filter((x) => x.id !== id));
  }, []);

  return { templates: list, error, save, remove };
}

/** Hledání bez diakritiky a velikosti písmen. */
export const fold = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function matchTemplate(t: ReportTemplate, q: string): boolean {
  if (!q) return true;
  const f = fold(q);
  return fold(t.name).includes(f) || (!!t.shortcut && fold(t.shortcut).startsWith(f)) || (f.length >= 4 && fold(t.text).includes(f));
}

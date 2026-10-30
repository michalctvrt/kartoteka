/** Klient šablon popisu (dnes simulace /api/templates, později backend). */
import type { ReportTemplate, TemplateInput } from "./types";
import { bridge } from "@/lib/runtimeConfig";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? `Chyba ${r.status}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

export const templatesApi = {
  list: () => call<ReportTemplate[]>(bridge("templates")),
  create: (t: TemplateInput) => call<ReportTemplate>(bridge("templates"), { method: "POST", body: JSON.stringify(t) }),
  update: (id: string, t: Partial<TemplateInput>) => call<ReportTemplate>(bridge(`templates/${id}`), { method: "PUT", body: JSON.stringify(t) }),
  remove: (id: string) => call<null>(bridge(`templates/${id}`), { method: "DELETE" }),
};

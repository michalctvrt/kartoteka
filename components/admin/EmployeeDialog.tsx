"use client";

/**
 * Přidání / úprava zaměstnance (admin). Role se vybírají dlaždicemi s popisem,
 * co role smí – víc rolí = oprávnění se sčítají. Pod rolemi jde každé oprávnění
 * (i okna na ploše) zvlášť zapnout/vypnout; ukládají se jen odchylky od rolí.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CAPABILITIES,
  CAPABILITY_GROUPS,
  ROLES,
  ROLE_HINT,
  ROLE_NAME,
  effectiveCaps,
  roleCaps,
  type Capability,
  type Role,
} from "@/lib/auth/roles";
import { staffApi } from "@/lib/auth/staffApi";
import { employeeName, type Employee, type EmployeeInput } from "@/lib/auth/types";

const EMPTY: EmployeeInput = {
  login: "",
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  roles: [],
  grants: [],
  denies: [],
  active: true,
  workingplace: null,
};

/** "Věra Čejková" → "vcejkova" (návrh přihlašovacího jména) */
function suggestLogin(first: string, last: string) {
  const strip = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (strip(first).slice(0, 1) + strip(last)).slice(0, 32);
}

export default function EmployeeDialog({
  open,
  onOpenChange,
  employee,
  isSelf,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee | null; // null = nový
  isSelf: boolean;
  onSaved: (e: Employee) => void;
}) {
  const [f, setF] = useState<EmployeeInput>(() => (employee ? { ...employee } : EMPTY));
  const [loginTouched, setLoginTouched] = useState(!!employee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<EmployeeInput>) =>
    setF((p) => {
      const next = { ...p, ...patch };
      if (!loginTouched && ("firstName" in patch || "lastName" in patch)) {
        next.login = suggestLogin(next.firstName, next.lastName);
      }
      return next;
    });
  const toggleRole = (r: Role) =>
    set({ roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : ROLES.filter((x) => x === r || f.roles.includes(x)) });

  // oprávnění: výchozí z rolí, výjimky jen jako odchylky
  const fromRoles = roleCaps(f.roles);
  const effective = effectiveCaps(f);
  const overridden = (c: Capability) => effective.has(c) !== fromRoles.has(c);
  const overrides = (f.grants?.length ?? 0) + (f.denies?.length ?? 0);
  const toggleCap = (c: Capability) => {
    const on = !effective.has(c); // nový stav
    const grants = new Set(f.grants ?? []);
    const denies = new Set(f.denies ?? []);
    grants.delete(c);
    denies.delete(c);
    if (on && !fromRoles.has(c)) grants.add(c);
    if (!on && fromRoles.has(c)) denies.add(c);
    set({ grants: [...grants], denies: [...denies] });
  };

  const missing: string[] = [];
  if (!f.firstName.trim()) missing.push("jméno");
  if (!f.lastName.trim()) missing.push("příjmení");
  if (!f.login.trim()) missing.push("přihlašovací jméno");
  if (f.roles.length === 0) missing.push("role");

  const save = async () => {
    if (missing.length) return;
    setSaving(true);
    setError(null);
    const body: EmployeeInput = {
      ...f,
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      title: f.title?.trim() || null,
      email: f.email?.trim() || null,
      login: f.login.trim(),
    };
    try {
      const saved = employee ? await staffApi.update(employee.id, body) : await staffApi.create(body);
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const label = "mb-1 block text-[13px] text-ui-muted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? employeeName(employee) : "Nový zaměstnanec"}</DialogTitle>
          <DialogDescription>
            {employee ? `Přihlašuje se jako ${employee.login}` : "Po uložení se může přihlásit do kartotéky."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr]">
            <div>
              <label htmlFor="em-title" className={label}>Titul</label>
              <input id="em-title" className="ui-input" value={f.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div>
              <label htmlFor="em-first" className={label}>Jméno</label>
              <input id="em-first" autoFocus className="ui-input" value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} />
            </div>
            <div>
              <label htmlFor="em-last" className={label}>Příjmení</label>
              <input id="em-last" className="ui-input" value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="em-login" className={label}>Přihlašovací jméno</label>
              <input
                id="em-login"
                className="ui-input"
                value={f.login}
                aria-describedby="em-login-hint"
                onChange={(e) => {
                  setLoginTouched(true);
                  set({ login: e.target.value.toLowerCase() });
                }}
              />
              <p id="em-login-hint" className="mt-1 text-[12px] text-ui-faint">malá písmena, číslice, . _ -</p>
            </div>
            <div>
              <label htmlFor="em-email" className={label}>E-mail</label>
              <input id="em-email" type="email" className="ui-input" value={f.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>

          <fieldset>
            <legend className={label}>Role</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => {
                const on = f.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleRole(r)}
                    className={cn(
                      "ui-press relative flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      on ? "border-ui-primary bg-ui-active" : "border-ui-line bg-ui-sheet hover:bg-ui-raised"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-ui-primary bg-ui-primary text-white" : "border-ui-control bg-ui-raised"
                      )}
                    >
                      {on && (
                        <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }}>
                          <Check className="h-3 w-3" />
                        </motion.span>
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{ROLE_NAME[r]}</span>
                      <span className="block text-[12px] text-ui-muted">{ROLE_HINT[r]}</span>
                    </span>
                  </button>
                );
              })}
            </div>

          </fieldset>

          <fieldset>
            <div className="mb-2 flex items-center justify-between gap-2">
              <legend className="text-[13px] text-ui-muted">
                Oprávnění{overrides > 0 && <span className="text-ui-ink"> · {overrides} {overrides === 1 ? "úprava" : overrides < 5 ? "úpravy" : "úprav"} proti rolím</span>}
              </legend>
              {overrides > 0 && (
                <button
                  type="button"
                  onClick={() => set({ grants: [], denies: [] })}
                  className="inline-flex items-center gap-1 text-[12px] text-ui-primary hover:underline"
                >
                  <RotateCcw className="h-3 w-3" /> Podle rolí
                </button>
              )}
            </div>
            <div className="divide-y divide-ui-rule rounded-lg border border-ui-line">
              {CAPABILITY_GROUPS.map(({ group, caps }) => (
                <div key={group} className="px-3 py-2">
                  <div className="mb-1 text-[12px] font-medium text-ui-muted">{group}</div>
                  {caps.map((c) => {
                    const on = effective.has(c);
                    const changed = overridden(c);
                    return (
                      <label key={c} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleCap(c)}
                          className="h-4 w-4 shrink-0 accent-[var(--ui-primary)]"
                        />
                        <span className="min-w-0 flex-1">{CAPABILITIES[c].label}</span>
                        {changed && (
                          <span
                            className={cn(
                              "shrink-0 rounded px-1.5 text-[11px] leading-5",
                              on ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                            )}
                            title="Ruční výjimka proti výchozím právům rolí"
                          >
                            {on ? "navíc" : "odebráno"}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </fieldset>

          {isSelf && !effective.has("staff.manage") && (
            <p className="text-[12px] text-amber-800 dark:text-amber-200">
              Odebíráte si správu zaměstnanců – po uložení už tuto stránku neuvidíte.
            </p>
          )}

          {employee && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--ui-primary)]"
                checked={f.active}
                onChange={(e) => set({ active: e.target.checked })}
              />
              Aktivní (může se přihlásit)
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 px-3 py-2 text-[13px] text-red-800 dark:border-red-900 dark:text-red-200">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <p className="mr-auto text-[12px] text-ui-muted">{missing.length ? `Chybí: ${missing.join(", ")}` : ""}</p>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Zrušit
            </Button>
            <Button type="submit" disabled={saving || missing.length > 0}>
              {saving && <Loader2 className="animate-spin" />}
              {employee ? "Uložit" : "Přidat zaměstnance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

/**
 * Zaměstnanci a role (jen admin). Bento: aktivní zaměstnanci podle rolí (2 sl.),
 * neaktivní, seznam s hledáním a filtrem role. Přidání/úprava v dialogu.
 * Data: lib/auth/staffApi (zatím simulace app/api/staff – viz lib/auth/types.ts).
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile, Metric } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Ghost, Skeleton } from "@/components/ui/skeleton";
import EmployeeDialog from "@/components/admin/EmployeeDialog";
import { useSession } from "@/components/auth/SessionProvider";
import { ROLES, ROLE_NAME, type Role } from "@/lib/auth/roles";
import { staffApi } from "@/lib/auth/staffApi";
import { employeeName, type Employee } from "@/lib/auth/types";

const ROLE_DOT: Record<Role, string> = {
  admin: "bg-ui-ink",
  reception: "bg-brand-500",
  lab: "bg-orange-400",
  doctor: "bg-emerald-600",
};

export default function StaffPage() {
  const { user } = useSession();
  const [list, setList] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Employee | "new" | null>(null);

  useEffect(() => {
    staffApi
      .list()
      .then(setList)
      .catch((e: Error) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list ?? [])
      .filter((e) => !role || e.roles.includes(role))
      .filter((e) => !t || `${employeeName(e)} ${e.login} ${e.email ?? ""}`.toLowerCase().includes(t))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.lastName.localeCompare(b.lastName, "cs"));
  }, [list, q, role]);

  const active = (list ?? []).filter((e) => e.active);
  const inactive = (list ?? []).length - active.length;

  const onSaved = (e: Employee) =>
    setList((l) => (l ? (l.some((x) => x.id === e.id) ? l.map((x) => (x.id === e.id ? e : x)) : [...l, e]) : [e]));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Zaměstnanci a role</h1>
          <p className="mt-1 text-sm text-ui-muted">Kdo se může přihlásit a co v kartotéce smí</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Přidat zaměstnance
        </Button>
      </header>

      {error && <p className="ui-tile p-4 text-sm">Seznam se nepodařilo načíst: {error}</p>}

      <Bento>
        {/* aktivní podle rolí */}
        <BentoTile span={2} index={0} title="Aktivní zaměstnanci">
          {!list ? (
            <div className="space-y-3 pt-1">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ) : (
            <>
              <Metric value={active.length} />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                {ROLES.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1.5">
                    <span aria-hidden className={cn("h-2 w-2 rounded-full", ROLE_DOT[r])} />
                    {ROLE_NAME[r]} <span className="text-ui-muted">{active.filter((e) => e.roles.includes(r)).length}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </BentoTile>
        <BentoTile index={1} title="Administrátoři">
          {!list ? <Skeleton className="mt-1 h-7 w-10" /> : <Metric value={active.filter((e) => e.roles.includes("admin")).length} sub="musí zůstat aspoň jeden" />}
        </BentoTile>
        <BentoTile index={2} title="Neaktivní">
          {!list ? <Skeleton className="mt-1 h-7 w-10" /> : <Metric value={inactive} sub={inactive ? "nemohou se přihlásit" : undefined} />}
        </BentoTile>

        {/* seznam */}
        <BentoTile
          span={4}
          index={3}
          bodyClassName="px-0 pb-1"
          title={`Seznam${list ? ` · ${shown.length}` : ""}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Hledat zaměstnance</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat" className="ui-input h-8 w-44 pl-8 text-[13px]" />
              </label>
              <Segmented
                size="sm"
                label="Role"
                value={role}
                onChange={setRole}
                options={[{ value: null, label: "Vše" }, ...ROLES.map((r) => ({ value: r, label: ROLE_NAME[r] }))]}
              />
            </div>
          }
        >
          {!list ? (
            <div className="divide-y divide-ui-rule">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <Ghost label="Žádný zaměstnanec neodpovídá filtru" className="px-4 py-4" />
          ) : (
            <ul className="divide-y divide-ui-rule">
              {shown.map((e, i) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + Math.min(i, 12) * 0.025 }}
                >
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    className={cn(
                      "group grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 text-left transition-colors hover:bg-ui-raised md:grid-cols-[2rem_minmax(0,1fr)_9rem_minmax(0,16rem)_6rem_auto]",
                      !e.active && "opacity-60"
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ui-line bg-ui-raised text-[12px] font-medium">
                      {(e.firstName[0] ?? "") + (e.lastName[0] ?? "")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {employeeName(e)}
                        {e.id === user?.id && <span className="font-normal text-ui-faint"> · vy</span>}
                      </span>
                      <span className="block truncate text-[12px] text-ui-muted md:hidden">{e.roles.map((r) => ROLE_NAME[r]).join(", ")}</span>
                    </span>
                    <span className="hidden truncate text-[13px] text-ui-muted md:block">{e.login}</span>
                    <span className="hidden flex-wrap items-center gap-1.5 md:flex">
                      {e.roles.map((r) => (
                        <span key={r} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-ui-line px-2 text-[12px]">
                          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", ROLE_DOT[r])} />
                          {ROLE_NAME[r]}
                        </span>
                      ))}
                      {(e.grants?.length ?? 0) + (e.denies?.length ?? 0) > 0 && (
                        <span className="text-[12px] text-ui-muted" title="Ruční výjimky proti rolím">
                          {e.grants?.length ? `+${e.grants.length}` : ""}
                          {e.grants?.length && e.denies?.length ? " " : ""}
                          {e.denies?.length ? `−${e.denies.length}` : ""} oprávnění
                        </span>
                      )}
                    </span>
                    <span className="hidden text-[13px] md:block">{e.active ? "Aktivní" : <span className="text-ui-muted">Neaktivní</span>}</span>
                    <ChevronRight className="h-4 w-4 text-ui-faint transition-transform group-hover:translate-x-0.5" />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </BentoTile>
      </Bento>

      {editing && (
        <EmployeeDialog
          key={editing === "new" ? "new" : editing.id}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          employee={editing === "new" ? null : editing}
          isSelf={editing !== "new" && editing.id === user?.id}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

"use client";

/**
 * Nastavení (bento):
 *   Toto pracoviště (2 sl.) – pult recepce, operátor Call250V, pracoviště pro nová vyšetření (tento počítač)
 *   Vzhled · Plocha
 *   Stav systému (2 sl.) – backend, vyvolávací systém, objednávky
 *   Můj účet (2 sl.) – role a skutečná oprávnění
 * Vše se ukládá hned (žádné tlačítko Uložit); sekce se ukazují podle oprávnění.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bento, BentoTile } from "@/components/ui/bento";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/auth/SessionProvider";
import { useWorkstation } from "@/components/queue/useWorkstation";
import { RECEPTION_COUNTERS } from "@/lib/call250v/config";
import { listWorkingplaces, type Option } from "@/lib/study/lookups";
import { usePrefs, type MotionPref, type ReportSize, type ThemePref } from "@/lib/prefs";
import { CAPABILITIES, CAPABILITY_GROUPS, ROLE_HOME, ROLE_NAME, type Role } from "@/lib/auth/roles";
import { employeeName } from "@/lib/auth/types";
import { runtimeConfig } from "@/lib/runtimeConfig";
import { bridge } from "@/lib/runtimeConfig";

const CONFIG_WORKINGPLACE = runtimeConfig.workingplace;
const WP_KEY = "kartoteka_workingplace_v1"; // stejný klíč jako NewStudyDialog
const DASHBOARD_ROLES: Role[] = ["reception", "lab", "doctor"];

/** „Uloženo“ na chvíli po změně. */
function useSavedStamp() {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!at) return;
    const t = setTimeout(() => setAt(0), 1600);
    return () => clearTimeout(t);
  }, [at]);
  return {
    mark: () => setAt(Date.now()),
    stamp: at ? (
      <span className="inline-flex items-center gap-1 text-[12px] text-ui-muted" role="status">
        <Check className="h-3.5 w-3.5 text-emerald-600" /> Uloženo
      </span>
    ) : null,
  };
}

export default function SettingsPage() {
  const { can, canVisit } = useSession();
  const showWorkstation = can("queue.reception") || can("queue.call") || can("study.create");
  const dashboards = DASHBOARD_ROLES.filter((r) => canVisit(ROLE_HOME[r]));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Nastavení</h1>
        <p className="mt-1 text-sm text-ui-muted">Změny se ukládají hned</p>
      </header>

      <Bento>
        {showWorkstation && <WorkstationTile index={0} />}
        <AppearanceTile index={1} />
        {dashboards.length > 0 && <DashboardTile index={2} roles={dashboards} />}
        <StatusTile index={3} />
        <AccountTile index={4} />
      </Bento>
    </div>
  );
}

// ─── Toto pracoviště ───

function WorkstationTile({ index }: { index: number }) {
  const { can } = useSession();
  const { ws, update } = useWorkstation();
  const { mark, stamp } = useSavedStamp();
  const [places, setPlaces] = useState<Option[] | null>(null);
  const [place, setPlace] = useState(() => {
    try {
      return localStorage.getItem(WP_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const needPlaces = !CONFIG_WORKINGPLACE && can("study.create");

  useEffect(() => {
    if (needPlaces) listWorkingplaces().then(setPlaces).catch(() => setPlaces([]));
  }, [needPlaces]);

  const set = (patch: Parameters<typeof update>[0]) => {
    update(patch);
    mark();
  };

  return (
    <BentoTile span={2} index={index} title="Toto pracoviště" action={stamp}>
      <p className="-mt-1 mb-4 text-[13px] text-ui-muted">Platí pro tento počítač, ne pro účet.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {can("queue.reception") && (
          <div>
            <div className="mb-1.5 text-[13px] text-ui-muted">Pult recepce</div>
            <Segmented
              label="Pult recepce"
              value={ws.receptionCounter}
              onChange={(v) => set({ receptionCounter: v })}
              options={RECEPTION_COUNTERS.map((c) => ({ value: c.id, label: c.label }))}
            />
            <p className="mt-1.5 text-[12px] text-ui-faint">Kam se vyvolávají pacienti z kiosku.</p>
          </div>
        )}
        {(can("queue.reception") || can("queue.call")) && (
          <div>
            <label htmlFor="st-op" className="mb-1.5 block text-[13px] text-ui-muted">
              Operátor ve vyvolávacím systému
            </label>
            <input
              id="st-op"
              className="ui-input max-w-[220px]"
              value={ws.operatorId}
              placeholder="ID v Call250V"
              aria-describedby="st-op-hint"
              onChange={(e) => set({ operatorId: e.target.value.trim() })}
            />
            <p id="st-op-hint" className="mt-1.5 text-[12px] text-ui-faint">Přidělí Kadlec; zatím se posílá k vyvolání.</p>
          </div>
        )}
        {can("study.create") && (
          <div className="sm:col-span-2">
            <label htmlFor="st-wp" className="mb-1.5 block text-[13px] text-ui-muted">
              Pracoviště pro nová vyšetření
            </label>
            {CONFIG_WORKINGPLACE ? (
              <p className="flex h-10 items-center text-sm">
                {CONFIG_WORKINGPLACE}
                <span className="ml-2 text-[12px] text-ui-faint">nastavené pro pobočku (config.js)</span>
              </p>
            ) : places === null ? (
              <Skeleton className="h-10 w-72" />
            ) : (
              <select
                id="st-wp"
                className="ui-input max-w-md"
                value={place}
                onChange={(e) => {
                  setPlace(e.target.value);
                  try {
                    localStorage.setItem(WP_KEY, e.target.value);
                  } catch {}
                  mark();
                }}
              >
                <option value="">— vyberte —</option>
                {places.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} – {w.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </BentoTile>
  );
}

// ─── Vzhled ───

function AppearanceTile({ index }: { index: number }) {
  const { prefs, update } = usePrefs();
  return (
    <BentoTile index={index} title="Vzhled">
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 text-[13px] text-ui-muted">Téma</div>
          <Segmented<ThemePref>
            size="sm"
            label="Téma"
            value={prefs.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: "light", label: "Světlé" },
              { value: "dark", label: "Tmavé" },
              { value: "system", label: "Podle systému" },
            ]}
          />
        </div>
        <div>
          <div className="mb-1.5 text-[13px] text-ui-muted">Animace</div>
          <Segmented<MotionPref>
            size="sm"
            label="Animace"
            value={prefs.motion}
            onChange={(motion) => update({ motion })}
            options={[
              { value: "full", label: "Plné" },
              { value: "reduced", label: "Omezené" },
            ]}
          />
          <p className="mt-1.5 text-[12px] text-ui-faint">Omezené = bez pohybu oken a přechodů.</p>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] text-ui-muted">Písmo ve zprávách</div>
          <Segmented<ReportSize>
            size="sm"
            label="Písmo ve zprávách"
            value={prefs.reportSize}
            onChange={(reportSize) => update({ reportSize })}
            options={[
              { value: "s", label: "Menší" },
              { value: "m", label: "Střední" },
              { value: "l", label: "Větší" },
            ]}
          />
          <p className="mt-1.5 text-[12px] text-ui-faint">Čtení i psaní popisu studie.</p>
        </div>
      </div>
    </BentoTile>
  );
}

// ─── Plocha ───

function DashboardTile({ index, roles }: { index: number; roles: Role[] }) {
  const router = useRouter();
  const [done, setDone] = useState<Role | null>(null);
  const reset = (r: Role) => {
    if (!window.confirm(`Vrátit plochu „${ROLE_NAME[r]}“ do výchozího rozložení? Vaše úpravy oken se zahodí.`)) return;
    try {
      localStorage.removeItem(`kartoteka_dashboard_v1_${r}`);
    } catch {}
    setDone(r);
  };
  return (
    <BentoTile index={index} title="Plocha">
      <p className="mb-3 text-[13px] text-ui-muted">Rozložení oken se ukládá v tomto prohlížeči.</p>
      <ul className="divide-y divide-ui-rule">
        {roles.map((r) => (
          <li key={r} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span>{ROLE_NAME[r]}</span>
            {done === r ? (
              <button type="button" onClick={() => router.push(ROLE_HOME[r])} className="text-[13px] text-ui-primary hover:underline">
                Obnoveno · otevřít
              </button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => reset(r)}>
                Výchozí
              </Button>
            )}
          </li>
        ))}
      </ul>
    </BentoTile>
  );
}

// ─── Stav systému ───

type CheckState = "ok" | "demo" | "warning" | "error";
type Status = {
  checkedAt: string;
  backend: { state: CheckState; text: string; ms?: number };
  queue: { state: CheckState; text: string; ms?: number };
  bookings: { state: CheckState; text: string; ms?: number };
};
const DOT: Record<CheckState, string> = {
  ok: "bg-emerald-600",
  demo: "bg-sky-500",
  warning: "bg-amber-500",
  error: "bg-red-600",
};

function StatusTile({ index }: { index: number }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    fetch(bridge("status"), { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);
  const check = () => {
    setLoading(true);
    load();
  };
  useEffect(() => load(), [load]);

  const rows: [string, Status["backend"] | undefined][] = [
    ["Kartotéka (backend)", status?.backend],
    ["Vyvolávací systém", status?.queue],
    ["Objednávky (SuperSaaS)", status?.bookings],
  ];

  return (
    <BentoTile
      span={2}
      index={index}
      title="Stav systému"
      action={
        <button
          type="button"
          onClick={check}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-[13px] text-ui-primary hover:underline disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Zkontrolovat
        </button>
      }
    >
      <ul className="divide-y divide-ui-rule">
        {rows.map(([label, c]) => (
          <li key={label} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] items-center gap-3 py-2 text-sm">
            <span className="text-ui-muted">{label}</span>
            {c ? (
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", DOT[c.state])} />
                <span className="truncate" title={c.text}>{c.text}</span>
              </span>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
            <span className="text-[12px] text-ui-faint">{c?.ms !== undefined ? `${c.ms} ms` : ""}</span>
          </li>
        ))}
      </ul>
      {status && (
        <p className="mt-2 text-[12px] text-ui-faint">
          Zkontrolováno {new Date(status.checkedAt).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
    </BentoTile>
  );
}

// ─── Můj účet ───

function AccountTile({ index }: { index: number }) {
  const router = useRouter();
  const { user, roles, caps, can, signOut } = useSession();
  if (!user) return null;
  return (
    <BentoTile
      span={2}
      index={index}
      title="Můj účet"
      action={
        can("staff.manage") && (
          <Link href="/admin/staff" className="text-[13px] text-ui-primary hover:underline">
            Spravovat zaměstnance
          </Link>
        )
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ui-line bg-ui-raised text-sm font-medium">
            {(user.firstName[0] ?? "") + (user.lastName[0] ?? "")}
          </span>
          <div>
            <div className="font-medium">{employeeName(user)}</div>
            <div className="text-[13px] text-ui-muted">
              {user.login} · {roles.map((r) => ROLE_NAME[r]).join(", ")}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            signOut();
            router.push("/login");
          }}
        >
          <LogOut /> Odhlásit se
        </Button>
      </div>

      <details className="group mt-4">
        <summary className="cursor-pointer list-none text-[13px] text-ui-primary hover:underline">
          Co smím ({caps.size} oprávnění)
        </summary>
        <div className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {CAPABILITY_GROUPS.map(({ group, caps: list }) => {
            const mine = list.filter((c) => caps.has(c));
            if (!mine.length) return null;
            return (
              <div key={group}>
                <div className="text-[12px] font-medium text-ui-muted">{group}</div>
                <ul className="mt-1 space-y-0.5 text-[13px]">
                  {mine.map((c) => (
                    <li key={c} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> {CAPABILITIES[c].label}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ui-faint">Oprávnění mění administrátor v Zaměstnancích a rolích.</p>
      </details>
    </BentoTile>
  );
}

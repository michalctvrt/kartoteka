"use client";

/**
 * Přizpůsobitelná plocha: okna jde zapínat/vypínat, přesouvat a zvětšovat.
 *
 * - „Upravit plochu“ zapne režim úprav: okna se tahají za záhlaví,
 *   velikost se mění za pravý dolní roh, vlevo nahoře je seznam oken
 *   k zaškrtnutí.
 * - Rozložení se ukládá do prohlížeče zvlášť pro každou roli (recepce /
 *   laborant / lékař). Až bude přihlašování, může se ukládat k uživateli.
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import { Check, GripVertical, LayoutDashboard, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DEFAULT_LAYOUTS, WIDGETS, type DashboardRole } from "./widgets";

const Grid = WidthProvider(GridLayout);
const storageKey = (role: DashboardRole) => `kartoteka_dashboard_v1_${role}`;

/** Načte uložené rozložení; neznámá okna zahodí, doplní min. rozměry. */
function loadLayout(role: DashboardRole): Layout[] {
  let saved: Layout[] | null = null;
  try {
    const raw = localStorage.getItem(storageKey(role));
    if (raw) saved = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return withLimits((saved ?? DEFAULT_LAYOUTS[role]).filter((l) => WIDGETS[l.i]));
}

function withLimits(layout: Layout[]): Layout[] {
  return layout.map((l) => ({ ...l, minW: WIDGETS[l.i].minW, minH: WIDGETS[l.i].minH }));
}

function saveLayout(role: DashboardRole, layout: Layout[]) {
  try {
    localStorage.setItem(
      storageKey(role),
      JSON.stringify(layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))
    );
  } catch {
    /* ignore */
  }
}

/** Mřížka se vykreslí až v prohlížeči (rozložení je v localStorage). */
const noop = () => () => {};
export default function Dashboard({ role }: { role: DashboardRole }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  if (!isClient) return null;
  return <DashboardInner role={role} />;
}

function DashboardInner({ role }: { role: DashboardRole }) {
  const [layout, setLayout] = useState<Layout[]>(() => loadLayout(role));
  const [editing, setEditing] = useState(false);

  const visible = useMemo(() => new Set(layout.map((l) => l.i)), [layout]);

  const update = (next: Layout[]) => {
    const limited = withLimits(next);
    setLayout(limited);
    saveLayout(role, limited);
  };

  const toggle = (id: string) => {
    if (visible.has(id)) {
      update(layout.filter((l) => l.i !== id));
    } else {
      const d = WIDGETS[id];
      // y: Infinity = zařadit na konec plochy
      update([...layout, { i: id, x: 0, y: Infinity, w: d.w, h: d.h }]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => update(DEFAULT_LAYOUTS[role])}>
              <RotateCcw className="w-4 h-4" /> Obnovit výchozí
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setEditing(false)}>
              <Check className="w-4 h-4" /> Hotovo
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
            <LayoutDashboard className="w-4 h-4" /> Upravit plochu
          </Button>
        )}
      </div>

      {editing && (
        <div className="rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 dark:bg-brand-950/30 p-4 space-y-2">
          <div className="text-sm font-semibold text-brand-900 dark:text-brand-100">
            Zobrazená okna
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.entries(WIDGETS).map(([id, d]) => (
              <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible.has(id)}
                  onChange={() => toggle(id)}
                  className="accent-brand-600 w-4 h-4"
                />
                {d.title}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Okna přesunete tažením za záhlaví, velikost změníte tažením za pravý dolní roh.
            Rozložení se ukládá v tomto prohlížeči.
          </p>
        </div>
      )}

      {layout.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">
          Plocha je prázdná. Klikněte na „Upravit plochu“ a zaškrtněte okna.
        </p>
      ) : (
        <Grid
          className={cn("-mx-2", editing && "dashboard-editing")}
          layout={layout}
          cols={12}
          rowHeight={30}
          margin={[16, 16]}
          containerPadding={[8, 8]}
          isDraggable={editing}
          isResizable={editing}
          draggableHandle=".widget-drag"
          compactType="vertical"
          onLayoutChange={(l) => editing && update(l)}
        >
          {layout.map((l) => {
            const d = WIDGETS[l.i];
            return (
              <div key={l.i} className={cn("relative", editing && "ring-2 ring-brand-300 rounded-xl")}>
                <div
                  className={cn(
                    "h-full flex flex-col rounded-xl overflow-hidden",
                    // čekárny mají vlastní barevný rámeček
                    !d.frameless &&
                      "bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-sm"
                  )}
                >
                  {d.frameless ? (
                    editing && (
                      <div className="widget-drag flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-100 cursor-move select-none">
                        <span className="flex items-center gap-1">
                          <GripVertical className="w-4 h-4" /> {d.title}
                        </span>
                        <RemoveButton onClick={() => toggle(l.i)} />
                      </div>
                    )
                  ) : (
                    <div
                      className={cn(
                        "widget-drag flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-neutral-700 font-semibold text-brand-900 dark:text-brand-100 select-none",
                        editing && "cursor-move bg-brand-50 dark:bg-brand-950/40"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {editing && <GripVertical className="w-4 h-4 text-brand-500" />}
                        {d.title}
                      </span>
                      {editing && <RemoveButton onClick={() => toggle(l.i)} />}
                    </div>
                  )}
                  <div className={cn("flex-1 min-h-0 overflow-auto", !d.frameless && "p-4")}>
                    {d.render()}
                  </div>
                </div>
              </div>
            );
          })}
        </Grid>
      )}
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      title="Skrýt okno"
      className="p-0.5 rounded hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

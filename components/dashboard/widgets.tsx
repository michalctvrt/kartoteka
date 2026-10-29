"use client";

/**
 * Okna (widgety), ze kterých si každý skládá svou plochu.
 * Nové okno = nový záznam v WIDGETS (+ případně do výchozí plochy role).
 *
 * Rozměry jsou v mřížce: 12 sloupců na šířku, výška v řádcích po ~46 px.
 * Používat jen povolené velikosti z grid.ts (WIDTHS / HEIGHTS).
 */

import type { ReactNode } from "react";
import type { WidgetSize } from "./size";
import type { Layout } from "react-grid-layout";
import ReceptionQueuePanel from "@/components/queue/ReceptionQueuePanel";
import { ModalityColumn } from "@/components/queue/WaitingBoard";
import ReceptionTodayList from "@/components/ReceptionTodayList";
import NewPatientBox from "@/components/NewPatientBox";
import ReceptionMessagesBlock from "@/components/ReceptionMessagesBlock";

import type { Capability } from "@/lib/auth/roles";

export type DashboardRole = "reception" | "lab" | "doctor";

export interface WidgetDef {
  title: string;
  /** Obsah okna; `size` = podoba podle aktuální velikosti (S / M / L). */
  render: (size: WidgetSize) => ReactNode;
  /** Výchozí a minimální velikost v mřížce */
  w: number;
  h: number;
  minW: number;
  minH: number;
  /** Okno má vlastní záhlaví (čekárny) → bez rámečku s nadpisem */
  frameless?: boolean;
  /** Oprávnění potřebné k oknu (lib/auth/roles.ts); bez něj se nenabízí ani nezobrazí */
  cap?: Capability;
}

export const WIDGETS: Record<string, WidgetDef> = {
  "waiting-RTG": {
    title: "Čekárna RTG",
    render: (sz) => <ModalityColumn m="RTG" className="h-full" size={sz} />,
    w: 4, h: 13, minW: 3, minH: 4, frameless: true, cap: "widget.waiting",
  },
  "waiting-UZ": {
    title: "Čekárna UZ",
    render: (sz) => <ModalityColumn m="UZ" className="h-full" size={sz} />,
    w: 4, h: 13, minW: 3, minH: 4, frameless: true, cap: "widget.waiting",
  },
  "waiting-MRI": {
    title: "Čekárna MRI",
    render: (sz) => <ModalityColumn m="MRI" className="h-full" size={sz} />,
    w: 4, h: 13, minW: 3, minH: 4, frameless: true, cap: "widget.waiting",
  },
  "queue-reception": {
    title: "Vyvolávací systém – recepce",
    render: (sz) => <ReceptionQueuePanel embedded size={sz} />,
    w: 6, h: 13, minW: 3, minH: 4, cap: "queue.reception",
  },
  "today-orders": {
    title: "Dnešní objednávky",
    render: (sz) => <ReceptionTodayList size={sz} />,
    w: 6, h: 18, minW: 3, minH: 4, cap: "widget.todayOrders",
  },
  "new-patient": {
    title: "Nový pacient",
    render: () => <NewPatientBox />,
    w: 6, h: 4, minW: 3, minH: 4, cap: "widget.newPatient",
  },
  messages: {
    title: "Aktuality a provozní zprávy",
    render: (sz) => <ReceptionMessagesBlock size={sz} />,
    w: 6, h: 9, minW: 3, minH: 4, cap: "widget.messages",
  },
};

const at = (i: string, x: number, y: number, w?: number, h?: number): Layout => ({
  i,
  x,
  y,
  w: w ?? WIDGETS[i].w,
  h: h ?? WIDGETS[i].h,
});

/** Výchozí plocha podle role (tlačítko „Obnovit výchozí“ se vrátí sem). */
export const DEFAULT_LAYOUTS: Record<DashboardRole, Layout[]> = {
  reception: [
    at("queue-reception", 0, 0, 6, 13),
    at("today-orders", 6, 0, 6, 18),
    at("new-patient", 0, 13, 6, 4),
    at("messages", 0, 17, 6, 9),
  ],
  lab: [at("waiting-RTG", 0, 0), at("waiting-UZ", 4, 0), at("waiting-MRI", 8, 0)],
  doctor: [at("waiting-RTG", 0, 0), at("waiting-UZ", 4, 0), at("waiting-MRI", 8, 0)],
};

"use client";

/**
 * Pole karty, které se v režimu úprav plynule přepne z textu na input.
 * Prázdná nepovinná pole se mimo úpravy neukazují (`hideEmpty`) – kontextová hustota.
 */

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

const swap = {
  initial: { opacity: 0, y: -3 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 3 },
  transition: { duration: 0.14 },
};

export default function InlineField({
  id,
  label,
  editing,
  display,
  hideEmpty,
  children,
}: {
  id: string;
  label: string;
  editing: boolean;
  /** hodnota pro čtení; prázdná = pomlčka */
  display: ReactNode;
  hideEmpty?: boolean;
  /** input pro režim úprav */
  children: ReactNode;
}) {
  const empty = display === null || display === undefined || display === "";
  if (!editing && empty && hideEmpty) return null;

  return (
    <div className="min-w-0">
      <label htmlFor={editing ? id : undefined} className="mb-1 block text-[13px] text-ui-muted">
        {label}
      </label>
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="edit" {...swap}>
            {children}
          </motion.div>
        ) : (
          <motion.div key="view" {...swap} className="flex h-10 items-center truncate text-[15px]">
            {empty ? <span className="text-ui-faint">—</span> : display}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

/**
 * Přechod mezi stránkami: template se na rozdíl od layoutu při každé navigaci
 * znovu připojí → obsah listu se jemně vynoří (okna plochy a dlaždice pak
 * navazují vlastním rozevřením od levého horního rohu).
 */

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

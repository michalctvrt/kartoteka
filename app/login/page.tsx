"use client";

/**
 * Přihlášení – ZATÍM SIMULACE: výběr zaměstnance ze seznamu (bez hesla).
 * Skutečné přihlášení (jméno + heslo, SSO s CFLocalSyncWeb) dodá backend;
 * pak tahle stránka jen přesměruje na jeho přihlášení a načte GET /me.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useSession } from "@/components/auth/SessionProvider";
import { staffApi } from "@/lib/auth/staffApi";
import { ROLE_HOME, ROLE_NAME } from "@/lib/auth/roles";
import { employeeName, type Employee } from "@/lib/auth/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSession();
  const [staff, setStaff] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffApi
      .list()
      .then((l) => setStaff(l.filter((e) => e.active)))
      .catch((e: Error) => setError(e.message));
  }, []);

  const enter = (e: Employee) => {
    signIn(e);
    router.push(ROLE_HOME[e.roles[0]]);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-frame p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="ui-tile w-full max-w-md p-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="DC Flipper Radiodiagnostika" className="h-auto w-44 dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-dark.svg" alt="DC Flipper Radiodiagnostika" className="hidden h-auto w-44 dark:block" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Přihlášení do Kartotéky</h1>
        <p className="mt-1 text-[13px] text-ui-muted">
          Zkušební režim: vyberte zaměstnance. Skutečné přihlášení heslem připraví backend.
        </p>

        {error && <p className="mt-4 text-sm text-red-700">Seznam zaměstnanců se nepodařilo načíst: {error}</p>}

        <ul className="mt-5 divide-y divide-ui-rule rounded-lg border border-ui-line">
          {staff === null
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </li>
              ))
            : staff.map((e, i) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                >
                  <button
                    type="button"
                    onClick={() => enter(e)}
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ui-raised"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ui-line bg-ui-raised text-[13px] font-medium">
                      {(e.firstName[0] ?? "") + (e.lastName[0] ?? "")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{employeeName(e)}</span>
                      <span className="block text-[12px] text-ui-muted">{e.roles.map((r) => ROLE_NAME[r]).join(", ")}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ui-faint transition-transform group-hover:translate-x-0.5" />
                  </button>
                </motion.li>
              ))}
        </ul>
      </motion.div>
    </div>
  );
}

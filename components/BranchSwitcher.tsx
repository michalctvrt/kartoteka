"use client";

/**
 * Přepínač pobočky v horní liště (jen když je v config.js víc poboček – lib/branches.ts).
 * Jiná pobočka než vlastní je zvýrazněná, ať je jasné, v čí kartotéce se právě pracuje.
 */

import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { BRANCHES, LOCAL_BRANCH, MULTI_BRANCH, setActiveBranch, useActiveBranch } from "@/lib/branches";
import { STUDY_CARD_PATH, usePath } from "@/lib/routes";
import { useSession } from "@/components/auth/SessionProvider";

export default function BranchSwitcher() {
  const active = useActiveBranch();
  const path = usePath();
  const router = useRouter();
  const { can } = useSession();
  if (!MULTI_BRANCH) return null;
  const change = (code: string) => {
    setActiveBranch(code);
    // otevřená studie patří jiné pobočce → zpět na seznam (stejné číslo studie na jiné pobočce = jiná studie)
    if (path === STUDY_CARD_PATH) router.push(can("report.write") ? "/doctor/reports" : "/reception/studies/search");
  };
  const away = active.code !== LOCAL_BRANCH.code;
  return (
    <label
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[13px] transition-colors",
        away ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" : "border-transparent text-ui-muted hover:bg-ui-active"
      )}
      title={away ? `Pracujete v kartotéce pobočky ${active.name} (vaše pobočka: ${LOCAL_BRANCH.name})` : "Pobočka, jejíž kartotéka je otevřená"}
    >
      <Building2 className="h-4 w-4 shrink-0" />
      <span className="sr-only">Pobočka</span>
      <select
        value={active.code}
        onChange={(e) => change(e.target.value)}
        className="cursor-pointer bg-transparent font-medium outline-none"
        aria-label="Pobočka"
      >
        {BRANCHES.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
            {b.code === LOCAL_BRANCH.code ? " (tato pobočka)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

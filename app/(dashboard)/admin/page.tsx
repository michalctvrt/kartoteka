"use client";

/** Plocha administrátora: rozcestník na správu zaměstnanců a pracovní plochy rolí. */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Bento, BentoTile } from "@/components/ui/bento";
import { ROLE_HINT, ROLE_HOME, ROLE_NAME, type Role } from "@/lib/auth/roles";

const AREAS: Role[] = ["reception", "lab", "doctor"];

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Administrace</h1>
        <p className="mt-1 text-sm text-ui-muted">Zaměstnanci, role a přístup ke všem plochám</p>
      </header>
      <Bento>
        <BentoTile index={0} title="Zaměstnanci a role">
          <p className="text-sm text-ui-muted">Přidat zaměstnance, přiřadit role, deaktivovat přístup.</p>
          <Link href="/admin/staff" className="group mt-3 inline-flex items-center gap-1 text-sm text-ui-primary hover:underline">
            Otevřít správu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </BentoTile>
        {AREAS.map((r, i) => (
          <BentoTile key={r} index={i + 1} title={`Plocha – ${ROLE_NAME[r]}`}>
            <p className="text-[13px] text-ui-muted">{ROLE_HINT[r]}</p>
            <Link href={ROLE_HOME[r]} className="group mt-3 inline-flex items-center gap-1 text-sm text-ui-primary hover:underline">
              Otevřít <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </BentoTile>
        ))}
      </Bento>
    </div>
  );
}

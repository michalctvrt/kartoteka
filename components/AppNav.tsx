"use client";

/**
 * Hlavní menu aplikace (levý rám). Položky podle oprávnění přihlášeného
 * (lib/auth/roles.ts). Skupiny jsou vždy rozbalené – vše vidět najednou.
 * Aktivní položka má podklad, který při přechodu přejede (layoutId).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileSearch,
  FileText,
  Home,
  LayoutGrid,
  ListChecks,
  LogOut,
  Moon,
  Package,
  PenLine,
  Printer,
  Stethoscope,
  Settings,
  Sun,
  UserSearch,
  UsersRound,
} from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";
import useDrafts from "@/components/hooks/useDrafts";
import MenuPatientsBadge from "@/components/MenuPatientsBadge";
import { readLastStudyId } from "@/lib/lastStudy";
import { useSession } from "@/components/auth/SessionProvider";
import { ROLES, ROLE_HOME, ROLE_NAME, workspaceOf, type Role } from "@/lib/auth/roles";
import { employeeName } from "@/lib/auth/types";
import { patientHref, studyHref, usePath } from "@/lib/routes";
import { BASE_PATH } from "@/lib/runtimeConfig";

export default function AppNav({
  theme,
  onToggleTheme,
  onNavigate,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  /** zavře mobilní menu po kliknutí */
  onNavigate?: () => void;
}) {
  const pathname = usePath();
  const router = useRouter();
  const { user, roles, can, canVisit, signOut } = useSession();
  const { latestId } = useDrafts();

  // pracovní plocha: podle adresy (smí-li tam), jinak první role uživatele
  const fromPath = workspaceOf(pathname);
  const ws: Role = fromPath && canVisit(ROLE_HOME[fromPath]) ? fromPath : roles[0] ?? "reception";
  const home = ROLE_HOME[ws];
  const workspaces = ROLES.filter((r) => canVisit(ROLE_HOME[r]));
  const worklist = `/${ws === "doctor" ? "doctor" : "lab"}/worklist`;

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  // Karta pacienta = poslední rozpracovaná karta, jinak vyhledávání
  const openPatientCard = () =>
    go(
      latestId
        ? patientHref(latestId)
        : "/reception/patients"
    );

  // Karta studie = naposledy otevřená studie, jinak vyhledávání
  const openStudyCard = () => {
    const sid = readLastStudyId();
    go(sid ? studyHref(sid) : "/reception/studies/search");
  };

  // vlastní skupina pro každou instanci menu (desktop / mobil), aby si zvýraznění nepřeskakovalo
  const navId = useId();

  const isPatientCard =
    pathname.startsWith("/reception/patients/") &&
    !pathname.startsWith("/reception/patients/new");
  const isStudyCard =
    pathname.startsWith("/reception/studies/") &&
    pathname !== "/reception/studies/search";

  return (
    <div className="flex h-full flex-col">
      {/* Logo + kdo jsem */}
      <div className="px-5 pt-5 pb-3">
        <Link href={home} onClick={onNavigate} className="block w-[168px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/logo.svg`} alt="DC Flipper Radiodiagnostika" className="h-auto w-full dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/logo-dark.svg`} alt="DC Flipper Radiodiagnostika" className="hidden h-auto w-full dark:block" />
        </Link>
        {user && (
          <div className="mt-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ui-line bg-ui-sheet text-[12px] font-medium">
              {(user.firstName[0] ?? "") + (user.lastName[0] ?? "")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{employeeName(user)}</span>
              <span className="block truncate text-[12px] text-ui-muted">{roles.map((r) => ROLE_NAME[r]).join(", ")}</span>
            </span>
          </div>
        )}
      </div>

      <LayoutGroup id={navId}>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 text-sm" aria-label="Hlavní menu">
        <NavItem href={home} icon={<Home />} active={pathname === home} onNavigate={onNavigate}>
          Domů
        </NavItem>

        {can("worklist.view") && (
          <NavItem href={worklist} icon={<ListChecks />} active={pathname === worklist} onNavigate={onNavigate}>
            Worklist
          </NavItem>
        )}

        {can("calendar.view") && (
          <NavItem
            href="/reception/calendar"
            icon={<CalendarDays />}
            active={pathname === "/reception/calendar"}
            onNavigate={onNavigate}
          >
            Kalendář objednávek
          </NavItem>
        )}

        {can("patient.view") && (
          <NavGroup label="Pacienti">
            <NavItem
              href="/reception/patients"
              icon={<UserSearch />}
              active={pathname === "/reception/patients"}
              onNavigate={onNavigate}
            >
              Vyhledat pacienta
            </NavItem>
            <NavButton icon={<ClipboardList />} active={isPatientCard} onClick={openPatientCard}>
              Karta pacienta
              {can("patient.edit") && <MenuPatientsBadge />}
            </NavButton>
          </NavGroup>
        )}

        {can("study.view") && (
          <NavGroup label="Studie">
            <NavItem
              href="/reception/studies/search"
              icon={<FileSearch />}
              active={pathname === "/reception/studies/search"}
              onNavigate={onNavigate}
            >
              Vyhledat studii
            </NavItem>
            <NavButton icon={<FileText />} active={isStudyCard} onClick={openStudyCard}>
              Karta studie
            </NavButton>
            {can("report.write") && (
              <NavItem href="/doctor/reports" icon={<PenLine />} active={pathname === "/doctor/reports"} onNavigate={onNavigate}>
                K popisu
              </NavItem>
            )}
            {can("doctors.view") && (
              <NavItem
                href="/reception/doctors"
                icon={<Stethoscope />}
                active={pathname === "/reception/doctors"}
                onNavigate={onNavigate}
              >
                Připojení lékaři
              </NavItem>
            )}
            {can("print.batch") && (
              <NavItem
                href="/reception/print"
                icon={<Printer />}
                active={pathname === "/reception/print"}
                onNavigate={onNavigate}
              >
                Hromadný tisk
              </NavItem>
            )}
          </NavGroup>
        )}

        {can("supplies.order") && (
          <NavGroup label="Provoz">
            <NavItem
              href="/supplies"
              icon={<Package />}
              active={pathname.startsWith("/supplies")}
              onNavigate={onNavigate}
            >
              Spotřební materiál
            </NavItem>
          </NavGroup>
        )}

        {can("staff.manage") && (
          <NavGroup label="Administrace">
            <NavItem
              href="/admin/staff"
              icon={<UsersRound />}
              active={pathname.startsWith("/admin/staff")}
              onNavigate={onNavigate}
            >
              Zaměstnanci a role
            </NavItem>
          </NavGroup>
        )}

        {/* víc pracovních ploch (admin, nebo víc rolí) → přepínač */}
        {workspaces.length > 1 && (
          <NavGroup label="Pracovní plocha">
            {workspaces.map((r) => (
              <NavItem
                key={r}
                href={ROLE_HOME[r]}
                icon={<LayoutGrid />}
                onNavigate={onNavigate}
              >
                {ROLE_NAME[r]}
                {ws === r && <span className="text-[12px] font-normal text-ui-faint">· teď</span>}
              </NavItem>
            ))}
          </NavGroup>
        )}
      </nav>
      </LayoutGroup>

      {/* Utility dole */}
      <div className="space-y-0.5 px-3 pb-4 text-sm">
        <NavItem href="/settings" icon={<Settings />} active={pathname === "/settings"} onNavigate={onNavigate}>
          Nastavení
        </NavItem>
        <NavButton icon={theme === "light" ? <Moon /> : <Sun />} onClick={onToggleTheme}>
          {theme === "light" ? "Tmavý režim" : "Světlý režim"}
        </NavButton>
        <NavButton
          icon={<LogOut />}
          onClick={() => {
            signOut();
            go("/login");
          }}
        >
          Odhlásit se
        </NavButton>
      </div>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-6" role="group" aria-label={label}>
      <p className="mb-1 px-3 text-xs font-medium text-ui-faint">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

const itemClass = (active?: boolean) =>
  cn(
    "relative flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left transition-colors [&>svg]:relative [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0",
    active
      ? "font-medium text-ui-ink [&>svg]:text-brand-700 dark:[&>svg]:text-brand-300"
      : "text-ui-muted hover:bg-ui-raised hover:text-ui-ink [&>svg]:text-ui-faint"
  );

/** Podklad aktivní položky – při přechodu přejede na nově vybranou položku. */
function ActivePill({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <motion.span
      layoutId="nav-active"
      className="ui-press absolute inset-0 rounded-lg border border-ui-line bg-ui-sheet"
      transition={{ type: "spring", stiffness: 520, damping: 40 }}
    />
  );
}

function NavItem({
  href,
  icon,
  active,
  onNavigate,
  children,
}: {
  href: string;
  icon: ReactNode;
  active?: boolean;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={href} onClick={onNavigate} className={itemClass(active)} aria-current={active ? "page" : undefined}>
      <ActivePill active={active} />
      {icon}
      <span className="relative flex items-center gap-1.5">{children}</span>
    </Link>
  );
}

function NavButton({
  icon,
  active,
  onClick,
  children,
}: {
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={itemClass(active)} aria-current={active ? "page" : undefined}>
      <ActivePill active={active} />
      {icon}
      <span className="relative flex items-center gap-1.5">{children}</span>
    </button>
  );
}

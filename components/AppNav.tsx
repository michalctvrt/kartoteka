"use client";

/**
 * Hlavní menu aplikace (levý rám). Skupiny Pacienti / Studie jsou vždy
 * rozbalené – žádné podmenu na kliknutí, vše vidět najednou.
 * Aktivní položka = světlý brand podklad, ostatní šedé (styl „rám a list“).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileSearch,
  FileText,
  Home,
  ListChecks,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserSearch,
} from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";
import useDrafts from "@/components/hooks/useDrafts";
import MenuPatientsBadge from "@/components/MenuPatientsBadge";
import { readLastStudyId } from "@/lib/lastStudy";

export type Role = "reception" | "lab" | "doctor" | "admin" | "other";

export const ROLE_LABEL: Record<Role, string> = {
  reception: "Recepce",
  lab: "Laborant",
  doctor: "Lékař",
  admin: "Administrátor",
  other: "Uživatel",
};

export function roleFromPath(pathname: string): Role {
  if (pathname.includes("/doctor")) return "doctor";
  if (pathname.includes("/lab")) return "lab";
  if (pathname.includes("/reception")) return "reception";
  if (pathname.includes("/admin")) return "admin";
  return "other";
}

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
  const pathname = usePathname();
  const router = useRouter();
  const role = roleFromPath(pathname);
  const { latestId } = useDrafts();

  const home =
    role === "other" ? "/" : role === "admin" ? "/admin" : `/${role}`;

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  // Karta pacienta = poslední rozpracovaná karta, jinak vyhledávání
  const openPatientCard = () =>
    go(
      latestId
        ? `/reception/patients/${encodeURIComponent(latestId)}`
        : "/reception/patients"
    );

  // Karta studie = naposledy otevřená studie, jinak vyhledávání
  const openStudyCard = () => {
    const sid = readLastStudyId();
    go(sid ? `/reception/studies/${encodeURIComponent(sid)}` : "/reception/studies/search");
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
      {/* Logo + kde jsem */}
      <div className="px-5 pt-5 pb-4">
        <Link href={home} onClick={onNavigate} className="block w-[168px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="DC Flipper Radiodiagnostika" className="h-auto w-full dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.svg" alt="DC Flipper Radiodiagnostika" className="hidden h-auto w-full dark:block" />
        </Link>
        <p className="mt-3 text-[13px] text-ui-muted">
          Kartotéka · <span className="font-medium text-ui-ink">{ROLE_LABEL[role]}</span>
        </p>
      </div>

      <LayoutGroup id={navId}>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 text-sm" aria-label="Hlavní menu">
        <NavItem href={home} icon={<Home />} active={pathname === home} onNavigate={onNavigate}>
          Domů
        </NavItem>

        {(role === "lab" || role === "doctor") && (
          <NavItem
            href={`/${role}/worklist`}
            icon={<ListChecks />}
            active={pathname === `/${role}/worklist`}
            onNavigate={onNavigate}
          >
            Worklist
          </NavItem>
        )}

        {role === "reception" && (
          <>
            <NavItem
              href="/reception/calendar"
              icon={<CalendarDays />}
              active={pathname === "/reception/calendar"}
              onNavigate={onNavigate}
            >
              Kalendář objednávek
            </NavItem>

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
                <MenuPatientsBadge />
              </NavButton>
            </NavGroup>
          </>
        )}

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
        </NavGroup>
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
        <NavButton icon={<LogOut />} onClick={() => go("/login")}>
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

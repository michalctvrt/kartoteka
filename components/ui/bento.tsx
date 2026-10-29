"use client"

/**
 * Bento mřížka – asymetrické dlaždice (border-monochrome: 1px linka, žádný stín pod kartou).
 *
 *   <Bento>
 *     <BentoTile span={2} index={0} title="Lístek">…</BentoTile>
 *     <BentoTile index={1} title="Vyšetření">…</BentoTile>
 *   </Bento>
 *
 * Dlaždice se při zobrazení rozevřou od levého horního rohu (jako okna na ploše),
 * postupně podle `index`. Při prefers-reduced-motion jen bez pohybu (MotionConfig v layoutu).
 */

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

function Bento({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
      {...props}
    />
  )
}

const SPAN: Record<1 | 2 | 4, string> = {
  1: "",
  2: "sm:col-span-2",
  4: "sm:col-span-2 xl:col-span-4",
}

type TileProps = {
  span?: 1 | 2 | 4
  /** na širokém displeji přes 2 řádky (např. popis vedle sloupce faktů) */
  rows?: 1 | 2
  index?: number
  title?: React.ReactNode
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children?: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, "title">

function BentoTile({
  span = 1,
  rows = 1,
  index = 0,
  title,
  action,
  className,
  bodyClassName,
  children,
  ...props
}: TileProps) {
  return (
    <motion.section
      layout="position"
      initial={{ opacity: 0, scale: 0.96, x: -10, y: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: index * 0.045 }}
      style={{ transformOrigin: "0% 0%" }}
      className={cn("ui-tile flex min-w-0 flex-col", SPAN[span], rows === 2 && "xl:row-span-2", className)}
      {...(props as React.ComponentProps<typeof motion.section>)}
    >
      {(title || action) && (
        <header className="flex min-h-9 items-center justify-between gap-2 px-4 pt-3">
          {title && <h2 className="text-[13px] font-medium text-ui-muted">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn("flex-1 px-4 pb-4 pt-2", bodyClassName)}>{children}</div>
    </motion.section>
  )
}

/** Velké číslo dlaždice (tabulkové číslice) + volitelná jednotka/podtitul. */
function Metric({
  value,
  unit,
  sub,
  className,
}: {
  value: React.ReactNode
  unit?: React.ReactNode
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold leading-none tracking-tight">{value}</span>
        {unit && <span className="text-sm text-ui-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[13px] text-ui-muted">{sub}</div>}
    </div>
  )
}

/** Řádek popisek – hodnota v dlaždici. Chybějící hodnota = šedá pomlčka. */
function DataRow({ label, children, className }: { label: string; children?: React.ReactNode; className?: string }) {
  const empty = children === null || children === undefined || children === ""
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5 text-sm", className)}>
      <dt className="shrink-0 text-ui-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right">{empty ? <span className="text-ui-faint">—</span> : children}</dd>
    </div>
  )
}

export { Bento, BentoTile, Metric, DataRow }

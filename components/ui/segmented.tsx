"use client"

/**
 * Přepínač možností (radiogroup) – vybraná položka má podklad, který při
 * změně přejede (framer-motion layoutId). Šířka podle obsahu, nikdy přes celý řádek.
 *
 *   <Segmented label="Modalita" value={m} onChange={setM}
 *     options={[{ value: null, label: "Vše" }, { value: "RTG", label: "RTG" }]} />
 */

import * as React from "react"
import { LayoutGroup, motion } from "framer-motion"

import { cn } from "@/lib/utils"

type Option<T> = { value: T; label: React.ReactNode }

function Segmented<T extends string | null>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  label: string
  options: Option<T>[]
  value: T | "custom"
  onChange: (v: T) => void
  size?: "sm" | "md"
  className?: string
}) {
  const id = React.useId()
  return (
    <LayoutGroup id={id}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "inline-flex items-center rounded-lg border border-ui-line bg-ui-raised p-0.5",
          size === "md" ? "h-10" : "h-8",
          className
        )}
      >
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative whitespace-nowrap rounded-md px-3 text-[13px] transition-colors",
                size === "md" ? "h-8" : "h-6 px-2.5",
                active ? "font-medium text-ui-ink" : "text-ui-muted hover:text-ui-ink"
              )}
            >
              {active && (
                <motion.span
                  layoutId="segment"
                  className="ui-press absolute inset-0 rounded-md border border-ui-line bg-ui-sheet"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                />
              )}
              <span className="relative">{o.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

export { Segmented }

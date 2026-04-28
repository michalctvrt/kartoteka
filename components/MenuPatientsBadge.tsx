"use client";

import useDrafts from "@/components/hooks/useDrafts";

export default function MenuPatientsBadge() {
  const { count } = useDrafts();

  if (count === 0) return null;

  return (
    <span
      title={count > 1 ? `${count} rozpracované karty` : "Rozpracovaná karta"}
      className="ml-2 inline-flex items-center justify-center min-w-[10px] h-[10px] px-1 text-[10px] font-semibold text-white bg-red-600 rounded-full"
    >
      {count > 1 ? count : ""}
    </span>
  );
}

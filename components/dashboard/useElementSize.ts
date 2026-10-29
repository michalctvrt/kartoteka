"use client";

import { useEffect, useRef, useState } from "react";

/** Sleduje rozměry prvku (ResizeObserver) — reaguje i během tažení za roh. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) =>
        Math.round(s.width) === Math.round(width) && Math.round(s.height) === Math.round(height)
          ? s
          : { width, height }
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

"use client";

import { useEffect, useState } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs:  0,
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

export function useBreakpoint() {
  const [bp, setBp] = useState<Breakpoint>("lg");

  useEffect(() => {
    const update = () => setBp(getBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile  = bp === "xs" || bp === "sm";
  const isTablet  = bp === "md";
  const isDesktop = bp === "lg" || bp === "xl";

  return { bp, isMobile, isTablet, isDesktop };
}

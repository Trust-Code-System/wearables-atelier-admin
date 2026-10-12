"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** A quiet transition between real metric values, without counting through invented totals. */
export function AnimatedValue({ value }: { value: string | number }) {
  const reduced = useReducedMotion();
  return <span className="admin-value-motion"><AnimatePresence initial={false} mode="popLayout"><motion.span key={value} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }} transition={{ duration: reduced ? 0 : 0.18, ease: [0.25, 1, 0.5, 1] }}>{value}</motion.span></AnimatePresence></span>;
}

export function MetricSurface({ children, className }: { children: ReactNode; className: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false} animate={{ opacity: 1 }} whileHover={reduced ? undefined : { y: -2 }} transition={{ duration: reduced ? 0 : 0.2, ease: [0.25, 1, 0.5, 1] }}>{children}</motion.div>;
}

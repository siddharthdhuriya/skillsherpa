"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Page transition: fade + slight upward slide, ~250ms, transform/opacity only
// (no layout-shifting properties). Two deliberate exclusions:
// - reduced-motion users get no animation at all;
// - the very first page load renders static HTML (no initial opacity: 0),
//   otherwise server-rendered content would stay invisible until hydration
//   and destroy LCP. Only client-side navigations animate.
let hasHydrated = false;

export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const [isInitialLoad] = useState(() => !hasHydrated);
  useEffect(() => {
    hasHydrated = true;
  }, []);

  if (prefersReducedMotion || isInitialLoad) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

// The three.js bundle is code-split and only ever requested from the
// homepage, after mount, so it never blocks first paint or LCP. Reduced
// motion users and low-end devices keep the static gradient backdrop.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

function useCanRender3D(): boolean {
  const prefersReducedMotion = useReducedMotion();
  const [capable, setCapable] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion) return;
    // Skip the 3D scene on low-end hardware and data-saver connections.
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const lowEnd =
      (nav.hardwareConcurrency ?? 8) <= 2 ||
      (nav.deviceMemory ?? 8) <= 2 ||
      nav.connection?.saveData === true;
    if (lowEnd) return;
    // Defer the three.js download until the main thread is idle so it never
    // competes with hydration/LCP (Core Web Vitals).
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (idle) idle(() => setCapable(true), { timeout: 3500 });
    else timer = setTimeout(() => setCapable(true), 1800);
    return () => timer && clearTimeout(timer);
  }, [prefersReducedMotion]);
  return !prefersReducedMotion && capable;
}

export function HeroBackdrop() {
  const show3D = useCanRender3D();
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Static gradient fallback: always painted (instant LCP backdrop),
          the canvas fades in above it when available. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 20%, var(--hero-glow) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 20% 80%, var(--accent) 0%, transparent 60%)",
        }}
      />
      {show3D && (
        <div className="absolute inset-0 animate-in fade-in duration-1000">
          <HeroScene />
        </div>
      )}
    </div>
  );
}

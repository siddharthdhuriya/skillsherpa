"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { trackEnrollClick } from "@/lib/analytics";

// The single most dominant element on a course page: high contrast, subtle
// motion on hover (transform-only), routed through /go/[slug] so the click is
// tracked and the raw affiliate URL never appears in the document. Fires a
// GA4 enroll_click event client-side, independent of the server-side
// click_events insert that /go/[slug] performs (see lib/analytics.ts for why
// both exist).
export function EnrollButton({
  courseSlug,
  courseTitle,
  platformName,
}: {
  courseSlug: string;
  courseTitle: string;
  platformName: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.a
      href={`/go/${courseSlug}`}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      onClick={() => trackEnrollClick({ courseSlug, courseTitle, platformName })}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.03, y: -1 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      Enroll now on {platformName}
      <ArrowUpRight aria-hidden="true" className="size-5" />
    </motion.a>
  );
}

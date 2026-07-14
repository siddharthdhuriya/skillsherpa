"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "./compare-context";

// Floating comparison tray: appears at the bottom whenever at least one
// course is selected, shows the picks, and links to /compare/view.
// Transform/opacity animation only; skipped for reduced-motion users.
export function CompareTray() {
  const compare = useCompare();
  const prefersReducedMotion = useReducedMotion();
  if (!compare) return null;
  const { items } = compare;
  const compareHref = `/compare/view?courses=${items.map((i) => i.slug).join(",")}`;

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.section
          aria-label="Courses selected for comparison"
          initial={prefersReducedMotion ? false : { y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { y: 96, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
        >
          <div className="glass mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl p-3 shadow-xl">
            <ul className="flex min-w-0 flex-1 flex-wrap gap-2" aria-label="Selected courses">
              {items.map((item) => (
                <li
                  key={item.slug}
                  className="flex max-w-56 items-center gap-1.5 rounded-full border bg-background/80 py-1 pl-3 pr-1 text-xs font-medium"
                >
                  <span className="truncate">{item.title}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.title} from comparison`}
                    onClick={() => compare.remove(item.slug)}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={compare.clear}>
                Clear
              </Button>
              {items.length >= 2 ? (
                <Button asChild size="sm">
                  <Link href={compareHref}>
                    Compare {items.length}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              ) : (
                <span className="px-2 text-xs text-muted-foreground">
                  Pick 1 more to compare
                </span>
              )}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

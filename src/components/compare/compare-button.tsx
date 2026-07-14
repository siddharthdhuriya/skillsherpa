"use client";

import { Check, Scale } from "lucide-react";
import { toast } from "sonner";
import { useCompare, COMPARE_LIMIT, type CompareItem } from "./compare-context";

// Small toggle used on course cards. Renders nothing outside a
// CompareProvider (e.g. the admin live preview).
export function CompareToggle({ course }: { course: CompareItem }) {
  const compare = useCompare();
  if (!compare) return null;
  const selected = compare.isSelected(course.slug);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={
        selected
          ? `Remove ${course.title} from comparison`
          : `Add ${course.title} to comparison`
      }
      title={selected ? "Remove from comparison" : "Add to comparison"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected && compare.isFull) {
          toast.error(`You can compare up to ${COMPARE_LIMIT} courses. Remove one first.`);
          return;
        }
        compare.toggle(course);
      }}
      className={`relative z-10 flex size-8 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background/85 text-muted-foreground backdrop-blur-sm hover:border-primary hover:text-primary"
      }`}
    >
      {selected ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Scale aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}

// Larger labeled variant for the course detail page's price card.
export function CompareDetailButton({ course }: { course: CompareItem }) {
  const compare = useCompare();
  if (!compare) return null;
  const selected = compare.isSelected(course.slug);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        if (!selected && compare.isFull) {
          toast.error(`You can compare up to ${COMPARE_LIMIT} courses. Remove one first.`);
          return;
        }
        compare.toggle(course);
      }}
      className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
        selected
          ? "border-primary bg-accent text-accent-foreground"
          : "hover:border-primary hover:text-primary"
      }`}
    >
      {selected ? (
        <>
          <Check aria-hidden="true" className="size-4" />
          Added to comparison
        </>
      ) : (
        <>
          <Scale aria-hidden="true" className="size-4" />
          Add to comparison
        </>
      )}
    </button>
  );
}

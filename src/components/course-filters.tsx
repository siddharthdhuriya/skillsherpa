"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { priceRangeValues } from "@/lib/validation";

// URL-driven filter bar (server components re-filter on param change).
// All controls are native/radix and fully keyboard navigable.
export function CourseFilters({
  categories,
  platforms,
  languages,
}: {
  categories: { slug: string; name: string }[];
  platforms: { id: string; name: string }[];
  languages: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const hasFilters = ["category", "platform", "price", "language"].some((k) =>
    searchParams.has(k),
  );

  const selects = [
    {
      key: "category",
      label: "Category",
      options: categories.map((c) => ({ value: c.slug, label: c.name })),
    },
    {
      key: "platform",
      label: "Platform",
      options: platforms.map((p) => ({ value: p.id, label: p.name })),
    },
    {
      key: "price",
      label: "Price",
      options: priceRangeValues.map((v) => ({ value: v, label: v === "free" ? "Free" : "Paid" })),
    },
    {
      key: "language",
      label: "Language",
      options: languages.map((l) => ({ value: l, label: l })),
    },
  ];

  return (
    <div
      role="group"
      aria-label="Filter courses"
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
    >
      {selects.map((s) => (
        <div key={s.key} className="min-w-36 flex-1 space-y-1.5 sm:flex-none">
          <Label htmlFor={`filter-${s.key}`} className="text-xs text-muted-foreground">
            {s.label}
          </Label>
          <Select
            value={searchParams.get(s.key) ?? "all"}
            onValueChange={(v) => setParam(s.key, v)}
          >
            <SelectTrigger id={`filter-${s.key}`} className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {s.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.replace(pathname, { scroll: false })}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

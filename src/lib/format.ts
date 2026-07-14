import type { PriceRange } from "@/lib/database.types";
import { currencySymbol } from "@/lib/currencies";

export function formatPrice(
  priceRange: PriceRange,
  amount: number | null,
  currency: string,
): string {
  if (priceRange === "free") return "Free";
  if (amount == null) return "Paid";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currencySymbol(currency)}${amount}`;
  }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

/** Deterministic hue from a string, for platform monogram tiles. */
export function hueFromString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

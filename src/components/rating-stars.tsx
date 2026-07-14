import { formatCount } from "@/lib/format";

// Accessible star rating: visual stars are aria-hidden, the value is read out.
export function RatingStars({
  rating,
  reviewCount,
}: {
  rating: number | null;
  reviewCount: number | null;
}) {
  if (rating == null) {
    return <span className="text-xs text-muted-foreground">Not yet rated</span>;
  }
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span
      role="img"
      className="inline-flex items-center gap-1.5"
      aria-label={`Rated ${rating} out of 5${reviewCount ? ` from ${reviewCount} reviews` : ""}`}
    >
      <span aria-hidden="true" className="relative inline-block leading-none">
        <span className="text-sm tracking-tight text-border select-none">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden whitespace-nowrap text-sm tracking-tight text-amber-500 select-none"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </span>
      <span aria-hidden="true" className="text-xs font-semibold">
        {rating.toFixed(1)}
      </span>
      {reviewCount != null && (
        <span aria-hidden="true" className="text-xs text-muted-foreground">
          ({formatCount(reviewCount)})
        </span>
      )}
    </span>
  );
}

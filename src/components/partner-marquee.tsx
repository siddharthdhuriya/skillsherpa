import { getAffiliatePlatforms } from "@/lib/data";
import { PlatformBadge } from "@/components/platform-badge";

// Trust strip: partner platform logos in a slow auto-scrolling marquee.
// The track is duplicated for a seamless loop; animation is transform-only
// and disabled under prefers-reduced-motion (see globals.css).
export async function PartnerMarquee() {
  const platforms = await getAffiliatePlatforms();
  return (
    <section aria-label="Partner platforms" className="border-y bg-muted/30 py-6">
      <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Courses from our partner platforms
      </p>
      <div className="relative overflow-hidden">
        <div className="animate-marquee flex w-max gap-12 pr-12">
          {[...platforms, ...platforms].map((p, i) => (
            <span key={`${p.id}-${i}`} aria-hidden={i >= platforms.length}>
              <PlatformBadge name={p.name} logoUrl={p.logo_url} size={24} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

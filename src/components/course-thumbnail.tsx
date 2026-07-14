import Image from "next/image";
import { hueFromString } from "@/lib/format";

/**
 * Course thumbnail with a fixed aspect ratio box. Uploaded images can be any
 * resolution/orientation — `object-cover` crops them to fill the box without
 * distortion, and the box itself is a fixed aspect ratio so layout never
 * shifts (CLS) regardless of what the admin uploads. Falls back to a
 * deterministic branded gradient tile when no image is set.
 */
export function CourseThumbnail({
  title,
  thumbnailUrl,
  sizes,
  className = "",
}: {
  title: string;
  thumbnailUrl: string | null;
  sizes: string;
  className?: string;
}) {
  if (thumbnailUrl) {
    return (
      <div className={`relative aspect-[16/9] w-full overflow-hidden ${className}`}>
        <Image
          src={thumbnailUrl}
          alt={`${title} course thumbnail`}
          fill
          sizes={sizes}
          className="object-cover"
        />
      </div>
    );
  }
  const hue = hueFromString(title);
  return (
    <div
      aria-hidden="true"
      className={`flex aspect-[16/9] w-full items-end overflow-hidden p-4 ${className}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.35 0.06 ${hue}) 0%, oklch(0.55 0.1 ${(hue + 40) % 360}) 100%)`,
      }}
    >
      <span className="font-heading text-lg font-semibold leading-snug text-white/90 line-clamp-2">
        {title}
      </span>
    </div>
  );
}

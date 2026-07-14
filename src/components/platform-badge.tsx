import Image from "next/image";
import { hueFromString } from "@/lib/format";

// Platform identity chip: uploaded logo when present, otherwise a
// deterministic monogram tile so listings never show broken images.
export function PlatformBadge({
  name,
  logoUrl,
  size = 20,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          className="rounded-sm object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex items-center justify-center rounded-sm font-semibold text-white"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.55,
            background: `oklch(0.55 0.13 ${hueFromString(name)})`,
          }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span>{name}</span>
    </span>
  );
}

// Original SkillSherpa mark: an ascending guide-path climbing three rising
// peaks toward a summit point, drawn as a single stroke. Designed in-house;
// no external icon packs or third-party brand assets.
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M5 23.5 L11 15 L15 19.5 L21.5 9.5"
        className="stroke-primary-foreground"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="7.5" r="2.5" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-heading text-lg font-bold tracking-tight">
        Skill<span className="text-primary">Sherpa</span>
      </span>
    </span>
  );
}

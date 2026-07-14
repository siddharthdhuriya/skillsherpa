import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ crumbs }: { crumbs: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.name} className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3.5" />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

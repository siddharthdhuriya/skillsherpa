import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/lib/data";

export async function SiteHeader() {
  const categories = await getCategories();
  return (
    <header className="glass sticky top-0 z-40 border-b border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="SkillSherpa home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          <Link
            href="/courses"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            All courses
          </Link>
          {categories
            .filter((c) => !c.parent_category_id)
            .slice(0, 4)
            .map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {c.name}
              </Link>
            ))}
        </nav>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Search courses">
            <Link href="/search">
              <Search aria-hidden="true" className="size-4.5" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

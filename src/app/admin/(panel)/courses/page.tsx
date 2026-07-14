import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCourses, getPlatforms } from "@/lib/data";
import { CoursesTable } from "./courses-table";

const PAGE_SIZE = 10;

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string; status?: string; page?: string }>;
}) {
  const { q = "", platform = "", status = "", page = "1" } = await searchParams;
  const [courses, platforms] = await Promise.all([
    getCourses({ includeInactive: true }),
    getPlatforms(),
  ]);

  const query = q.trim().toLowerCase();
  const filtered = courses
    .filter((c) => !query || `${c.title} ${c.platform.name} ${c.category.name}`.toLowerCase().includes(query))
    .filter((c) => !platform || c.platform_id === platform)
    .filter((c) =>
      status === "active" ? c.is_active : status === "inactive" ? !c.is_active : true,
    );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Courses</h1>
        <Button asChild>
          <Link href="/admin/courses/new">Add course</Link>
        </Button>
      </div>
      <CoursesTable
        rows={rows.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          platformName: c.platform.name,
          categoryName: c.category.name,
          categorySlug: c.category.slug,
          priceRange: c.price_range,
          priceAmount: c.price_amount,
          currency: c.currency,
          rating: c.external_rating,
          isActive: c.is_active,
        }))}
        platforms={platforms.map((p) => ({ id: p.id, name: p.name }))}
        totalCount={filtered.length}
        page={currentPage}
        pageCount={pageCount}
        filters={{ q, platform, status }}
      />
    </div>
  );
}

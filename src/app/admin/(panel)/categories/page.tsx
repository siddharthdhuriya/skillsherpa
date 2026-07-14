import { getCategories, getCourses } from "@/lib/data";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const [categories, courses] = await Promise.all([
    getCategories(),
    getCourses({ includeInactive: true }),
  ]);
  const courseCounts = Object.fromEntries(
    categories.map((c) => [c.id, courses.filter((course) => course.category_id === c.id).length]),
  );
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Categories</h1>
      <CategoriesClient categories={categories} courseCounts={courseCounts} />
    </div>
  );
}

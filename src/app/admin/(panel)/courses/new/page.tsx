import { getAffiliatePlatforms, getCategories } from "@/lib/data";
import { CourseForm } from "../course-form";

export default async function NewCoursePage() {
  const [platforms, categories] = await Promise.all([getAffiliatePlatforms(), getCategories()]);
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Add course</h1>
      <CourseForm platforms={platforms} categories={categories} />
    </div>
  );
}

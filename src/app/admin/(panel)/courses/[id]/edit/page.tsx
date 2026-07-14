import { notFound } from "next/navigation";
import { getAffiliatePlatforms, getCategories, getCourses } from "@/lib/data";
import { CourseForm } from "../../course-form";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [platforms, categories, courses] = await Promise.all([
    getAffiliatePlatforms(),
    getCategories(),
    getCourses({ includeInactive: true }),
  ]);
  const course = courses.find((c) => c.id === id);
  if (!course) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Edit course</h1>
      <CourseForm
        platforms={platforms}
        categories={categories}
        courseId={course.id}
        initialValues={{
          title: course.title,
          slug: course.slug,
          platform_id: course.platform_id,
          category_id: course.category_id,
          subcategory: course.subcategory ?? "",
          description: course.description,
          ai_summary: course.ai_summary ?? "",
          price_range: course.price_range,
          price_amount: course.price_amount,
          currency: course.currency,
          external_rating: course.external_rating,
          review_count: course.review_count,
          duration: course.duration ?? "",
          language: course.language,
          enrollment_link: course.enrollment_link,
          thumbnail_url: course.thumbnail_url ?? "",
          is_active: course.is_active,
        }}
      />
    </div>
  );
}

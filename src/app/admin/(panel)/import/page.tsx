import { getCategories, getPlatforms } from "@/lib/data";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const [platforms, categories] = await Promise.all([getPlatforms(), getCategories()]);
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Bulk import courses</h1>
      <ImportClient
        platforms={platforms.map((p) => ({
          name: p.name,
          hasAffiliateProgram: p.has_affiliate_program,
        }))}
        categories={categories.map((c) => ({ name: c.name }))}
      />
    </div>
  );
}

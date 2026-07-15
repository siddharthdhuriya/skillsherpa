"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImageIcon, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CourseCard } from "@/components/course-card";
import { fetchCourseMetadataAction, saveCourse } from "@/app/admin/actions";
import { courseSchema, slugify, type CourseFormValues } from "@/lib/validation";
import { CURRENCIES, currencySymbol } from "@/lib/currencies";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Category, Platform, PublicCourse } from "@/lib/database.types";

// The platform dropdown receives ONLY affiliate platforms from the server
// page, so a non-affiliate platform is impossible to select here; the server
// action and the DB trigger back that up.
export function CourseForm({
  platforms,
  categories,
  initialValues,
  courseId,
}: {
  platforms: Platform[];
  categories: Category[];
  initialValues?: Partial<CourseFormValues>;
  courseId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  // Storage upload requires a real Supabase project (NEXT_PUBLIC_* env vars
  // are inlined at build time, so this check works in a client component).
  const storageEnabled = isSupabaseConfigured();

  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      slug: "",
      platform_id: "",
      category_id: "",
      subcategory: "",
      description: "",
      ai_summary: "",
      price_range: "paid" as const,
      price_amount: null,
      currency: "USD",
      external_rating: null,
      review_count: null,
      duration: "",
      language: "English",
      enrollment_link: "",
      thumbnail_url: "",
      is_active: true,
      ...initialValues,
    },
  });

  const watched = form.watch();

  const previewCourse: PublicCourse | null = useMemo(() => {
    const platform = platforms.find((p) => p.id === watched.platform_id);
    const category = categories.find((c) => c.id === watched.category_id);
    if (!platform || !category) return null;
    return {
      id: courseId ?? "preview",
      platform_id: platform.id,
      category_id: category.id,
      title: watched.title || "Course title",
      slug: watched.slug || "preview",
      subcategory: watched.subcategory || null,
      description: watched.description || "",
      ai_summary: watched.ai_summary || null,
      price_range: watched.price_range ?? "paid",
      price_amount: watched.price_amount != null && watched.price_amount !== ("" as unknown) ? Number(watched.price_amount) : null,
      currency: watched.currency || "USD",
      external_rating: watched.external_rating != null && watched.external_rating !== ("" as unknown) ? Number(watched.external_rating) : null,
      review_count: watched.review_count != null && watched.review_count !== ("" as unknown) ? Number(watched.review_count) : null,
      duration: watched.duration || null,
      language: watched.language || "English",
      thumbnail_url: watched.thumbnail_url || null,
      is_active: watched.is_active ?? true,
      created_at: "",
      updated_at: "",
      platform,
      category,
    };
  }, [watched, platforms, categories, courseId]);

  async function onImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `course-thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      form.setValue("thumbnail_url", data.publicUrl, { shouldValidate: true });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  async function onFetchFromUrl() {
    if (!sourceUrl.trim()) return;
    setIsFetchingMetadata(true);
    try {
      const result = await fetchCourseMetadataAction(sourceUrl.trim());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const data = result.data!;
      if (data.title) {
        form.setValue("title", data.title, { shouldValidate: true });
        if (!form.getFieldState("slug").isDirty) {
          form.setValue("slug", slugify(data.title));
        }
      }
      if (data.description) form.setValue("description", data.description, { shouldValidate: true });
      if (data.thumbnailUrl) form.setValue("thumbnail_url", data.thumbnailUrl);
      if (data.externalRating != null) form.setValue("external_rating", data.externalRating);
      if (data.reviewCount != null) form.setValue("review_count", data.reviewCount);
      if (data.language) form.setValue("language", data.language);
      if (data.duration) form.setValue("duration", data.duration);
      if (data.priceRange) form.setValue("price_range", data.priceRange, { shouldValidate: true });
      if (data.priceAmount != null) form.setValue("price_amount", data.priceAmount);
      if (data.currency) form.setValue("currency", data.currency);
      if (data.detectedPlatformId) form.setValue("platform_id", data.detectedPlatformId, { shouldValidate: true });
      form.setValue("enrollment_link", data.sourceUrl, { shouldValidate: true });

      if (data.warnings.length > 0) {
        data.warnings.forEach((w) => toast.warning(w));
      } else {
        toast.success("Course details imported. Review everything before saving.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not fetch that URL.");
    } finally {
      setIsFetchingMetadata(false);
    }
  }

  function onSubmit(values: CourseFormValues) {
    startTransition(async () => {
      const result = await saveCourse(values, courseId);
      if (result.ok) {
        toast.success(courseId ? "Course updated and live" : "Course created and live");
        router.push("/admin/courses");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const err = form.formState.errors;
  const field = (label: string, id: keyof CourseFormValues, input: React.ReactNode, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {hint && !err[id] && <p className="text-xs text-muted-foreground">{hint}</p>}
      {err[id] && <p className="text-xs text-destructive">{String(err[id]?.message)}</p>}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {!courseId && (
          <div className="space-y-2 rounded-lg border border-dashed p-4">
            <Label htmlFor="source-url" className="flex items-center gap-1.5">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              Import from a course URL (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="source-url"
                type="url"
                placeholder="https://www.coursera.org/specializations/..."
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={isFetchingMetadata}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onFetchFromUrl}
                disabled={isFetchingMetadata || !sourceUrl.trim()}
              >
                {isFetchingMetadata ? "Fetching..." : "Fetch details"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pulls whatever title, description, rating, and image the course&apos;s own page
              publishes. Always review the fields below before saving. This never fills in the
              AI summary; write that yourself in your own words.
            </p>
          </div>
        )}

        {field(
          "Title",
          "title",
          <Input
            id="title"
            {...form.register("title", {
              onChange: (e) => {
                if (!courseId && !form.getFieldState("slug").isDirty) {
                  form.setValue("slug", slugify(e.target.value));
                }
              },
            })}
          />,
        )}
        {field(
          "Slug",
          "slug",
          <Input id="slug" {...form.register("slug")} />,
          "Auto-generated from the title for a clean, SEO-friendly URL. Edit only if needed.",
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="platform_id">Platform</Label>
            <Select
              value={watched.platform_id || undefined}
              onValueChange={(v) => form.setValue("platform_id", v, { shouldValidate: true })}
            >
              <SelectTrigger id="platform_id" className="w-full">
                <SelectValue placeholder="Choose a partner platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only platforms with an active affiliate partnership are listed.
            </p>
            {err.platform_id && (
              <p className="text-xs text-destructive">{String(err.platform_id.message)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Category</Label>
            <Select
              value={watched.category_id || undefined}
              onValueChange={(v) => form.setValue("category_id", v, { shouldValidate: true })}
            >
              <SelectTrigger id="category_id" className="w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err.category_id && (
              <p className="text-xs text-destructive">{String(err.category_id.message)}</p>
            )}
          </div>
        </div>

        {field("Subcategory (optional)", "subcategory", <Input id="subcategory" {...form.register("subcategory")} />)}
        {field(
          "Description",
          "description",
          <Textarea id="description" rows={4} {...form.register("description")} />,
          "What the course covers. Shown on the course page.",
        )}
        {field(
          "AI summary (optional)",
          "ai_summary",
          <Textarea id="ai_summary" rows={4} {...form.register("ai_summary")} />,
          "SkillSherpa's own take on who this course is for. Must be original wording, not the platform's marketing copy.",
        )}

        <div className="space-y-1.5">
          <Label>Price</Label>
          <div className="flex gap-2">
            {(["free", "paid"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  form.setValue("price_range", option, { shouldValidate: true })
                }
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  watched.price_range === option
                    ? "border-primary bg-accent text-accent-foreground"
                    : "hover:border-primary/50"
                }`}
              >
                {option === "free" ? "Free" : "Paid"}
              </button>
            ))}
          </div>
        </div>

        {watched.price_range === "paid" && (
          <div className="grid gap-5 sm:grid-cols-2">
            {field(
              "Price amount",
              "price_amount",
              <Input id="price_amount" type="number" step="0.01" min="0" {...form.register("price_amount")} />,
            )}
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={watched.currency || "USD"}
                onValueChange={(v) => form.setValue("currency", v, { shouldValidate: true })}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {currencySymbol(c.code)} {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-3">
          {field(
            "Rating (0-5)",
            "external_rating",
            <Input id="external_rating" type="number" step="0.1" min="0" max="5" {...form.register("external_rating")} />,
            "The platform's own rating.",
          )}
          {field("Review count", "review_count", <Input id="review_count" type="number" min="0" {...form.register("review_count")} />)}
          {field("Duration", "duration", <Input id="duration" placeholder="e.g. 25 hours" {...form.register("duration")} />)}
        </div>

        {field("Language", "language", <Input id="language" {...form.register("language")} />)}

        <div className="space-y-1.5">
          <Label htmlFor="thumbnail-upload">Course image (optional)</Label>
          {storageEnabled ? (
            <div className="space-y-3">
              {watched.thumbnail_url && (
                <div className="relative w-full max-w-xs overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded URL, preview only */}
                  <img
                    src={watched.thumbnail_url}
                    alt="Course thumbnail preview"
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => form.setValue("thumbnail_url", "")}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              )}
              <label
                htmlFor="thumbnail-upload"
                className="flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
              >
                <ImageIcon aria-hidden="true" className="size-4" />
                {uploadingImage ? "Uploading..." : watched.thumbnail_url ? "Replace image" : "Upload image"}
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImageUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Any resolution works — it&apos;s automatically cropped to fit a 16:9 box on the site.
                Leave empty to use a branded gradient tile.
              </p>
            </div>
          ) : (
            <>
              <Input
                id="thumbnail-upload"
                type="url"
                placeholder="https://..."
                {...form.register("thumbnail_url")}
              />
              <p className="text-xs text-muted-foreground">
                Image upload activates once Supabase is connected. Until then, paste an image
                URL or leave empty for a branded gradient tile.
              </p>
            </>
          )}
        </div>

        {field(
          "Enrollment link (affiliate URL)",
          "enrollment_link",
          <Input id="enrollment_link" type="url" {...form.register("enrollment_link")} />,
          "The full partner URL with your tracking parameters. Visitors never see it directly; they go through /go/.",
        )}

        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Switch
            id="is_active"
            checked={watched.is_active}
            onCheckedChange={(v) => form.setValue("is_active", v)}
          />
          <div>
            <Label htmlFor="is_active">Live on the site</Label>
            <p className="text-xs text-muted-foreground">
              Inactive courses stay in the admin but are hidden everywhere else.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending || uploadingImage}>
            {isPending ? "Saving..." : courseId ? "Save changes" : "Create course"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/courses")}>
            Cancel
          </Button>
        </div>
      </form>

      <aside aria-label="Course card preview" className="lg:sticky lg:top-8 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewCourse ? (
              <CourseCard course={previewCourse} interactive={false} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Pick a platform and category to see how the course card will look.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

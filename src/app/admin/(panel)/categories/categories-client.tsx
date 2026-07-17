"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { removeCategory, saveCategory } from "@/app/admin/actions";
import { categorySchema, slugify, type CategoryFormValues } from "@/lib/validation";
import {
  generateCategoryDescription,
  generateCategorySeoDescription,
  generateCategorySeoTitle,
} from "@/lib/seo-templates";
import type { Category } from "@/lib/database.types";

export function CategoriesClient({
  categories,
  courseCounts,
}: {
  categories: Category[];
  courseCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      parent_category_id: null,
      seo_title: "",
      seo_description: "",
    },
  });

  function openEditor(category: Category | "new") {
    setEditing(category);
    if (category === "new") {
      form.reset({ name: "", slug: "", description: "", parent_category_id: null, seo_title: "", seo_description: "" });
    } else {
      form.reset({
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        parent_category_id: category.parent_category_id,
        seo_title: category.seo_title ?? "",
        seo_description: category.seo_description ?? "",
      });
    }
  }

  function onSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      const result = await saveCategory(values, editing === "new" ? undefined : editing?.id);
      if (result.ok) {
        toast.success(editing === "new" ? "Category added" : "Category updated");
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onConfirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await removeCategory(deleting.id);
      setDeleting(null);
      if (result.ok) {
        toast.success("Category deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const err = form.formState.errors;
  const seoTitle = form.watch("seo_title") ?? "";
  const seoDescription = form.watch("seo_description") ?? "";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openEditor("new")}>Add category</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>SEO title</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">/{c.slug}</TableCell>
                <TableCell className="max-w-72 truncate text-muted-foreground">
                  {c.seo_title ?? "-"}
                </TableCell>
                <TableCell className="tabular-nums">{courseCounts[c.id] ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEditor(c)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(c)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add category" : "Edit category"}</DialogTitle>
            <DialogDescription>
              SEO title and description control how this category appears in search results.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                {...form.register("name", {
                  onChange: (e) => {
                    if (editing !== "new") return;
                    const name = e.target.value.trim();
                    if (!form.getFieldState("slug").isDirty) {
                      form.setValue("slug", slugify(e.target.value));
                    }
                    if (!name) return;
                    // Auto-generate the description and SEO fields so an
                    // admin only has to type a name; each stays overridable
                    // (same "isDirty" guard as slug) if they want to tweak it.
                    if (!form.getFieldState("description").isDirty) {
                      form.setValue("description", generateCategoryDescription(name));
                    }
                    if (!form.getFieldState("seo_title").isDirty) {
                      form.setValue("seo_title", generateCategorySeoTitle(name), { shouldValidate: true });
                    }
                    if (!form.getFieldState("seo_description").isDirty) {
                      form.setValue("seo_description", generateCategorySeoDescription(name), {
                        shouldValidate: true,
                      });
                    }
                  },
                })}
              />
              {err.name && <p className="text-xs text-destructive">{err.name.message}</p>}
              {editing === "new" && !err.name && (
                <p className="text-xs text-muted-foreground">
                  Slug, description, and SEO fields below fill in automatically. Edit any of them
                  before saving if you want something different.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-slug">Slug</Label>
              <Input id="c-slug" {...form.register("slug")} />
              {err.slug && <p className="text-xs text-destructive">{err.slug.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-description">Description</Label>
              <Textarea id="c-description" rows={3} {...form.register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-seo-title">SEO title ({seoTitle.length}/70)</Label>
              <Input id="c-seo-title" {...form.register("seo_title")} />
              {err.seo_title && <p className="text-xs text-destructive">{err.seo_title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-seo-description">
                SEO description ({seoDescription.length}/170)
              </Label>
              <Textarea id="c-seo-description" rows={3} {...form.register("seo_description")} />
              {err.seo_description && (
                <p className="text-xs text-destructive">{err.seo_description.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              {deleting && (courseCounts[deleting.id] ?? 0) > 0
                ? `"${deleting.name}" still has ${courseCounts[deleting.id]} course(s). Reassign them first.`
                : `This permanently removes "${deleting?.name}".`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || (deleting != null && (courseCounts[deleting.id] ?? 0) > 0)}
              onClick={onConfirmDelete}
            >
              Delete category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

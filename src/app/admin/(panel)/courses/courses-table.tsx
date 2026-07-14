"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { removeCourse, setCourseActive } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import type { PriceRange } from "@/lib/database.types";

interface Row {
  id: string;
  title: string;
  slug: string;
  platformName: string;
  categoryName: string;
  categorySlug: string;
  priceRange: PriceRange;
  priceAmount: number | null;
  currency: string;
  rating: number | null;
  isActive: boolean;
}

export function CoursesTable({
  rows,
  platforms,
  totalCount,
  page,
  pageCount,
  filters,
}: {
  rows: Row[];
  platforms: { id: string; name: string }[];
  totalCount: number;
  page: number;
  pageCount: number;
  filters: { q: string; platform: string; status: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.replace(`/admin/courses?${params.toString()}`);
  }

  function onToggleActive(row: Row, next: boolean) {
    startTransition(async () => {
      const result = await setCourseActive(row.id, next);
      if (result.ok) {
        toast.success(next ? `"${row.title}" is now live` : `"${row.title}" hidden from the site`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onConfirmDelete() {
    if (!pendingDelete) return;
    const row = pendingDelete;
    startTransition(async () => {
      const result = await removeCourse(row.id);
      setPendingDelete(null);
      if (result.ok) {
        toast.success(`Deleted "${row.title}"`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          type="search"
          aria-label="Search courses"
          placeholder="Search by title, platform, category..."
          defaultValue={filters.q}
          className="w-full sm:w-72"
          onChange={(e) => setParam("q", e.target.value)}
        />
        <Select
          value={filters.platform || "all"}
          onValueChange={(v) => setParam("platform", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-44" aria-label="Filter by platform">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => setParam("status", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Live</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No courses match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-64">
                  <span className="block truncate font-medium">{row.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">/{row.slug}</span>
                </TableCell>
                <TableCell>{row.platformName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.categoryName}</Badge>
                </TableCell>
                <TableCell>{formatPrice(row.priceRange, row.priceAmount, row.currency)}</TableCell>
                <TableCell className="tabular-nums">{row.rating?.toFixed(1) ?? "-"}</TableCell>
                <TableCell>
                  <Switch
                    checked={row.isActive}
                    disabled={isPending}
                    onCheckedChange={(v) => onToggleActive(row, v)}
                    aria-label={`Toggle "${row.title}" live status`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/courses/${row.categorySlug}/${row.slug}`} target="_blank">
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/courses/${row.id}/edit`}>Edit</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(row)}
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount} {totalCount === 1 ? "course" : "courses"}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              Previous
            </Button>
            <span>
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete course?</DialogTitle>
            <DialogDescription>
              This permanently removes &quot;{pendingDelete?.title}&quot; and its click history.
              If you only want to hide it from the site, use the Live toggle instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={onConfirmDelete}>
              {isPending ? "Deleting..." : "Delete course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

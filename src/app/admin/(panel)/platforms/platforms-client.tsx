"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlatformBadge } from "@/components/platform-badge";
import { removePlatform, savePlatform } from "@/app/admin/actions";
import { platformSchema, type PlatformFormValues } from "@/lib/validation";
import type { Platform } from "@/lib/database.types";

export function PlatformsClient({
  platforms,
  courseCounts,
  storageEnabled,
}: {
  platforms: Platform[];
  courseCounts: Record<string, number>;
  storageEnabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Platform | "new" | null>(null);
  const [deleting, setDeleting] = useState<Platform | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      name: "",
      website_url: "",
      logo_url: "",
      has_affiliate_program: false,
      commission_rate: null,
      affiliate_network: "",
    },
  });

  function openEditor(platform: Platform | "new") {
    setEditing(platform);
    if (platform === "new") {
      form.reset({
        name: "",
        website_url: "",
        logo_url: "",
        has_affiliate_program: false,
        commission_rate: null,
        affiliate_network: "",
      });
    } else {
      form.reset({
        name: platform.name,
        website_url: platform.website_url,
        logo_url: platform.logo_url ?? "",
        has_affiliate_program: platform.has_affiliate_program,
        commission_rate: platform.commission_rate,
        affiliate_network: platform.affiliate_network ?? "",
      });
    }
  }

  async function onLogoUpload(file: File) {
    setUploading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const path = `platform-logos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      form.setValue("logo_url", data.publicUrl, { shouldValidate: true });
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(values: PlatformFormValues) {
    startTransition(async () => {
      const result = await savePlatform(values, editing === "new" ? undefined : editing?.id);
      if (result.ok) {
        toast.success(editing === "new" ? "Platform added" : "Platform updated");
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
      const result = await removePlatform(deleting.id);
      setDeleting(null);
      if (result.ok) {
        toast.success("Platform deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const watched = form.watch();
  const err = form.formState.errors;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openEditor("new")}>Add platform</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Affiliate program</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {platforms.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <PlatformBadge name={p.name} logoUrl={p.logo_url} size={24} />
                </TableCell>
                <TableCell>
                  {p.has_affiliate_program ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Active partner</Badge>
                  ) : (
                    <Badge variant="destructive">No partnership</Badge>
                  )}
                </TableCell>
                <TableCell>{p.affiliate_network ?? "-"}</TableCell>
                <TableCell className="tabular-nums">
                  {p.commission_rate != null ? `${p.commission_rate}%` : "-"}
                </TableCell>
                <TableCell className="tabular-nums">{courseCounts[p.id] ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEditor(p)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(p)}
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
            <DialogTitle>{editing === "new" ? "Add platform" : "Edit platform"}</DialogTitle>
            <DialogDescription>
              Only platforms with an active affiliate partnership can have courses listed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* has_affiliate_program is the gate for everything else — kept
                prominent at the top of the form, not buried. */}
            <div className="flex items-center justify-between rounded-lg border-2 border-primary/40 bg-accent/40 p-4">
              <div>
                <Label htmlFor="has_affiliate_program" className="font-semibold">
                  Active affiliate partnership
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required before any course from this platform can be listed.
                </p>
              </div>
              <Switch
                id="has_affiliate_program"
                checked={watched.has_affiliate_program}
                onCheckedChange={(v) => form.setValue("has_affiliate_program", v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" {...form.register("name")} />
              {err.name && <p className="text-xs text-destructive">{err.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-website">Website URL</Label>
              <Input id="p-website" type="url" {...form.register("website_url")} />
              {err.website_url && (
                <p className="text-xs text-destructive">{err.website_url.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-logo">Logo</Label>
              {storageEnabled ? (
                <input
                  id="p-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onLogoUpload(file);
                  }}
                />
              ) : (
                <>
                  <Input id="p-logo" type="url" placeholder="https://..." {...form.register("logo_url")} />
                  <p className="text-xs text-muted-foreground">
                    File upload to Supabase Storage activates once Supabase is connected. Until
                    then, paste an image URL or leave empty for a monogram tile.
                  </p>
                </>
              )}
              {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
              {watched.logo_url && (
                <p className="break-all text-xs text-muted-foreground">{watched.logo_url}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-rate">Commission rate (%)</Label>
                <Input id="p-rate" type="number" step="0.01" min="0" max="100" {...form.register("commission_rate")} />
                <p className="text-xs text-muted-foreground">
                  Confirm against the platform&apos;s live affiliate agreement.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-network">Affiliate network</Label>
                <Input id="p-network" placeholder="e.g. Cuelinks, Direct" {...form.register("affiliate_network")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || uploading}>
                {isPending ? "Saving..." : "Save platform"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete platform?</DialogTitle>
            <DialogDescription>
              {deleting && (courseCounts[deleting.id] ?? 0) > 0
                ? `"${deleting.name}" still has ${courseCounts[deleting.id]} course(s). Delete or reassign them first.`
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
              Delete platform
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

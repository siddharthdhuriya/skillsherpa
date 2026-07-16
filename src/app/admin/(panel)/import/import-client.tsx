"use client";

import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkImportCourses, type ImportRowResult } from "@/app/admin/actions";
import { csvRowSchema } from "@/lib/validation";

const TEMPLATE_HEADER =
  "slug,title,platform,category,subcategory,offered_by,description,ai_summary,price_range,price_amount,currency,external_rating,review_count,duration,language,enrollment_link";
const TEMPLATE_EXAMPLE = `"","Intro to Data Analysis","Coursera","Data Science","Data Analysis","Example University","A 20-character-plus description of what the course covers.","Optional original summary.","paid",29.99,USD,4.5,1200,"12 hours",English,https://www.example-partner.com/course?aff=YOURID`;

interface PreviewRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  title: string;
  platform: string;
  category: string;
  action: "create" | "update";
  matchedTitle?: string;
  status: "valid" | "blocked" | "invalid";
  problems: string[];
}

export function ImportClient({
  platforms,
  categories,
  existingCourses,
}: {
  platforms: { name: string; hasAffiliateProgram: boolean }[];
  categories: { name: string }[];
  existingCourses: { slug: string; title: string }[];
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const existingBySlug = new Map(existingCourses.map((c) => [c.slug, c.title]));

  function validateRows(rows: Record<string, unknown>[]): PreviewRow[] {
    return rows.map((raw, i) => {
      const problems: string[] = [];
      let status: PreviewRow["status"] = "valid";

      const parsed = csvRowSchema.safeParse(raw);
      if (!parsed.success) {
        status = "invalid";
        problems.push(
          ...parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`),
        );
      }

      const platformName = String(raw.platform ?? "").trim();
      const categoryName = String(raw.category ?? "").trim();
      const platform = platforms.find(
        (p) => p.name.toLowerCase() === platformName.toLowerCase(),
      );
      if (!platform) {
        status = "invalid";
        problems.push(`Unknown platform "${platformName}". Add it under Platforms first.`);
      } else if (!platform.hasAffiliateProgram) {
        // Hard product rule: flagged and blocked in preview, never imported.
        status = "blocked";
        problems.push(
          `"${platform.name}" has no affiliate partnership. Its courses cannot be listed on SkillSherpa.`,
        );
      }
      if (!categories.some((c) => c.name.toLowerCase() === categoryName.toLowerCase())) {
        if (status === "valid") status = "invalid";
        problems.push(`Unknown category "${categoryName}". Add it under Categories first.`);
      }

      const slug = String(raw.slug ?? "").trim();
      const matchedTitle = slug ? existingBySlug.get(slug) : undefined;

      return {
        rowNumber: i + 1,
        raw,
        title: String(raw.title ?? "(untitled)"),
        platform: platformName,
        category: categoryName,
        action: matchedTitle ? "update" : "create",
        matchedTitle,
        status,
        problems,
      };
    });
  }

  function onFileChosen(file: File) {
    setResults(null);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (parsed) => {
        if (parsed.errors.length > 0) {
          toast.error(`CSV parse problem on row ${parsed.errors[0].row}: ${parsed.errors[0].message}`);
        }
        if (parsed.data.length === 0) {
          toast.error("No rows found in that file.");
          return;
        }
        setPreview(validateRows(parsed.data));
      },
    });
  }

  function onImport() {
    if (!preview) return;
    const validRows = preview.filter((r) => r.status === "valid").map((r) => r.raw);
    if (validRows.length === 0) {
      toast.error("There are no valid rows to import.");
      return;
    }
    startTransition(async () => {
      const result = await bulkImportCourses(validRows);
      if (result.ok && result.data) {
        const created = result.data.filter((r) => r.status === "created").length;
        const updated = result.data.filter((r) => r.status === "updated").length;
        toast.success(
          `${created} created, ${updated} updated (${validRows.length} rows processed). Live now.`,
        );
        setResults(result.data);
        setPreview(null);
        if (fileInput.current) fileInput.current.value = "";
      } else if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  function downloadTemplate() {
    const blob = new Blob([`${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skillsherpa-course-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = preview
    ? {
        valid: preview.filter((r) => r.status === "valid").length,
        blocked: preview.filter((r) => r.status === "blocked").length,
        invalid: preview.filter((r) => r.status === "invalid").length,
        creating: preview.filter((r) => r.status === "valid" && r.action === "create").length,
        updating: preview.filter((r) => r.status === "valid" && r.action === "update").length,
      }
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload a CSV</CardTitle>
          <CardDescription>
            Columns: slug, title, platform, category, subcategory, offered_by, description,
            ai_summary, price_range (free, paid), price_amount, currency, external_rating,
            review_count, duration, language, enrollment_link. Platform and category are
            matched by name.
            <br />
            <strong>Leave slug blank to create a new course</strong> (a slug is generated from
            the title automatically). <strong>Fill in an existing course&apos;s slug to update
            it</strong> instead of creating a duplicate — export your current courses first if
            you want their exact slugs. Changing the slug column itself doesn&apos;t rename a
            course; it creates a new one, since slug is how a row is matched to a course.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose CSV file"
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChosen(file);
            }}
          />
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            Download template
          </Button>
        </CardContent>
      </Card>

      {preview && counts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Review before importing</CardTitle>
            <CardDescription>
              {counts.creating > 0 && `${counts.creating} will be created`}
              {counts.creating > 0 && counts.updating > 0 && ", "}
              {counts.updating > 0 && `${counts.updating} will be updated`}
              {counts.blocked > 0 && `, ${counts.blocked} blocked (non-affiliate platform)`}
              {counts.invalid > 0 && `, ${counts.invalid} with errors`}. Nothing is committed
              until you confirm.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {counts.blocked > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Some rows are blocked</AlertTitle>
                <AlertDescription>
                  Rows referencing platforms without an affiliate partnership cannot be imported.
                  This is a product rule enforced in the database as well.
                </AlertDescription>
              </Alert>
            )}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Problems</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
                      <TableCell className="max-w-56 truncate font-medium">{row.title}</TableCell>
                      <TableCell>{row.platform}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>
                        {row.status !== "invalid" && row.status !== "blocked" ? (
                          row.action === "update" ? (
                            <Badge variant="outline" className="border-primary text-primary">
                              Update: {row.matchedTitle}
                            </Badge>
                          ) : (
                            <Badge variant="outline">New course</Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.status === "valid" && <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Ready</Badge>}
                        {row.status === "blocked" && <Badge variant="destructive">Blocked</Badge>}
                        {row.status === "invalid" && <Badge variant="outline">Fix errors</Badge>}
                      </TableCell>
                      <TableCell className="max-w-80 text-xs text-muted-foreground">
                        {row.problems.join(" ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-3">
              <Button onClick={onImport} disabled={isPending || counts.valid === 0}>
                {isPending
                  ? "Importing..."
                  : `Import ${counts.valid} ${counts.valid === 1 ? "row" : "rows"}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPreview(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {results.map((r) => (
                <li key={r.row} className="flex items-center gap-2">
                  {r.status === "created" && (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Created</Badge>
                  )}
                  {r.status === "updated" && (
                    <Badge className="bg-primary text-primary-foreground hover:bg-primary">Updated</Badge>
                  )}
                  {r.status === "failed" && <Badge variant="destructive">Failed</Badge>}
                  <span className="font-medium">{r.title}</span>
                  {r.error && <span className="text-xs text-muted-foreground">{r.error}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

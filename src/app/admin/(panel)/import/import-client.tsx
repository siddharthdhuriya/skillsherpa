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
  "title,platform,category,subcategory,offered_by,description,ai_summary,price_range,price_amount,currency,external_rating,review_count,duration,language,enrollment_link";
const TEMPLATE_EXAMPLE = `"Intro to Data Analysis","Coursera","Data Science","Data Analysis","Example University","A 20-character-plus description of what the course covers.","Optional original summary.","paid",29.99,USD,4.5,1200,"12 hours",English,https://www.example-partner.com/course?aff=YOURID`;

interface PreviewRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  title: string;
  platform: string;
  category: string;
  status: "valid" | "blocked" | "invalid";
  problems: string[];
}

export function ImportClient({
  platforms,
  categories,
}: {
  platforms: { name: string; hasAffiliateProgram: boolean }[];
  categories: { name: string }[];
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

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

      return {
        rowNumber: i + 1,
        raw,
        title: String(raw.title ?? "(untitled)"),
        platform: platformName,
        category: categoryName,
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
        const imported = result.data.filter((r) => r.status === "imported").length;
        toast.success(`Imported ${imported} of ${validRows.length} courses. They are live now.`);
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
      }
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload a CSV</CardTitle>
          <CardDescription>
            Columns: title, platform, category, subcategory, offered_by, description,
            ai_summary, price_range (free, paid), price_amount, currency, external_rating,
            review_count, duration, language, enrollment_link. Platform and category are
            matched by name. Slugs are generated automatically.
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
              {counts.valid} ready to import
              {counts.blocked > 0 && `, ${counts.blocked} blocked (non-affiliate platform)`}
              {counts.invalid > 0 && `, ${counts.invalid} with errors`}. Only valid rows are
              imported; nothing is committed until you confirm.
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
                  : `Import ${counts.valid} ${counts.valid === 1 ? "course" : "courses"}`}
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
                  {r.status === "imported" ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Imported</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
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

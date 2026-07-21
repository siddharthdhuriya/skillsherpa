import "server-only";

import * as cheerio from "cheerio";

// Fetches a course's own page and extracts whatever structured metadata it
// publishes for SEO purposes (JSON-LD Course schema, Open Graph tags) to
// prefill the admin's "Add course" form. This mirrors what any link-preview
// tool does with public, machine-readable metadata a site chooses to expose.
//
// Deliberately does NOT touch ai_summary: SkillSherpa's own original take on
// a course must stay admin-authored, both per product policy and because the
// distinctness check would otherwise be trivially defeated by pasting the
// source's own copy into the field it's meant to guard against.

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB — real course pages are well under this
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface FetchedCourseMetadata {
  title: string | null;
  description: string | null;
  offeredBy: string | null;
  thumbnailUrl: string | null; // Supabase Storage URL once re-uploaded, or null
  externalRating: number | null;
  reviewCount: number | null;
  language: string | null;
  duration: string | null;
  priceAmount: number | null;
  priceRange: "free" | "paid" | null;
  currency: string | null;
  detectedPlatformId: string | null;
  sourceUrl: string;
  warnings: string[];
}

// Blocks the classic SSRF targets (localhost, private ranges, link-local /
// cloud metadata endpoint). This is admin-only and gated behind auth, but
// it's a server-side fetch of an admin-supplied URL, so closing this off is
// cheap defense in depth regardless of who can trigger it.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "169.254.169.254") return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
  pt: "Portuguese", hi: "Hindi", ja: "Japanese", zh: "Chinese", ko: "Korean",
  ar: "Arabic", ru: "Russian", nl: "Dutch", tr: "Turkish", pl: "Polish",
};

function friendlyLanguage(code: string | undefined): string | null {
  if (!code) return null;
  const base = code.split("-")[0].toLowerCase();
  return LANGUAGE_NAMES[base] ?? code;
}

// Converts a schema.org ISO 8601 duration ("P2M", "PT10H", "P1W") into the
// short human strings this app already uses ("2 months", "10 hours").
function friendlyDuration(iso: string | undefined): string | null {
  if (!iso) return null;
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(iso);
  if (!match) return null;
  const [, years, months, weeks, days, hours, minutes] = match;
  const parts: string[] = [];
  const push = (value: string | undefined, unit: string) => {
    const n = Number(value);
    if (n > 0) parts.push(`${n} ${unit}${n === 1 ? "" : "s"}`);
  };
  push(years, "year");
  push(months, "month");
  push(weeks, "week");
  push(days, "day");
  push(hours, "hour");
  push(minutes, "minute");
  return parts.length > 0 ? parts.slice(0, 2).join(" ") : null;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Coursera (and some others) conventionally open their meta description with
// "Offered by <institution>. <rest of description>" — e.g. "Offered by
// Stanford University and DeepLearning.AI. #BreakIntoAI with...". Pulls that
// out into its own field and returns the remaining description without it,
// so the stored description doesn't redundantly repeat what's now a
// dedicated field.
function extractOfferedBy(text: string): { offeredBy: string | null; rest: string } {
  // Non-greedy up to a period FOLLOWED BY WHITESPACE, not just any period —
  // institution names routinely contain periods with no trailing space
  // (e.g. "DeepLearning.AI"), which a naive `[^.]+` would stop at instead of
  // the real end of the sentence.
  const match = /^Offered by (.+?)\.\s+/i.exec(text);
  if (!match) return { offeredBy: null, rest: text };
  return { offeredBy: match[1].trim(), rest: text.slice(match[0].length).trim() };
}

/** Walks a JSON-LD payload (object, array, or @graph) looking for a Course node. */
function findCourseNode(data: unknown): Record<string, unknown> | null {
  const isCourse = (n: unknown): n is Record<string, unknown> =>
    typeof n === "object" && n !== null && "@type" in n &&
    (Array.isArray((n as Record<string, unknown>)["@type"])
      ? ((n as Record<string, unknown>)["@type"] as unknown[]).includes("Course")
      : (n as Record<string, unknown>)["@type"] === "Course");

  if (Array.isArray(data)) {
    for (const node of data) {
      const found = findCourseNode(node);
      if (found) return found;
    }
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  if (isCourse(data)) return data as Record<string, unknown>;
  const graph = (data as Record<string, unknown>)["@graph"];
  if (graph) return findCourseNode(graph);
  return null;
}

async function reuploadImage(imageUrl: string, warnings: string[]): Promise<string | null> {
  try {
    const { isSupabaseConfigured } = await import("@/lib/supabase/env");
    if (!isSupabaseConfigured()) return null; // demo mode: no real storage to upload to

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      warnings.push("Could not download the source image.");
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      warnings.push("Source image URL did not return an image.");
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      warnings.push("Source image was too large to import automatically.");
      return null;
    }
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const path = `course-thumbnails/${Date.now()}-fetched.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, buffer, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      warnings.push(`Could not save the source image: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    warnings.push("Could not download the source image.");
    return null;
  }
}

function validateSourceUrl(sourceUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http/https URLs are supported.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("That URL can't be fetched.");
  }
  return parsed;
}

async function fetchHtml(sourceUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // A normal browser UA — some course platforms serve a stripped-down
        // page (or block) generic/bot user agents.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`The page returned an error (status ${res.status}).`);
    const reader = res.body?.getReader();
    if (!reader) return await res.text();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) throw new Error("The page was too large to process.");
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("The page took too long to respond.");
    }
    throw e instanceof Error ? e : new Error("Could not fetch that URL.");
  } finally {
    clearTimeout(timeout);
  }
}

function extractAggregateRating(course: Record<string, unknown>): { externalRating: number | null; reviewCount: number | null } {
  const rating = course.aggregateRating as Record<string, unknown> | undefined;
  if (!rating) return { externalRating: null, reviewCount: null };
  const value = Number(rating.ratingValue);
  const count = Number(rating.reviewCount ?? rating.ratingCount);
  return {
    externalRating: Number.isFinite(value) ? Math.round(value * 10) / 10 : null,
    reviewCount: Number.isFinite(count) ? count : null,
  };
}

// Lightweight companion to fetchCourseMetadata() for periodic re-fetching of
// just rating/review_count on an existing course — skips title/description/
// image extraction (and the image re-upload that would otherwise re-run on
// every scheduled refresh) since only the two rating fields are needed.
export async function fetchCourseRating(
  sourceUrl: string,
): Promise<{ externalRating: number | null; reviewCount: number | null }> {
  validateSourceUrl(sourceUrl);
  const html = await fetchHtml(sourceUrl);
  const $ = cheerio.load(html);

  let course: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (course) return;
    try {
      course = findCourseNode(JSON.parse($(el).text()));
    } catch {
      // malformed JSON-LD on the source page: skip this block
    }
  });

  if (!course) return { externalRating: null, reviewCount: null };
  return extractAggregateRating(course);
}

export async function fetchCourseMetadata(sourceUrl: string): Promise<FetchedCourseMetadata> {
  const warnings: string[] = [];
  const result: FetchedCourseMetadata = {
    title: null, description: null, offeredBy: null, thumbnailUrl: null, externalRating: null,
    reviewCount: null, language: null, duration: null, priceAmount: null,
    priceRange: null, currency: null, detectedPlatformId: null, sourceUrl, warnings,
  };

  const parsed = validateSourceUrl(sourceUrl);
  const html = await fetchHtml(sourceUrl);
  const $ = cheerio.load(html);

  // 1. JSON-LD Course schema (richest source when present).
  let course: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (course) return;
    try {
      const data = JSON.parse($(el).text());
      course = findCourseNode(data);
    } catch {
      // malformed JSON-LD on the source page: skip this block
    }
  });

  let jsonLdTitle: string | null = null;
  let jsonLdProviderName: string | null = null;
  if (course) {
    const c = course as Record<string, unknown>;
    if (typeof c.name === "string") jsonLdTitle = c.name;
    if (typeof c.description === "string") {
      const { offeredBy, rest } = extractOfferedBy(stripHtml(c.description));
      result.description = rest;
      result.offeredBy = offeredBy;
    }
    const provider = c.provider as Record<string, unknown> | undefined;
    if (typeof provider?.name === "string") jsonLdProviderName = provider.name;
    if (typeof c.image === "string") result.thumbnailUrl = c.image;
    else if (Array.isArray(c.image) && typeof c.image[0] === "string") result.thumbnailUrl = c.image[0];
    if (typeof c.inLanguage === "string") result.language = friendlyLanguage(c.inLanguage);

    const instance = c.hasCourseInstance as Record<string, unknown> | undefined;
    const durationSource =
      (instance?.courseWorkload as string) ?? (c.timeRequired as string) ?? undefined;
    result.duration = friendlyDuration(durationSource);

    const { externalRating, reviewCount } = extractAggregateRating(c);
    result.externalRating = externalRating;
    result.reviewCount = reviewCount;

    const offers = c.offers as Record<string, unknown> | undefined;
    if (offers) {
      const price = Number(offers.price);
      if (Number.isFinite(price)) {
        result.priceAmount = price > 0 ? price : null;
        result.priceRange = price > 0 ? "paid" : "free";
        if (typeof offers.priceCurrency === "string") result.currency = offers.priceCurrency;
      }
    }
  } else {
    warnings.push("No structured course data found on that page; only basic details could be extracted.");
  }

  // 2. Title: prefer the page's own <h1>, since platforms often publish a
  // shorter/different title in <title>, og:title, and even JSON-LD's "name"
  // for SEO/social-preview purposes than what's actually shown to visitors
  // (e.g. Coursera's "Machine Learning Specialization" page has og:title and
  // JSON-LD name both just say "Machine Learning"). Fall back through
  // JSON-LD, then Open Graph, then <title>, only if there's no usable H1.
  const h1Text = $("h1")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .find((text) => text.length >= 3);
  const titleTagText = $("title")
    .first()
    .text()
    .replace(/\s*[|–-]\s*[^|–-]+$/, "") // strip a trailing " | SiteName" / " - SiteName"
    .trim();
  result.title =
    h1Text || jsonLdTitle || $('meta[property="og:title"]').attr("content")?.trim() || titleTagText || null;

  // 3. Open Graph fallback for anything JSON-LD didn't cover.
  if (!result.description) {
    const ogDesc = $('meta[property="og:description"]').attr("content") ?? $('meta[name="description"]').attr("content");
    if (ogDesc) {
      const { offeredBy, rest } = extractOfferedBy(stripHtml(ogDesc));
      result.description = rest;
      if (!result.offeredBy) result.offeredBy = offeredBy;
    }
  }
  if (!result.offeredBy) result.offeredBy = jsonLdProviderName;
  if (!result.thumbnailUrl) {
    result.thumbnailUrl = $('meta[property="og:image"]').attr("content")?.trim() || null;
  }

  if (!result.title) throw new Error("Could not find a title on that page.");

  // 4. Match the source domain against your existing affiliate platforms.
  try {
    const { getAffiliatePlatforms } = await import("@/lib/data");
    const platforms = await getAffiliatePlatforms();
    const match = platforms.find((p) => {
      try {
        return new URL(p.website_url).hostname.replace(/^www\./, "") === parsed.hostname.replace(/^www\./, "");
      } catch {
        return false;
      }
    });
    result.detectedPlatformId = match?.id ?? null;
    if (!match) {
      warnings.push(`"${parsed.hostname}" doesn't match any of your affiliate partner platforms — choose one manually.`);
    }
  } catch {
    // platform lookup failing shouldn't block the rest of the extraction
  }

  // 5. Re-host the thumbnail on Supabase Storage so it works with next/image
  // (which only trusts your own Storage domain, not arbitrary source sites).
  if (result.thumbnailUrl) {
    const rehosted = await reuploadImage(result.thumbnailUrl, warnings);
    result.thumbnailUrl = rehosted;
    if (!rehosted) warnings.push("Source thumbnail could not be imported automatically; upload one manually.");
  }

  return result;
}

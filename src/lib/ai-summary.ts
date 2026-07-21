import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { checkDistinctness } from "@/lib/distinctness";

// Auto-generates SkillSherpa's own "AI summary" for a course from its
// description. This is the one path allowed to fill ai_summary without a
// human writing it — everywhere else (CSV import, admin form, Sheets sync)
// still lets an admin override by typing their own value, which always wins
// over generation. checkDistinctness() is the same guard a human-authored
// summary must pass, so a generated one gets no free pass on duplicate-
// content SEO risk; it just gets a few automatic rewrite attempts instead of
// a rejected form submission.

const MODEL = "claude-haiku-4-5-20251001";
const MAX_ATTEMPTS = 3;

// Claude is instructed not to use em dashes, but this is a hard backstop:
// replace any that slip through with a comma so the output never contains
// one, without ever emitting the visually similar "double hyphen" instead.
function stripEmDashes(text: string): string {
  return text
    .replace(/\s*[–—]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrompt(title: string, description: string, tooSimilarTo?: string): string {
  const base = `Write a 2-3 sentence "AI summary" for this course, in SkillSherpa's own original voice — not a rewording of the course's marketing description, but our independent take on who the course is for and why it's worth taking.

Course title: ${title}
Course description: ${description}

Rules:
- 2-3 sentences, plain prose, no headings or bullet points.
- Do not use em dashes or en dashes (— or –) anywhere in the response.
- Do not copy phrases from the description; use different sentence structure and wording throughout.
- No marketing fluff like "unlock your potential" — be concrete about who benefits and what they'll walk away with.
- Output only the summary text, nothing else.`;

  if (!tooSimilarTo) return base;
  return `${base}

Your previous attempt was rejected for being too textually similar to the description: "${tooSimilarTo}"
Rewrite it with substantially different sentence structure and vocabulary while keeping the same meaning.`;
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Returns a generated summary, or null if generation isn't configured or
 * couldn't produce a sufficiently original result after a few attempts.
 * Never throws — callers treat a missing ai_summary as acceptable rather
 * than blocking course creation/import on an LLM call.
 */
export async function generateAiSummary(title: string, description: string): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  let lastAttempt: string | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: buildPrompt(title, description, lastAttempt) }],
      });
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") continue;
      const summary = stripEmDashes(block.text.trim());
      if (!summary) continue;
      if (!checkDistinctness(summary, description)) return summary;
      lastAttempt = summary;
    } catch {
      return null;
    }
  }
  return null;
}

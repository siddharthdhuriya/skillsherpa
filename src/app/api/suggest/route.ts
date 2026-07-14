import { NextRequest, NextResponse } from "next/server";
import { getSuggestions } from "@/lib/data";

// Autocomplete endpoint for the hero/search inputs. Not indexable content.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const suggestions = await getSuggestions(q);
  return NextResponse.json(suggestions, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Robots-Tag": "noindex",
    },
  });
}

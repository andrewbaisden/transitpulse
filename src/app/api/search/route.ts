import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchStopsAndLines } from "@/server/queries/search";

const QuerySchema = z.object({ q: z.string().default("") });

export async function GET(request: NextRequest) {
  const { q } = QuerySchema.parse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });

  const results = await searchStopsAndLines(q);
  return NextResponse.json({ results });
}

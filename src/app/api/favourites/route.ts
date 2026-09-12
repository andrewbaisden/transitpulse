import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/client";

// Exactly one of lineId/stopId — never both, never neither. Enforced here
// (the query-layer boundary), not by the schema itself — see
// DECISIONS.md ADR-025.
const TargetSchema = z
  .object({
    lineId: z.string().min(1).optional(),
    stopId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.lineId) !== Boolean(value.stopId), {
    message: "Provide exactly one of lineId or stopId",
  });

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = TargetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const favourite = await prisma.favourite.upsert({
    where: parsed.data.lineId
      ? { userId_lineId: { userId: session.user.id, lineId: parsed.data.lineId } }
      : { userId_stopId: { userId: session.user.id, stopId: parsed.data.stopId ?? "" } },
    create: { userId: session.user.id, ...parsed.data },
    update: {},
  });

  return NextResponse.json({ favouriteId: favourite.id });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = z.object({ favouriteId: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  // Scoped to the current user — deleteMany rather than delete so an
  // attempt to remove someone else's favourite silently affects zero rows
  // instead of leaking whether that id exists.
  await prisma.favourite.deleteMany({
    where: { id: parsed.data.favouriteId, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}

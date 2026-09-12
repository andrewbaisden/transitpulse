import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getFavouriteId, getUserFavourites } from "@/server/queries/favourites";
import { seedDemoData } from "../../../support/seed-demo-data";

const TEST_USER_ID = "test-favourites-user";

describe("favourites queries", () => {
  let centralId: string;
  let stratfordId: string;

  beforeAll(async () => {
    await seedDemoData();
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      create: {
        id: TEST_USER_ID,
        name: "Favourites Test User",
        email: "favourites-test@example.com",
        emailVerified: false,
      },
      update: {},
    });

    const central = await prisma.line.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "central" } },
    });
    centralId = central.id;
    const stratford = await prisma.stop.findUniqueOrThrow({
      where: { source_externalRef: { source: "demo", externalRef: "stratford" } },
    });
    stratfordId = stratford.id;
  });

  afterAll(async () => {
    await prisma.favourite.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.delete({ where: { id: TEST_USER_ID } });
  });

  it("returns no favourite id and empty lists before anything is favourited", async () => {
    expect(await getFavouriteId(TEST_USER_ID, { lineId: centralId })).toBeNull();
    expect(await getUserFavourites(TEST_USER_ID)).toEqual({ lines: [], stops: [] });
  });

  it("reports a favourited line and station once created", async () => {
    await prisma.favourite.create({ data: { userId: TEST_USER_ID, lineId: centralId } });
    await prisma.favourite.create({ data: { userId: TEST_USER_ID, stopId: stratfordId } });

    const favouriteId = await getFavouriteId(TEST_USER_ID, { lineId: centralId });
    expect(favouriteId).not.toBeNull();

    const favourites = await getUserFavourites(TEST_USER_ID);
    expect(favourites.lines).toHaveLength(1);
    expect(favourites.lines[0].name).toBe("Central");
    expect(favourites.stops).toHaveLength(1);
    expect(favourites.stops[0].name).toBe("Stratford");
  });
});

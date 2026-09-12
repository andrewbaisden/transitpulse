import { prisma } from "@/server/db/client";

export interface FavouriteLine {
  favouriteId: string;
  id: string;
  name: string;
  color: string | null;
}

export interface FavouriteStop {
  favouriteId: string;
  id: string;
  name: string;
}

export interface UserFavourites {
  lines: FavouriteLine[];
  stops: FavouriteStop[];
}

export async function getUserFavourites(userId: string): Promise<UserFavourites> {
  const favourites = await prisma.favourite.findMany({
    where: { userId },
    include: { line: true, stop: true },
    orderBy: { createdAt: "desc" },
  });

  const lines: FavouriteLine[] = [];
  const stops: FavouriteStop[] = [];
  for (const favourite of favourites) {
    if (favourite.line) {
      lines.push({
        favouriteId: favourite.id,
        id: favourite.line.id,
        name: favourite.line.name,
        color: favourite.line.color,
      });
    } else if (favourite.stop) {
      stops.push({ favouriteId: favourite.id, id: favourite.stop.id, name: favourite.stop.name });
    }
  }

  return { lines, stops };
}

/** Which of the given lineId/stopId (never both) the user has already favourited, if any. */
export async function getFavouriteId(
  userId: string,
  target: { lineId: string } | { stopId: string },
): Promise<string | null> {
  const favourite = await prisma.favourite.findFirst({
    where: { userId, ...target },
    select: { id: true },
  });
  return favourite?.id ?? null;
}

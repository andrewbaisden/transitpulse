import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFavourites } from "@/server/queries/favourites";

export default async function FavouritesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const favourites = await getUserFavourites(session.user.id);
  const isEmpty = favourites.lines.length === 0 && favourites.stops.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Favourites</h1>

      {isEmpty && (
        <p className="text-sm text-muted-foreground">
          No favourites yet — star a line or station to see it here.
        </p>
      )}

      {favourites.lines.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Lines</h2>
          <ul className="flex flex-col gap-1">
            {favourites.lines.map((line) => (
              <li key={line.favouriteId}>
                <Link
                  href={`/lines/${line.id}`}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: line.color ?? "#52525b" }}
                  />
                  {line.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {favourites.stops.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Stations</h2>
          <ul className="flex flex-col gap-1">
            {favourites.stops.map((stop) => (
              <li key={stop.favouriteId}>
                <Link
                  href={`/stations/${stop.id}`}
                  className="block rounded-md px-3 py-2 hover:bg-accent"
                >
                  {stop.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

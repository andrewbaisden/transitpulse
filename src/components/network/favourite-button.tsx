"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Target = { lineId: string } | { stopId: string };

/**
 * `initialFavouriteId` comes from a server-rendered query (per-page — see
 * the line/station detail pages), so the button renders in the right
 * state immediately, no client-side fetch-on-mount flash.
 */
export function FavouriteButton({
  target,
  initialFavouriteId,
}: {
  target: Target;
  initialFavouriteId: string | null;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [favouriteId, setFavouriteId] = useState(initialFavouriteId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return null;

  if (!session) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/sign-in">
          <Star className="size-3.5" /> Favourite
        </Link>
      </Button>
    );
  }

  const isFavourited = favouriteId !== null;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={isSaving}
        onClick={async () => {
          setIsSaving(true);
          setError(null);
          try {
            if (isFavourited) {
              const response = await fetch("/api/favourites", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ favouriteId }),
              });
              // A failed delete leaves favouriteId as-is, so the button
              // keeps accurately showing "Favourited" rather than a state
              // that no longer matches the server.
              if (!response.ok) throw new Error("Couldn't remove favourite. Try again.");
              setFavouriteId(null);
            } else {
              const response = await fetch("/api/favourites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(target),
              });
              if (!response.ok) throw new Error("Couldn't save favourite. Try again.");
              const data: { favouriteId: string } = await response.json();
              setFavouriteId(data.favouriteId);
            }
          } catch {
            setError(
              isFavourited
                ? "Couldn't remove favourite. Try again."
                : "Couldn't save favourite. Try again.",
            );
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <Star className={cn("size-3.5", isFavourited && "fill-current")} />
        {isFavourited ? "Favourited" : "Favourite"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

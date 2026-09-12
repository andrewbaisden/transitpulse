"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
        <Link href="/sign-up" className="text-muted-foreground hover:text-foreground">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/favourites" className="text-muted-foreground hover:text-foreground">
        Favourites
      </Link>
      <span className="text-muted-foreground">{session.user.name}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        }}
      >
        Sign out
      </Button>
    </div>
  );
}

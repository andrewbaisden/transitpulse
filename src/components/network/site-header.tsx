import Link from "next/link";
import { SearchBox } from "@/components/network/search-box";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/lines", label: "Lines" },
  { href: "/stations", label: "Stations" },
  { href: "/map", label: "Map" },
];

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            TransitPulse
          </Link>
          <nav className="flex gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <SearchBox />
      </div>
    </header>
  );
}

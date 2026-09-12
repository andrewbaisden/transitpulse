import { Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { SearchBox } from "@/components/network/search-box";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/lines", label: "Lines" },
  { href: "/stations", label: "Stations" },
  { href: "/map", label: "Map" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-3 px-5 py-3 sm:px-8 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-7">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="TransitPulse home"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#0a2540] text-white shadow-sm transition-transform group-hover:-rotate-3">
              <Activity className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-bold tracking-[-0.04em] text-[#0a2540]">
              Transit<span className="text-[#635bff]">Pulse</span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-1 text-sm md:flex"
            aria-label="Primary navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0a2540]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="order-3 flex w-full items-center gap-3 sm:order-2 sm:w-auto">
          <SearchBox />
          <UserMenu />
        </div>
        <Link
          href="/map"
          className="order-3 hidden items-center gap-1.5 rounded-full bg-[#635bff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#544cf0] lg:flex"
        >
          Explore map
          <ArrowUpRight className="size-3.5" />
        </Link>
        <nav
          className="order-4 flex w-full items-center justify-between border-t border-slate-200/70 pt-2 text-xs md:hidden"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-[#0a2540]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

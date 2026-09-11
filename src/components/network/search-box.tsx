"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchResult } from "@/server/queries/search";

async function fetchSearchResults(term: string): Promise<SearchResult[]> {
  if (term.trim().length < 2) return [];
  const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
  if (!response.ok) throw new Error("Search request failed");
  const data: { results: SearchResult[] } = await response.json();
  return data.results;
}

export function SearchBox() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const deferredTerm = useDeferredValue(term);
  const router = useRouter();

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search", deferredTerm],
    queryFn: () => fetchSearchResults(deferredTerm),
  });

  function goTo(result: SearchResult) {
    setOpen(false);
    setTerm("");
    router.push(result.type === "line" ? `/lines/${result.id}` : `/stations/${result.id}`);
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
        data-testid="search-trigger"
      >
        <Search className="size-4" />
        Search lines and stations…
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search lines and stations"
      >
        {/* CommandDialog renders its children directly (no implicit Command
            root), so the store context must be provided explicitly here. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search lines and stations…"
            value={term}
            onValueChange={setTerm}
          />
          <CommandList>
            {!isFetching && term.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.type}-${result.id}-${result.name}`}
                    onSelect={() => goTo(result)}
                  >
                    <span className="flex-1">{result.name}</span>
                    <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

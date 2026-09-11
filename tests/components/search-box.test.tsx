// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "@/components/network/search-box";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SearchBox />
    </QueryClientProvider>,
  );
}

describe("SearchBox", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              results: [
                { type: "stop", id: "stratford-id", name: "Stratford", subtitle: "STATION" },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
  });

  it("opens the search dialog when the trigger is clicked", async () => {
    renderWithQueryClient();
    await userEvent.click(screen.getByTestId("search-trigger"));
    expect(screen.getByPlaceholderText("Search lines and stations…")).toBeInTheDocument();
  });

  it("shows fetched results and navigates on selection", async () => {
    renderWithQueryClient();
    await userEvent.click(screen.getByTestId("search-trigger"));
    await userEvent.type(screen.getByPlaceholderText("Search lines and stations…"), "strat");

    const result = await screen.findByText("Stratford");
    await userEvent.click(result);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/stations/stratford-id"));
  });
});

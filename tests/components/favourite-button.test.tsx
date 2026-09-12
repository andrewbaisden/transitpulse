// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FavouriteButton } from "@/components/network/favourite-button";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: useSessionMock },
}));

describe("FavouriteButton", () => {
  beforeEach(() => {
    useSessionMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ favouriteId: "new-fav-id" }), { status: 200 }),
      ),
    );
  });

  it("prompts sign-in when there is no session", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: false });

    render(<FavouriteButton target={{ lineId: "central-id" }} initialFavouriteId={null} />);

    expect(screen.getByRole("link", { name: /favourite/i })).toHaveAttribute("href", "/sign-in");
  });

  it("renders nothing while the session is loading", () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });
    const { container } = render(
      <FavouriteButton target={{ lineId: "central-id" }} initialFavouriteId={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'Favourite' when signed in and not yet favourited, then toggles on click", async () => {
    useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } }, isPending: false });
    const user = userEvent.setup();

    render(<FavouriteButton target={{ lineId: "central-id" }} initialFavouriteId={null} />);

    const button = screen.getByRole("button", { name: /favourite/i });
    expect(button).toHaveTextContent("Favourite");

    await user.click(button);

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Favourited"));
    expect(fetch).toHaveBeenCalledWith(
      "/api/favourites",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows 'Favourited' when already favourited", () => {
    useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } }, isPending: false });

    render(<FavouriteButton target={{ lineId: "central-id" }} initialFavouriteId="existing-fav" />);

    expect(screen.getByRole("button")).toHaveTextContent("Favourited");
  });

  it("shows an error and keeps its prior state when the save request fails", async () => {
    useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } }, isPending: false });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    const user = userEvent.setup();

    render(<FavouriteButton target={{ lineId: "central-id" }} initialFavouriteId={null} />);

    await user.click(screen.getByRole("button", { name: /favourite/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save favourite/i);
    expect(screen.getByRole("button")).toHaveTextContent("Favourite");
  });
});

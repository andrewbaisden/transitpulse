// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetworkMap } from "@/components/network/network-map";
import type { MapStop } from "@/server/queries/map";

// leaflet is mocked entirely rather than rendered — this proves the
// component wires stop data into the correct leaflet calls, not that tile
// painting works (that's verified manually in a real browser).
// vi.mock is hoisted above this file's own top-level consts, so the mock
// instances it needs to reference have to be created inside vi.hoisted
// instead — a plain `const markerInstance = ...` above would still throw a
// TDZ error when the hoisted mock factory runs.
const { markerInstance, mapInstance, markerFn, tileLayerFn, latLngBoundsFn, divIconFn } =
  vi.hoisted(() => {
    const markerInstance = {
      bindPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
    };
    const tileLayerInstance = { addTo: vi.fn().mockReturnThis() };
    const mapInstance = {
      setView: vi.fn().mockReturnThis(),
      fitBounds: vi.fn(),
      remove: vi.fn(),
    };
    return {
      markerInstance,
      mapInstance,
      markerFn: vi.fn(() => markerInstance),
      tileLayerFn: vi.fn(() => tileLayerInstance),
      latLngBoundsFn: vi.fn(() => "bounds"),
      divIconFn: vi.fn(({ html }: { html: string }) => html),
    };
  });

vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => mapInstance),
    tileLayer: tileLayerFn,
    marker: markerFn,
    divIcon: divIconFn,
    latLngBounds: latLngBoundsFn,
  },
}));

const STOPS: MapStop[] = [
  { id: "stop-1", name: "Stratford", lat: 51.5416, lon: -0.0042, lineColor: "#DC241F" },
  { id: "stop-2", name: "Bank", lat: 51.5133, lon: -0.0886, lineColor: null },
];

// The component loads leaflet via a runtime `import()` (see network-map.tsx
// for why it can't be a static import), so its setup runs a tick after
// render rather than synchronously.
function flushLeafletImport(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("NetworkMap", () => {
  it("creates one marker per stop, positioned and coloured from the stop data", async () => {
    render(<NetworkMap stops={STOPS} />);
    await flushLeafletImport();

    expect(markerFn).toHaveBeenCalledTimes(2);
    expect(markerFn).toHaveBeenCalledWith(
      [51.5416, -0.0042],
      expect.objectContaining({ icon: expect.stringContaining("#DC241F") }),
    );
    // Falls back to a default colour rather than passing null through.
    expect(markerFn).toHaveBeenCalledWith(
      [51.5133, -0.0886],
      expect.objectContaining({ icon: expect.stringContaining("#6b7280") }),
    );
    expect(markerInstance.bindPopup).toHaveBeenCalledWith(expect.stringContaining("Stratford"));
    expect(markerInstance.bindPopup).toHaveBeenCalledWith(expect.stringContaining("Bank"));
  });

  it("fits the view to the stops and removes the map on unmount", async () => {
    const { unmount } = render(<NetworkMap stops={STOPS} />);
    await flushLeafletImport();

    expect(mapInstance.fitBounds).toHaveBeenCalled();

    unmount();
    expect(mapInstance.remove).toHaveBeenCalled();
  });

  it("skips fitBounds when there are no stops to plot", async () => {
    mapInstance.fitBounds.mockClear();
    render(<NetworkMap stops={[]} />);
    await flushLeafletImport();

    expect(mapInstance.fitBounds).not.toHaveBeenCalled();
  });
});

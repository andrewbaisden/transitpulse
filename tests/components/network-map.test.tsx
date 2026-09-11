// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetworkMap } from "@/components/network/network-map";
import type { MapStop } from "@/server/queries/map";

// jsdom has no WebGL — maplibre-gl is mocked entirely rather than rendered,
// matching how the library itself is unit-tested upstream. This proves the
// component wires stop data into the correct maplibre calls, not that
// WebGL painting works (that's verified manually in a real browser).
// vi.mock is hoisted above this file's own top-level consts, so the mock
// instances it needs to reference have to be created inside vi.hoisted
// instead — a plain `const markerInstance = ...` above would still throw a
// TDZ error when the hoisted mock factory runs.
const { MapCtor, MarkerCtor, PopupCtor, mapInstance, markerInstance } = vi.hoisted(() => {
  const markerInstance = {
    setLngLat: vi.fn().mockReturnThis(),
    setPopup: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  const mapInstance = {
    addControl: vi.fn(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
  };
  return {
    // `new`-able: maplibre-gl's real exports are classes, and the
    // component calls them with `new`, so arrow-function mocks (not
    // constructible) would throw "is not a constructor".
    MapCtor: vi.fn(function MapCtor() {
      return mapInstance;
    }),
    MarkerCtor: vi.fn(function MarkerCtor() {
      return markerInstance;
    }),
    PopupCtor: vi.fn(function PopupCtor() {
      return { setHTML: vi.fn().mockReturnThis() };
    }),
    mapInstance,
    markerInstance,
  };
});

vi.mock("maplibre-gl", () => ({
  Map: MapCtor,
  Marker: MarkerCtor,
  Popup: PopupCtor,
  NavigationControl: vi.fn(),
  LngLatBounds: vi.fn(function LngLatBounds() {
    return { extend: vi.fn().mockReturnThis() };
  }),
}));

const STOPS: MapStop[] = [
  { id: "stop-1", name: "Stratford", lat: 51.5416, lon: -0.0042, lineColor: "#DC241F" },
  { id: "stop-2", name: "Bank", lat: 51.5133, lon: -0.0886, lineColor: null },
];

describe("NetworkMap", () => {
  it("creates one marker per stop, positioned and coloured from the stop data", () => {
    render(<NetworkMap stops={STOPS} />);

    expect(MarkerCtor).toHaveBeenCalledTimes(2);
    expect(MarkerCtor).toHaveBeenCalledWith({ color: "#DC241F" });
    // Falls back to a default colour rather than passing null through.
    expect(MarkerCtor).toHaveBeenCalledWith({ color: "#6b7280" });
    expect(markerInstance.setLngLat).toHaveBeenCalledWith([-0.0042, 51.5416]);
    expect(markerInstance.setLngLat).toHaveBeenCalledWith([-0.0886, 51.5133]);
  });

  it("fits the view to the stops and removes the map on unmount", () => {
    const { unmount } = render(<NetworkMap stops={STOPS} />);

    expect(mapInstance.fitBounds).toHaveBeenCalled();

    unmount();
    expect(mapInstance.remove).toHaveBeenCalled();
    expect(markerInstance.remove).toHaveBeenCalled();
  });

  it("skips fitBounds when there are no stops to plot", () => {
    mapInstance.fitBounds.mockClear();
    render(<NetworkMap stops={[]} />);
    expect(mapInstance.fitBounds).not.toHaveBeenCalled();
  });
});

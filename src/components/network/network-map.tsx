"use client";

import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { MapStop } from "@/server/queries/map";

// OpenFreeMap's hosted "positron" style — free, no API key, no per-request
// billing. See DECISIONS.md ADR-016 for why this over Mapbox (which needs a
// token) or the bare MapLibre demo style (too coarse for a real network map).
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const LONDON_CENTER: [number, number] = [-0.1276, 51.5072];
const DEFAULT_MARKER_COLOR = "#6b7280"; // zinc-500 — matches LineBadge's own fallback

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

/**
 * Plots each stop as a marker, colour-matched to its first line, with a
 * popup linking to the station page. Fits the view to whatever stops are
 * passed in — one call site for both the full network map and a single-stop
 * "where is this station" embed (station detail page).
 */
export function NetworkMap({
  stops,
  className,
  maxZoom = 16,
}: {
  stops: MapStop[];
  className?: string;
  maxZoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: LONDON_CENTER,
      zoom: 10,
    });
    map.addControl(new NavigationControl(), "top-right");

    const markers = stops.map((stop) =>
      new Marker({ color: stop.lineColor ?? DEFAULT_MARKER_COLOR })
        .setLngLat([stop.lon, stop.lat])
        .setPopup(
          new Popup({ offset: 16 }).setHTML(
            `<a href="/stations/${stop.id}" style="font-weight:600;text-decoration:underline">${escapeHtml(stop.name)}</a>`,
          ),
        )
        .addTo(map),
    );

    if (stops.length > 0) {
      const bounds = stops.reduce(
        (b, stop) => b.extend([stop.lon, stop.lat] as [number, number]),
        new LngLatBounds([stops[0].lon, stops[0].lat], [stops[0].lon, stops[0].lat]),
      );
      map.fitBounds(bounds, { padding: 48, maxZoom, duration: 0 });
    }

    return () => {
      for (const marker of markers) marker.remove();
      map.remove();
    };
  }, [stops, maxZoom]);

  return <div ref={containerRef} className={className ?? "h-[500px] w-full rounded-lg border"} />;
}

"use client";

import "leaflet/dist/leaflet.css";
import type { DivIcon, Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";
import type { MapStop } from "@/server/queries/map";

// Standard OpenStreetMap raster tiles — the no-signup default Leaflet's own
// docs use. CARTO's "free" Positron raster tiles (tried first) now require
// an API key even for light use, which fails ADR-016's no-API-key
// requirement; OSM's tile usage policy permits this traffic level with no
// registration. See DECISIONS.md ADR-016.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const LONDON_CENTER: [number, number] = [51.5072, -0.1276];
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

// A plain coloured pin as a divIcon, since Leaflet's default marker image
// (blue, from a bundled PNG) can't be recoloured per-line without either
// shipping one PNG per line colour or fighting bundler asset paths.
function pinIcon(L: typeof import("leaflet"), color: string): DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
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

    // Leaflet's module touches `window` at import time, so it can't be a
    // top-level import — that breaks the client component's SSR pass (see
    // DECISIONS.md ADR-016). Deferring to a runtime import here keeps this
    // one component with no next/dynamic wrapper.
    let cancelled = false;
    let map: LeafletMap | undefined;

    import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { zoomControl: true }).setView(LONDON_CENTER, 10);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

      for (const stop of stops) {
        L.marker([stop.lat, stop.lon], { icon: pinIcon(L, stop.lineColor ?? DEFAULT_MARKER_COLOR) })
          .bindPopup(
            `<a href="/stations/${stop.id}" style="font-weight:600;text-decoration:underline">${escapeHtml(stop.name)}</a>`,
          )
          .addTo(map);
      }

      if (stops.length > 0) {
        const bounds = L.latLngBounds(
          stops.map((stop) => [stop.lat, stop.lon] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [48, 48], maxZoom });
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [stops, maxZoom]);

  return <div ref={containerRef} className={className ?? "h-[500px] w-full rounded-lg border"} />;
}

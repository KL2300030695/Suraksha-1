// ---------------------------------------------------------------------------
// Routing + geocoding for live tracking.
//
// Uses open, key-less services by default so the prototype works out of the box:
//   - OSRM demo server for driving routes (distance, duration, geometry)
//   - OpenStreetMap Nominatim for geocoding hospital addresses
//
// Both can be overridden via environment variables (see .env.example). If a
// routing call fails, callers fall back to straight-line distance.
// ---------------------------------------------------------------------------
import { CAMPUS_FALLBACK } from "../utils/tracking";

type LatLng = { lat: number; lng: number };

// Vite exposes env vars prefixed with VITE_.
const OSRM_BASE =
  (import.meta as any).env?.VITE_OSRM_URL || "https://router.project-osrm.org";
const ORS_API_KEY = (import.meta as any).env?.VITE_ORS_API_KEY || "";

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  // [lat, lng] pairs for drawing the route polyline on the map.
  geometry: [number, number][];
  source: "osrm" | "ors";
}

// Fetch a driving route between two points. Returns null on any failure so the
// caller can fall back to a straight-line estimate.
export async function fetchRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  // Prefer OpenRouteService when an API key is configured (better limits).
  if (ORS_API_KEY) {
    try {
      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const feat = data.features?.[0];
        const summary = feat?.properties?.summary;
        const coords = feat?.geometry?.coordinates as [number, number][] | undefined;
        if (summary && coords) {
          return {
            distanceMeters: summary.distance,
            durationSeconds: summary.duration,
            geometry: coords.map(([lng, lat]) => [lat, lng] as [number, number]),
            source: "ors",
          };
        }
      }
    } catch {
      /* fall through to OSRM */
    }
  }

  try {
    const url =
      `${OSRM_BASE}/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    const coords = (route.geometry?.coordinates || []) as [number, number][];
    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: coords.map(([lng, lat]) => [lat, lng] as [number, number]),
      source: "osrm",
    };
  } catch {
    return null;
  }
}

// Geocode a free-text hospital/location string to coordinates via Nominatim.
// Falls back to the campus centre if nothing resolves.
export async function geocodeHospital(query: string): Promise<LatLng> {
  const q = (query || "").trim();
  if (!q) return { ...CAMPUS_FALLBACK };
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const arr = await res.json();
      if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
        return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
      }
    }
  } catch {
    /* fall through */
  }
  return { ...CAMPUS_FALLBACK };
}

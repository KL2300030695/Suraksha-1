// ---------------------------------------------------------------------------
// useRoute — given a donor point and a hospital point, expose the distance,
// ETA and route polyline. Straight-line distance updates instantly on every
// donor move; the real driving route (OSRM/ORS) is refreshed on a throttle so
// we don't hammer the public routing server.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { fetchRoute } from "../services/routing";
import { haversineMeters, fallbackEtaSeconds } from "../utils/tracking";

type LatLng = { lat: number; lng: number };

interface UseRouteResult {
  distanceMeters: number | null;
  etaSeconds: number | null;
  geometry: [number, number][];
  source: "osrm" | "ors" | "line";
}

const REFRESH_MS = 20000; // re-request the driving route at most this often
const REFETCH_MOVE_M = 60; // ...or when the donor has moved at least this far

export function useRoute(donor: LatLng | null, hospital: LatLng | null): UseRouteResult {
  const [result, setResult] = useState<UseRouteResult>({
    distanceMeters: null,
    etaSeconds: null,
    geometry: [],
    source: "line",
  });

  const lastFetchRef = useRef<number>(0);
  const lastFetchPointRef = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!donor || !hospital) return;

    // Instant straight-line estimate on every donor update.
    const line = haversineMeters(donor, hospital);
    setResult((prev) => ({
      distanceMeters: line,
      etaSeconds: prev.source !== "line" && prev.distanceMeters
        ? // keep the last routed ETA scaled to the new distance if we have one
          (prev.etaSeconds && prev.distanceMeters ? (prev.etaSeconds / prev.distanceMeters) * line : fallbackEtaSeconds(line))
        : fallbackEtaSeconds(line),
      geometry: prev.geometry,
      source: prev.source,
    }));

    // Throttled driving-route upgrade.
    const now = Date.now();
    const moved = lastFetchPointRef.current
      ? haversineMeters(donor, lastFetchPointRef.current)
      : Infinity;
    if (now - lastFetchRef.current < REFRESH_MS && moved < REFETCH_MOVE_M) return;

    lastFetchRef.current = now;
    lastFetchPointRef.current = donor;
    let cancelled = false;
    fetchRoute(donor, hospital).then((route) => {
      if (cancelled || !route) return;
      setResult({
        distanceMeters: route.distanceMeters,
        etaSeconds: route.durationSeconds,
        geometry: route.geometry,
        source: route.source,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [donor?.lat, donor?.lng, hospital?.lat, hospital?.lng]);

  return result;
}

// ---------------------------------------------------------------------------
// useLiveLocation — donor-side hook.
//
// Watches the device GPS via navigator.geolocation.watchPosition(), throttles
// writes to Firestore (faster while moving, slower when stationary), and
// exposes clear status + error states for the UI. Location sharing ONLY runs
// between start() and stop() — never passively.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from "react";
import { DonorLocation, TrackingSessionStatus } from "../types";
import { startTracking, updateDonorLocation, stopTracking } from "../services/locationTracking";
import { writeInterval, haversineMeters } from "../utils/tracking";

export type GeoErrorKind =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unknown";

export interface LiveLocationError {
  kind: GeoErrorKind;
  message: string;
}

export type LiveLocationStatus = "idle" | "requesting" | "active" | "error";

interface UseLiveLocationResult {
  status: LiveLocationStatus;
  location: DonorLocation | null;
  error: LiveLocationError | null;
  online: boolean;
  start: () => void;
  stop: (finalStatus?: TrackingSessionStatus) => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 2000,
  timeout: 20000,
};

function mapGeoError(err: GeolocationPositionError): LiveLocationError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return {
        kind: "denied",
        message:
          "Location permission is required to share your live location with the requester during this emergency journey.",
      };
    case err.POSITION_UNAVAILABLE:
      return { kind: "unavailable", message: "GPS is unavailable right now. Check that location services are on." };
    case err.TIMEOUT:
      return { kind: "timeout", message: "Getting your location timed out. Retrying…" };
    default:
      return { kind: "unknown", message: "Couldn't read your location. Please try again." };
  }
}

export function useLiveLocation(
  requestId: string,
  donor: { uid: string; name?: string }
): UseLiveLocationResult {
  const [status, setStatus] = useState<LiveLocationStatus>("idle");
  const [location, setLocation] = useState<DonorLocation | null>(null);
  const [error, setError] = useState<LiveLocationError | null>(null);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const watchIdRef = useRef<number | null>(null);
  const lastWriteRef = useRef<number>(0);
  const lastWrittenPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const startedRef = useRef<boolean>(false);

  // Track connectivity so the UI can show a reconnect hint.
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setError(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("error");
      setError({ kind: "unsupported", message: "This browser doesn't support location services." });
      return;
    }

    setStatus("requesting");
    // Create the sharing session up front (status "active", no coords yet).
    startTracking(requestId, donor).catch((e) => console.error("startTracking failed:", e));
    startedRef.current = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: DonorLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          timestamp: pos.timestamp || Date.now(),
        };
        setLocation(loc);
        setStatus("active");
        setError(null);

        // Throttle writes: always write the first fix, then respect the
        // movement-based interval (faster when moving, by speed or by distance).
        const now = Date.now();
        const movedSinceWrite = lastWrittenPointRef.current
          ? haversineMeters({ lat: loc.latitude, lng: loc.longitude }, lastWrittenPointRef.current)
          : Infinity;
        const interval = writeInterval(loc.speed, movedSinceWrite);
        if (lastWriteRef.current === 0 || now - lastWriteRef.current >= interval) {
          lastWriteRef.current = now;
          lastWrittenPointRef.current = { lat: loc.latitude, lng: loc.longitude };
          updateDonorLocation(requestId, donor.uid, loc).catch((e) =>
            // Firestore queues writes while offline; log and keep watching.
            console.error("updateDonorLocation failed (will retry when online):", e)
          );
        }
      },
      (err) => {
        const mapped = mapGeoError(err);
        setError(mapped);
        // A denied permission is terminal; other errors may be transient so we
        // keep the watch alive and let it recover.
        if (mapped.kind === "denied") {
          clearWatch();
          setStatus("error");
        }
      },
      GEO_OPTIONS
    );
  }, [requestId, donor, clearWatch]);

  const stop = useCallback(
    (finalStatus: TrackingSessionStatus = "completed") => {
      clearWatch();
      lastWriteRef.current = 0;
      lastWrittenPointRef.current = null;
      setStatus("idle");
      if (startedRef.current) {
        stopTracking(requestId, finalStatus).catch((e) => console.error("stopTracking failed:", e));
        startedRef.current = false;
      }
    },
    [requestId, clearWatch]
  );

  // Clean up the GPS watch on unmount (does not auto-end the session so a brief
  // remount can resume; staleness detection covers a truly gone donor).
  useEffect(() => () => clearWatch(), [clearWatch]);

  return { status, location, error, online, start, stop };
}

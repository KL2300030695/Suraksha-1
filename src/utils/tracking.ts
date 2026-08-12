// ---------------------------------------------------------------------------
// Live donor tracking — shared constants and pure helpers.
// ---------------------------------------------------------------------------

// How often the donor's device pushes a new location to Firestore. We throttle
// so we never write "every second": faster while moving, slower when still.
// All values are configurable here in one place.
export const TRACKING_CONFIG = {
  MOVING_WRITE_INTERVAL_MS: 4000,      // ~every 4s while moving
  STATIONARY_WRITE_INTERVAL_MS: 15000, // ~every 15s while stationary
  MOVING_SPEED_THRESHOLD_MPS: 1.0,     // > 1 m/s (~3.6 km/h) counts as "moving"
  MOVING_MIN_MOVE_M: 15,               // ...or moved >= 15m since last write (covers devices with no speed)
  STALE_AFTER_MS: 60000,               // no update for 60s => "hasn't updated recently"
  UNAVAILABLE_AFTER_MS: 180000,        // no update for 3 min => "live location unavailable"
  SESSION_MAX_AGE_MS: 2 * 60 * 60 * 1000, // auto-expire a session after 2h
  ASSUMED_SPEED_KMH: 28,               // fallback ETA speed when no routing service
} as const;

// KL University campus — used as a sensible fallback destination when a
// hospital address can't be geocoded.
export const CAMPUS_FALLBACK = { lat: 16.4419, lng: 80.6226 } as const;

// Great-circle distance between two coordinates, in metres.
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Pick the write interval from movement. A donor counts as "moving" if the
// device reports a speed above the threshold OR they've moved far enough since
// the last write (so it stays responsive on devices that never report speed).
export function writeInterval(
  speedMps: number | null,
  movedMetersSinceWrite: number
): number {
  const movingBySpeed =
    speedMps != null && speedMps >= TRACKING_CONFIG.MOVING_SPEED_THRESHOLD_MPS;
  const movingByDistance = movedMetersSinceWrite >= TRACKING_CONFIG.MOVING_MIN_MOVE_M;
  return movingBySpeed || movingByDistance
    ? TRACKING_CONFIG.MOVING_WRITE_INTERVAL_MS
    : TRACKING_CONFIG.STATIONARY_WRITE_INTERVAL_MS;
}

// "1.2 km" / "640 m"
export function formatDistance(meters: number): string {
  if (!isFinite(meters) || meters < 0) return "—";
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// "9 min" / "1 hr 5 min" / "under a minute"
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "under a minute";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

// "just now" / "35 seconds ago" / "2 minutes ago"
export function timeAgo(sinceMs: number | null | undefined): string {
  if (!sinceMs) return "—";
  const diff = Date.now() - sinceMs;
  if (diff < 5000) return "just now";
  const secs = Math.round(diff / 1000);
  if (secs < 60) return `${secs} seconds ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
}

export type StalenessLevel = "fresh" | "stale" | "unavailable";

// Classify how trustworthy the last known location is by its age.
export function stalenessLevel(lastUpdatedAt: number | null | undefined): StalenessLevel {
  if (!lastUpdatedAt) return "unavailable";
  const age = Date.now() - lastUpdatedAt;
  if (age >= TRACKING_CONFIG.UNAVAILABLE_AFTER_MS) return "unavailable";
  if (age >= TRACKING_CONFIG.STALE_AFTER_MS) return "stale";
  return "fresh";
}

// A friendly ETA (seconds) fallback using straight-line distance when no
// routing service is available.
export function fallbackEtaSeconds(distanceMeters: number): number {
  const mps = (TRACKING_CONFIG.ASSUMED_SPEED_KMH * 1000) / 3600;
  return distanceMeters / mps;
}

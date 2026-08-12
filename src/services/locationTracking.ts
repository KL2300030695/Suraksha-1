// ---------------------------------------------------------------------------
// Firestore live-tracking service.
//
// One "current" tracking document is stored per emergency request at:
//     requests/{requestId}/tracking/current
//
// Only the latest position is kept — we never write a per-second history, and
// no historical GPS trail is retained (privacy by design). Reuses the existing
// Firebase initialisation from ../firebase (no second app).
// ---------------------------------------------------------------------------
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { DonorLocation, EmergencyRequest, TrackingSession, TrackingSessionStatus } from "../types";
import { geocodeHospital } from "./routing";

function trackingRef(requestId: string) {
  // Subcollection document — one active session per request.
  return doc(db, "requests", requestId, "tracking", "current");
}

// Donor: begin a sharing session (status "active", no coordinates yet until the
// first GPS fix arrives).
export async function startTracking(
  requestId: string,
  donor: { uid: string; name?: string }
): Promise<void> {
  const now = Date.now();
  const session: TrackingSession = {
    requestId,
    donorId: donor.uid,
    donorName: donor.name || "",
    status: "active",
    sharingStartedAt: now,
    lastUpdatedAt: null,
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
  };
  await setDoc(trackingRef(requestId), session, { merge: true });
}

// Donor: push the latest GPS reading. Merged so the session metadata is kept.
export async function updateDonorLocation(
  requestId: string,
  donorId: string,
  loc: DonorLocation
): Promise<void> {
  await setDoc(
    trackingRef(requestId),
    {
      donorId,
      status: "active" as TrackingSessionStatus,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      heading: loc.heading,
      lastUpdatedAt: loc.timestamp,
    },
    { merge: true }
  );
}

// Donor: end / pause the session. Coordinates are left in place but the status
// tells the requester tracking has stopped.
export async function stopTracking(
  requestId: string,
  status: TrackingSessionStatus = "completed"
): Promise<void> {
  try {
    await updateDoc(trackingRef(requestId), { status, lastUpdatedAt: Date.now() });
  } catch {
    // Doc may not exist if the donor stopped before the first write — ignore.
  }
}

// Requester/donor: live-subscribe to the current tracking session. Returns the
// unsubscribe function. Calls back with null when no session exists.
export function subscribeToTracking(
  requestId: string,
  cb: (session: TrackingSession | null) => void
): () => void {
  return onSnapshot(
    trackingRef(requestId),
    (snap) => cb(snap.exists() ? (snap.data() as TrackingSession) : null),
    (err) => {
      console.error("tracking subscription error:", err);
      cb(null);
    }
  );
}

// Resolve the hospital destination coordinates for a request. Uses cached
// coordinates on the request when present; otherwise geocodes the hospital /
// location text and best-effort caches the result back on the request so both
// donor and requester share the same target.
export async function ensureHospitalCoords(
  request: EmergencyRequest
): Promise<{ lat: number; lng: number }> {
  if (typeof request.hospitalLat === "number" && typeof request.hospitalLng === "number") {
    return { lat: request.hospitalLat, lng: request.hospitalLng };
  }
  const coords = await geocodeHospital(`${request.hospital} ${request.location}`.trim());
  // Best-effort cache (open demo rules allow it; ignore failures).
  try {
    const reqRef = doc(db, "requests", request.id);
    const fresh = await getDoc(reqRef);
    const data = fresh.data() as EmergencyRequest | undefined;
    if (!data?.hospitalLat) {
      await updateDoc(reqRef, { hospitalLat: coords.lat, hospitalLng: coords.lng });
    }
  } catch {
    /* non-fatal */
  }
  return coords;
}

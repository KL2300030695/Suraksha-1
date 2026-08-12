// ---------------------------------------------------------------------------
// RequesterTracking — shown to the person who created the request once a donor
// has accepted. A "Track Donor" button opens a live map modal that subscribes
// to the donor's current location in real time (no page refresh needed).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation, X, Radio, Hourglass } from "lucide-react";
import { EmergencyRequest, TrackingSession } from "../../types";
import { subscribeToTracking, ensureHospitalCoords } from "../../services/locationTracking";
import { useRoute } from "../../hooks/useRoute";
import { stalenessLevel } from "../../utils/tracking";
import LiveDonorMap from "./LiveDonorMap";
import TrackingStatus from "./TrackingStatus";

interface RequesterTrackingProps {
  request: EmergencyRequest;
}

export default function RequesterTracking({ request }: RequesterTrackingProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [hospital, setHospital] = useState<{ lat: number; lng: number } | null>(
    typeof request.hospitalLat === "number" && typeof request.hospitalLng === "number"
      ? { lat: request.hospitalLat, lng: request.hospitalLng }
      : null
  );

  // Subscribe to the live tracking session only while the map is open.
  useEffect(() => {
    if (!open) return;
    const unsub = subscribeToTracking(request.id, setSession);
    if (!hospital) {
      ensureHospitalCoords(request).then(setHospital);
    }
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request.id]);

  const hasFix = session?.latitude != null && session?.longitude != null;
  const donorPoint = useMemo(
    () => (hasFix ? { lat: session!.latitude as number, lng: session!.longitude as number } : null),
    [hasFix, session]
  );
  const { distanceMeters, etaSeconds, geometry, source } = useRoute(donorPoint, hospital);

  const staleness = stalenessLevel(session?.lastUpdatedAt);
  const notStarted = !session || session.status === "not_started" || !hasFix;
  const ended = session?.status === "completed" || session?.status === "cancelled" || session?.status === "expired";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition shadow shadow-red-950/40"
      >
        <Navigation className="w-3.5 h-3.5" /> Track Donor
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-navy-light border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500" /> Tracking donor
                </h3>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {request.hospital} · {request.bloodGroup} for {request.patientName}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map */}
            <div className="h-72 sm:h-80 bg-navy-dark relative">
              <LiveDonorMap
                donor={donorPoint}
                hospital={hospital}
                route={geometry}
                heading={session?.heading}
                stale={staleness !== "fresh"}
                className="h-full w-full"
              />
              {notStarted && !ended && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy-dark/80 text-center px-6">
                  <Hourglass className="w-7 h-7 text-yellow-400 animate-pulse" />
                  <p className="text-sm font-bold text-white">Waiting for the donor to start their journey</p>
                  <p className="text-[11px] text-gray-400">You'll see them move here the moment they start sharing.</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="p-5">
              {ended ? (
                <div className="text-center py-2">
                  <p className="text-sm font-bold text-white">
                    {session?.status === "completed" ? "Donor has arrived 🎉" : "Live sharing has ended"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Tracking is no longer active for this request.</p>
                </div>
              ) : (
                <TrackingStatus
                  session={session}
                  distanceMeters={distanceMeters}
                  etaSeconds={etaSeconds}
                  routeSource={source}
                  variant="requester"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

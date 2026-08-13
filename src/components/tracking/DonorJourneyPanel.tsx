// ---------------------------------------------------------------------------
// DonorJourneyPanel — shown to the donor who accepted a request. Lets them
// explicitly start sharing their live location ("Start Journey"), shows the
// live map + status, and lets them stop. Location is only captured while
// sharing is active.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { Navigation2, MapPin, Play, Square, RefreshCw, AlertTriangle, WifiOff, CheckCircle2 } from "lucide-react";
import { EmergencyRequest, UserProfile } from "../../types";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { useRoute } from "../../hooks/useRoute";
import { ensureHospitalCoords } from "../../services/locationTracking";
import LiveDonorMap from "./LiveDonorMap";
import TrackingStatus from "./TrackingStatus";
import { TrackingSession } from "../../types";

interface DonorJourneyPanelProps {
  request: EmergencyRequest;
  currentUser: UserProfile;
}

const ARRIVAL_RADIUS_M = 120;

export default function DonorJourneyPanel({ request, currentUser }: DonorJourneyPanelProps) {
  const [hospital, setHospital] = useState<{ lat: number; lng: number } | null>(
    typeof request.hospitalLat === "number" && typeof request.hospitalLng === "number"
      ? { lat: request.hospitalLat, lng: request.hospitalLng }
      : null
  );

  const { status, location, error, online, start, stop } = useLiveLocation(request.id, {
    uid: currentUser.uid,
    name: currentUser.name,
  });

  const donorPoint = useMemo(
    () => (location ? { lat: location.latitude, lng: location.longitude } : null),
    [location]
  );
  const { distanceMeters, etaSeconds, geometry, source } = useRoute(donorPoint, hospital);

  // Resolve the hospital destination once (geocode + cache) when the panel opens.
  useEffect(() => {
    let cancelled = false;
    if (!hospital) {
      ensureHospitalCoords(request).then((c) => !cancelled && setHospital(c));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  // Build a light "session" object for the shared status readout from the
  // donor's own live location (donor is the source of truth here).
  const localSession: TrackingSession | null = location
    ? {
        requestId: request.id,
        donorId: currentUser.uid,
        donorName: currentUser.name,
        status: "active",
        sharingStartedAt: null,
        lastUpdatedAt: location.timestamp,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
      }
    : null;

  const sharing = status === "active" || status === "requesting";
  const arrived = distanceMeters != null && distanceMeters <= ARRIVAL_RADIUS_M;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 text-red-500 flex items-center justify-center">
          <Navigation2 className="w-4 h-4" />
        </span>
        <div>
          <h4 className="text-sm font-bold text-gray-900 leading-tight">
            {sharing ? "Live location sharing ON" : "Emergency request accepted"}
          </h4>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {request.hospital}
          </p>
        </div>
      </div>

      {/* Permission / geolocation errors */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
          {error.kind !== "unsupported" && (
            <button
              onClick={start}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-mono font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
        </div>
      )}

      {/* Not sharing yet -> Start Journey */}
      {!sharing && status !== "error" && (
        <button
          onClick={start}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-red-950/40"
        >
          <Play className="w-4 h-4" /> Start Journey — share live location
        </button>
      )}

      {/* Sharing active */}
      {sharing && (
        <>
          {!online && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              You're offline — updates will resume automatically when the connection is back.
            </div>
          )}

          <div className="h-56 sm:h-64 rounded-xl overflow-hidden border border-gray-200">
            <LiveDonorMap donor={donorPoint} hospital={hospital} route={geometry} heading={location?.heading} />
          </div>

          <TrackingStatus
            session={localSession}
            distanceMeters={distanceMeters}
            etaSeconds={etaSeconds}
            routeSource={source}
            variant="donor"
          />

          {arrived && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-[11px] text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> You're at the hospital. Tap below to end sharing.
            </div>
          )}

          <button
            onClick={() => stop(arrived ? "completed" : "cancelled")}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-xl text-sm transition border ${
              arrived
                ? "bg-green-600 hover:bg-green-700 text-white border-green-500/30"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            {arrived ? <CheckCircle2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {arrived ? "I've reached the hospital — stop sharing" : "Stop sharing"}
          </button>
        </>
      )}
    </div>
  );
}

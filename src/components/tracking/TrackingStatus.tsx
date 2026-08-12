// ---------------------------------------------------------------------------
// TrackingStatus — compact live readout: sharing status, distance, ETA, GPS
// accuracy, duration / last-updated, and staleness warnings. Used by both the
// donor and requester views. Ticks once a second so relative times stay live.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { Navigation, Clock, Crosshair, Radio, AlertTriangle } from "lucide-react";
import { TrackingSession } from "../../types";
import {
  formatDistance,
  formatDuration,
  timeAgo,
  stalenessLevel,
} from "../../utils/tracking";

interface TrackingStatusProps {
  session: TrackingSession | null;
  distanceMeters: number | null;
  etaSeconds: number | null;
  routeSource?: "osrm" | "ors" | "line";
  variant: "donor" | "requester";
}

export default function TrackingStatus({
  session,
  distanceMeters,
  etaSeconds,
  routeSource,
  variant,
}: TrackingStatusProps) {
  // Re-render every second for live "duration" / "X seconds ago".
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const staleness = stalenessLevel(session?.lastUpdatedAt);
  const isDone = session?.status === "completed" || session?.status === "cancelled" || session?.status === "expired";

  const statusLabel = isDone
    ? session?.status === "completed"
      ? "Arrived"
      : session?.status === "cancelled"
      ? "Sharing stopped"
      : "Session expired"
    : staleness === "unavailable"
    ? "Live location unavailable"
    : staleness === "stale"
    ? "Waiting for update…"
    : "Active";

  const statusColor = isDone
    ? "text-gray-400"
    : staleness === "unavailable"
    ? "text-red-400"
    : staleness === "stale"
    ? "text-yellow-400"
    : "text-green-400";

  const dotColor = isDone
    ? "bg-gray-500"
    : staleness === "unavailable"
    ? "bg-red-500"
    : staleness === "stale"
    ? "bg-yellow-500"
    : "bg-green-500";

  return (
    <div className="space-y-3">
      {/* Sharing status */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5" /> Location sharing
        </span>
        <span className={`flex items-center gap-1.5 text-xs font-bold ${statusColor}`}>
          <span className={`w-2 h-2 rounded-full ${dotColor} ${!isDone && staleness === "fresh" ? "animate-pulse" : ""}`} />
          {statusLabel}
        </span>
      </div>

      {/* Distance + ETA */}
      {!isDone && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-1">
              <Navigation className="w-3 h-3" /> Distance
            </div>
            <div className="text-lg font-display font-black text-white mt-0.5">
              {distanceMeters != null ? formatDistance(distanceMeters) : "—"}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> ETA
            </div>
            <div className="text-lg font-display font-black text-white mt-0.5">
              {etaSeconds != null ? formatDuration(etaSeconds) : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Secondary meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
        {session?.accuracy != null && (
          <span className="flex items-center gap-1">
            <Crosshair className="w-3 h-3" /> GPS ±{Math.round(session.accuracy)} m
          </span>
        )}
        {variant === "donor" && session?.sharingStartedAt && !isDone && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Sharing {formatDuration((Date.now() - session.sharingStartedAt) / 1000)}
          </span>
        )}
        <span>
          Last updated: <span className="text-gray-400">{timeAgo(session?.lastUpdatedAt)}</span>
        </span>
        {routeSource === "line" && !isDone && distanceMeters != null && (
          <span className="text-gray-600">(straight-line estimate)</span>
        )}
      </div>

      {/* Staleness warnings — never present an old location as current. */}
      {!isDone && staleness === "stale" && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Donor location hasn't updated recently. Showing the last known position.</span>
        </div>
      )}
      {!isDone && staleness === "unavailable" && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Live location unavailable — the donor's device hasn't reported a position in a while.</span>
        </div>
      )}
    </div>
  );
}

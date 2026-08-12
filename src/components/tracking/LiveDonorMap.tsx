// ---------------------------------------------------------------------------
// LiveDonorMap — Leaflet + OpenStreetMap map showing the donor moving toward
// the hospital, with the route line between them. Custom div-icon markers
// (no image assets) keep it on-brand and avoid Leaflet's bundler icon issue.
// ---------------------------------------------------------------------------
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

interface LiveDonorMapProps {
  donor: LatLng | null;
  hospital: LatLng | null;
  route?: [number, number][];
  heading?: number | null;
  stale?: boolean;
  className?: string;
}

const donorIcon = (heading: number | null | undefined, stale?: boolean) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:38px;height:38px">
        <span style="position:absolute;inset:0;border-radius:9999px;background:${
          stale ? "rgba(148,163,184,.35)" : "rgba(220,38,38,.35)"
        };${stale ? "" : "animation:srkPing 1.6s ease-out infinite"}"></span>
        <span style="position:absolute;inset:7px;border-radius:9999px;background:${
          stale ? "#64748b" : "#dc2626"
        };display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);border:2px solid #fff">
          <span style="display:inline-block;transform:rotate(${heading ?? 0}deg);color:#fff;font-size:14px;line-height:1">▲</span>
        </span>
      </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

const hospitalIcon = () =>
  L.divIcon({
    className: "",
    html: `
      <div style="width:34px;height:34px;border-radius:10px;background:#fff;border:2px solid #dc2626;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4)">
        <span style="color:#dc2626;font-weight:800;font-size:18px;line-height:1">✚</span>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

// Keep both markers comfortably in view as the donor moves.
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => p && isFinite(p.lat) && isFinite(p.lng));
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 15, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: true });
  }, [map, points]);
  return null;
}

export default function LiveDonorMap({
  donor,
  hospital,
  route,
  heading,
  stale,
  className,
}: LiveDonorMapProps) {
  const center = donor || hospital || { lat: 16.4419, lng: 80.6226 };
  const fitPoints = [donor, hospital].filter(Boolean) as LatLng[];

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom
      className={className}
      style={{ height: "100%", width: "100%", background: "#0b111e" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {route && route.length > 1 && (
        <Polyline positions={route} pathOptions={{ color: "#dc2626", weight: 4, opacity: 0.8 }} />
      )}

      {hospital && <Marker position={[hospital.lat, hospital.lng]} icon={hospitalIcon()} />}
      {donor && <Marker position={[donor.lat, donor.lng]} icon={donorIcon(heading, stale)} />}

      <FitBounds points={fitPoints} />
    </MapContainer>
  );
}

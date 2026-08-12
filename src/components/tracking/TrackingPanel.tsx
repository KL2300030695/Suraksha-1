// ---------------------------------------------------------------------------
// TrackingPanel — the single entry point dropped into a request card. It shows
// the right view for the right person and nothing to anyone else:
//   - the donor who accepted   -> DonorJourneyPanel (start/stop sharing)
//   - the requester who created -> RequesterTracking (track donor on a map)
//   - anyone else               -> nothing (privacy by default)
// Only appears once a donor has accepted the request.
// ---------------------------------------------------------------------------
import { EmergencyRequest, UserProfile } from "../../types";
import DonorJourneyPanel from "./DonorJourneyPanel";
import RequesterTracking from "./RequesterTracking";

interface TrackingPanelProps {
  request: EmergencyRequest;
  currentUser: UserProfile;
}

export default function TrackingPanel({ request, currentUser }: TrackingPanelProps) {
  // Tracking is only meaningful once a donor is committed to the request.
  const trackable = request.status === "accepted" || request.status === "in_progress";
  if (!trackable || !request.acceptedBy) return null;

  const isDonor = currentUser.uid === request.acceptedBy;
  const isRequester = currentUser.uid === request.userId;

  if (isDonor) {
    return <DonorJourneyPanel request={request} currentUser={currentUser} />;
  }
  if (isRequester) {
    return (
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white">Your donor is matched</p>
          <p className="text-[11px] text-gray-500 truncate">Track their live location on the way to the hospital.</p>
        </div>
        <RequesterTracking request={request} />
      </div>
    );
  }
  return null;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UserRole = 'student' | 'faculty' | 'staff' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  idCard: string; // student/employee ID
  role: UserRole;
  department: string;
  year?: string; // for students
  bloodGroup: BloodGroup;
  phone: string;
  gender: string;
  dob: string;
  lastDonation?: string; // date string
  isEligible: boolean;
  isAvailable: boolean;
  verified: boolean;
  createdAt: string;
}

export type RequestStatus = 'created' | 'searching' | 'accepted' | 'in_progress' | 'completed' | 'closed';

export type UrgencyLevel = 'critical' | 'high' | 'medium';

export interface EmergencyRequest {
  id: string;
  userId: string;
  patientName: string;
  bloodGroup: BloodGroup;
  hospital: string;
  location: string;
  units: number;
  contactName: string;
  contactPhone: string;
  urgency: UrgencyLevel;
  requiredTime: string;
  notes?: string;
  status: RequestStatus;
  acceptedBy?: string; // uid of the donor
  createdAt: string;
  // Optional geocoded hospital destination, resolved lazily when live tracking
  // starts and cached on the request so donor + requester share the same target.
  hospitalLat?: number;
  hospitalLng?: number;
}

// ---------------------------------------------------------------------------
// Live donor tracking
// ---------------------------------------------------------------------------

// Lifecycle of a live-location sharing session tied to one emergency request.
export type TrackingSessionStatus =
  | 'not_started'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'expired';

// A single GPS reading captured from the browser Geolocation API.
export interface DonorLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null; // metres
  speed: number | null;    // metres/second
  heading: number | null;  // degrees from true north
  timestamp: number;       // epoch millis
}

// The single "current tracking" document stored per request at
// requests/{requestId}/tracking/current. Only the latest position is kept —
// no historical GPS trail is retained (privacy by design).
export interface TrackingSession {
  requestId: string;
  donorId: string;
  donorName?: string;
  status: TrackingSessionStatus;
  sharingStartedAt: number | null; // epoch millis
  lastUpdatedAt: number | null;    // epoch millis
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
}

export interface DonationRecord {
  id: string;
  requestId: string;
  donorId: string;
  bloodGroup: BloodGroup;
  units: number;
  date: string;
  status: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  requestId: string;
  title: string;
  message: string;
  bloodGroup: BloodGroup;
  hospital: string;
  location: string;
  patientName: string;
  urgency: UrgencyLevel;
  status: 'unread' | 'read' | 'accepted' | 'declined';
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: string;
}

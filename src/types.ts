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
  _sandboxPassword?: string;
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

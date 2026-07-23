import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, EmergencyRequest, DonationRecord, AnnouncementItem } from "../types";

// Static mock data to populate Firestore for a realistic campus-wide experience on first run
const MOCK_USERS: UserProfile[] = [
  {
    uid: "admin-uid-123",
    name: "Prof. Rajesh Sharma",
    email: "rajesh.sharma@kluniversity.in",
    idCard: "FAC-8890",
    role: "admin",
    department: "Computer Science & Engineering",
    bloodGroup: "O+",
    phone: "+91 98765 43210",
    gender: "Male",
    dob: "1978-05-14",
    lastDonation: "2026-03-10",
    isEligible: true,
    isAvailable: true,
    verified: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "donor-uid-1",
    name: "Aarav Mehta",
    email: "aarav.mehta@kluniversity.in",
    idCard: "STU-2024-0045",
    role: "student",
    department: "Information Technology",
    year: "3rd Year",
    bloodGroup: "A+",
    phone: "+91 91234 56789",
    gender: "Male",
    dob: "2004-11-23",
    lastDonation: "2026-01-15",
    isEligible: true,
    isAvailable: true,
    verified: true,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "donor-uid-2",
    name: "Ananya Iyer",
    email: "ananya.iyer@kluniversity.in",
    idCard: "STU-2023-0192",
    role: "student",
    department: "Mechanical Engineering",
    year: "4th Year",
    bloodGroup: "O-",
    phone: "+91 82345 67890",
    gender: "Female",
    dob: "2003-08-04",
    lastDonation: "2025-12-10",
    isEligible: true,
    isAvailable: true,
    verified: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "donor-uid-3",
    name: "Vikram Rathore",
    email: "vikram.r@kluniversity.in",
    idCard: "STF-4410",
    role: "staff",
    department: "Campus Facilities & Security",
    bloodGroup: "B+",
    phone: "+91 73456 78901",
    gender: "Male",
    dob: "1985-09-19",
    lastDonation: "",
    isEligible: true,
    isAvailable: true,
    verified: true,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "donor-uid-4",
    name: "Dr. Meera Sen",
    email: "meera.sen@kluniversity.in",
    idCard: "FAC-1022",
    role: "faculty",
    department: "Biotechnology & Sciences",
    bloodGroup: "AB-",
    phone: "+91 64567 89012",
    gender: "Female",
    dob: "1980-12-01",
    lastDonation: "2026-02-14",
    isEligible: true,
    isAvailable: false,
    verified: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    uid: "donor-uid-5",
    name: "Rohan Das",
    email: "rohan.das@kluniversity.in",
    idCard: "STU-2025-1033",
    role: "student",
    department: "Electronics & Communication",
    year: "2nd Year",
    bloodGroup: "B-",
    phone: "+91 95678 90123",
    gender: "Male",
    dob: "2005-04-12",
    lastDonation: "",
    isEligible: true,
    isAvailable: true,
    verified: false, // For testing admin verification
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_REQUESTS: EmergencyRequest[] = [
  {
    id: "req-1",
    userId: "donor-uid-5",
    patientName: "Sanjay Das (Student's Father)",
    bloodGroup: "O-",
    hospital: "City Metro Superspeciality Hospital",
    location: "Block C, Metro Junction (3km from Campus)",
    units: 3,
    contactName: "Rohan Das",
    contactPhone: "+91 95678 90123",
    urgency: "critical",
    requiredTime: "Within 2 Hours",
    notes: "Requires immediate bypass surgery. O-negative is highly urgent. Please contact immediately.",
    status: "searching",
    createdAt: new Date().toISOString()
  },
  {
    id: "req-2",
    userId: "donor-uid-1",
    patientName: "Prof. Amrita Rao",
    bloodGroup: "AB-",
    hospital: "University Health Center & Hospital",
    location: "Campus West Wing Medical Building",
    units: 2,
    contactName: "Aarav Mehta",
    contactPhone: "+91 91234 56789",
    urgency: "high",
    requiredTime: "By Tonight",
    notes: "Platelet transfusion needed. Matching Biotechnology department faculty member.",
    status: "accepted",
    acceptedBy: "donor-uid-4",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "req-3",
    userId: "donor-uid-3",
    patientName: "Harish Kumar (Security Guard)",
    bloodGroup: "B+",
    hospital: "Red Cross Emergency Center",
    location: "Outer Ring Road Exit 4",
    units: 4,
    contactName: "Vikram Rathore",
    contactPhone: "+91 73456 78901",
    urgency: "medium",
    requiredTime: "Within 24 Hours",
    notes: "Post-accident recovery. Heavy blood loss. Staff solidarity request.",
    status: "completed",
    acceptedBy: "donor-uid-3",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_DONATIONS: DonationRecord[] = [
  {
    id: "don-1",
    requestId: "req-3",
    donorId: "donor-uid-3",
    bloodGroup: "B+",
    units: 2,
    date: "2026-07-11",
    status: "completed"
  },
  {
    id: "don-2",
    requestId: "historic-1",
    donorId: "donor-uid-1",
    bloodGroup: "A+",
    units: 1,
    date: "2026-01-15",
    status: "completed"
  },
  {
    id: "don-3",
    requestId: "historic-2",
    donorId: "admin-uid-123",
    bloodGroup: "O+",
    units: 2,
    date: "2026-03-10",
    status: "completed"
  }
];

const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "ann-1",
    title: "Annual Campus Blood Drive scheduled for next Monday!",
    content: "The Red Cross and University Health Center will host a joint blood donation camp at the Main Gymnasium from 9:00 AM to 5:00 PM. High eligibility standards apply. Registration via Suraksha earns a Platinum Donor Badge!",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: "Prof. Rajesh Sharma"
  },
  {
    id: "ann-2",
    title: "URGENT NEED: Critical Shortage of O-Negative Blood Types",
    content: "Our campus health center currently reports an absolute depletion of O-negative emergency supply packs. All eligible O-negative students and staff are encouraged to keep their Availability toggles active.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    author: "Prof. Rajesh Sharma"
  }
];

export async function seedDatabaseIfEmpty() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    if (!usersSnap.empty) {
      console.log("Database already has data. Skipping seed.");
      return;
    }

    console.log("Database is empty. Initiating professional campus data seed...");

    // Seed Users
    for (const u of MOCK_USERS) {
      await setDoc(doc(db, "users", u.uid), u);
    }

    // Seed Requests
    for (const r of MOCK_REQUESTS) {
      await setDoc(doc(db, "requests", r.id), r);
    }

    // Seed Donations
    for (const d of MOCK_DONATIONS) {
      await setDoc(doc(db, "donations", d.id), d);
    }

    // Seed Announcements
    for (const a of MOCK_ANNOUNCEMENTS) {
      await setDoc(doc(db, "announcements", a.id), a);
    }

    console.log("Database seeded successfully with exclusive campus data!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

import { useState, useEffect, useMemo, FormEvent } from "react";
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, EmergencyRequest, DonationRecord, NotificationItem, BloodGroup } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Activity,
  CheckCircle,
  Clock,
  MapPin,
  Hospital,
  Users,
  LogOut,
  Settings,
  Bell,
  Award,
  Check,
  ChevronRight,
  Menu,
  X,
  Gift,
  FileText,
  Search,
  Droplet,
  Navigation,
  UserPlus,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  User,
  PlusCircle,
} from "lucide-react";

// Existing modular subcomponents (rendered inside tabs)
import DonorDirectory from "./DonorDirectory";
import RequestPortal from "./RequestPortal";
import SmartMatchingPanel from "./SmartMatchingPanel";
import TrackingPanel from "./tracking/TrackingPanel";

interface DashboardProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

type SidebarTab = "dashboard" | "profile" | "requests" | "directory" | "notifications" | "settings";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function timeAgoShort(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

export default function Dashboard({ currentUser: initialUser, onLogout }: DashboardProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [activeTab, setActiveTab] = useState<SidebarTab>("dashboard");
  const [requestPortalTab, setRequestPortalTab] = useState<"list" | "create">("list");
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});

  // Profile form fields
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone);
  const [profileDept, setProfileDept] = useState(currentUser.department);
  const [profileDob, setProfileDob] = useState(currentUser.dob || "");
  const [profileGender, setProfileGender] = useState(currentUser.gender || "Male");
  const [profileYear, setProfileYear] = useState(currentUser.year || "");
  const [profileBloodGroup, setProfileBloodGroup] = useState<BloodGroup>(currentUser.bloodGroup);
  const [lastDonationDate, setLastDonationDate] = useState(currentUser.lastDonation || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Firestore collections
  const [activeRequests, setActiveRequests] = useState<EmergencyRequest[]>([]);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfilePhone(currentUser.phone);
      setProfileDept(currentUser.department);
      setProfileDob(currentUser.dob || "");
      setProfileGender(currentUser.gender || "Male");
      setProfileYear(currentUser.year || "");
      setProfileBloodGroup(currentUser.bloodGroup);
      setLastDonationDate(currentUser.lastDonation || "");
    }
  }, [currentUser]);

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) setCurrentUser(docSnap.data() as UserProfile);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setAllUsers(list);
    });

    const unsubRequests = onSnapshot(query(collection(db, "requests")), (snapshot) => {
      const list: EmergencyRequest[] = [];
      snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as EmergencyRequest));
      list.sort((a, b) => {
        const statusOrder: Record<string, number> = { searching: 1, accepted: 2, completed: 3, closed: 4 };
        const statusDiff = (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9);
        if (statusDiff !== 0) return statusDiff;
        const urgencyOrder: Record<string, number> = { critical: 1, high: 2, medium: 3 };
        const urgencyDiff = (urgencyOrder[a.urgency] || 9) - (urgencyOrder[b.urgency] || 9);
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setActiveRequests(list);
    });

    const unsubDonations = onSnapshot(
      query(collection(db, "donations"), where("donorId", "==", currentUser.uid)),
      (snapshot) => {
        const list: DonationRecord[] = [];
        snapshot.forEach((docSnap) => list.push(docSnap.data() as DonationRecord));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setDonationHistory(list);
      }
    );

    const unsubNotifications = onSnapshot(
      query(collection(db, "notifications"), where("userId", "==", currentUser.uid)),
      (snapshot) => {
        const list: NotificationItem[] = [];
        snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as NotificationItem));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(list);
        setLoading(false);
      }
    );

    return () => {
      unsubProfile();
      unsubUsers();
      unsubRequests();
      unsubDonations();
      unsubNotifications();
    };
  }, [currentUser?.uid]);

  // ---- computed ----
  const profileCompletion = useMemo(() => {
    const fields = [
      currentUser.name, currentUser.email, currentUser.idCard, currentUser.department,
      currentUser.phone, currentUser.gender, currentUser.dob, currentUser.bloodGroup,
      currentUser.lastDonation, currentUser.role === "student" ? currentUser.year : true,
    ];
    const completed = fields.filter((v) => v !== undefined && v !== null && v !== "").length;
    return Math.round((completed / fields.length) * 100);
  }, [currentUser]);

  const eligibilityInfo = useMemo(() => {
    if (!currentUser.lastDonation) return { label: "Eligible now", isEligible: true, date: "Ready now" };
    const lastDate = new Date(currentUser.lastDonation);
    const nextEligible = new Date(lastDate);
    nextEligible.setDate(lastDate.getDate() + 90);
    const diffDays = Math.ceil((nextEligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { label: "Eligible now", isEligible: true, date: "Available" };
    return {
      label: `Rest ${diffDays}d`, isEligible: false,
      date: nextEligible.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
    };
  }, [currentUser.lastDonation]);

  const totalCompletedDonations = useMemo(
    () => donationHistory.filter((d) => d.status === "completed").length,
    [donationHistory]
  );
  const livesSavedCount = useMemo(() => totalCompletedDonations * 3, [totalCompletedDonations]);
  const rewardPoints = useMemo(
    () => totalCompletedDonations * 150 + (profileCompletion >= 90 ? 100 : 50),
    [totalCompletedDonations, profileCompletion]
  );
  const donorLevel = useMemo(() => {
    if (totalCompletedDonations >= 8) return { level: "Vanguard Titan", rank: 4, icon: "💎" };
    if (totalCompletedDonations >= 4) return { level: "Platinum Sentinel", rank: 3, icon: "🛡️" };
    if (totalCompletedDonations >= 2) return { level: "Gold Guardian", rank: 2, icon: "⭐" };
    if (totalCompletedDonations >= 1) return { level: "Bronze Defender", rank: 1, icon: "✨" };
    return { level: "New Donor", rank: 0, icon: "🎗️" };
  }, [totalCompletedDonations]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => n.status === "unread").length,
    [notifications]
  );

  // Community stats (real data)
  const activeDonorsCount = useMemo(
    () => allUsers.filter((u) => u.isAvailable && u.isEligible).length,
    [allUsers]
  );
  const fulfilledCount = useMemo(
    () => activeRequests.filter((r) => r.status === "completed").length,
    [activeRequests]
  );
  const livesImpacted = fulfilledCount * 3;
  const bloodAvailability = useMemo(() => {
    const map: Record<string, number> = {};
    BLOOD_GROUPS.forEach((bg) => {
      map[bg] = allUsers.filter((u) => u.bloodGroup === bg && u.isAvailable && u.isEligible).length;
    });
    return map;
  }, [allUsers]);

  const urgentRequests = useMemo(
    () => activeRequests.filter((r) => r.status === "searching").slice(0, 4),
    [activeRequests]
  );

  const getProximityDistance = (hospitalName: string) => {
    let hash = 0;
    for (let i = 0; i < hospitalName.length; i++) hash = hospitalName.charCodeAt(i) + ((hash << 5) - hash);
    return `${((Math.abs(hash) % 4) + 0.8).toFixed(1)} km away`;
  };

  // ---- handlers ----
  const toggleAvailability = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { isAvailable: !currentUser.isAvailable });
    } catch (error) {
      console.error("Error updating availability status:", error);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileName || !profilePhone || !profileDept) {
      alert("Please enter Name, Phone Number, and Department.");
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const updatedProfile: any = {
        name: profileName, phone: profilePhone, department: profileDept,
        dob: profileDob || null, gender: profileGender || "Male",
        bloodGroup: profileBloodGroup, lastDonation: lastDonationDate || null,
      };
      if (currentUser.role === "student" && profileYear) updatedProfile.year = profileYear;
      await updateDoc(doc(db, "users", currentUser.uid), updatedProfile);
      alert("Profile saved successfully!");
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Error updating user profile:", err);
      alert("Profile update failed. Try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleRespondEmergency = async (req: EmergencyRequest) => {
    if (req.userId === currentUser.uid) {
      alert("You cannot respond to your own emergency request.");
      return;
    }
    const confirmAccept = confirm(
      `Respond to Emergency Alert?\n\nYou are committing to donate ${req.units} units of ${req.bloodGroup} at ${req.hospital}. Your name and contact phone will be shared with ${req.contactName}.`
    );
    if (!confirmAccept) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "requests", req.id), { status: "accepted", acceptedBy: currentUser.uid });
      const donationId = "don-" + Math.random().toString(36).substr(2, 9);
      batch.set(doc(db, "donations", donationId), {
        id: donationId, requestId: req.id, donorId: currentUser.uid, bloodGroup: req.bloodGroup,
        units: req.units,
        date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        status: "completed",
      });
      const notificationId = "notif-" + Math.random().toString(36).substr(2, 9);
      batch.set(doc(db, "notifications", notificationId), {
        id: notificationId, userId: req.userId, requestId: req.id,
        title: `Donor Match Secured: ${currentUser.name} accepted your request`,
        message: `${currentUser.name} (${currentUser.bloodGroup}) is on the way! Contact phone: ${currentUser.phone}.`,
        bloodGroup: req.bloodGroup, hospital: req.hospital, location: req.location,
        patientName: req.patientName, urgency: req.urgency, status: "unread",
        createdAt: new Date().toISOString(),
      });
      await batch.commit();
      alert("Emergency match secured! The requester has been notified.");
    } catch (err) {
      console.error("Error responding to request:", err);
      alert("Failed to accept emergency. Please check your network.");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unreadList = notifications.filter((n) => n.status === "unread");
    if (unreadList.length === 0) return;
    try {
      const batch = writeBatch(db);
      unreadList.forEach((n) => batch.update(doc(db, "notifications", n.id), { status: "read" }));
      await batch.commit();
    } catch (err) {
      console.error("Error marking alerts as read:", err);
    }
  };

  const handleCompleteOwnRequest = async (reqId: string) => {
    try {
      await updateDoc(doc(db, "requests", reqId), { status: "completed" });
      alert("Emergency request marked as completed. Safe healing to the patient!");
    } catch (err) {
      console.error("Error closing request:", err);
    }
  };

  const handleCancelOwnRequest = async (reqId: string) => {
    if (!confirm("Are you sure you want to cancel this emergency request?")) return;
    try {
      await updateDoc(doc(db, "requests", reqId), { status: "closed" });
      alert("Request canceled successfully.");
    } catch (err) {
      console.error("Error canceling request:", err);
    }
  };

  const goRequestBlood = () => { setActiveTab("requests"); setRequestPortalTab("create"); setMobileSidebarOpen(false); };
  const goDirectory = () => { setActiveTab("directory"); setMobileSidebarOpen(false); };

  const initials = currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const firstName = currentUser.name.split(" ")[0];

  // Sidebar — real features only
  const nav: { id: SidebarTab; label: string; icon: any; onClick?: () => void; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "directory", label: "Find Donors", icon: Search },
    { id: "requests", label: "Request Blood", icon: Droplet, onClick: goRequestBlood },
    { id: "requests", label: "My Requests", icon: FileText, onClick: () => { setActiveTab("requests"); setRequestPortalTab("list"); setMobileSidebarOpen(false); },
      badge: activeRequests.filter((r) => r.userId === currentUser.uid && r.status === "searching").length },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotificationsCount },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const card = "bg-white border border-gray-100 rounded-2xl shadow-sm";
  const label = "block text-xs font-semibold text-gray-500 mb-1.5";
  const input = "w-full bg-gray-50 border border-gray-200 focus:border-red-400 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition";

  return (
    <div className="min-h-screen bg-[#faf6f7] text-gray-900 flex flex-col md:flex-row font-sans">

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
            <Droplet className="w-4 h-4 text-white fill-white/90" />
          </div>
          <span className="font-display font-bold text-gray-900">Suraksha</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab("notifications")} className="relative p-1 text-gray-500">
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-600 rounded-full" />}
          </button>
          <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="p-1.5 rounded-lg bg-gray-100 text-gray-700">
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 p-5 flex flex-col justify-between
        transition-transform duration-300 md:relative md:translate-x-0
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="space-y-6 overflow-y-auto">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <span className="font-display text-lg font-black text-gray-900 leading-tight block">Suraksha</span>
              <span className="text-[10px] text-gray-400 font-medium">Donate Blood, Save Lives</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            {nav.map((item, i) => {
              const Icon = item.icon;
              const active =
                activeTab === item.id &&
                // disambiguate the two "requests" entries by requestPortalTab
                (item.id !== "requests" ||
                  (item.label === "Request Blood" ? requestPortalTab === "create" : requestPortalTab === "list"));
              return (
                <button
                  key={`${item.label}-${i}`}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    else { setActiveTab(item.id); setMobileSidebarOpen(false); }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4.5 h-4.5" />
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-red-600 text-white"}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom promo + logout */}
        <div className="space-y-3 pt-4">
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 border border-red-100 p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <Heart className="w-5 h-5 text-red-600 fill-red-600" />
            </div>
            <p className="text-sm font-bold text-gray-900">Every Drop Counts</p>
            <p className="text-[11px] text-gray-500 mt-0.5 mb-3">Your one donation can save up to 3 lives.</p>
            <button onClick={goDirectory} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition">
              Donate Now
            </button>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <div onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-30 md:hidden" />
      )}

      {/* Main */}
      <main className="flex-grow min-w-0 p-5 md:p-8">
        {/* Greeting top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-black text-gray-900 flex items-center gap-2">
              Hello, {firstName} <span className="text-xl">👋</span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Thank you for being a lifesaver!</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-100 rounded-full px-3.5 py-2 shadow-sm">
              <MapPin className="w-4 h-4 text-red-500" /> KL University, AP
            </span>
            <button onClick={() => setActiveTab("notifications")} className="relative p-2.5 bg-white border border-gray-100 rounded-full shadow-sm text-gray-500 hover:text-red-600 transition">
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab("profile")} className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-500 to-rose-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {initials}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ============================ DASHBOARD HOME ============================ */}
          {activeTab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* LEFT / MAIN (2 cols) */}
              <div className="xl:col-span-2 space-y-6">
                {/* Search + request */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className={`${card} flex-1 flex items-center px-4`}>
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      onFocus={goDirectory}
                      placeholder="Search by blood group, location, or name..."
                      className="w-full bg-transparent py-3 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                    <button onClick={goDirectory} className="hidden sm:inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                      <Search className="w-4 h-4" /> Search
                    </button>
                  </div>
                  <button onClick={goRequestBlood} className={`${card} flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition`}>
                    <Droplet className="w-4 h-4 fill-red-600" /> Request Blood
                  </button>
                </div>

                {/* Stat cards (real data) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: <Droplet className="w-5 h-5" />, tint: "bg-red-50 text-red-600", value: activeDonorsCount, label: "Active Donors", sub: "Ready to help" },
                    { icon: <Users className="w-5 h-5" />, tint: "bg-amber-50 text-amber-600", value: fulfilledCount, label: "Requests Fulfilled", sub: "By the community" },
                    { icon: <CheckCircle className="w-5 h-5" />, tint: "bg-green-50 text-green-600", value: livesImpacted, label: "Lives Impacted", sub: "Together" },
                    { icon: <Activity className="w-5 h-5" />, tint: "bg-blue-50 text-blue-600", value: activeRequests.filter(r => r.status === "searching").length, label: "Active Requests", sub: "Right now" },
                  ].map((s, i) => (
                    <div key={i} className={`${card} p-4`}>
                      <div className={`w-11 h-11 rounded-full ${s.tint} flex items-center justify-center mb-3`}>{s.icon}</div>
                      <div className="text-2xl font-display font-black text-gray-900">{s.value}+</div>
                      <div className="text-xs font-semibold text-gray-700">{s.label}</div>
                      <div className="text-[11px] text-gray-400">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Hero banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-600 to-rose-700 p-7 sm:p-9 text-white">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-90 hidden sm:block">
                    <div className="w-40 h-40 rounded-full bg-white/10 flex items-center justify-center">
                      <Droplet className="w-24 h-24 text-white fill-white/90" />
                    </div>
                  </div>
                  <div className="relative max-w-sm">
                    <span className="text-sm font-semibold text-white/80">Be a Hero.</span>
                    <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight mt-1">Donate Blood,<br />Save Lives.</h2>
                    <p className="text-sm text-white/80 mt-3 mb-5">Your kindness can bring someone back to life.</p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={goDirectory} className="inline-flex items-center gap-1.5 bg-white text-red-600 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-red-50 transition">
                        <UserPlus className="w-4 h-4" /> Find Donors
                      </button>
                      <button onClick={goRequestBlood} className="inline-flex items-center gap-1.5 bg-white/15 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/25 transition border border-white/20">
                        <PlusCircle className="w-4 h-4" /> Request Blood
                      </button>
                    </div>
                  </div>
                </div>

                {/* How Suraksha works */}
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900 mb-3">How Suraksha Works</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { icon: <Search className="w-5 h-5" />, tint: "bg-red-50 text-red-600", t: "1. Find or Request", d: "Search donors or request blood in an emergency." },
                      { icon: <Bell className="w-5 h-5" />, tint: "bg-amber-50 text-amber-600", t: "2. Connect", d: "We connect you with verified donors near you." },
                      { icon: <Droplet className="w-5 h-5" />, tint: "bg-green-50 text-green-600", t: "3. Donate", d: "Donate blood and help save precious lives." },
                      { icon: <Heart className="w-5 h-5" />, tint: "bg-blue-50 text-blue-600", t: "4. Save Lives", d: "Your donation brings hope and saves lives." },
                    ].map((s, i) => (
                      <div key={i} className={`${card} p-4`}>
                        <div className={`w-10 h-10 rounded-full ${s.tint} flex items-center justify-center mb-3`}>{s.icon}</div>
                        <div className="text-sm font-bold text-gray-900">{s.t}</div>
                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">{s.d}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nearby emergency requests (real, with respond + tracking) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Nearby Emergency Requests
                    </h3>
                    <span className="text-xs font-semibold text-red-500">
                      {activeRequests.filter((r) => r.status === "searching").length} active
                    </span>
                  </div>
                  {activeRequests.length === 0 ? (
                    <div className={`${card} p-8 text-center`}>
                      <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">Campus zone secure</p>
                      <p className="text-xs text-gray-400">No active blood requests right now.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeRequests.map((req) => (
                        <div key={req.id} className={`${card} p-5 ${req.status === "searching" && req.urgency === "critical" ? "border-red-200" : ""}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white font-display font-black text-[11px]">{req.bloodGroup}</span>
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  req.urgency === "critical" ? "bg-red-50 text-red-600" : req.urgency === "high" ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-600"}`}>
                                  {req.urgency}
                                </span>
                                <span className="text-[11px] text-gray-400">{getProximityDistance(req.hospital)}</span>
                              </div>
                              <h4 className="text-sm font-bold text-gray-900">Patient: {req.patientName}</h4>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Hospital className="w-3.5 h-3.5 text-gray-400" /> {req.hospital} <span className="text-gray-400">({req.location})</span>
                              </p>
                              <p className="text-[11px] text-gray-400 flex items-center gap-2">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {req.requiredTime}</span>
                                <span>· {req.units} units needed</span>
                              </p>
                            </div>
                            <div className="shrink-0">
                              {req.status === "searching" ? (
                                req.userId === currentUser.uid ? (
                                  <span className="text-[11px] font-semibold text-gray-400">Your request</span>
                                ) : (
                                  <button onClick={() => handleRespondEmergency(req)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition">
                                    Respond
                                  </button>
                                )
                              ) : (
                                <span className={`text-[11px] font-bold ${req.status === "accepted" ? "text-blue-500" : "text-green-500"}`}>
                                  {req.status === "accepted" ? "Matched 🤝" : "Completed 🎉"}
                                </span>
                              )}
                            </div>
                          </div>

                          {req.status === "searching" && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-red-500" /> Smart matching active
                              </span>
                              <button onClick={() => setExpandedMatches((p) => ({ ...p, [req.id]: !p[req.id] }))}
                                className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
                                {expandedMatches[req.id] ? "Hide matches" : "Show matches"}
                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedMatches[req.id] ? "rotate-90" : ""}`} />
                              </button>
                            </div>
                          )}
                          <AnimatePresence>
                            {expandedMatches[req.id] && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <SmartMatchingPanel request={req} currentUser={currentUser} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <TrackingPanel request={req} currentUser={currentUser} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN (widgets) */}
              <div className="space-y-6">
                {/* Availability card (real, useful — replaces app promo) */}
                <div className={`${card} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-gray-900 text-sm">Your Availability</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${eligibilityInfo.isEligible ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                      {eligibilityInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">Emergency available</span>
                      <span className="text-[11px] text-gray-400">Toggle off if feeling unwell</span>
                    </div>
                    <button onClick={toggleAvailability} className={`w-12 h-7 rounded-full p-1 transition-colors ${currentUser.isAvailable ? "bg-green-500" : "bg-gray-300"}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition ${currentUser.isAvailable ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <div className="text-lg font-display font-black text-red-600">{livesSavedCount}</div>
                      <div className="text-[10px] text-gray-400">Lives you've saved</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <div className="text-lg font-display font-black text-gray-900">{totalCompletedDonations}</div>
                      <div className="text-[10px] text-gray-400">Donations</div>
                    </div>
                  </div>
                </div>

                {/* Urgent requests (real) */}
                <div className={`${card} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-gray-900 text-sm">Urgent Requests</h3>
                    <button onClick={() => { setActiveTab("requests"); setRequestPortalTab("list"); }} className="text-[11px] font-semibold text-red-600">View All</button>
                  </div>
                  {urgentRequests.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No urgent requests right now.</p>
                  ) : (
                    <div className="space-y-3">
                      {urgentRequests.map((r) => (
                        <div key={r.id} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {r.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-900 truncate">{r.patientName}</span>
                              <span className="text-[10px] text-gray-400 shrink-0">{timeAgoShort(r.createdAt)}</span>
                            </div>
                            <p className="text-[11px] font-semibold text-red-600">{r.bloodGroup} blood needed</p>
                            <p className="text-[11px] text-gray-400 truncate">{r.hospital}</p>
                          </div>
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">Urgent</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blood availability (real donor counts per group) */}
                <div className={`${card} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-gray-900 text-sm">Blood Availability</h3>
                    <button onClick={goDirectory} className="text-[11px] font-semibold text-red-600">View All</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map((bg) => (
                      <div key={bg} className="bg-gray-50 rounded-xl p-2 text-center">
                        <div className="flex items-center justify-center gap-0.5 text-red-600">
                          <Droplet className="w-3 h-3 fill-red-600" />
                          <span className="font-display font-black text-xs">{bg}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{bloodAvailability[bg]} units</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prestige (real) */}
                <div className={`${card} p-5`}>
                  <h3 className="font-display font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-red-500" /> Your Achievements
                  </h3>
                  <div className="flex items-center justify-between bg-gradient-to-r from-rose-50 to-red-50 rounded-xl p-3 border border-red-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{donorLevel.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{donorLevel.level}</div>
                        <div className="text-[10px] text-gray-500">Level {donorLevel.rank}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-display font-black text-red-600 flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> {rewardPoints}</div>
                      <div className="text-[10px] text-gray-400">points</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================ PROFILE ============================ */}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="max-w-3xl space-y-6">
              <div className={`${card} p-6`}>
                <h2 className="font-display text-xl font-black text-gray-900 flex items-center gap-2 mb-1">
                  <User className="w-5 h-5 text-red-500" /> Your Profile
                </h2>
                <p className="text-xs text-gray-500 mb-5">Keep your details up to date so donors and requesters can reach you fast.</p>
                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Full name *</label>
                    <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className={input} required />
                  </div>
                  <div>
                    <label className={label}>Email (read-only)</label>
                    <input value={currentUser.email} disabled className={`${input} bg-gray-100 text-gray-400 cursor-not-allowed`} />
                  </div>
                  <div>
                    <label className={label}>Phone *</label>
                    <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className={input} required />
                  </div>
                  <div>
                    <label className={label}>Campus ID (read-only)</label>
                    <input value={currentUser.idCard} disabled className={`${input} bg-gray-100 text-gray-400 cursor-not-allowed`} />
                  </div>
                  <div>
                    <label className={label}>Department *</label>
                    <input value={profileDept} onChange={(e) => setProfileDept(e.target.value)} className={input} required />
                  </div>
                  {currentUser.role === "student" && (
                    <div>
                      <label className={label}>Academic year</label>
                      <select value={profileYear} onChange={(e) => setProfileYear(e.target.value)} className={input}>
                        <option value="">Select year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Postgraduate">Postgraduate</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={label}>Gender</label>
                    <select value={profileGender} onChange={(e) => setProfileGender(e.target.value)} className={input}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Date of birth</label>
                    <input type="date" value={profileDob} onChange={(e) => setProfileDob(e.target.value)} className={input} />
                  </div>
                  <div>
                    <label className={label}>Blood group *</label>
                    <select value={profileBloodGroup} onChange={(e) => setProfileBloodGroup(e.target.value as BloodGroup)} className={`${input} text-red-600 font-bold`} required>
                      {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Last donation date</label>
                    <input type="date" value={lastDonationDate} onChange={(e) => setLastDonationDate(e.target.value)} className={input} />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setActiveTab("dashboard")} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={isUpdatingProfile} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold">
                      {isUpdatingProfile ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Donation history */}
              <div className={`${card} p-6`}>
                <h3 className="font-display font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Donation History
                </h3>
                {donationHistory.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No donations recorded yet. Respond to a request to start saving lives!</p>
                ) : (
                  <div className="space-y-2">
                    {donationHistory.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 font-bold text-xs">{d.bloodGroup}</span>
                          <span className="text-gray-700">{d.units} units donated</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">{d.status}</span>
                          <span className="text-[11px] text-gray-400">{d.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ============================ REQUESTS ============================ */}
          {activeTab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
              <div className="flex border-b border-gray-200">
                <button onClick={() => setRequestPortalTab("list")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${requestPortalTab === "list" ? "border-red-500 text-red-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  My Requests ({activeRequests.filter((r) => r.userId === currentUser.uid).length})
                </button>
                <button onClick={() => setRequestPortalTab("create")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${requestPortalTab === "create" ? "border-red-500 text-red-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  Request Blood
                </button>
              </div>

              {requestPortalTab === "create" ? (
                <RequestPortal currentUser={currentUser} onSuccess={() => setRequestPortalTab("list")} />
              ) : (
                <div className="space-y-3">
                  {activeRequests.filter((r) => r.userId === currentUser.uid).length === 0 ? (
                    <div className={`${card} p-10 text-center`}>
                      <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">No requests yet</p>
                      <p className="text-xs text-gray-400 mb-4">You haven't created any emergency requests.</p>
                      <button onClick={() => setRequestPortalTab("create")} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl">Create your first request</button>
                    </div>
                  ) : (
                    activeRequests.filter((r) => r.userId === currentUser.uid).map((req) => (
                      <div key={req.id} className={`${card} p-5`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-display font-black text-[11px]">{req.bloodGroup}</span>
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                req.status === "searching" ? "bg-red-50 text-red-600" : req.status === "accepted" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
                                {req.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Patient: {req.patientName}</h4>
                            <p className="text-xs text-gray-500">{req.hospital} ({req.location}) · {req.units} units</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {req.status === "searching" && (
                              <button onClick={() => handleCancelOwnRequest(req.id)} className="px-3 py-1.5 border border-gray-200 text-gray-500 hover:text-red-600 text-xs font-semibold rounded-lg">Cancel</button>
                            )}
                            {req.status === "accepted" && (
                              <>
                                <button onClick={() => handleCancelOwnRequest(req.id)} className="px-3 py-1.5 border border-gray-200 text-gray-500 hover:text-red-600 text-xs font-semibold rounded-lg">Cancel</button>
                                <button onClick={() => handleCompleteOwnRequest(req.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg">Mark completed ✔</button>
                              </>
                            )}
                            {req.status === "completed" && <span className="text-xs font-semibold text-green-600">Completed 🤝</span>}
                          </div>
                        </div>
                        {req.status === "searching" && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-red-500" /> Smart matching active</span>
                            <button onClick={() => setExpandedMatches((p) => ({ ...p, [req.id]: !p[req.id] }))} className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                              {expandedMatches[req.id] ? "Hide matches" : "Show matches"}
                              <ChevronRight className={`w-3 h-3 transition-transform ${expandedMatches[req.id] ? "rotate-90" : ""}`} />
                            </button>
                          </div>
                        )}
                        <AnimatePresence>
                          {expandedMatches[req.id] && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <SmartMatchingPanel request={req} currentUser={currentUser} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <TrackingPanel request={req} currentUser={currentUser} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ============================ DIRECTORY ============================ */}
          {activeTab === "directory" && (
            <motion.div key="directory" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <DonorDirectory />
            </motion.div>
          )}

          {/* ============================ NOTIFICATIONS ============================ */}
          {activeTab === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="max-w-3xl">
              <div className={`${card} p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display text-xl font-black text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-500" /> Notifications
                  </h2>
                  {unreadNotificationsCount > 0 && (
                    <button onClick={handleMarkAllNotificationsRead} className="text-xs font-semibold text-gray-500 hover:text-red-600">Mark all as read</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">No notifications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-4 rounded-xl border ${n.status === "unread" ? "bg-red-50/50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold text-[10px]">{n.bloodGroup}</span>
                              <span className="text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                            <p className="text-xs text-gray-600">{n.message}</p>
                            <p className="text-[11px] text-gray-400">{n.hospital} ({n.location})</p>
                          </div>
                          {n.status === "unread" && (
                            <button onClick={() => updateDoc(doc(db, "notifications", n.id), { status: "read" })} className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 shrink-0">Dismiss</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ============================ SETTINGS ============================ */}
          {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="max-w-3xl">
              <div className={`${card} p-6 space-y-6`}>
                <div>
                  <h2 className="font-display text-xl font-black text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-red-500" /> Settings
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Manage your visibility, preferences, and account.</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-1 mb-3">Campus directory visibility</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">Account verification</span>
                      <p className="text-[11px] text-gray-500">Verified by campus admins; controls donor-match eligibility.</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${currentUser.verified ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                      {currentUser.verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-1 mb-3">Account</h3>
                  <div className="p-4 rounded-xl bg-gray-50 space-y-1.5 text-xs text-gray-500">
                    <div><span className="font-semibold text-gray-700">Sign-in:</span> University email &amp; password</div>
                    <div><span className="font-semibold text-gray-700">Email:</span> {currentUser.email}</div>
                    <div><span className="font-semibold text-gray-700">Account ID:</span> <span className="font-mono">{currentUser.uid}</span></div>
                  </div>
                </div>

                <button onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700">
                  <LogOut className="w-4 h-4" /> Log out of this account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

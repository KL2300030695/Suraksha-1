import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { 
  collection, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  writeBatch,
  doc as firestoreDoc,
  setDoc
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
  Phone, 
  Hospital, 
  AlertCircle, 
  RefreshCw, 
  Star, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  Users, 
  PlusCircle, 
  LogOut, 
  Shield, 
  Settings, 
  Bell, 
  Award, 
  Smartphone, 
  Building, 
  Check, 
  ChevronRight, 
  Menu, 
  X,
  ThumbsUp, 
  Gift, 
  Briefcase, 
  Camera,
  Compass,
  FileText,
  Mail,
  Calendar,
  Sparkles
} from "lucide-react";

// Import existing modular subcomponents
import DonorDirectory from "./DonorDirectory";
import RequestPortal from "./RequestPortal";
import SmartMatchingPanel from "./SmartMatchingPanel";

interface DashboardProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

type SidebarTab = "dashboard" | "profile" | "requests" | "directory" | "notifications" | "settings";

export default function Dashboard({ currentUser: initialUser, onLogout }: DashboardProps) {
  // Responsive sidebar toggle for mobile
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Real-time user profile state syncing with Firestore
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [activeTab, setActiveTab] = useState<SidebarTab>("dashboard");
  const [requestPortalTab, setRequestPortalTab] = useState<"list" | "create">("list");
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});

  // Local state for profile form fields
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone);
  const [profileDept, setProfileDept] = useState(currentUser.department);
  const [profileDob, setProfileDob] = useState(currentUser.dob || "");
  const [profileGender, setProfileGender] = useState(currentUser.gender || "Male");
  const [profileYear, setProfileYear] = useState(currentUser.year || "");
  const [profileBloodGroup, setProfileBloodGroup] = useState<BloodGroup>(currentUser.bloodGroup);
  const [lastDonationDate, setLastDonationDate] = useState(currentUser.lastDonation || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Firestore collections states
  const [activeRequests, setActiveRequests] = useState<EmergencyRequest[]>([]);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync profile edits with initialUser when it changes
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

    // 1. Sync User Profile Document in real-time
    const unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUser(docSnap.data() as UserProfile);
      }
    });

    // 2. Listen to all active emergency blood requests
    const qRequests = query(collection(db, "requests"));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      const list: EmergencyRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EmergencyRequest);
      });
      
      // Sort: Searching (critical/high urgency first), then by date descending
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

    // 3. Listen to donation history for this user
    const qDonations = query(
      collection(db, "donations"),
      where("donorId", "==", currentUser.uid)
    );
    const unsubDonations = onSnapshot(qDonations, (snapshot) => {
      const list: DonationRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DonationRecord);
      });
      // Sort newest donation first
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDonationHistory(list);
    });

    // 4. Listen to notifications matching this user's UID
    const qNotifications = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid)
    );
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      const list: NotificationItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as NotificationItem);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubRequests();
      unsubDonations();
      unsubNotifications();
    };
  }, [currentUser?.uid]);

  // Computed metric: Profile Completion Percentage
  const profileCompletion = useMemo(() => {
    const fields = [
      currentUser.name,
      currentUser.email,
      currentUser.idCard,
      currentUser.department,
      currentUser.phone,
      currentUser.gender,
      currentUser.dob,
      currentUser.bloodGroup,
      currentUser.lastDonation,
      currentUser.role === "student" ? currentUser.year : true
    ];
    const completed = fields.filter(val => val !== undefined && val !== null && val !== "").length;
    return Math.round((completed / fields.length) * 100);
  }, [currentUser]);

  // Computed metric: Next eligibility calculation based on last donation date (90 days limit)
  const eligibilityInfo = useMemo(() => {
    if (!currentUser.lastDonation) {
      return { status: "Immediately Eligible", isEligible: true, remainingDays: 0, date: "Ready Now" };
    }
    const lastDate = new Date(currentUser.lastDonation);
    const nextEligible = new Date(lastDate);
    nextEligible.setDate(lastDate.getDate() + 90);
    const today = new Date();
    const diffTime = nextEligible.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { 
        status: "🟢 Safe & Eligible", 
        isEligible: true, 
        remainingDays: 0, 
        date: "Available" 
      };
    } else {
      return { 
        status: "🔴 Rest Period Active", 
        isEligible: false, 
        remainingDays: diffDays, 
        date: nextEligible.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) 
      };
    }
  }, [currentUser.lastDonation]);

  // Computed achievements stats
  const totalCompletedDonations = useMemo(() => {
    return donationHistory.filter(d => d.status === "completed").length;
  }, [donationHistory]);

  const livesSavedCount = useMemo(() => {
    return totalCompletedDonations * 3; // Standard statistic: 1 blood donation can save up to 3 lives!
  }, [totalCompletedDonations]);

  const rewardPoints = useMemo(() => {
    return (totalCompletedDonations * 150) + (profileCompletion >= 90 ? 100 : 50);
  }, [totalCompletedDonations, profileCompletion]);

  const donorLevel = useMemo(() => {
    if (totalCompletedDonations >= 8) return { level: "Vanguard Titan", rank: 4, icon: "💎" };
    if (totalCompletedDonations >= 4) return { level: "Platinum Sentinel", rank: 3, icon: "🛡️" };
    if (totalCompletedDonations >= 2) return { level: "Gold Guardian", rank: 2, icon: "⭐" };
    if (totalCompletedDonations >= 1) return { level: "Bronze Defender", rank: 1, icon: "✨" };
    return { level: "New Donor", rank: 0, icon: "🎗️" };
  }, [totalCompletedDonations]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => n.status === "unread").length;
  }, [notifications]);

  // Stable distance generator for hospital proximity layout
  const getProximityDistance = (hospitalName: string) => {
    let hash = 0;
    for (let i = 0; i < hospitalName.length; i++) {
      hash = hospitalName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const dist = (Math.abs(hash) % 4) + 0.8; // Stable distance between 0.8 km and 4.8 km
    return `${dist.toFixed(1)} km away`;
  };

  // Toggle Availability Status with Firestore sync
  const toggleAvailability = async () => {
    const nextVal = !currentUser.isAvailable;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { isAvailable: nextVal });
    } catch (error) {
      console.error("Error updating availability status:", error);
    }
  };

  // Profile Save Update Handler
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileName || !profilePhone || !profileDept) {
      alert("Please enter Name, Phone Number, and Department.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updatedProfile: any = {
        name: profileName,
        phone: profilePhone,
        department: profileDept,
        dob: profileDob || null,
        gender: profileGender || "Male",
        bloodGroup: profileBloodGroup,
        lastDonation: lastDonationDate || null,
      };

      if (currentUser.role === "student" && profileYear) {
        updatedProfile.year = profileYear;
      }

      // Sync Firestore profile
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

  // Respond/Accept Emergency Request Handler
  const handleRespondEmergency = async (req: EmergencyRequest) => {
    if (req.userId === currentUser.uid) {
      alert("You cannot respond to your own emergency request.");
      return;
    }

    const confirmAccept = confirm(
      `Respond to Emergency Alert? \n\nYou are committing to donate ${req.units} units of ${req.bloodGroup} at ${req.hospital}. Your name and contact phone will be matched with ${req.contactName}.`
    );
    if (!confirmAccept) return;

    try {
      const batch = writeBatch(db);

      // 1. Update Request state in DB
      const requestRef = doc(db, "requests", req.id);
      batch.update(requestRef, {
        status: "accepted",
        acceptedBy: currentUser.uid
      });

      // 2. Create automated donation history ledger entry
      const donationId = "don-" + Math.random().toString(36).substr(2, 9);
      const donationRef = doc(db, "donations", donationId);
      batch.set(donationRef, {
        id: donationId,
        requestId: req.id,
        donorId: currentUser.uid,
        bloodGroup: req.bloodGroup,
        units: req.units,
        date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        status: "completed" // Direct completed ledger entries for high responsiveness
      });

      // 3. Dispatch confirmation notification directly to patient contact person
      const notificationId = "notif-" + Math.random().toString(36).substr(2, 9);
      const notificationRef = doc(db, "notifications", notificationId);
      batch.set(notificationRef, {
        id: notificationId,
        userId: req.userId,
        requestId: req.id,
        title: `Donor Match Secured: ${currentUser.name} accepted your request`,
        message: `${currentUser.name} (${currentUser.bloodGroup}) is on the way! Contact phone: ${currentUser.phone}.`,
        bloodGroup: req.bloodGroup,
        hospital: req.hospital,
        location: req.location,
        patientName: req.patientName,
        urgency: req.urgency,
        status: "unread",
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      alert("Emergency match secured successfully! Re-routing navigation logs...");
    } catch (err) {
      console.error("Error responding to request:", err);
      alert("Failed to accept emergency. Please check your network.");
    }
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = async () => {
    const unreadList = notifications.filter(n => n.status === "unread");
    if (unreadList.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadList.forEach(n => {
        batch.update(doc(db, "notifications", n.id), { status: "read" });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marking alerts as read:", err);
    }
  };

  // Resolve user created request as Completed
  const handleCompleteOwnRequest = async (reqId: string) => {
    try {
      await updateDoc(doc(db, "requests", reqId), { status: "completed" });
      alert("Emergency Request marked as Completed! Safe healing to the patient.");
    } catch (err) {
      console.error("Error closing request:", err);
    }
  };

  // Cancel user created request
  const handleCancelOwnRequest = async (reqId: string) => {
    if (!confirm("Are you sure you want to cancel this emergency request?")) return;
    try {
      await updateDoc(doc(db, "requests", reqId), { status: "closed" });
      alert("Request canceled successfully.");
    } catch (err) {
      console.error("Error canceling request:", err);
    }
  };

  // Sidebar Menu List setup
  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "profile", label: "Profile", icon: User },
    { id: "requests", label: "Blood Requests", icon: FileText, badge: activeRequests.filter(r => r.userId === currentUser.uid && r.status === "searching").length },
    { id: "directory", label: "Donor Directory", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotificationsCount },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-navy-dark text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* ========================================================
          SIDEBAR LAYOUT
          ======================================================== */}
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-gray-950/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-display font-extrabold text-white text-base shadow shadow-red-600/30">
            S
          </div>
          <div>
            <span className="font-display font-black text-sm tracking-widest text-white">SURAKSHA</span>
            <span className="block text-[8px] font-mono tracking-wider text-red-500 uppercase leading-none">Campus Network</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadNotificationsCount > 0 && (
            <button onClick={() => setActiveTab("notifications")} className="relative p-1">
              <Bell className="w-4 h-4 text-gray-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
            </button>
          )}
          <button 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
            className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-300"
          >
            {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Desktop & Mobile Slide-out Sidebar Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-950/95 border-r border-white/5 backdrop-blur-md p-6 flex flex-col justify-between transition-transform duration-300 md:relative md:translate-x-0
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Upper Sidebar Brand & Navigation */}
        <div className="space-y-8">
          
          {/* Brand Logo */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-display font-black text-xl text-white shadow-lg shadow-red-600/30">
              S
            </div>
            <div>
              <span className="font-display text-base font-black tracking-widest text-white block">SURAKSHA</span>
              <span className="block text-[9px] font-mono tracking-widest text-red-500 uppercase leading-none">Emergency Network</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as SidebarTab);
                    setMobileSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer group
                    ${isActive 
                      ? "bg-red-600/10 text-red-500 border border-red-500/15" 
                      : "text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent"}
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-red-500" : "text-gray-400 group-hover:text-white"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-[9px] font-sans font-extrabold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {/* Optional Admin Link inside sidebar */}
            {currentUser.role === "admin" && (
              <a
                href="/admin"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-purple-400 hover:bg-purple-950/10 hover:text-purple-300 transition-all border border-transparent"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </a>
            )}
          </nav>
        </div>

        {/* Lower Sidebar Session Card */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div className="flex items-center gap-3 bg-white/[0.01] border border-white/5 p-2.5 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-red-600/10 text-red-500 font-display font-extrabold text-sm border border-red-500/20 flex items-center justify-center shrink-0">
              {currentUser.bloodGroup}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-white truncate leading-tight">{currentUser.name}</span>
              <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-widest leading-none truncate mt-0.5">
                {currentUser.role}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2.5 bg-white/5 hover:bg-red-600/10 border border-white/5 hover:border-red-500/20 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-gray-400 hover:text-red-500 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Background Dim Backdrop on Mobile Open */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* ========================================================
          MAIN SCREEN CONTENT WRAPPER
          ======================================================== */}
      <main className="flex-grow p-6 md:p-8 space-y-6 overflow-x-hidden">
        
        <AnimatePresence mode="wait">
          
          {/* ========================================================
              TAB 1: MAIN DASHBOARD OVERVIEW
              ======================================================== */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              
              {/* UPPER SECTION: Welcome & Quick Profiles */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* TOP WELCOME CARD (Lg grid col span 2) */}
                <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-r from-red-950/20 via-red-950/5 to-transparent border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                  {/* Neon radial highlights */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    
                    {/* User Profile Photo / Avatar circle with double ring */}
                    <div className="relative group shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-red-500 p-0.5 shadow-lg shadow-red-950/60">
                        <div className="w-full h-full rounded-full bg-navy-dark flex items-center justify-center font-display font-extrabold text-xl text-red-500 border border-white/5 uppercase">
                          {currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#030712] flex items-center justify-center" title="Systems Active">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h2 className="font-display text-xl font-black text-white tracking-tight leading-none">
                          Greetings, {currentUser.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-gray-400 uppercase font-bold tracking-wider">
                          {currentUser.role}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                        Department: <span className="text-slate-200 font-medium">{currentUser.department}</span> • ID: <span className="font-mono text-slate-300 font-semibold">{currentUser.idCard}</span>
                      </p>

                      {/* Profile Completion Index Progress */}
                      <div className="pt-2 max-w-xs space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-gray-400 uppercase tracking-widest font-bold">Profile Completeness</span>
                          <span className="text-red-400 font-bold">{profileCompletion}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500 rounded-full"
                            style={{ width: `${profileCompletion}%` }}
                          />
                        </div>
                        {profileCompletion < 90 && (
                          <button 
                            onClick={() => setActiveTab("profile")} 
                            className="text-[9px] font-mono text-red-400 hover:text-red-300 flex items-center gap-0.5 transition"
                          >
                            Add missing fields to complete profile <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats right-badge display */}
                  <div className="flex flex-col items-center sm:items-end justify-between self-stretch shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 flex flex-col items-center justify-center font-display font-black text-2xl shadow-inner relative group">
                      {currentUser.bloodGroup}
                      <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 bg-red-600 text-[8px] text-white font-mono rounded font-bold uppercase">Blood</span>
                    </div>
                    
                    <div className="mt-3 sm:mt-0 text-center sm:text-right">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Availability</span>
                      <span className={`text-xs font-bold ${currentUser.isAvailable ? "text-green-400" : "text-gray-400"}`}>
                        {currentUser.isAvailable ? "🟢 AVAILABLE" : "🔴 UNAVAILABLE"}
                      </span>
                    </div>
                  </div>

                </div>

                {/* AVAILABILITY CARD WITH GORGEOUS LARGE TOGGLE (Lg grid col span 1) */}
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-black text-white text-sm uppercase tracking-wider">Availability</h3>
                      <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Ready to donate?</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase ${eligibilityInfo.isEligible ? "bg-green-600/15 text-green-400" : "bg-red-600/15 text-red-400"}`}>
                      {eligibilityInfo.status}
                    </span>
                  </div>

                  {/* Availability Toggle controls */}
                  <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-100 block">Emergency Available</span>
                      <p className="text-[10px] text-gray-500">Toggle offline if feeling unwell</p>
                    </div>
                    
                    {/* Big iOS-style Toggle Slider */}
                    <button
                      onClick={toggleAvailability}
                      className={`w-14 h-7.5 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                        currentUser.isAvailable ? "bg-green-600" : "bg-white/5 border border-white/5"
                      }`}
                    >
                      <div
                        className={`bg-white w-5.5 h-5.5 rounded-full shadow-lg transform duration-300 ${
                          currentUser.isAvailable ? "translate-x-6.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bottom date readouts */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-white/5 pt-3.5">
                    <div>
                      <span className="text-gray-500 font-mono block uppercase text-[9px] tracking-wider">Last Donation</span>
                      <span className="text-slate-300 font-bold font-mono block mt-0.5">
                        {currentUser.lastDonation 
                          ? new Date(currentUser.lastDonation).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) 
                          : "None Logged"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-mono block uppercase text-[9px] tracking-wider">Next Eligible</span>
                      <span className="text-red-400 font-bold font-mono block mt-0.5">
                        {eligibilityInfo.date}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* QUICK ACTIONS HUB (4 modern cards) */}
              <div>
                <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-gray-400 mb-3.5">QUICK OPERATIONS HUB</h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Request Blood */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => { setActiveTab("requests"); setRequestPortalTab("create"); }}
                    className="p-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-red-500/20 transition-all duration-300 cursor-pointer space-y-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 border border-red-500/10 flex items-center justify-center transition-colors group-hover:bg-red-600 group-hover:text-white">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">Request Blood</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">Trigger a new campus-wide compatible alert</p>
                    </div>
                  </motion.div>

                  {/* Card 2: Find Donors */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => setActiveTab("directory")}
                    className="p-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-red-500/20 transition-all duration-300 cursor-pointer space-y-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 border border-red-500/10 flex items-center justify-center transition-colors group-hover:bg-red-600 group-hover:text-white">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">Find Donors</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">Search verified students & campus registry</p>
                    </div>
                  </motion.div>

                  {/* Card 3: Donation History */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => setActiveTab("profile")}
                    className="p-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-red-500/20 transition-all duration-300 cursor-pointer space-y-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 border border-red-500/10 flex items-center justify-center transition-colors group-hover:bg-red-600 group-hover:text-white">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">Donation History</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">View your logged completed blood ledger</p>
                    </div>
                  </motion.div>

                  {/* Card 4: My Requests */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => { setActiveTab("requests"); setRequestPortalTab("list"); }}
                    className="p-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-red-500/20 transition-all duration-300 cursor-pointer space-y-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 border border-red-500/10 flex items-center justify-center transition-colors group-hover:bg-red-600 group-hover:text-white">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">My Requests</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">Track active issues you launched previously</p>
                    </div>
                  </motion.div>

                </div>
              </div>

              {/* LOWER ROW: Live Alerts, History, Achievements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* NEARBY EMERGENCY REQUESTS (Lg grid col span 2) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h3 className="font-display font-black text-white text-base flex items-center gap-1.5">
                      <Heart className="w-4.5 h-4.5 text-red-500 animate-pulse fill-red-500" /> Nearby Emergency Requests
                    </h3>
                    <span className="text-[10px] font-mono text-red-400 font-bold">
                      {activeRequests.filter(r => r.status === 'searching').length} Critical Alerts
                    </span>
                  </div>

                  {activeRequests.length === 0 ? (
                    <div className="text-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl space-y-2">
                      <ShieldCheck className="w-8 h-8 text-green-400 mx-auto" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Campus Zone Secured</h4>
                      <p className="text-[10px] text-gray-400">No active blood matching requirements on radar.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                      {activeRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`p-5 rounded-2xl bg-white/[0.01] border transition duration-300 relative overflow-hidden ${
                            req.status !== "searching"
                              ? "border-white/5"
                              : req.urgency === "critical"
                              ? "border-red-500/40 hover:border-red-500/60 shadow-lg shadow-red-950/30"
                              : req.urgency === "high"
                              ? "border-orange-500/25 hover:border-orange-500/45"
                              : "border-red-500/15 hover:border-red-500/35 hover:bg-red-950/[0.01]"
                          }`}
                        >
                          {/* Left urgency rail: instant visual triage for critical requests */}
                          {req.status === "searching" && req.urgency === "critical" && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />
                          )}

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                            {/* Left part: group info */}
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-display font-black text-[11px] leading-tight shadow">
                                  {req.bloodGroup}
                                </span>
                                
                                <span className={`text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                  req.urgency === "critical" 
                                    ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                    : req.urgency === "high" 
                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20" 
                                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                }`}>
                                  {req.urgency} Urgency
                                </span>

                                <span className={`text-[9px] font-mono font-semibold uppercase ${
                                  req.status === "searching" ? "text-red-500 animate-pulse font-extrabold" : "text-blue-400"
                                }`}>
                                  {req.status === "searching" ? "• Active Matcher" : `• Status: ${req.status}`}
                                </span>

                                <span className="text-[10px] text-gray-500 font-mono">
                                  ({getProximityDistance(req.hospital)})
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-slate-100 pt-1">Patient: {req.patientName}</h4>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Hospital className="w-3.5 h-3.5 text-gray-500 shrink-0" /> 
                                <span>{req.hospital} <span className="text-gray-500">({req.location})</span></span>
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 font-mono pt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" /> Deadline: {req.requiredTime}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-slate-300">Units Needed: {req.units} Units</span>
                              </div>

                              {req.notes && (
                                <p className="text-[11px] italic text-gray-400 bg-white/[0.01] border-l border-red-500 pl-2 py-1 rounded mt-2">
                                  "{req.notes}"
                                </p>
                              )}
                            </div>

                            {/* Right action button */}
                            <div className="shrink-0 w-full sm:w-auto text-right">
                              {req.status === "searching" ? (
                                req.userId === currentUser.uid ? (
                                  <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">Your Request</span>
                                ) : (
                                  <button
                                    onClick={() => handleRespondEmergency(req)}
                                    className="w-full sm:w-auto py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-xl transition border border-red-500/20 cursor-pointer shadow shadow-red-950/60"
                                  >
                                    Respond Alert
                                  </button>
                                )
                              ) : (
                                <div className="text-[11px] font-mono font-bold uppercase text-blue-400">
                                  {req.status === "accepted" ? (
                                    <span className="flex items-center gap-1">
                                      <span>Matched 🤝</span>
                                      {req.acceptedBy === currentUser.uid && (
                                        <span className="bg-red-600/10 text-red-500 px-1 py-0.2 text-[9px] rounded font-bold">You Accepted</span>
                                      )}
                                    </span>
                                  ) : (
                                    "Completed 🎉"
                                  )}
                                </div>
                              )}
                            </div>

                          </div>

                          {/* Smart Match Panel Trigger */}
                          {req.status === "searching" && (
                            <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between">
                              <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                <span>Suraksha Matching Engine active</span>
                              </span>
                              <button
                                onClick={() => setExpandedMatches((prev) => ({ ...prev, [req.id]: !prev[req.id] }))}
                                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 text-gray-300 hover:text-red-400 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>{expandedMatches[req.id] ? "Hide Best Matches" : "Show Best Matches"}</span>
                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedMatches[req.id] ? "rotate-90" : ""}`} />
                              </button>
                            </div>
                          )}

                          {/* Expanded Smart Matches Panel */}
                          <AnimatePresence>
                            {expandedMatches[req.id] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <SmartMatchingPanel 
                                  request={req} 
                                  currentUser={currentUser} 
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ACHIEVEMENTS & LEDGER STATS (Lg grid col span 1) */}
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2">
                    <h3 className="font-display font-black text-white text-base flex items-center gap-1.5">
                      <Award className="w-4.5 h-4.5 text-red-500" /> Your Achievements
                    </h3>
                  </div>

                  {/* Level Banner */}
                  <div className="bg-gradient-to-r from-red-950/20 via-white/[0.01] to-transparent border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Donor Prestige Level</span>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{donorLevel.icon}</span>
                        <span>{donorLevel.level}</span>
                      </h4>
                      <p className="text-[10px] text-gray-400">Level {donorLevel.rank} active safety guardian</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Your Impact</span>
                      <span className="text-sm font-mono font-black text-red-500">{livesSavedCount} Lives Saved</span>
                    </div>
                  </div>

                  {/* Achievements Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Points Box */}
                    <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-xl text-center space-y-1">
                      <div className="w-7 h-7 bg-red-600/10 text-red-500 rounded-lg flex items-center justify-center mx-auto text-xs">
                        <Gift className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block font-bold">Reward Points</span>
                      <span className="text-base font-mono font-black text-white">{rewardPoints} pts</span>
                    </div>

                    {/* Donations count Box */}
                    <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-xl text-center space-y-1">
                      <div className="w-7 h-7 bg-red-600/10 text-red-500 rounded-lg flex items-center justify-center mx-auto text-xs">
                        <Heart className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block font-bold">Total Donations</span>
                      <span className="text-base font-mono font-black text-white">{totalCompletedDonations} Logged</span>
                    </div>

                  </div>

                  {/* Badge Ledger Icons Showcase */}
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-3">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Earned Badges</span>
                    
                    <div className="flex gap-3">
                      
                      {/* Badge 1: Sentinel */}
                      <div className="group relative">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-lg filter shadow cursor-help" title="Active Sentinel (Account Verified)">
                          🛡️
                        </div>
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-[9px] font-mono font-bold text-white px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                          Sentinel: Verified Account
                        </div>
                      </div>

                      {/* Badge 2: Defender (1+ donation) */}
                      <div className={`group relative ${totalCompletedDonations >= 1 ? "opacity-100" : "opacity-25 filter grayscale"}`}>
                        <div className="w-10 h-10 rounded-xl bg-orange-950/20 border border-orange-500/20 flex items-center justify-center text-lg shadow cursor-help" title="Bronze Defender (1+ completed donation)">
                          🎗️
                        </div>
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-[9px] font-mono font-bold text-white px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                          Bronze Defender (1+ logs)
                        </div>
                      </div>

                      {/* Badge 3: Guardian (3+ donations) */}
                      <div className={`group relative ${totalCompletedDonations >= 3 ? "opacity-100" : "opacity-25 filter grayscale"}`}>
                        <div className="w-10 h-10 rounded-xl bg-yellow-950/20 border border-yellow-500/20 flex items-center justify-center text-lg shadow cursor-help" title="Gold Guardian (3+ completed donations)">
                          ⭐
                        </div>
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-[9px] font-mono font-bold text-white px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                          Gold Guardian (3+ logs)
                        </div>
                      </div>

                      {/* Badge 4: Titan (5+ donations) */}
                      <div className={`group relative ${totalCompletedDonations >= 5 ? "opacity-100" : "opacity-25 filter grayscale"}`}>
                        <div className="w-10 h-10 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-center justify-center text-lg shadow cursor-help" title="Vanguard Titan (5+ completed donations)">
                          💎
                        </div>
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-[9px] font-mono font-bold text-white px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                          Vanguard Titan (5+ logs)
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

          {/* ========================================================
              TAB 2: USER PROFILE EDITOR
              ======================================================== */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="border-b border-white/5 pb-4 mb-6">
                  <h2 className="font-display text-xl font-black text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-red-500" /> Your Profile
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Keep your medical details, contact info, and campus ID up to date so donors and requesters can reach you fast.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Name */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Full Name *</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none transition"
                        required
                      />
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Email Address (Secure)</label>
                      <input
                        type="email"
                        value={currentUser.email}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-2 px-3 text-xs text-gray-500 focus:outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Primary Phone Number *</label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none transition font-mono"
                        required
                      />
                    </div>

                    {/* ID Card */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Campus Card ID (Read Only)</label>
                      <input
                        type="text"
                        value={currentUser.idCard}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-2 px-3 text-xs text-gray-500 focus:outline-none cursor-not-allowed font-mono"
                        disabled
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Department / Division *</label>
                      <input
                        type="text"
                        value={profileDept}
                        onChange={(e) => setProfileDept(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-600 focus:outline-none transition"
                        required
                      />
                    </div>

                    {/* Student Year (only if student) */}
                    {currentUser.role === "student" && (
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Academic Year (Required for Students)</label>
                        <select
                          value={profileYear}
                          onChange={(e) => setProfileYear(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition"
                        >
                          <option value="">Select Academic Year</option>
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                          <option value="Postgraduate">Postgraduate / Research</option>
                        </select>
                      </div>
                    )}

                    {/* Gender */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Gender Identification</label>
                      <select
                        value={profileGender}
                        onChange={(e) => setProfileGender(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* DOB */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Date of Birth</label>
                      <input
                        type="date"
                        value={profileDob}
                        onChange={(e) => setProfileDob(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition font-mono"
                      />
                    </div>

                    {/* Blood Group */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Blood Group *</label>
                      <select
                        value={profileBloodGroup}
                        onChange={(e) => setProfileBloodGroup(e.target.value as BloodGroup)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-red-500 font-bold focus:outline-none transition"
                        required
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>

                    {/* Last Donation Date */}
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Last Blood Donation Date</label>
                      <input
                        type="date"
                        value={lastDonationDate}
                        onChange={(e) => setLastDonationDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition font-mono"
                      />
                      <span className="text-[10px] text-gray-500 font-mono mt-1 block">Leave empty if you haven't donated yet.</span>
                    </div>

                  </div>

                  {/* Submission Row */}
                  <div className="border-t border-white/5 pt-5 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab("dashboard")}
                      className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.02] text-xs font-mono font-bold uppercase transition"
                    >
                      Cancel Sync
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition shadow-lg shadow-red-950/40"
                    >
                      {isUpdatingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>

              {/* DONATION LEDGER (Profile Subsection) */}
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6">
                <h3 className="font-display font-black text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Donation History
                </h3>
                
                {donationHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500 font-mono">
                    No active donation matches recorded. Earn points by accepting emergency requests!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {donationHistory.map((d) => (
                      <div key={d.id} className="p-4 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center text-xs">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-500 font-bold font-mono">
                            {d.bloodGroup}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono ml-2">ID: {d.id}</span>
                          <div className="text-slate-200 mt-1">Transferred {d.units} units of blood successfully.</div>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-mono font-semibold uppercase text-[9px]">
                            {d.status}
                          </span>
                          <div className="text-[10px] text-gray-500 font-mono">{d.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ========================================================
              TAB 3: BLOOD REQUEST MANAGER (My Requests & RequestPortal)
              ======================================================== */}
          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              
              {/* Inner Tabs for requests */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setRequestPortalTab("list")}
                  className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition ${
                    requestPortalTab === "list" 
                      ? "border-red-500 text-red-500" 
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  My Requests ({activeRequests.filter(r => r.userId === currentUser.uid).length})
                </button>
                <button
                  onClick={() => setRequestPortalTab("create")}
                  className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition ${
                    requestPortalTab === "create" 
                      ? "border-red-500 text-red-500" 
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  ⚠️ Dispatch Emergency Alert
                </button>
              </div>

              {requestPortalTab === "create" ? (
                <RequestPortal 
                  currentUser={currentUser} 
                  onSuccess={() => setRequestPortalTab("list")} 
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-black text-white text-base">Your Dispatched Emergencies</h3>
                      <p className="text-xs text-gray-400">Track and manage emergency requirements initiated by your account.</p>
                    </div>
                  </div>

                  {activeRequests.filter(r => r.userId === currentUser.uid).length === 0 ? (
                    <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl space-y-4">
                      <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-100 font-mono uppercase">No requests logged</h4>
                        <p className="text-xs text-gray-500">You haven't initiated any emergency requests yet.</p>
                      </div>
                      <button
                        onClick={() => setRequestPortalTab("create")}
                        className="py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase rounded-xl transition shadow"
                      >
                        Launch First Alert
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {activeRequests.filter(r => r.userId === currentUser.uid).map((req) => (
                        <div key={req.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-4">
                          
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-display font-black text-[10px]">
                                  {req.bloodGroup}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500">ID: {req.id}</span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                                  req.status === "searching" 
                                    ? "bg-red-500/10 text-red-400 animate-pulse" 
                                    : req.status === "accepted" 
                                    ? "bg-blue-500/10 text-blue-400" 
                                    : "bg-green-500/10 text-green-400"
                                }`}>
                                  {req.status}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-white">Patient: {req.patientName}</h4>
                              <p className="text-xs text-gray-400">{req.hospital} ({req.location}) • {req.units} units needed</p>
                              <p className="text-[10px] font-mono text-gray-500">Created At: {new Date(req.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                              {req.status === "searching" && (
                                <button
                                  onClick={() => handleCancelOwnRequest(req.id)}
                                  className="px-3 py-1.5 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-500 text-[10px] font-mono font-bold rounded-lg transition"
                                >
                                  Cancel Request
                                </button>
                              )}

                              {req.status === "accepted" && (
                                <>
                                  <button
                                    onClick={() => handleCancelOwnRequest(req.id)}
                                    className="px-3 py-1.5 border border-white/10 text-gray-400 hover:text-red-500 text-[10px] font-mono font-bold rounded-lg transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleCompleteOwnRequest(req.id)}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-mono font-bold rounded-lg transition"
                                  >
                                    Mark Completed ✔
                                  </button>
                                </>
                              )}

                              {req.status === "completed" && (
                                <span className="text-[10px] font-mono text-green-400 font-bold uppercase">Request Completed 🤝</span>
                              )}
                            </div>
                          </div>

                          {/* Smart Match Panel Trigger */}
                          {req.status === "searching" && (
                            <div className="pt-3.5 border-t border-white/5 flex items-center justify-between w-full">
                              <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                <span>Suraksha Matching Engine active</span>
                              </span>
                              <button
                                onClick={() => setExpandedMatches((prev) => ({ ...prev, [req.id]: !prev[req.id] }))}
                                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 text-gray-300 hover:text-red-400 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>{expandedMatches[req.id] ? "Hide Best Matches" : "Show Best Matches"}</span>
                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedMatches[req.id] ? "rotate-90" : ""}`} />
                              </button>
                            </div>
                          )}

                          {/* Expanded Smart Matches Panel */}
                          <AnimatePresence>
                            {expandedMatches[req.id] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden w-full"
                              >
                                <SmartMatchingPanel 
                                  request={req} 
                                  currentUser={currentUser} 
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}

          {/* ========================================================
              TAB 4: DONOR DIRECTORY (Render DonorDirectory)
              ======================================================== */}
          {activeTab === "directory" && (
            <motion.div
              key="directory"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <DonorDirectory />
            </motion.div>
          )}

          {/* ========================================================
              TAB 5: NOTIFICATION CENTER
              ======================================================== */}
          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="border-b border-white/5 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-black text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-red-500" /> Real-time Alert Notification Center
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Check matching broadcasts, secure contact revelations, and success ledger receipts.
                    </p>
                  </div>

                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-mono text-slate-300 rounded-lg transition"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-xs text-gray-500 font-mono">
                    No active notifications or matching logs in your mailbox.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-4 rounded-xl border text-xs transition relative overflow-hidden ${
                          notif.status === "unread" 
                            ? "bg-red-950/[0.02] border-red-500/25" 
                            : "bg-black/30 border-white/5"
                        }`}
                      >
                        {notif.status === "unread" && (
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-600" />
                        )}

                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-red-600/10 text-red-500 font-bold font-mono text-[9px]">
                                {notif.bloodGroup} Match
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(notif.createdAt).toLocaleTimeString()} • {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h4 className="text-sm font-bold text-slate-100">{notif.title}</h4>
                            <p className="text-xs text-slate-300">{notif.message}</p>
                            <p className="text-[10px] text-gray-500 font-mono">Facility: {notif.hospital} ({notif.location})</p>
                          </div>

                          {notif.status === "unread" && (
                            <button
                              onClick={() => {
                                updateDoc(doc(db, "notifications", notif.id), { status: "read" });
                              }}
                              className="px-2.5 py-1 rounded bg-white/5 text-[9px] font-mono text-gray-400 hover:text-white transition"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ========================================================
              TAB 6: APP SETTINGS PANEL
              ======================================================== */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="border-b border-white/5 pb-4 mb-6">
                  <h2 className="font-display text-xl font-black text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-red-500" /> Settings
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Manage your visibility, notification preferences, and account privacy.
                  </p>
                </div>

                <div className="space-y-6">
                  
                  {/* Subsection 1: Security Visibility */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 pb-1">Campus Directory Visibility</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-100">Campus Account Verification</span>
                        <p className="text-[10px] text-gray-500">Verified status is confirmed by campus administrators and controls your eligibility to appear as a matched donor</p>
                      </div>

                      {/* Read-only status badge: verification is admin-controlled, not user-editable */}
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase ${
                        currentUser.verified ? "bg-green-600/15 text-green-400" : "bg-yellow-600/15 text-yellow-500"
                      }`}>
                        {currentUser.verified ? "Verified" : "Pending Admin Verification"}
                      </span>
                    </div>
                  </div>

                  {/* Subsection 2: Notification Toggles */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 pb-1">Notification Preferences</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-200">Email Alerts Backup</span>
                          <p className="text-[10px] text-gray-500">Dispatch copies of emergency alerts directly to your mail inbox</p>
                        </div>
                        <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.2 rounded font-bold uppercase">Synced</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-200">SMS Notification Router</span>
                          <p className="text-[10px] text-gray-500">Send mobile SMS notifications during severe critical alert matching</p>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">Unconfigured</span>
                      </div>
                    </div>
                  </div>

                  {/* Subsection 3: Credentials Ledger */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 pb-1">Sandbox System Credentials</h3>
                    
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono text-gray-400">
                      <div><span className="text-slate-300">Auth Method:</span> Sandbox Credential Session</div>
                      <div><span className="text-slate-300">UID Signature:</span> <span className="text-red-400 select-all">{currentUser.uid}</span></div>
                      {currentUser._sandboxPassword && (
                        <div><span className="text-slate-300">Emergency Security Code:</span> <span className="text-slate-200 select-all">{currentUser._sandboxPassword}</span></div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

    </div>
  );
}

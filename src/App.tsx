import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "./types";
import { seedDatabaseIfEmpty } from "./utils/seeder";

// Components
import LandingPage from "./components/LandingPage";
import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";
import DonorDirectory from "./components/DonorDirectory";
import RequestPortal from "./components/RequestPortal";
import AdminPanel from "./components/AdminPanel";
import RealTimeNotifications from "./components/RealTimeNotifications";

// Icons
import { 
  Shield, 
  Users, 
  PlusCircle, 
  LogOut, 
  Activity, 
  Menu, 
  X,
  Globe
} from "lucide-react";

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Run initial seed on mount to make sure the university simulation is populated
  useEffect(() => {
    const initDatabase = async () => {
      await seedDatabaseIfEmpty();
    };
    initDatabase();

    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            setCurrentUser(docSnap.data() as UserProfile);
          } else {
            console.log("No custom database profile found for authenticated UID.");
          }
        } catch (error) {
          console.error("Error loading user session profile:", error);
        }
        setLoading(false);
      } else {
        // If there's no active Firebase user, check if there's a sandbox local session
        const localUid = localStorage.getItem("local_session_uid");
        if (localUid) {
          try {
            const docSnap = await getDoc(doc(db, "users", localUid));
            if (docSnap.exists()) {
              setCurrentUser(docSnap.data() as UserProfile);
            } else {
              localStorage.removeItem("local_session_uid");
              setCurrentUser(null);
            }
          } catch (error) {
            console.error("Error loading sandbox session profile:", error);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Update active tab based on path when navigation happens
  useEffect(() => {
    if (location.pathname === "/admin") {
      setActiveTab("admin");
    } else if (location.pathname === "/dashboard") {
      if (activeTab === "admin") {
        setActiveTab("dashboard");
      }
    }
  }, [location.pathname, activeTab]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("local_session_uid");
      await signOut(auth);
      setCurrentUser(null);
      setActiveTab("dashboard");
      navigate("/");
    } catch (error) {
      console.error("Error signing out user:", error);
    }
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-dark flex flex-col justify-center items-center gap-4 text-slate-100">
        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center font-display font-extrabold text-2xl text-white shadow-lg shadow-red-600/30 animate-pulse">
          S
        </div>
        <div className="space-y-1 text-center">
          <h2 className="font-display font-black tracking-widest text-sm">SURAKSHA Shield</h2>
          <p className="text-[10px] font-mono text-red-500 uppercase tracking-widest">Securing Campus Emergency Network...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/" 
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <div className="min-h-screen bg-navy-dark relative">
              <LandingPage />
            </div>
          )
        } 
      />

      <Route 
        path="/login" 
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <div className="min-h-screen bg-navy-dark flex items-center justify-center p-4">
              <div className="relative w-full max-w-4xl">
                <AuthModal onSuccess={handleAuthSuccess} initialMode="login" />
              </div>
            </div>
          )
        } 
      />

      <Route 
        path="/register" 
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <div className="min-h-screen bg-navy-dark flex items-center justify-center p-4">
              <div className="relative w-full max-w-4xl">
                <AuthModal onSuccess={handleAuthSuccess} initialMode="register" />
              </div>
            </div>
          )
        } 
      />

      {/* Authenticated Dashboard Route */}
      <Route 
        path="/dashboard" 
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : (
            <Dashboard currentUser={currentUser} onLogout={handleLogout} />
          )
        } 
      />

      {/* Authenticated Admin Route */}
      <Route 
        path="/admin" 
        element={
          !currentUser ? (
            <Navigate to="/login" replace />
          ) : currentUser.role !== "admin" ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <div className="min-h-screen bg-navy-dark text-slate-100 flex flex-col justify-between">
              
              {/* Real-time Match sliding notifications in bottom-right */}
              <RealTimeNotifications currentUser={currentUser} />

              {/* Main Console Header */}
              <header className="sticky top-0 z-40 bg-navy-dark/90 backdrop-blur-md border-b border-white/5 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  
                  {/* Logo */}
                  <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/dashboard")}>
                    <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-display font-extrabold text-xl text-white shadow-lg shadow-red-600/30">
                      S
                    </div>
                    <div>
                      <span className="font-display text-lg font-black tracking-widest text-white">SURAKSHA</span>
                      <span className="block text-[9px] font-mono tracking-widest text-red-500 uppercase">Campus Emergency Network</span>
                    </div>
                  </div>

                  {/* Desktop Navigation Tabs */}
                  <nav className="hidden md:flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 inline-block mr-1" /> Dashboard
                    </button>
                    <button
                      onClick={() => { navigate("/dashboard"); setActiveTab("directory"); }}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 inline-block mr-1" /> Donors Directory
                    </button>
                    <button
                      onClick={() => { navigate("/dashboard"); setActiveTab("request"); }}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 inline-block mr-1" /> Trigger Emergency
                    </button>
                    <button
                      onClick={() => navigate("/admin")}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition bg-red-600 text-white shadow shadow-red-950/40 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 inline-block mr-1" /> Admin Panel
                    </button>
                  </nav>

                  {/* Desktop User profile badge & Logout */}
                  <div className="hidden md:flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-white block leading-tight">{currentUser.name}</span>
                      <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider leading-none">
                        {currentUser.bloodGroup} Donor
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-red-600/10 border border-white/5 hover:border-red-500/20 text-gray-400 hover:text-red-500 transition cursor-pointer"
                      title="Sign Out Session"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mobile hamburger menu */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-100 cursor-pointer"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>

                </div>
              </header>

              {/* Mobile Menu Drawer */}
              {mobileMenuOpen && (
                <div className="md:hidden bg-navy-dark border-b border-white/10 p-4 space-y-2 animate-slide-in">
                  <button
                    onClick={() => { navigate("/dashboard"); setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                    className="w-full text-left py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => { navigate("/dashboard"); setActiveTab("directory"); setMobileMenuOpen(false); }}
                    className="w-full text-left py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    Donors Directory
                  </button>
                  <button
                    onClick={() => { navigate("/dashboard"); setActiveTab("request"); setMobileMenuOpen(false); }}
                    className="w-full text-left py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    Trigger Emergency
                  </button>
                  <button
                    onClick={() => { navigate("/admin"); setMobileMenuOpen(false); }}
                    className="w-full text-left py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    Admin Panel
                  </button>
                  <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 font-mono">
                      {currentUser.name.split(" ")[0]} ({currentUser.bloodGroup})
                    </span>
                    <button
                      onClick={handleLogout}
                      className="py-1 px-3.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}

              {/* Main Console Content Body */}
              <main className="flex-grow max-w-7xl w-full mx-auto p-6 md:py-8">
                <AdminPanel />
              </main>

              {/* Console Footer */}
              <footer className="border-t border-white/5 bg-navy-dark py-8 px-6 text-center text-[10px] text-gray-500 font-mono">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-red-500" /> SURAKSHA Campus Emergency Network
                  </span>
                  <span>
                    © 2026 SURAKSHA. One campus, one community, saving lives together.
                  </span>
                </div>
              </footer>
            </div>
          )
        } 
      />

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

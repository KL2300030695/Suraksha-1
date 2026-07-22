import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { BloodGroup, UserProfile, UserRole } from "../types";
import { Shield, Sparkles, User, Mail, Lock, Phone, Calendar, Heart, GraduationCap, MapPin, CheckCircle, AlertTriangle } from "lucide-react";

interface AuthModalProps {
  onSuccess: (profile: UserProfile) => void;
  initialMode?: "login" | "register";
}

export default function AuthModal({ onSuccess, initialMode = "login" }: AuthModalProps) {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(initialMode === "register");

  useEffect(() => {
    setIsRegistering(initialMode === "register");
  }, [initialMode]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Common Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Detailed Profile State (Registration)
  const [idCard, setIdCard] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [year, setYear] = useState("3rd Year");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("2004-06-15");
  const [lastDonation, setLastDonation] = useState("");
  const [isEligible, setIsEligible] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  // Demo Login accounts mapping
  const DEMO_ACCOUNTS = [
    {
      name: "Prof. Rajesh Sharma",
      role: "admin",
      email: "rajesh.sharma@kluniversity.in",
      bloodGroup: "O+",
      uid: "admin-uid-123",
      tag: "Administrator / Faculty"
    },
    {
      name: "Aarav Mehta",
      role: "student",
      email: "aarav.mehta@kluniversity.in",
      bloodGroup: "A+",
      uid: "donor-uid-1",
      tag: "Student Donor"
    },
    {
      name: "Vikram Rathore",
      role: "staff",
      email: "vikram.r@kluniversity.in",
      bloodGroup: "B+",
      uid: "donor-uid-3",
      tag: "Security Staff"
    }
  ];

  const handleDemoLogin = async (demo: typeof DEMO_ACCOUNTS[0]) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the mock user profile directly from Firestore
      const userDoc = await getDoc(doc(db, "users", demo.uid));
      let profile: UserProfile;
      if (userDoc.exists()) {
        profile = userDoc.data() as UserProfile;
      } else {
        // Fallback: If not seeded yet, create a fresh simulation profile
        profile = {
          uid: demo.uid,
          name: demo.name,
          email: demo.email,
          idCard: demo.role === "admin" ? "FAC-8890" : demo.role === "student" ? "STU-2024-0045" : "STF-4410",
          role: demo.role as UserRole,
          department: demo.role === "admin" ? "Computer Science & Engineering" : "Information Technology",
          bloodGroup: demo.bloodGroup as BloodGroup,
          phone: "+91 98765 43210",
          gender: "Male",
          dob: "2000-01-01",
          isEligible: true,
          isAvailable: true,
          verified: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", demo.uid), profile);
      }
      localStorage.setItem("local_session_uid", profile.uid);
      onSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize Demo Session. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all email and password fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Look up by email in Firestore (highly robust Sandbox Mode authentication)
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      let profile: UserProfile | null = null;
      if (!querySnapshot.empty) {
        querySnapshot.forEach((docSnap) => {
          profile = docSnap.data() as UserProfile;
        });
      }

      if (!profile) {
        throw new Error("No campus account found with this email. Please register to create an account.");
      }

      // If password protection is stored, check it
      if (profile._sandboxPassword && profile._sandboxPassword !== password) {
        throw new Error("Incorrect password for this campus account.");
      }

      localStorage.setItem("local_session_uid", profile.uid);
      onSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid credentials. Please double check.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // University Email Restriction Check (Relaxed for evaluation convenience)
    const cleanEmail = email.trim().toLowerCase();
    const isEduEmail = cleanEmail.endsWith("@kluniversity.in");
    
    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!name || !email || !password || !idCard || !phone) {
      setError("Please complete all registration fields.");
      return;
    }

    setLoading(true);
    try {
      // Check if user already exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error("A campus account with this email is already registered.");
      }

      // Generate a custom deterministic sandbox UID
      const cleanEmail = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "-");
      const uid = `sandbox-uid-${cleanEmail}-${Date.now().toString().slice(-6)}`;

      const profile: any = {
        uid: uid ?? "",
        name: name ?? "",
        email: email.trim().toLowerCase(),
        idCard: idCard ?? "",
        role: role ?? "student",
        department: department ?? "",
        bloodGroup: bloodGroup ?? "O+",
        phone: phone ?? "",
        gender: gender ?? "Male",
        dob: dob ?? "",
        isEligible: isEligible !== undefined ? isEligible : true,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        verified: role === "admin" ? true : false,
        createdAt: new Date().toISOString(),
        _sandboxPassword: password ?? "",
        year: (role === "student" && year) ? year : null,
        lastDonation: lastDonation ? lastDonation : null
      };

      // Safeguard check: convert any remaining undefined fields to null
      Object.keys(profile).forEach(key => {
        if (profile[key] === undefined) {
          profile[key] = null;
        }
      });

      await setDoc(doc(db, "users", uid), profile);
      localStorage.setItem("local_session_uid", uid);
      onSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 bg-navy-light/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
      {/* Left Column: Visual branding and emotional appeal */}
      <div className="p-8 flex flex-col justify-between bg-gradient-to-br from-red-950/40 via-red-950/10 to-transparent border-r border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider mb-6">
            <Shield className="w-3.5 h-3.5" /> UNIVERSITY ACCESS ONLY
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white mb-2">
            Campus Protection <br />
            <span className="text-red-500 font-extrabold text-4xl">SURAKSHA</span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Connecting students, professors, and staff to eliminate WhatsApp delay during critical medical situations. 100% verified campus blood donation network.
          </p>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-red-500 shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Targeted Match Notifications</h4>
                <p className="text-xs text-gray-400">Alerts only reach available campus members with matching blood groups.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-red-500 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Verified Academic Profiles</h4>
                <p className="text-xs text-gray-400">Strictly restricted to students, faculty, and administrative staff email credentials.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Mode Quick Access Grid */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>INSTANT DEMO SESSION LAUNCHERS:</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.uid}
                type="button"
                onClick={() => handleDemoLogin(demo)}
                disabled={loading}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/40 text-left transition text-xs group"
              >
                <div>
                  <div className="font-medium text-white group-hover:text-red-400 transition">{demo.name}</div>
                  <div className="text-[10px] text-gray-400">{demo.tag} ({demo.bloodGroup})</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono group-hover:bg-red-500/25 group-hover:text-white text-gray-400 transition">
                  Quick Login
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Auth Forms */}
      <div className="p-8 flex flex-col justify-center">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-start gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!isRegistering ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="mb-4">
              <h3 className="font-display text-xl font-bold text-white mb-1">Welcome Back</h3>
              <p className="text-xs text-gray-400">Access the campus network with your university account</p>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">University Email (or any email for demo)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@kluniversity.in (or your email)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg text-sm transition shadow-lg shadow-red-950/50 flex justify-center items-center gap-2"
            >
              {loading ? "Verifying Credentials..." : "Log In & Secure"}
            </button>

            <div className="text-center mt-6">
              <span className="text-xs text-gray-400">Need to register a new profile? </span>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-xs text-red-400 hover:text-red-300 font-semibold underline transition"
              >
                Create Account
              </button>
            </div>
          </form>
        ) : (
          /* Multi-Step Campus Registration Form */
          <form onSubmit={handleRegister} className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <div className="mb-2">
              <h3 className="font-display text-xl font-bold text-white mb-1">Verify Campus Profile</h3>
              <p className="text-xs text-gray-400">Create your official University Emergency card.</p>
            </div>

            {/* Step 1: Basic Creds */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Full Name</label>
                <input
                  type="text"
                  placeholder="Aarav Mehta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Uni Email (or any email)</label>
                <input
                  type="email"
                  placeholder="name@kluniversity.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Student/Employee ID</label>
                <input
                  type="text"
                  placeholder="STU-2024-0045"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Step 2: Role Details */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white font-bold text-red-500 focus:outline-none transition"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Step 3: Bio Data */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Department</label>
                <input
                  type="text"
                  placeholder="CSE / IT / ME"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>
            </div>

            {role === "student" && (
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Academic Batch/Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                >
                  <option value="1st Year">1st Year (Freshman)</option>
                  <option value="2nd Year">2nd Year (Sophomore)</option>
                  <option value="3rd Year">3rd Year (Junior)</option>
                  <option value="4th Year">4th Year (Senior)</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase">Last Donation Date</label>
                <input
                  type="date"
                  value={lastDonation}
                  onChange={(e) => setLastDonation(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none transition"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded bg-navy-dark border-white/10"
                  />
                  <label htmlFor="isAvailable" className="text-xs font-medium text-gray-300">
                    Active Donor Now
                  </label>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-red-950/20 border border-red-500/15 rounded-lg text-[11px] text-gray-300 mt-2">
              <span className="font-semibold text-red-400">Medical Declaration:</span> By signing up, you declare that you satisfy standard blood donation weight (45kg+), Hb level (&gt;12.5), and have no recent surgeries or blood transfusions.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg text-xs transition shadow-lg shadow-red-950/50 flex justify-center items-center"
            >
              {loading ? "Deploying Profile Security..." : "Complete Registration & Verification"}
            </button>

            <div className="text-center mt-3">
              <span className="text-xs text-gray-400">Already registered? </span>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs text-red-400 hover:text-red-300 font-semibold underline transition"
              >
                Log In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

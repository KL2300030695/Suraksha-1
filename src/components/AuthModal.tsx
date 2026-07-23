import { useState, useEffect, FormEvent, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { BloodGroup, UserProfile, UserRole } from "../types";
import { Shield, Sparkles, User, Mail, Lock, Phone, Calendar, Heart, GraduationCap, CheckCircle, AlertTriangle, Eye, EyeOff, ArrowLeft, ArrowRight, Check } from "lucide-react";

interface AuthModalProps {
  onSuccess: (profile: UserProfile) => void;
  initialMode?: "login" | "register";
}

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const REGISTER_STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Profile" },
  { id: 3, label: "Health" },
] as const;

export default function AuthModal({ onSuccess, initialMode = "login" }: AuthModalProps) {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(initialMode === "register");
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setIsRegistering(initialMode === "register");
    setRegStep(1);
  }, [initialMode]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  // Per-step validation so a stressed or first-time user gets focused, immediate feedback
  // instead of a wall of errors after filling out the entire form.
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      const cleanEmail = email.trim().toLowerCase();
      if (!name || !cleanEmail || !password || !idCard) {
        setError("Please complete your name, email, password, and ID card number.");
        return false;
      }
      if (!cleanEmail.includes("@")) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (password.length < 6) {
        setError("Password should be at least 6 characters.");
        return false;
      }
    }
    if (step === 2) {
      if (!phone || !department) {
        setError("Please complete your phone number and department.");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const goToNextStep = (e: MouseEvent) => {
    // Defensively block any native submit activation — React can reuse this same
    // DOM button node for the step-3 submit button, and the browser resolves a
    // click's default action against the post-render element, not the one clicked.
    e.preventDefault();
    if (validateStep(regStep)) {
      setRegStep((s) => (Math.min(3, s + 1) as 1 | 2 | 3));
    }
  };

  const goToPrevStep = () => {
    setError(null);
    setRegStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3));
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

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
      const uidEmail = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "-");
      const uid = `sandbox-uid-${uidEmail}-${Date.now().toString().slice(-6)}`;

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

  const inputClass = "w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none transition";

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
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-1">Verify Campus Profile</h3>
              <p className="text-xs text-gray-400">Create your official University Emergency card in three quick steps.</p>
            </div>

            {/* Step Progress Indicator */}
            <div className="flex items-center gap-2">
              {REGISTER_STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border-2 transition-colors ${
                      regStep === step.id
                        ? "bg-red-600 border-red-500 text-white"
                        : regStep > step.id
                        ? "bg-red-600/20 border-red-500/50 text-red-400"
                        : "bg-transparent border-white/10 text-gray-500"
                    }`}>
                      {regStep > step.id ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${regStep === step.id ? "text-red-400 font-bold" : "text-gray-500"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < REGISTER_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 mb-4 rounded transition-colors ${regStep > step.id ? "bg-red-500/50" : "bg-white/10"}`} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleRegister} className="space-y-4">

              {/* STEP 1: Account essentials */}
              {regStep === 1 && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="Aarav Mehta"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">University Email</label>
                    <input
                      type="email"
                      placeholder="name@kluniversity.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                    <span className="text-[9px] text-gray-500 mt-1 block">Never shown publicly — only visible to you.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClass} pr-9`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-500 hover:text-gray-300 transition"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Student/Employee ID</label>
                      <input
                        type="text"
                        placeholder="STU-2024-0045"
                        value={idCard}
                        onChange={(e) => setIdCard(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Role, blood group, contact */}
              {regStep === 2 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className={inputClass}
                      >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 XXXXX XXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Blood Group</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BLOOD_GROUPS.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setBloodGroup(bg)}
                          className={`py-2 rounded-lg border font-display font-extrabold text-xs transition ${
                            bloodGroup === bg
                              ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-950/35"
                              : "bg-navy-dark/60 text-gray-400 border-white/5 hover:border-white/10"
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="CSE / IT / ME"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  {role === "student" && (
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Academic Batch/Year</label>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className={inputClass}
                      >
                        <option value="1st Year">1st Year (Freshman)</option>
                        <option value="2nd Year">2nd Year (Sophomore)</option>
                        <option value="3rd Year">3rd Year (Junior)</option>
                        <option value="4th Year">4th Year (Senior)</option>
                        <option value="Postgraduate">Postgraduate</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Health & availability */}
              {regStep === 3 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className={inputClass}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Last Donation Date (optional)</label>
                    <input
                      type="date"
                      value={lastDonation}
                      onChange={(e) => setLastDonation(e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-[9px] text-gray-500 mt-1 block">Leave empty if you haven't donated yet — we'll track your 90-day eligibility automatically.</span>
                  </div>

                  <label className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="w-4 h-4 accent-red-600 rounded bg-navy-dark border-white/10"
                    />
                    <div>
                      <span className="text-xs font-medium text-gray-200 block">I'm available to donate right now</span>
                      <span className="text-[10px] text-gray-500">You can toggle this anytime from your dashboard.</span>
                    </div>
                  </label>

                  <div className="p-2.5 bg-red-950/20 border border-red-500/15 rounded-lg text-[11px] text-gray-300">
                    <span className="font-semibold text-red-400 flex items-center gap-1 mb-0.5">
                      <Heart className="w-3 h-3" /> Medical Declaration
                    </span>
                    By signing up, you declare that you satisfy standard blood donation weight (45kg+), Hb level (&gt;12.5), and have no recent surgeries or blood transfusions.
                  </div>
                </div>
              )}

              {/* Step navigation footer */}
              <div className="flex items-center gap-3 pt-1">
                {regStep > 1 && (
                  <button
                    type="button"
                    onClick={goToPrevStep}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-mono font-bold transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                )}

                {regStep < 3 ? (
                  <button
                    key="continue-btn"
                    type="button"
                    onClick={goToNextStep}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition shadow-lg shadow-red-950/50"
                  >
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    key="submit-btn"
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition shadow-lg shadow-red-950/50 flex justify-center items-center gap-2"
                  >
                    {loading ? "Deploying Profile Security..." : "Complete Registration"}
                  </button>
                )}
              </div>
            </form>

            <div className="text-center pt-1">
              <span className="text-xs text-gray-400">Already registered? </span>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs text-red-400 hover:text-red-300 font-semibold underline transition"
              >
                Log In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

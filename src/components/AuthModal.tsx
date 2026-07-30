import { useState, useEffect, FormEvent, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { BloodGroup, UserProfile, UserRole } from "../types";
import { Droplet, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Check, AlertTriangle, ShieldCheck } from "lucide-react";

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
  const [isEligible] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
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
        throw new Error("No campus account found with this email. Please create an account first.");
      }

      if (profile._sandboxPassword && profile._sandboxPassword !== password) {
        throw new Error("Incorrect password. Please try again.");
      }

      localStorage.setItem("local_session_uid", profile.uid);
      onSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Per-step validation so a new user gets focused feedback instead of a
  // wall of errors after filling out the whole form.
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      const cleanEmail = email.trim().toLowerCase();
      if (!name || !cleanEmail || !password || !idCard) {
        setError("Please complete your name, email, password, and ID.");
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
    // Block any native submit — React can reuse this same DOM button node for
    // the step-3 submit button; the browser resolves default action against the
    // post-render element, not the one clicked.
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
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error("An account with this email already exists.");
      }

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
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5";
  const inputClass = "w-full bg-white/[0.03] border border-white/10 focus:border-red-500/60 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition";
  const selectClass = "w-full bg-white/[0.03] border border-white/10 focus:border-red-500/60 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none transition";

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand */}
      <div className="flex flex-col items-center text-center mb-7">
        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-950/40 mb-4">
          <Droplet className="w-6 h-6 text-white fill-white/90" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white tracking-tight">Suraksha</h1>
        <p className="text-sm text-gray-500 mt-1">Campus Emergency Blood Network</p>
      </div>

      {/* Card */}
      <div className="bg-navy-light/40 border border-white/10 rounded-2xl p-6 sm:p-7">
        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!isRegistering ? (
          /* ---------------- LOGIN ---------------- */
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-0.5">Log in to your campus account.</p>
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="you@kluniversity.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} pl-10`}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-gray-300 transition"
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
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition"
            >
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>
        ) : (
          /* ---------------- REGISTRATION ---------------- */
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Create your account</h2>
              <p className="text-sm text-gray-500 mt-0.5">Join the campus network in three quick steps.</p>
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-2">
              {REGISTER_STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border transition-colors ${
                      regStep === step.id
                        ? "bg-red-600 border-red-500 text-white"
                        : regStep > step.id
                        ? "bg-red-600/15 border-red-500/40 text-red-400"
                        : "bg-transparent border-white/10 text-gray-600"
                    }`}>
                      {regStep > step.id ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <span className={`text-[10px] ${regStep === step.id ? "text-gray-300 font-medium" : "text-gray-600"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < REGISTER_STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 mb-4 transition-colors ${regStep > step.id ? "bg-red-500/40" : "bg-white/10"}`} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* STEP 1 */}
              {regStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input type="text" placeholder="Aarav Mehta" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
                  </div>
                  <div>
                    <label className={labelClass}>University email</label>
                    <input type="email" placeholder="you@kluniversity.in" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Password</label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder="Min 6 chars" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-9`} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition" tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Student / Staff ID</label>
                      <input type="text" placeholder="STU-2024-0045" value={idCard} onChange={(e) => setIdCard(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {regStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Role</label>
                      <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={selectClass}>
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input type="text" placeholder="+91 XXXXX XXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Blood group</label>
                    <div className="grid grid-cols-4 gap-2">
                      {BLOOD_GROUPS.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setBloodGroup(bg)}
                          className={`py-2 rounded-lg border font-display font-bold text-sm transition ${
                            bloodGroup === bg
                              ? "bg-red-600 text-white border-red-500"
                              : "bg-white/[0.03] text-gray-400 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Department</label>
                    <input type="text" placeholder="Computer Science & Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
                  </div>

                  {role === "student" && (
                    <div>
                      <label className={labelClass}>Academic year</label>
                      <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Postgraduate">Postgraduate</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3 */}
              {regStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Gender</label>
                      <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Date of birth</label>
                      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={selectClass} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Last donation date <span className="text-gray-600">(optional)</span></label>
                    <input type="date" value={lastDonation} onChange={(e) => setLastDonation(e.target.value)} className={selectClass} />
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                    <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-4 h-4 accent-red-600 rounded" />
                    <div>
                      <span className="text-sm text-gray-200 block">I'm available to donate</span>
                      <span className="text-xs text-gray-500">You can change this anytime.</span>
                    </div>
                  </label>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    By registering, you confirm you meet standard donation criteria (45kg+, healthy Hb, no recent surgery or transfusion).
                  </p>
                </div>
              )}

              {/* Step navigation */}
              <div className="flex items-center gap-3 pt-1">
                {regStep > 1 && (
                  <button
                    type="button"
                    onClick={goToPrevStep}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}

                {regStep < 3 ? (
                  <button
                    key="continue-btn"
                    type="button"
                    onClick={goToNextStep}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    key="submit-btn"
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition"
                  >
                    {loading ? "Creating account…" : "Create account"}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Switch mode */}
      <p className="text-center text-sm text-gray-500 mt-5">
        {!isRegistering ? (
          <>New to Suraksha?{" "}
            <button onClick={() => navigate("/register")} className="text-red-400 hover:text-red-300 font-medium transition">
              Create an account
            </button>
          </>
        ) : (
          <>Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-red-400 hover:text-red-300 font-medium transition">
              Log in
            </button>
          </>
        )}
      </p>

      {/* Trust line */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600 mt-4">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Secure access · Verified KL University members only</span>
      </div>
    </div>
  );
}

import { useState, useEffect, FormEvent, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { BloodGroup, UserProfile, UserRole } from "../types";
import { Droplet, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Check, AlertTriangle, ShieldCheck, MailCheck } from "lucide-react";

// Turn Firebase Auth error codes into friendly, human messages.
function authErrorMessage(err: any): string {
  const code = err?.code as string | undefined;
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Password is too weak — please use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in isn't enabled yet. Please contact the campus admin.";
    default:
      return err?.message || "Something went wrong. Please try again.";
  }
}

interface AuthModalProps {
  onSuccess: (profile: UserProfile) => void;
  initialMode?: "login" | "register";
}

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Suraksha is exclusive to KL University — only official university emails are accepted.
const UNIVERSITY_DOMAIN = "@kluniversity.in";
const isUniversityEmail = (email: string) => email.trim().toLowerCase().endsWith(UNIVERSITY_DOMAIN);

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
    setView("login");
    setResetSent(false);
    setRegisteredProfile(null);
    setError(null);
  }, [initialMode]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login screen sub-view: normal login vs. forgot-password reset.
  const [view, setView] = useState<"login" | "reset">("login");
  const [resetSent, setResetSent] = useState(false);
  // After a successful registration we show a "verify your email" confirmation
  // instead of dropping the user straight into the app.
  const [registeredProfile, setRegisteredProfile] = useState<UserProfile | null>(null);

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
    if (!isUniversityEmail(email)) {
      setError(`Please use your university email (ending in ${UNIVERSITY_DOMAIN}).`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

      // Load the matching campus profile stored under the Auth UID.
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) {
        throw new Error("We couldn't find your campus profile. Please contact the admin.");
      }
      onSuccess(snap.data() as UserProfile);
    } catch (err: any) {
      console.error(err);
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Forgot-password: send the reset email through the Brevo serverless endpoint,
  // falling back to Firebase's own email if that endpoint isn't available (e.g. local dev).
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!isUniversityEmail(clean)) {
      setError(`Please enter your university email (ending in ${UNIVERSITY_DOMAIN}).`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      }).catch(() => null);

      if (resp && resp.ok) {
        setResetSent(true);
      } else if (resp && resp.status !== 404) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Could not send the reset email.");
      } else {
        // Endpoint unavailable (local dev / offline) — use Firebase's built-in email.
        await sendPasswordResetEmail(auth, clean);
        setResetSent(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(authErrorMessage(err));
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
      if (!isUniversityEmail(cleanEmail)) {
        setError(`Only KL University emails (${UNIVERSITY_DOMAIN}) are allowed.`);
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
    if (!isUniversityEmail(cleanEmail)) {
      setError(`Only KL University emails (${UNIVERSITY_DOMAIN}) are allowed.`);
      return;
    }
    if (!name || !email || !password || !idCard || !phone) {
      setError("Please complete all registration fields.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create the real Firebase Auth account (password is hashed by Firebase).
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      // 2. Send the verification email through the Brevo endpoint, falling back to
      // Firebase's own email if the endpoint isn't available (e.g. local dev).
      try {
        const resp = await fetch("/api/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        }).catch(() => null);
        if (!resp || !resp.ok) {
          await sendEmailVerification(cred.user);
        }
      } catch (verifyErr) {
        // Non-fatal: the account exists; they can re-request verification later.
        console.error("Could not send verification email:", verifyErr);
      }

      // 3. Store the campus profile in Firestore, keyed by the Auth UID.
      const uid = cred.user.uid;
      const profile: any = {
        uid,
        name,
        email: cleanEmail,
        idCard,
        role,
        department,
        bloodGroup,
        phone,
        gender,
        dob: dob || null,
        isEligible: isEligible !== undefined ? isEligible : true,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        verified: role === "admin",
        createdAt: new Date().toISOString(),
        year: (role === "student" && year) ? year : null,
        lastDonation: lastDonation || null,
      };

      Object.keys(profile).forEach((key) => {
        if (profile[key] === undefined) profile[key] = null;
      });

      await setDoc(doc(db, "users", uid), profile);

      // 4. Show the "verify your email" confirmation before entering the app.
      setRegisteredProfile(profile as UserProfile);
    } catch (err: any) {
      console.error(err);
      setError(authErrorMessage(err));
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

        {registeredProfile ? (
          /* ---------------- EMAIL VERIFICATION NOTICE ---------------- */
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-2xl bg-green-600/15 border border-green-500/30 flex items-center justify-center mx-auto">
              <MailCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">Verify your email</h2>
              <p className="text-sm text-gray-500 mt-1">
                We've sent a verification link to{" "}
                <span className="text-gray-300 font-medium">{registeredProfile.email}</span>. Please confirm it to secure your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSuccess(registeredProfile)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition"
            >
              Continue to dashboard
            </button>
            <p className="text-xs text-gray-600">
              Didn't get it? Check your spam folder — the link can take a minute to arrive.
            </p>
          </div>
        ) : !isRegistering ? (
          view === "reset" ? (
            /* ---------------- FORGOT PASSWORD ---------------- */
            resetSent ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-2xl bg-green-600/15 border border-green-500/30 flex items-center justify-center mx-auto">
                  <MailCheck className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">Check your email</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    If an account exists for{" "}
                    <span className="text-gray-300 font-medium">{email.trim().toLowerCase()}</span>, a password reset link is on its way.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setView("login"); setResetSent(false); setError(null); }}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold py-2.5 px-4 rounded-xl text-sm transition"
                >
                  Back to log in
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">Reset your password</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Enter your university email and we'll send a reset link.</p>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setView("login"); setError(null); }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition"
                >
                  Back to log in
                </button>
              </form>
            )
          ) : (
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

            <button
              type="button"
              onClick={() => { setView("reset"); setResetSent(false); setError(null); }}
              className="w-full text-center text-sm text-gray-500 hover:text-red-400 transition"
            >
              Forgot password?
            </button>
          </form>
          )
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
                    <p className="text-[11px] text-gray-600 mt-1.5">Only official {UNIVERSITY_DOMAIN} emails are accepted.</p>
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
      {!registeredProfile && view === "login" && (
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
      )}

      {/* Trust line */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600 mt-4">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Secure access · Verified KL University members only</span>
      </div>
    </div>
  );
}

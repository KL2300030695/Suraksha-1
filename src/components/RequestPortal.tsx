import { useState, useEffect, FormEvent } from "react";
import { collection, addDoc, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import { EmergencyRequest, BloodGroup, UrgencyLevel, UserProfile } from "../types";
import { AlertCircle, PlusCircle, CheckCircle, Search, Sparkles, Heart, Clock, Building, User } from "lucide-react";

interface RequestPortalProps {
  currentUser: UserProfile;
  onSuccess: () => void;
}

export default function RequestPortal({ currentUser, onSuccess }: RequestPortalProps) {
  const [patientName, setPatientName] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O-");
  const [hospital, setHospital] = useState("");
  const [location, setLocation] = useState("");
  const [units, setUnits] = useState(2);
  const [contactName, setContactName] = useState(currentUser.name);
  const [contactPhone, setContactPhone] = useState(currentUser.phone);
  const [urgency, setUrgency] = useState<UrgencyLevel>("high");
  const [requiredTime, setRequiredTime] = useState("Within 4 Hours");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [matchingCount, setMatchingCount] = useState(0);

  // Blood group compatibility dictionary: Returns list of compatible donor groups for a given recipient group
  const getCompatibleDonors = (recipientBG: BloodGroup): BloodGroup[] => {
    switch (recipientBG) {
      case "O-": return ["O-"];
      case "O+": return ["O-", "O+"];
      case "A-": return ["O-", "A-"];
      case "A+": return ["O-", "O+", "A-", "A+"];
      case "B-": return ["O-", "B-"];
      case "B+": return ["O-", "O+", "B-", "B+"];
      case "AB-": return ["O-", "A-", "B-", "AB-"];
      case "AB+": return ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
      default: return [];
    }
  };

  // Live matching feedback as user configures the form
  const calculateMatchingDonors = async () => {
    try {
      const compatibleGroups = getCompatibleDonors(bloodGroup);
      
      const q = query(
        collection(db, "users"),
        where("isAvailable", "==", true),
        where("isEligible", "==", true)
      );

      const snapshot = await getDocs(q);
      let count = 0;
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (compatibleGroups.includes(u.bloodGroup) && u.uid !== currentUser.uid) {
          count++;
        }
      });
      setMatchingCount(count);
    } catch (error) {
      console.error("Error calculating donor matches:", error);
    }
  };

  useEffect(() => {
    calculateMatchingDonors();
  }, [bloodGroup]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientName || !hospital || !location || !contactName || !contactPhone) {
      alert("Please fill in all mandatory fields.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create request record
      const requestId = "req-" + Math.random().toString(36).substr(2, 9);
      const newRequest: EmergencyRequest = {
        id: requestId,
        userId: currentUser.uid,
        patientName,
        bloodGroup,
        hospital,
        location,
        units,
        contactName,
        contactPhone,
        urgency,
        requiredTime,
        notes: notes || undefined,
        status: "searching",
        createdAt: new Date().toISOString()
      };

      const batch = writeBatch(db);

      // Save request document
      const requestRef = doc(db, "requests", requestId);
      batch.set(requestRef, newRequest);

      // 2. Locate active compatible matching donors
      const compatibleGroups = getCompatibleDonors(bloodGroup);
      const q = query(
        collection(db, "users"),
        where("isAvailable", "==", true),
        where("isEligible", "==", true)
      );
      
      const snapshot = await getDocs(q);
      const matchingDonors: UserProfile[] = [];
      
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (compatibleGroups.includes(u.bloodGroup) && u.uid !== currentUser.uid) {
          matchingDonors.push(u);
        }
      });

      // 3. Dispatch targeted real-time push notification docs to matched donors
      matchingDonors.forEach((donor) => {
        const notificationId = "notif-" + Math.random().toString(36).substr(2, 9);
        const notificationRef = doc(db, "notifications", notificationId);
        
        batch.set(notificationRef, {
          id: notificationId,
          userId: donor.uid,
          requestId: requestId,
          title: `URGENT MATCH: ${bloodGroup} needed at ${hospital}`,
          message: `Patient ${patientName} requires ${units} units of ${bloodGroup} blood immediately.`,
          bloodGroup,
          hospital,
          location,
          patientName,
          urgency,
          status: "unread",
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error("Error creating emergency request pipeline:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-navy-light/20 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Background visual highlight */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {success ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-scale-up">
          <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center border border-red-400/25 shadow-lg shadow-red-600/30">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="font-display text-2xl font-black text-white">Emergency broadcast live!</h3>
          <p className="text-sm text-gray-400 max-w-md">
            Suraksha smart engine has dispatched real-time alert notifications directly to the dashboards of the <span className="text-red-500 font-bold font-mono">{matchingCount} matching available donors</span>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h2 className="font-display text-2xl font-black text-white flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-red-500" /> Dispatch Emergency Request
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Trigger the targeted alert system to find matched compatible blood donors inside our university campus instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Blood Type Selection with smart indicator */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">Requested Blood Group *</label>
              <div className="grid grid-cols-4 gap-2">
                {(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as BloodGroup[]).map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBloodGroup(bg)}
                    className={`py-2 rounded-lg border font-display font-extrabold text-sm transition ${
                      bloodGroup === bg
                        ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-950/35"
                        : "bg-navy-dark/60 text-gray-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
              
              {/* Smart Match Feedback Banner */}
              <div className="p-3 bg-red-950/20 border border-red-500/15 rounded-xl text-xs flex items-center gap-2.5 mt-2">
                <Sparkles className="w-4 h-4 text-red-500 shrink-0" />
                <span>
                  Smart Match: Compatible donor groups: <span className="font-mono text-red-400 font-bold">{getCompatibleDonors(bloodGroup).join(", ")}</span>. <br />
                  <span className="text-[11px] text-gray-400">Located <span className="text-green-400 font-semibold font-mono">{matchingCount} active available donors</span> on campus right now.</span>
                </span>
              </div>
            </div>

            {/* Patients and Unit details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Patient Name *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Sanjay Das (Student's Father)"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Units Required *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={units}
                    onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                    className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white focus:outline-none transition font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Required Time *</label>
                  <select
                    value={requiredTime}
                    onChange={(e) => setRequiredTime(e.target.value)}
                    className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white focus:outline-none transition"
                  >
                    <option value="Immediately (Within 1 Hr)">Immediately (Within 1 Hr)</option>
                    <option value="Within 2 Hours">Within 2 Hours</option>
                    <option value="Within 4 Hours">Within 4 Hours</option>
                    <option value="By Tonight">By Tonight</option>
                    <option value="Within 24 Hours">Within 24 Hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Hospital & Location Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Hospital Name *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Building className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="City Metro Superspeciality Hospital"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Location / Address *</label>
                <input
                  type="text"
                  placeholder="Block C, Metro Junction (3km from Campus)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Primary Contacts */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Contact Person Name *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Phone Number *</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white focus:outline-none transition font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Urgency selection */}
            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Urgency Level *</label>
              <div className="grid grid-cols-3 gap-2">
                {(["medium", "high", "critical"] as UrgencyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`py-2 px-1 rounded-lg border text-xs font-mono font-bold capitalize transition ${
                      urgency === level
                        ? level === "critical"
                          ? "bg-red-600 text-white border-red-500 shadow-md"
                          : level === "high"
                          ? "bg-orange-600 text-white border-orange-500 shadow-md"
                          : "bg-yellow-600 text-white border-yellow-500 shadow-md"
                        : "bg-navy-dark/60 text-gray-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-1.5">Additional Emergency Notes</label>
              <textarea
                placeholder="Details of surgery, bypass requirements, doctor reference number or ward information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none transition resize-none"
              />
            </div>
          </div>

          <div className="p-3.5 bg-yellow-950/20 border border-yellow-500/10 rounded-xl text-xs text-gray-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold text-white">Emergency Honor Guard:</span> Falsifying blood donation requests is a severe academic infraction. Trigger this system strictly for genuine university-related emergencies.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg shadow-red-950/60 flex items-center justify-center gap-2"
          >
            {loading ? "Activating Smart Matching Pipeline..." : "Dispatch Emergency Request Alert"}
          </button>
        </form>
      )}
    </div>
  );
}

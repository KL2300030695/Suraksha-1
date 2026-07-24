import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, EmergencyRequest, BloodGroup, DonationRecord } from "../types";
import { Sparkles, Heart, Clock, Building, User, Phone, CheckCircle, RefreshCw, Award, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SmartMatchingPanelProps {
  request: EmergencyRequest;
  currentUser: UserProfile;
  onUpdate?: () => void;
}

export default function SmartMatchingPanel({ request, currentUser, onUpdate }: SmartMatchingPanelProps) {
  const [matchingDonors, setMatchingDonors] = useState<{
    donor: UserProfile;
    score: number;
    reasons: string[];
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [revealedContacts, setRevealedContacts] = useState<Record<string, boolean>>({});

  // Compatibility function
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

  const loadBestMatches = async () => {
    setLoading(true);
    try {
      const compatibleGroups = getCompatibleDonors(request.bloodGroup);
      
      // Efficient query: Get users of compatible blood groups who are verified
      const usersQuery = query(
        collection(db, "users"),
        where("verified", "==", true)
      );

      const [usersSnapshot, donationsSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(collection(db, "donations"))
      ]);

      const allDonations: DonationRecord[] = [];
      donationsSnapshot.forEach((docSnap) => {
        allDonations.push({ id: docSnap.id, ...docSnap.data() } as DonationRecord);
      });

      const list: { donor: UserProfile; score: number; reasons: string[] }[] = [];

      usersSnapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        
        // Exclude the patient/requester themselves from matches
        if (u.uid === request.userId) return;

        // Verify compatibility
        if (!compatibleGroups.includes(u.bloodGroup)) return;

        // Calculate custom match score (0-100%)
        let score = 0;
        const reasons: string[] = [];

        // 1. Blood Group Compatibility (Max 40 points)
        const isExact = u.bloodGroup === request.bloodGroup;
        if (isExact) {
          score += 40;
          reasons.push("Exact antigen blood group match (+40%)");
        } else {
          score += 30;
          reasons.push("Universal/compatible blood group match (+30%)");
        }

        // 2. Availability Status (Max 20 points)
        if (u.isAvailable) {
          score += 20;
          reasons.push("Marked as Available for emergency dispatch (+20%)");
        } else {
          score += 5;
          reasons.push("Currently on recovery/sabbatical (+5%)");
        }

        // 3. Donation Eligibility (90-day rule) (Max 15 points)
        let isEligible = true;
        if (u.lastDonation) {
          const lastDate = new Date(u.lastDonation);
          const nextEligible = new Date(lastDate);
          nextEligible.setDate(lastDate.getDate() + 90);
          const today = new Date();
          const diffTime = nextEligible.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            isEligible = false;
          }
        }
        if (isEligible && u.isEligible !== false) {
          score += 15;
          reasons.push("Fully eligible & passed the 90-day rest period (+15%)");
        } else {
          score += 0;
          reasons.push("Under active 90-day medical recovery rest period (0%)");
        }

        // 4. Department Affinity (Max 10 points)
        // Check if matching requester department if we have it
        if (u.department && request.contactName) {
          // We can approximate or boost if department matches
          const deptMatch = u.department.toLowerCase() === currentUser.department.toLowerCase();
          if (deptMatch) {
            score += 10;
            reasons.push(`Shared Department Affinity: ${u.department} (+10%)`);
          }
        }

        // 5. Role Affinity & Mobility (Max 10 points)
        if (u.role === "student") {
          score += 5;
          reasons.push("Student status: highly responsive on-campus mobile reserve (+5%)");
        }
        if (u.role === currentUser.role) {
          score += 5;
          reasons.push(`Shared Role Affinity: both are ${u.role}s (+5%)`);
        }

        // 6. Recent Activity / Reliable experience (Max 5 points)
        const completedCount = allDonations.filter(
          (d) => d.donorId === u.uid && d.status === "completed"
        ).length;

        if (completedCount >= 3) {
          score += 5;
          reasons.push(`Highly Active Hero: ${completedCount} successful donations (+5%)`);
        } else if (completedCount >= 1) {
          score += 3;
          reasons.push(`Active Donor: ${completedCount} verified donation recorded (+3%)`);
        }

        list.push({ donor: u, score, reasons });
      });

      // Sort matches: highest score first, then by name
      list.sort((a, b) => b.score - a.score || a.donor.name.localeCompare(b.donor.name));

      // Slice the top 5 matches
      setMatchingDonors(list.slice(0, 5));
    } catch (error) {
      console.error("Error running Smart Matching Engine:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBestMatches();
  }, [request.id, request.status]);

  const handleRespond = async (donor: UserProfile) => {
    if (request.status !== "searching") return;

    setRespondingId(donor.uid);
    try {
      const batch = writeBatch(db);

      // 1. Update Request state in DB
      const requestRef = doc(db, "requests", request.id);
      batch.update(requestRef, {
        status: "accepted",
        acceptedBy: donor.uid
      });

      // 2. Dispatch notification/alert to target donor
      const notificationId = "notif-" + Math.random().toString(36).substr(2, 9);
      const notificationRef = doc(db, "notifications", notificationId);
      
      batch.set(notificationRef, {
        id: notificationId,
        userId: donor.uid,
        requestId: request.id,
        title: `MATCH COMMITTED: Request Accepted!`,
        message: `You have been selected as the primary responder for patient ${request.patientName} at ${request.hospital}. Please proceed.`,
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        location: request.location,
        patientName: request.patientName,
        urgency: request.urgency,
        status: "unread",
        createdAt: new Date().toISOString()
      });

      await batch.commit();

      if (onUpdate) {
        onUpdate();
      }
      
      // Re-trigger load to refresh UI
      await loadBestMatches();
    } catch (error) {
      console.error("Error response matching assignment:", error);
    } finally {
      setRespondingId(null);
    }
  };

  const toggleContact = (uid: string) => {
    setRevealedContacts((prev) => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  return (
    <div className="mt-4 p-5 rounded-2xl bg-navy-light/80 border border-red-500/10 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-red-600/10 text-red-500 rounded-lg">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider">
              Suraksha AI Smart Matching Engine
            </h4>
            <p className="text-[10px] text-gray-400">
              Real-time scoring across compatibilities, availability, 90-day rest rules, department, and activity.
            </p>
          </div>
        </div>
        <button
          onClick={loadBestMatches}
          disabled={loading}
          className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
          title="Re-run matching engine"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-red-500" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-mono text-gray-500">Recalculating donor affinity indexes...</p>
        </div>
      ) : matchingDonors.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-gray-500 font-mono">
          No matching eligible donors detected on campus.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest flex justify-between">
            <span>Ranked Compatible Matches (Top 5 Best)</span>
            <span className="text-red-400 font-bold">Match score</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            <AnimatePresence>
              {matchingDonors.map(({ donor, score, reasons }, index) => {
                const initials = donor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const isCurrentUserDonor = currentUser.uid === donor.uid;
                const isRequestAccepted = request.status === "accepted" || request.status === "completed";
                const isThisDonorAccepted = request.acceptedBy === donor.uid;

                return (
                  <motion.div
                    key={donor.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                    className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      isThisDonorAccepted
                        ? "bg-green-950/20 border-green-500/30"
                        : "bg-navy-dark/40 hover:bg-navy-dark/60 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {/* Background number rank badge */}
                    <div className="absolute top-1 right-2 text-[24px] font-black font-display text-white/5 select-none pointer-events-none">
                      #{index + 1}
                    </div>

                    {/* Left: Donor profile details */}
                    <div className="flex items-center gap-3.5">
                      {/* Photo/Avatar Representation */}
                      <div className="relative shrink-0">
                        <div className={`w-11 h-11 rounded-full p-0.5 shadow-md ${
                          score >= 80 
                            ? "bg-gradient-to-tr from-red-600 to-orange-500" 
                            : "bg-gradient-to-tr from-slate-700 to-slate-500"
                        }`}>
                          <div className="w-full h-full rounded-full bg-navy-dark flex items-center justify-center font-display font-extrabold text-xs text-red-400 border border-white/5">
                            {initials}
                          </div>
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-navy-dark flex items-center justify-center ${
                          donor.isAvailable ? "bg-green-500" : "bg-gray-500"
                        }`} title={donor.isAvailable ? "Available" : "Unavailable"}>
                          <span className={`w-1 h-1 rounded-full bg-white ${donor.isAvailable ? "animate-ping" : ""}`} />
                        </div>
                      </div>

                      {/* Info text */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white leading-tight">
                            {donor.name}
                          </span>
                          {isCurrentUserDonor && (
                            <span className="px-1.5 py-0.2 bg-red-600 text-[8px] font-mono font-black rounded uppercase text-white">
                              You
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 bg-red-600/10 text-red-500 font-display font-black text-[10px] rounded">
                            {donor.bloodGroup}
                          </span>
                        </div>

                        <p className="text-[10px] text-gray-400">
                          Dept: <span className="text-slate-300 font-medium">{donor.department}</span> • Role: <span className="text-slate-300 capitalize">{donor.role}</span>
                        </p>

                        <div className="flex items-center gap-x-2 text-[10px] text-gray-500 font-mono">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-gray-500 shrink-0" /> Last Donated:{" "}
                            <span className="font-bold text-slate-400">
                              {donor.lastDonation
                                ? new Date(donor.lastDonation).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "None Logged"}
                            </span>
                          </span>
                        </div>

                        {/* Expandable score matching rationale */}
                        <div className="pt-1.5 flex flex-wrap gap-1">
                          {reasons.slice(0, 2).map((reason, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 bg-white/[0.02] border border-white/5 rounded text-[8px] font-mono text-gray-400"
                            >
                              {reason.split(" (+")[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Score indicator and Respond button */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-3 w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 shrink-0">
                      
                      {/* Match Score Badge */}
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider leading-none">
                          Affinity Match
                        </div>
                        <div className={`text-base font-mono font-black mt-0.5 ${
                          score >= 80 ? "text-red-500" : score >= 60 ? "text-orange-400" : "text-yellow-500"
                        }`}>
                          {score}%
                        </div>
                      </div>

                      {/* Action response trigger */}
                      <div>
                        {isThisDonorAccepted ? (
                          <div className="flex items-center gap-1 text-[10px] font-mono font-extrabold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Matches Secured 🤝
                          </div>
                        ) : isRequestAccepted ? (
                          <div className="text-[9px] font-mono text-gray-500 uppercase font-bold">
                            Allocated / Resolved
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRespond(donor)}
                            disabled={respondingId !== null}
                            className={`px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-mono text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center gap-1 cursor-pointer shadow-md shadow-red-950/40`}
                          >
                            {respondingId === donor.uid ? (
                              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            <span>Respond</span>
                          </button>
                        )}
                      </div>

                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, BloodGroup } from "../types";
import { Search, MapPin, Phone, Mail, Check, Calendar, AlertCircle, RefreshCw, Eye, Heart, BadgeCheck } from "lucide-react";

export default function DonorDirectory() {
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>("ALL");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("ALL");
  const [revealedContacts, setRevealedContacts] = useState<Record<string, boolean>>({});

  const bloodGroups: (BloodGroup | "ALL")[] = ["ALL", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const fetchDonors = async () => {
    setLoading(true);
    try {
      // Fetch verified donors who aren't admins
      const q = query(
        collection(db, "users"),
        where("role", "!=", "admin")
      );
      const snapshot = await getDocs(q);
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      
      // Sort: Available donors first, then by name
      list.sort((a, b) => {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        return a.name.localeCompare(b.name);
      });

      setDonors(list);
      setFilteredDonors(list);
    } catch (error) {
      console.error("Error fetching campus donors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  useEffect(() => {
    let result = donors;

    // Filter by Search Term (Name, Department, ID Card, Phone)
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.department.toLowerCase().includes(term) ||
          (d.year && d.year.toLowerCase().includes(term))
      );
    }

    // Filter by Blood Group
    if (selectedBloodGroup !== "ALL") {
      result = result.filter((d) => d.bloodGroup === selectedBloodGroup);
    }

    // Filter by Availability
    if (selectedAvailability !== "ALL") {
      const isAvail = selectedAvailability === "available";
      result = result.filter((d) => d.isAvailable === isAvail);
    }

    setFilteredDonors(result);
  }, [searchTerm, selectedBloodGroup, selectedAvailability, donors]);

  const toggleContact = (uid: string) => {
    setRevealedContacts((prev) => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-navy-light/20 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" /> Verify Campus Donor Directory
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Search active university students, faculty and staff. Direct contact should strictly be reserved for medical emergencies.
          </p>
        </div>
        <button 
          onClick={fetchDonors}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-Sync Roster
        </button>
      </div>

      {/* Advanced Filter Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-navy-light/40 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
        {/* Term Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by Name, Department, Year..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition"
          />
        </div>

        {/* Blood Type Selection */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono text-gray-400 shrink-0 uppercase">BLOOD TYPE:</label>
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-red-500 font-bold focus:outline-none transition"
          >
            {bloodGroups.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        {/* Availability Select */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono text-gray-400 shrink-0 uppercase">STATUS:</label>
          <select
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
            className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white focus:outline-none transition"
          >
            <option value="ALL">Show All Roster</option>
            <option value="available">🟢 Available Donors Only</option>
            <option value="unavailable">🔴 On Recovery/Sabbatical</option>
          </select>
        </div>
      </div>

      {/* Roster Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-xs font-mono text-gray-400">Querying verified university records...</p>
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="text-center py-16 bg-navy-light/10 border border-dashed border-white/10 rounded-xl space-y-2">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h4 className="text-sm font-semibold text-white">No Matching Campus Donors</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Try adjusting your search query or selecting 'Show All Roster' to locate available members.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor) => (
            <div 
              key={donor.uid}
              className={`p-5 rounded-2xl bg-navy-light/30 border transition duration-300 flex flex-col justify-between ${
                donor.isAvailable 
                  ? "border-green-500/20 hover:border-green-500/40 hover:bg-green-500/[0.01]" 
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              <div>
                {/* Header: Name, Avatar, Blood Group */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {/* Circle Initial Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-extrabold text-sm border shadow-md ${
                      donor.isAvailable 
                        ? "bg-green-950/40 text-green-400 border-green-500/30" 
                        : "bg-navy-dark border-white/10 text-gray-400"
                    }`}>
                      {donor.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5 leading-snug">
                        {donor.name}
                        {donor.verified && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-[8px] font-mono font-bold uppercase tracking-wide shrink-0">
                            <BadgeCheck className="w-2.5 h-2.5" /> Verified
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium capitalize">
                        {donor.role} • {donor.department}
                      </p>
                      {donor.year && (
                        <p className="text-[10px] text-red-400 font-mono">{donor.year}</p>
                      )}
                    </div>
                  </div>

                  {/* Blood Group Badge */}
                  <span className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 flex flex-col items-center justify-center shrink-0">
                    <span className="font-display font-black text-sm leading-tight">{donor.bloodGroup}</span>
                  </span>
                </div>

                {/* Body Details */}
                <div className="space-y-1.5 border-t border-white/5 pt-3 my-3 text-[11px] text-gray-400">
                  <div className="flex justify-between">
                    <span>Availability Status:</span>
                    <span className={`font-mono font-bold ${donor.isAvailable ? 'text-green-400' : 'text-gray-500'}`}>
                      {donor.isAvailable ? "🟢 ACTIVE & AVAILABLE" : "🔴 NOT AVAILABLE"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medical Eligibility:</span>
                    <span className={`font-medium ${donor.isEligible ? 'text-green-400' : 'text-red-400'}`}>
                      {donor.isEligible ? "Safe to Donate" : "Not Eligible"}
                    </span>
                  </div>
                  {donor.lastDonation && (
                    <div className="flex justify-between">
                      <span>Last Blood Donation:</span>
                      <span className="text-slate-300 font-mono">{donor.lastDonation}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Campus ID Card:</span>
                    <span className="text-slate-300 font-mono">{donor.idCard}</span>
                  </div>
                </div>
              </div>

              {/* Action: Reveal contact info for emergency */}
              <div className="mt-2 pt-3 border-t border-white/5">
                {revealedContacts[donor.uid] ? (
                  <div className="bg-navy-dark/85 p-2.5 rounded-xl border border-white/10 space-y-1.5 animate-slide-in text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <Phone className="w-3.5 h-3.5 text-red-500" />
                      <a href={`tel:${donor.phone}`} className="hover:underline font-mono font-bold">{donor.phone}</a>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200 overflow-hidden">
                      <Mail className="w-3.5 h-3.5 text-red-500" />
                      <a href={`mailto:${donor.email}`} className="hover:underline text-[10px] truncate">{donor.email}</a>
                    </div>
                    <button
                      onClick={() => toggleContact(donor.uid)}
                      className="w-full text-center text-[10px] font-mono text-gray-500 hover:text-white transition mt-1 pt-1 border-t border-white/5"
                    >
                      Hide Details
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleContact(donor.uid)}
                    className="w-full py-1.5 bg-white/5 hover:bg-red-600/15 border border-white/10 hover:border-red-500/30 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-gray-300 hover:text-red-400 transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Request Emergency Contact
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

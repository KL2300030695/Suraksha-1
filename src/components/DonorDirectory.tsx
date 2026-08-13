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

  const cardBase = "bg-white border border-gray-100 rounded-2xl shadow-sm";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`${cardBase} p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3`}>
        <div>
          <h2 className="font-display text-xl font-black text-gray-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Campus Donor Directory
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Search active university students, faculty and staff. Contact should be reserved for medical emergencies.
          </p>
        </div>
        <button onClick={fetchDonors} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${cardBase} p-4`}>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, department, year..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 focus:border-red-400 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition"
          />
        </div>
        <select
          value={selectedBloodGroup}
          onChange={(e) => setSelectedBloodGroup(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 focus:border-red-400 rounded-xl py-2.5 px-3 text-sm text-red-600 font-bold focus:outline-none transition"
        >
          {bloodGroups.map((bg) => (
            <option key={bg} value={bg}>{bg === "ALL" ? "All blood types" : bg}</option>
          ))}
        </select>
        <select
          value={selectedAvailability}
          onChange={(e) => setSelectedAvailability(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 focus:border-red-400 rounded-xl py-2.5 px-3 text-sm text-gray-900 focus:outline-none transition"
        >
          <option value="ALL">All members</option>
          <option value="available">Available donors only</option>
          <option value="unavailable">Currently unavailable</option>
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-xs text-gray-500">Loading verified campus donors…</p>
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className={`text-center py-16 ${cardBase} space-y-2`}>
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h4 className="text-sm font-semibold text-gray-900">No matching donors</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">Try adjusting your search or selecting 'All members'.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor) => (
            <div
              key={donor.uid}
              className={`${cardBase} p-5 flex flex-col justify-between transition ${donor.isAvailable ? "hover:border-green-200" : "hover:border-gray-200"}`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-display font-extrabold text-sm ${
                      donor.isAvailable ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500"
                    }`}>
                      {donor.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 leading-snug">
                        {donor.name}
                        {donor.verified && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[8px] font-bold uppercase tracking-wide shrink-0">
                            <BadgeCheck className="w-2.5 h-2.5" /> Verified
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium capitalize">{donor.role} • {donor.department}</p>
                      {donor.year && <p className="text-[10px] text-red-500 font-semibold">{donor.year}</p>}
                    </div>
                  </div>
                  <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 font-display font-black text-sm">
                    {donor.bloodGroup}
                  </span>
                </div>

                <div className="space-y-1.5 border-t border-gray-100 pt-3 my-3 text-[11px] text-gray-500">
                  <div className="flex justify-between">
                    <span>Availability</span>
                    <span className={`font-bold ${donor.isAvailable ? "text-green-600" : "text-gray-400"}`}>
                      {donor.isAvailable ? "Active & available" : "Unavailable"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eligibility</span>
                    <span className={`font-semibold ${donor.isEligible ? "text-green-600" : "text-red-500"}`}>
                      {donor.isEligible ? "Safe to donate" : "Not eligible"}
                    </span>
                  </div>
                  {donor.lastDonation && (
                    <div className="flex justify-between">
                      <span>Last donation</span>
                      <span className="text-gray-700">{donor.lastDonation}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Campus ID</span>
                    <span className="text-gray-700 font-mono">{donor.idCard}</span>
                  </div>
                </div>
              </div>

              <div className="mt-1 pt-3 border-t border-gray-100">
                {revealedContacts[donor.uid] ? (
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-3.5 h-3.5 text-red-500" />
                      <a href={`tel:${donor.phone}`} className="hover:underline font-semibold">{donor.phone}</a>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 overflow-hidden">
                      <Mail className="w-3.5 h-3.5 text-red-500" />
                      <a href={`mailto:${donor.email}`} className="hover:underline text-[11px] truncate">{donor.email}</a>
                    </div>
                    <button onClick={() => toggleContact(donor.uid)} className="w-full text-center text-[10px] font-semibold text-gray-400 hover:text-gray-700 transition mt-1 pt-1 border-t border-gray-100">
                      Hide details
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleContact(donor.uid)}
                    className="w-full py-2 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl text-[11px] font-semibold text-gray-600 hover:text-red-600 transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Request emergency contact
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

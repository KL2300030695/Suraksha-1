import { useState, useEffect, FormEvent } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, EmergencyRequest, DonationRecord, AnnouncementItem, BloodGroup } from "../types";
import { Users, Award, Shield, FileText, Check, Trash2, Megaphone, BarChart3, HelpCircle, Activity, Sparkles, RefreshCw } from "lucide-react";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "requests" | "announcements" | "stats">("stats");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Announcement Form State
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, "users"));
      const uList: UserProfile[] = [];
      usersSnap.forEach((docSnap) => {
        uList.push(docSnap.data() as UserProfile);
      });
      setUsers(uList);

      // 2. Fetch Requests
      const requestsSnap = await getDocs(collection(db, "requests"));
      const rList: EmergencyRequest[] = [];
      requestsSnap.forEach((docSnap) => {
        rList.push(docSnap.data() as EmergencyRequest);
      });
      setRequests(rList);

      // 3. Fetch Announcements
      const announcementsSnap = await getDocs(collection(db, "announcements"));
      const aList: AnnouncementItem[] = [];
      announcementsSnap.forEach((docSnap) => {
        aList.push(docSnap.data() as AnnouncementItem);
      });
      aList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAnnouncements(aList);

    } catch (error) {
      console.error("Error fetching admin statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { verified: true });
      setUsers((prev) => prev.map((u) => u.uid === userId ? { ...u, verified: true } : u));
    } catch (error) {
      console.error("Error verifying user profile:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you absolutely sure you want to remove this account from the campus network? This action is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.uid !== userId));
    } catch (error) {
      console.error("Error deleting user profile:", error);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, newStatus: any) => {
    try {
      await updateDoc(doc(db, "requests", requestId), { status: newStatus });
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch (error) {
      console.error("Error updating emergency request:", error);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm("Delete this emergency blood request record?")) return;
    try {
      await deleteDoc(doc(db, "requests", requestId));
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Error deleting blood request:", error);
    }
  };

  const handleCreateAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle || !newAnnContent) return;

    try {
      const id = "ann-" + Math.random().toString(36).substr(2, 9);
      const newAnn: AnnouncementItem = {
        id,
        title: newAnnTitle,
        content: newAnnContent,
        createdAt: new Date().toISOString(),
        author: "System Administrator"
      };

      await addDoc(collection(db, "announcements"), newAnn);
      setAnnouncements((prev) => [newAnn, ...prev]);
      setNewAnnTitle("");
      setNewAnnContent("");
      alert("Announcement posted successfully!");
    } catch (error) {
      console.error("Error publishing announcement:", error);
    }
  };

  // Stats Calculations
  const totalMembers = users.length;
  const activeDonors = users.filter((u) => u.isAvailable && u.isEligible).length;
  const resolvedEmergency = requests.filter((r) => r.status === "completed" || r.status === "closed").length;
  const pendingMatching = requests.filter((r) => r.status === "searching" || r.status === "accepted").length;

  // Inventory distribution: representing percentage safety levels based on donor roster counts
  const getBloodGroupCount = (group: BloodGroup) => {
    return users.filter((u) => u.bloodGroup === group && u.isAvailable && u.isEligible).length;
  };

  const bloodGroups: BloodGroup[] = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

  // Generate printable status report
  const generateReport = () => {
    let report = `=== SURAKSHA EMERGENCY NETWORK STATUS REPORT ===\n`;
    report += `Date generated: ${new Date().toLocaleString()}\n`;
    report += `-------------------------------------------------\n`;
    report += `Total Verified Campus Members: ${totalMembers}\n`;
    report += `Active Available Donors Roster: ${activeDonors}\n`;
    report += `Resolved Campus Emergencies: ${resolvedEmergency}\n`;
    report += `-------------------------------------------------\n`;
    report += `Campus Blood Group Reserves (Active Available Count):\n`;
    bloodGroups.forEach((bg) => {
      report += `  ${bg}: ${getBloodGroupCount(bg)} active donors\n`;
    });
    
    // Create download element
    const element = document.createElement("a");
    const file = new Blob([report], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Suraksha_Campus_Health_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Admin Title Header */}
      <div className="bg-navy-light/20 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1 bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider mb-2 font-bold uppercase">
            <Shield className="w-3.5 h-3.5" /> SECURITY COMMAND CENTER
          </div>
          <h2 className="font-display text-2xl font-black text-white tracking-tight">University Oversight Panel</h2>
          <p className="text-xs text-gray-400 mt-1">
            Maintain campus rosters, broadcast warnings, view real-time safety indices and inspect medical transactions.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={generateReport}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs rounded-xl font-bold transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Export Report (.TXT)
          </button>
          <button 
            onClick={fetchData}
            className="p-2 bg-navy-dark hover:bg-white/5 border border-white/5 rounded-xl transition text-gray-400 hover:text-white"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-3 px-4 font-mono text-xs font-bold transition border-b-2 ${
            activeTab === "stats" ? "border-red-500 text-white" : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" /> Safety Analytics
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 font-mono text-xs font-bold transition border-b-2 ${
            activeTab === "users" ? "border-red-500 text-white" : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" /> Member Verification ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 px-4 font-mono text-xs font-bold transition border-b-2 ${
            activeTab === "requests" ? "border-red-500 text-white" : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5 inline mr-1.5" /> Emergency Controls ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`pb-3 px-4 font-mono text-xs font-bold transition border-b-2 ${
            activeTab === "announcements" ? "border-red-500 text-white" : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 inline mr-1.5" /> Campus Broadcasts
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-xs font-mono text-gray-400">Compiling campus stats logs...</p>
        </div>
      ) : (
        <div>
          {/* Stats Analytics Dashboard Tab */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-navy-light/30 border border-white/5">
                  <div className="text-xs font-mono text-gray-400 uppercase">Campus Members</div>
                  <div className="text-3xl font-display font-black text-white mt-1">{totalMembers}</div>
                  <p className="text-[10px] text-gray-500 mt-1">Verified student & staff accounts</p>
                </div>
                <div className="p-5 rounded-2xl bg-navy-light/30 border border-green-500/10">
                  <div className="text-xs font-mono text-green-400 uppercase">Active Donors Now</div>
                  <div className="text-3xl font-display font-black text-green-400 mt-1">{activeDonors}</div>
                  <p className="text-[10px] text-gray-500 mt-1">Eligible with open availability</p>
                </div>
                <div className="p-5 rounded-2xl bg-navy-light/30 border border-white/5">
                  <div className="text-xs font-mono text-gray-400 uppercase">Emergency Requests</div>
                  <div className="text-3xl font-display font-black text-white mt-1">{requests.length}</div>
                  <p className="text-[10px] text-gray-500 mt-1">Total requests triggered on app</p>
                </div>
                <div className="p-5 rounded-2xl bg-navy-light/30 border border-red-500/10">
                  <div className="text-xs font-mono text-red-400 uppercase">Resolved Emergencies</div>
                  <div className="text-3xl font-display font-black text-red-500 mt-1">{resolvedEmergency}</div>
                  <p className="text-[10px] text-gray-500 mt-1">Life-saving handovers completed</p>
                </div>
              </div>

              {/* Blood Inventory Data Visualization */}
              <div className="bg-navy-light/20 border border-white/10 p-6 rounded-2xl">
                <div className="mb-6">
                  <h3 className="font-display text-lg font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-red-500" /> Campus Blood Group Reserves Status
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Live telemetry indicating safety thresholds based on active available donor rosters for each specific antigen.
                  </p>
                </div>

                {/* Custom Dynamic SVG / Progress Grid representing Blood Reserve Levels */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {bloodGroups.map((bg) => {
                    const count = getBloodGroupCount(bg);
                    // Threshold calculation (safety index %): count of 4 donors means 100% full campus safety reserve
                    const safetyPercent = Math.min(100, Math.round((count / 4) * 100));
                    
                    return (
                      <div key={bg} className="p-4 bg-navy-dark border border-white/5 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="w-10 h-10 rounded-lg bg-red-600/10 text-red-500 border border-red-500/15 flex items-center justify-center font-display font-black text-sm">
                            {bg}
                          </span>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-slate-200">{count} Active Donors</span>
                            <span className="block text-[10px] font-mono text-gray-500">Reserve Pool</span>
                          </div>
                        </div>

                        {/* Custom visual progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-gray-400">Safety Index:</span>
                            <span className={safetyPercent >= 75 ? "text-green-400" : safetyPercent >= 40 ? "text-yellow-400" : "text-red-500 animate-pulse font-bold"}>
                              {safetyPercent}% {safetyPercent >= 75 ? "Secure" : safetyPercent >= 40 ? "Optimal" : "DELETED SUPPLY"}
                            </span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                safetyPercent >= 75 ? "bg-green-500" : safetyPercent >= 40 ? "bg-yellow-500" : "bg-red-600"
                              }`}
                              style={{ width: `${safetyPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Member verification list */}
          {activeTab === "users" && (
            <div className="bg-navy-light/20 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-mono text-[10px] uppercase">
                    <th className="p-4">Name / ID Card</th>
                    <th className="p-4">Role / Department</th>
                    <th className="p-4">Blood Group</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-white/[0.01] transition">
                      <td className="p-4">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{u.idCard}</div>
                      </td>
                      <td className="p-4 font-medium capitalize">
                        <div>{u.role}</div>
                        <div className="text-[10px] text-slate-400">{u.department}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-500 font-display font-extrabold border border-red-500/10">
                          {u.bloodGroup}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-gray-300">
                        <div>{u.phone}</div>
                        <div className="text-[10px] text-gray-500">{u.email}</div>
                      </td>
                      <td className="p-4">
                        {u.verified ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-400 font-mono text-[9px] font-bold">
                            VERIFIED CAMB
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-600/10 text-yellow-500 font-mono text-[9px] font-bold animate-pulse">
                            PENDING VERIFY
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1">
                        {!u.verified && (
                          <button
                            onClick={() => handleVerifyUser(u.uid)}
                            className="p-1.5 rounded-lg bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white transition"
                            title="Verify Account"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(u.uid)}
                          className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition"
                          title="Remove Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Emergency requests management */}
          {activeTab === "requests" && (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="p-5 rounded-2xl bg-navy-light/30 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-center py-0.5 rounded bg-red-600 text-white font-display font-black text-xs">{r.bloodGroup}</span>
                      <span className={`text-[10px] font-mono font-bold uppercase ${
                        r.urgency === "critical" ? "text-red-400" : r.urgency === "high" ? "text-orange-400" : "text-yellow-400"
                      }`}>
                        {r.urgency} Urgency
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">ID: {r.id}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">Patient: {r.patientName}</h4>
                    <p className="text-xs text-gray-400">{r.hospital} ({r.location})</p>
                    <p className="text-[11px] text-gray-500">Contact: {r.contactName} ({r.contactPhone})</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                    <select
                      value={r.status}
                      onChange={(e) => handleUpdateRequestStatus(r.id, e.target.value)}
                      className="bg-navy-dark/85 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none transition"
                    >
                      <option value="searching">Searching Donors</option>
                      <option value="accepted">Accepted</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed (Life Saved!)</option>
                      <option value="closed">Closed / Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDeleteRequest(r.id)}
                      className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition flex justify-center items-center"
                      title="Delete Request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Announcements Manager */}
          {activeTab === "announcements" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Publisher form */}
              <form onSubmit={handleCreateAnnouncement} className="p-6 rounded-2xl bg-navy-light/30 border border-white/10 space-y-4">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-1.5">
                  <Megaphone className="w-5 h-5 text-red-500" /> Dispatch Campus Broadcast
                </h3>

                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Campus Blood Drive Scheduled..."
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Content</label>
                  <textarea
                    placeholder="Provide full description of camp locations, incentives, eligibility guidelines or urgent warnings..."
                    value={newAnnContent}
                    onChange={(e) => setNewAnnContent(e.target.value)}
                    rows={4}
                    className="w-full bg-navy-dark/60 border border-white/10 focus:border-red-500 rounded-lg py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none transition resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold font-mono text-xs uppercase tracking-wider rounded-lg transition"
                >
                  Broadcast to Campus Feed
                </button>
              </form>

              {/* Feed List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                <h3 className="font-display text-sm font-bold text-gray-400">Current Administrative Stream</h3>
                {announcements.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl bg-navy-light/10 border border-white/5 space-y-1">
                    <h4 className="text-sm font-bold text-white leading-snug">{a.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{a.content}</p>
                    <div className="flex justify-between text-[9px] font-mono text-gray-500 pt-1">
                      <span>Posted by: {a.author}</span>
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

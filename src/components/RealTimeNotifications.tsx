import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { NotificationItem, UserProfile } from "../types";
import { Bell, ShieldAlert, Check, X, MapPin, Hospital, Clock } from "lucide-react";

interface RealTimeNotificationsProps {
  currentUser: UserProfile;
}

export default function RealTimeNotifications({ currentUser }: RealTimeNotificationsProps) {
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);

  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;

    // Listen to real-time unread matching notifications for this donor
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      where("status", "==", "unread")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreads: NotificationItem[] = [];
      snapshot.forEach((docSnap) => {
        unreads.push({ id: docSnap.id, ...docSnap.data() } as NotificationItem);
      });

      if (unreads.length > 0) {
        // Sort by createdAt descending to show latest
        unreads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActiveNotification(unreads[0]);
      } else {
        setActiveNotification(null);
      }
    }, (error) => {
      console.error("Error listening to real-time notification matching:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAction = async (action: 'accepted' | 'declined') => {
    if (!activeNotification) return;

    try {
      const batch = writeBatch(db);

      // 1. Update notification status
      const notificationRef = doc(db, "notifications", activeNotification.id);
      batch.update(notificationRef, { status: action });

      // 2. If accepted, update the original request status and assign the donor
      if (action === 'accepted') {
        const requestRef = doc(db, "requests", activeNotification.requestId);
        batch.update(requestRef, {
          status: 'accepted',
          acceptedBy: currentUser.uid
        });

        // Add a donation log history entry
        const donationRef = doc(collection(db, "donations"));
        batch.set(donationRef, {
          id: donationRef.id,
          requestId: activeNotification.requestId,
          donorId: currentUser.uid,
          bloodGroup: activeNotification.bloodGroup,
          units: 1, // Default allocation unit
          date: new Date().toISOString().split("T")[0],
          status: "accepted"
        });
      }

      await batch.commit();
      setActiveNotification(null);
    } catch (error) {
      console.error("Error committing notification response:", error);
    }
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-slate-900 border-2 border-red-500 rounded-2xl shadow-2xl p-5 shadow-red-950/40 animate-bounce-short">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1 w-full">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              {activeNotification.urgency} Urgent Alert
            </span>
            <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> MATCHED
            </span>
          </div>

          <h4 className="text-sm font-bold text-white mt-1.5">{activeNotification.title}</h4>
          <p className="text-xs text-gray-300">{activeNotification.message}</p>

          <div className="mt-3 space-y-1.5 text-xs text-gray-400 border-t border-white/5 pt-2 font-sans">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="font-semibold text-red-500">Blood Requested:</span>
              <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold text-xs font-mono">{activeNotification.bloodGroup}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Hospital className="w-3.5 h-3.5 text-gray-500" />
              <span>{activeNotification.hospital}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span>{activeNotification.location}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
            <button
              onClick={() => handleAction('accepted')}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition font-mono border border-red-500/10"
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </button>
            <button
              onClick={() => handleAction('declined')}
              className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-1.5 px-3 rounded-lg text-xs transition font-mono border border-white/10"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

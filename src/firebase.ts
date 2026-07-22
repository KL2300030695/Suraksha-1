import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  projectId: "aerobic-overview-b5jvd",
  appId: "1:384360357216:web:35c718be02cc0f90309205",
  apiKey: "AIzaSyC57dMh_F50WssqH2goAffxlSQfdDbVIAQ",
  authDomain: "aerobic-overview-b5jvd.firebaseapp.com",
  storageBucket: "aerobic-overview-b5jvd.firebasestorage.app",
  messagingSenderId: "384360357216",
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID
const db = initializeFirestore(app, {}, "ai-studio-760e2ead-71bb-4f98-a941-bdd2c88b9c5f");

// Initialize Auth
const auth = getAuth(app);

// Verify Connection to Firestore as required by firebase-integration skill
async function testConnection() {
  try {
    // Attempt a silent read from a dummy path to trigger/verify connection
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Firestore connected successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration or network connection.");
    } else {
      console.log("Firestore initialized (offline/empty ready).");
    }
  }
}

testConnection();

export { app, db, auth };

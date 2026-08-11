import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWvTomk6THqI9LJ6uj5-bJLRnGrtz9v68",
  authDomain: "suraksha-5a8c0.firebaseapp.com",
  projectId: "suraksha-5a8c0",
  storageBucket: "suraksha-5a8c0.firebasestorage.app",
  messagingSenderId: "455957441732",
  appId: "1:455957441732:web:90fbfeb249a622ececad91",
  measurementId: "G-Q5807BSVTN",
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore — this project uses the standard default database.
const db = getFirestore(app);

// Auth
const auth = getAuth(app);

// Lightweight connection check (logs to the console, non-fatal).
async function testConnection() {
  try {
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

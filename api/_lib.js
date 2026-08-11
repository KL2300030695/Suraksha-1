// Shared helpers for the Suraksha serverless functions.
// Files in /api starting with "_" are NOT treated as routes by Vercel.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize the Firebase Admin app once (reused across warm invocations).
// The service account JSON is provided via the FIREBASE_SERVICE_ACCOUNT env var
// (never committed to the repo).
export function getAdminAuth() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(JSON.parse(raw)) });
  return getAuth(app);
}

// Send a transactional email through Brevo's HTTP API.
export async function sendBrevoEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Suraksha Campus Network";
  if (!apiKey || !senderEmail) {
    throw new Error("BREVO_API_KEY / BREVO_SENDER_EMAIL env vars are not set");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${body}`);
  }
  return res.json();
}

// Branded email shell (no raw emoji — keeps encoding clean across clients).
export function emailShell({ heading, body, buttonLabel, buttonUrl, footnote }) {
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
    <div style="text-align:center;margin-bottom:8px">
      <span style="display:inline-block;width:40px;height:40px;line-height:40px;background:#dc2626;color:#fff;border-radius:12px;font-weight:800;font-size:20px">S</span>
    </div>
    <h2 style="color:#dc2626;margin:0 0 8px;text-align:center">${heading}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.55">${body}</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${buttonUrl}" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block">${buttonLabel}</a>
    </p>
    <p style="color:#94a3b8;font-size:12px">${footnote}</p>
  </div>`;
}

// The app only accepts KL University emails.
export const isUniversityEmail = (email) =>
  String(email || "").trim().toLowerCase().endsWith("@kluniversity.in");

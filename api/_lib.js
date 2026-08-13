// ---------------------------------------------------------------------------
// Shared helpers for the Suraksha serverless functions.
// Files in /api starting with "_" are NOT treated as routes by Vercel.
//
// Firebase email action links are generated via the Identity Toolkit admin
// REST API using a service-account OAuth token (signed with Node's built-in
// crypto). We deliberately avoid the firebase-admin SDK — it's heavy and
// crashes Vercel's ESM serverless runtime (FUNCTION_INVOCATION_FAILED). This
// approach needs only `node:crypto` + fetch.
// ---------------------------------------------------------------------------
import crypto from "node:crypto";

const b64url = (s) => Buffer.from(s).toString("base64url");

let cachedToken = null; // { token, exp } — reused across warm invocations

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  return JSON.parse(raw);
}

// Exchange the service-account key for a short-lived Google OAuth access token.
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const sa = serviceAccount();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase",
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(sa.private_key, "base64url");

  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("OAuth token exchange failed: " + JSON.stringify(data));
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

// Generate a Firebase email action link (PASSWORD_RESET | VERIFY_EMAIL) WITHOUT
// Firebase sending its own email — we deliver it via Brevo. Returns null if the
// account doesn't exist (anti-enumeration).
export async function generateActionLink(email, requestType) {
  const token = await getAccessToken();
  const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requestType, email, returnOobLink: true }),
  });
  const data = await res.json();
  if (data.error) {
    if (data.error.message === "EMAIL_NOT_FOUND") return null;
    throw new Error("sendOobCode failed: " + JSON.stringify(data.error));
  }
  return data.oobLink;
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

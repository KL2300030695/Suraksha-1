import { getAdminAuth, sendBrevoEmail, emailShell, isUniversityEmail } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!isUniversityEmail(email)) {
      return res.status(400).json({ error: "Only KL University emails are allowed." });
    }

    let link;
    try {
      link = await getAdminAuth().generateEmailVerificationLink(email);
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        return res.status(200).json({ ok: true });
      }
      throw e;
    }

    await sendBrevoEmail({
      to: email,
      subject: "Verify your Suraksha account",
      html: emailShell({
        heading: "Verify your email",
        body: "Welcome to Suraksha, the KL University campus emergency blood network. Please confirm your email address to secure your account.",
        buttonLabel: "Verify email",
        buttonUrl: link,
        footnote: "If you didn't create a Suraksha account, you can ignore this email.",
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("send-verification error:", e);
    return res.status(500).json({ error: "Could not send the verification email." });
  }
}

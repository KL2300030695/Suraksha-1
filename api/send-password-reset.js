import { generateActionLink, sendBrevoEmail, emailShell, isUniversityEmail } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!isUniversityEmail(email)) {
      return res.status(400).json({ error: "Only KL University emails are allowed." });
    }

    // Anti-enumeration: null link means no such account — still return ok.
    const link = await generateActionLink(email, "PASSWORD_RESET");
    if (!link) return res.status(200).json({ ok: true });

    await sendBrevoEmail({
      to: email,
      subject: "Reset your Suraksha password",
      html: emailShell({
        heading: "Reset your password",
        body: "We received a request to reset the password for your Suraksha campus account. Click below to choose a new password. If you didn't request this, you can safely ignore this email.",
        buttonLabel: "Reset password",
        buttonUrl: link,
        footnote: "This link expires in 1 hour and can be used once.",
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("send-password-reset error:", e);
    return res.status(500).json({ error: "Could not send the reset email. Please try again." });
  }
}

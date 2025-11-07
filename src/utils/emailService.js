// utils/emailService.js
import postmark from "postmark";
import dotenv from "dotenv";

dotenv.config();

// Initialize Postmark client
const client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

/**
 * Send a verification email using Postmark
 * @param {Object} user - user data (must include .email and .name)
 * @param {String} token - signed JWT for verification
 */
export const sendVerificationEmail = async (user, token) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const htmlBody = `
  <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f7fa; padding: 40px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" 
           style="max-width:600px;margin:auto;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <tr>
        <td style="background-color:#0f172a;padding:24px;text-align:center;">
          <h1 style="color:#fff;font-size:22px;font-weight:600;margin:0;">Tailux Crypto</h1>
          <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">Secure Digital Wallet • Trusted Transactions</p>
        </td>
      </tr>
      <tr>
        <td style="padding:30px 40px;">
          <h2 style="color:#111827;font-size:20px;margin-bottom:10px;">Welcome, ${user.name || "Trader"} 👋</h2>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:20px;">
            Thanks for joining <strong>Tailux Crypto</strong>. To complete your registration, please verify your email address by clicking the button below.
          </p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${verificationLink}" 
               style="background-color:#2563eb;color:#fff;padding:12px 26px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
               Verify My Email
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:0;">
            This verification link will expire in <strong>7 days</strong>. If you didn’t create an account, please ignore this email.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#f1f5f9;padding:20px;text-align:center;font-size:12px;color:#6b7280;">
          © ${new Date().getFullYear()} Tailux Crypto. All rights reserved.<br/>
          Powered by Bitcoin & Ethereum Blockchain Security.
        </td>
      </tr>
    </table>
  </div>
  `;

  try {
    await client.sendEmail({
      From: process.env.POSTMARK_SENDER_EMAIL, // e.g. info@bitcoinandstockinvestment.com
      To: user.email,
      Subject: "Verify your Tailux Crypto account",
      HtmlBody: htmlBody,
      MessageStream: "outbound",
    });

    console.log(`✅ Verification email sent to ${user.email}`);
  } catch (err) {
    console.error("❌ Error sending verification email:", err);
    throw new Error("Email delivery failed");
  }
};

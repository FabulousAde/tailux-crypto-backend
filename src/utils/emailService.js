import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const sendVerificationEmail = async (to, token) => {
  const verifyUrl = `${process.env.APP_BASE_URL}/api/auth/verify/${token}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,          // 587 uses STARTTLS, not direct SSL
    requireTLS: true,       // force TLS upgrade
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 20000, // 20 s
    greetingTimeout: 20000,
  });

  const mailOptions = {
    from: `"Tailux Crypto" <${process.env.SMTP_USER}>`,
    to,
    subject: "Verify Your Tailux Crypto Account",
    html: `
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #eee;">
        <h2>Welcome to Tailux Crypto 🚀</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:10px 15px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">
           Verify My Email
        </a>
        <p style="margin-top:20px;">Or copy this link: ${verifyUrl}</p>
        <p style="font-size:12px;color:#888;">This link expires in 24 hours.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`📨 Verification email sent to ${to}`);
};
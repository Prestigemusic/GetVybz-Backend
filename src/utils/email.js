// backend/src/utils/email.js
import nodemailer from "nodemailer";
import logger from "./logger.js";

/**
 * Core function to send emails.
 * Supports text or HTML content.
 */
export const sendEmail = async (to, subject, text, html = null) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.MAIL_FROM || `"GetVybz" <no-reply@getvybz.com>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`📨 Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error("❌ Email sending failed:", err);
  }
};

/**
 * Helper for sending system notifications (e.g. cron summaries, alerts)
 */
export const sendAdminEmail = async (subject, htmlContent) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.warn("⚠️ ADMIN_EMAIL not defined in .env — skipping admin summary email.");
      return;
    }

    await sendEmail(adminEmail, subject, "", htmlContent);
    logger.info(`📬 Admin email sent: ${subject}`);
  } catch (err) {
    logger.error("❌ Failed to send admin email:", err);
  }
};

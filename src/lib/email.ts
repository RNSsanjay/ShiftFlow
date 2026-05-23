import nodemailer from "nodemailer";

// Retrieve environment credentials
const host = process.env.EMAIL_HOST || "smtp.gmail.com";
const port = Number(process.env.EMAIL_PORT) || 587;
const user = process.env.EMAIL_HOST_USER || "";
const pass = process.env.EMAIL_HOST_PASSWORD || "";
const defaultFrom = process.env.DEFAULT_FROM_EMAIL || "sanjay.n.aiml.2022@snsct.org";

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // True for 465, false for 587
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Sends a premium HTML email containing the verification OTP.
 */
export async function sendVerificationEmail(toEmail: string, name: string, otp: string) {
  const mailOptions = {
    from: `"AttendMind Security" <${defaultFrom}>`,
    to: toEmail,
    subject: "Verify Your AttendMind Credentials",
    html: `
      <div style="font-family: sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #1e293b;">
        <h2 style="color: #3b82f6; text-align: center; margin-bottom: 5px;">AttendMind</h2>
        <p style="font-size: 10px; color: #64748b; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0; font-weight: bold;">Enterprise Identity Management</p>
        
        <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1; margin-top: 25px;">Hello ${name},</p>
        <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">Thank you for registering your organisation tenant. To complete your administrator profile, please verify your email address using the secure code below:</p>
        
        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px solid #334155;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 0.2em; color: #3b82f6;">${otp}</span>
        </div>
        
        <p style="font-size: 11px; color: #64748b; text-align: center; margin-bottom: 25px;">This OTP is valid for 15 minutes. If you did not trigger this setup, please disregard this email.</p>
        
        <div style="border-t: 1px solid #1e293b; padding-top: 20px; text-align: center; font-size: 10px; color: #475569;">
          © ${new Date().getFullYear()} AttendMind Technologies. All Rights Reserved.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Dispatches system notifications to the admin / configured email.
 */
export async function sendSystemNotificationEmail(toEmail: string, title: string, message: string) {
  const mailOptions = {
    from: `"AttendMind Console Alerts" <${defaultFrom}>`,
    to: toEmail,
    subject: `[Alert] AttendMind: ${title}`,
    html: `
      <div style="font-family: sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #1e293b;">
        <h2 style="color: #3b82f6; text-align: center; margin-bottom: 5px;">AttendMind</h2>
        <p style="font-size: 10px; color: #64748b; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0; font-weight: bold;">System Notification Feed</p>
        
        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 15px;">${title}</h3>
          <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1; margin-bottom: 0;">${message}</p>
        </div>
        
        <p style="font-size: 11px; color: #64748b; text-align: center;">This is an automated operational status message dispatched from your workspace console.</p>
        
        <div style="border-t: 1px solid #1e293b; padding-top: 20px; text-align: center; font-size: 10px; color: #475569;">
          © ${new Date().getFullYear()} AttendMind Technologies. All Rights Reserved.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Sends a daily CSV log attachment email to the configured administrator inbox.
 */
export async function sendDailyAttendanceCsvEmail(toEmail: string, dateStr: string, csvContent: string) {
  const mailOptions = {
    from: `"AttendMind Export Broker" <${defaultFrom}>`,
    to: toEmail,
    subject: `Daily Attendance CSV Log: ${dateStr}`,
    text: `Greetings,\n\nPlease find attached the automated daily attendance logs compiled in CSV format for the date: ${dateStr}.\n\nPlatform Status: All Nodes Active.\n\nRegards,\nAttendMind Broker Services`,
    attachments: [
      {
        filename: `attendmind_logs_${dateStr.replace(/[^a-zA-Z0-9]/g, "_")}.csv`,
        content: csvContent,
      },
    ],
  };

  return transporter.sendMail(mailOptions);
}

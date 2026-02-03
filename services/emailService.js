import nodemailer from "nodemailer";

// Configure transporter once
const transporter = nodemailer.createTransport({
  service: "gmail", // Change to your email service
  auth: {
    user: process.env.EMAIL_USER || "your_email@gmail.com",
    pass: process.env.EMAIL_PASS || "your_email_password",
  },
});

// Send email function
export async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"TrackUp" <${process.env.EMAIL_USER || "your_email@gmail.com"}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (err) {
    console.error("Email send error:", err);
    throw err;
  }
}

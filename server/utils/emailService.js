import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"PrintNear Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔒 Your PrintNear Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #2563eb; text-align: center;">PrintNear Verification</h2>
        <p style="font-size: 14px; color: #475569;">Your OTP code is valid for 5 minutes:</p>
        <div style="background-color: #f1f5f9; text-align: center; padding: 16px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; margin: 20px 0; border-radius: 12px;">
          ${otp}
        </div>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"PrintNear Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Welcome to PrintNear!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #2563eb;">Hello ${name}, 👋</h2>
        <p style="color: #334155;">Welcome to PrintNear! Your account has been successfully created.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};
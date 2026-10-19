import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Otp from '../models/Otp.js';
import { protect, getJwtSecret } from '../middleware/authMiddleware.js';
import { sendOTPEmail, sendWelcomeEmail } from '../utils/emailService.js';

const router = express.Router();

const publicUser = user => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone
});

const issueToken = user =>
  jwt.sign({ id: user._id, role: user.role, name: user.name }, getJwtSecret(), { expiresIn: '7d' });

// 1. Send Real-Time OTP for Sign Up
router.post('/send-otp', async (req, res, next) => {
  try {
    const { name, email, password, role, phone, shopName, address, upiId } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const userRole = role === 'shopkeeper' ? 'shopkeeper' : 'customer';
    const otp = crypto.randomInt(100000, 1000000).toString();
    const passwordHash = await bcrypt.hash(password, 12);

    // Clean up any stale OTPs for this email and save fresh OTP
    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otp,
      userData: {
        name: name.trim().slice(0, 80),
        email: normalizedEmail,
        passwordHash,
        role: userRole,
        phone: String(phone || '').trim().slice(0, 20),
        shopName: shopName?.trim() || `${name.trim()}'s Print Hub`,
        address: address?.trim() || 'Local Campus Area',
        upiId: upiId?.trim() || ''
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes validity
    });

    // Send real-time OTP email
    let emailSent = false;
    try {
      await sendOTPEmail(normalizedEmail, otp);
      emailSent = true;
    } catch (emailErr) {
      console.error('[EmailService] Failed to deliver OTP email:', emailErr.message);
    }

    res.json({
      message: emailSent
        ? 'A 6-digit verification code has been sent to your email.'
        : 'Verification code generated. Please check your email.',
      email: normalizedEmail,
      expiresInSeconds: 300,
      ...(process.env.NODE_ENV !== 'production' ? { debugOtp: otp } : {})
    });
  } catch (error) { next(error); }
});

// 2. Verify OTP & Finalize Registration with Welcome Email
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const submittedOtp = String(otp || '').trim();

    if (!normalizedEmail || !submittedOtp) {
      return res.status(400).json({ message: 'Email and 6-digit verification code are required.' });
    }

    const record = await Otp.findOne({ email: normalizedEmail, otp: submittedOtp });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      await Otp.deleteMany({ email: normalizedEmail });
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const { name, passwordHash, role, phone, shopName, address, upiId } = record.userData;

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: passwordHash,
      role,
      phone,
      isVerified: true
    });

    if (user.role === 'shopkeeper') {
      await Shop.create({
        ownerId: user._id,
        ownerName: user.name,
        email: user.email,
        phone: user.phone || 'Not Provided',
        shopName: shopName || `${user.name}'s Print Hub`,
        address: address || 'Local Area',
        upiId: upiId || '',
        pricing: { bwPerPage: 3, colorPerPage: 10 }
      });
    }

    // Clean up OTP record post-verification
    await Otp.deleteMany({ email: normalizedEmail });

    // Send real-time Welcome Email asynchronously
    sendWelcomeEmail(user.email, user.name).catch(err => {
      console.error('[EmailService] Failed to send welcome email:', err.message);
    });

    res.status(201).json({
      message: 'Account verified successfully! Welcome to PrintNear.',
      token: issueToken(user),
      user: publicUser(user),
      welcome: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) { next(error); }
});

// 3. Resend OTP
router.post('/resend-otp', async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    const record = await Otp.findOne({ email: normalizedEmail });
    if (!record) {
      return res.status(404).json({ message: 'No pending registration found for this email. Please sign up again.' });
    }

    const newOtp = crypto.randomInt(100000, 1000000).toString();
    record.otp = newOtp;
    record.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await record.save();

    let emailSent = false;
    try {
      await sendOTPEmail(normalizedEmail, newOtp);
      emailSent = true;
    } catch (err) {
      console.error('[EmailService] Resend OTP email failed:', err.message);
    }

    res.json({
      message: emailSent ? 'New verification code sent to your email.' : 'New verification code generated.',
      email: normalizedEmail,
      expiresInSeconds: 300,
      ...(process.env.NODE_ENV !== 'production' ? { debugOtp: newOtp } : {})
    });
  } catch (error) { next(error); }
});

// 4. Direct Registration Endpoint (Legacy & Automated Tests) with Welcome Email
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone, shopName, address, upiId } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!name?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

    const userRole = role === 'shopkeeper' ? 'shopkeeper' : 'customer';

    const user = await User.create({
      name: name.trim().slice(0, 80),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: userRole,
      phone: String(phone || '').trim().slice(0, 20),
      isVerified: true
    });

    if (user.role === 'shopkeeper') {
      await Shop.create({
        ownerId: user._id,
        ownerName: user.name,
        email: user.email,
        phone: user.phone || 'Not Provided',
        shopName: shopName?.trim() || `${user.name}'s Print Hub`,
        address: address?.trim() || 'Local Area',
        upiId: upiId?.trim() || '',
        pricing: { bwPerPage: 3, colorPerPage: 10 }
      });
    }

    sendWelcomeEmail(user.email, user.name).catch(() => {});

    res.status(201).json({ message: 'Account registered successfully.', token: issueToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    res.json({ message: 'Login successful.', token: issueToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.patch('/profile', protect, async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    const update = {};
    if (name?.trim()) update.name = name.trim().slice(0, 80);
    if (phone !== undefined) update.phone = String(phone).trim().slice(0, 20);

    if (email?.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
      if (duplicate) return res.status(409).json({ message: 'That email is already registered.' });
      update.email = normalizedEmail;
    }

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'Profile updated successfully.', user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;

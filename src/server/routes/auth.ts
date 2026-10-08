import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db';
import {
  Router,
  json,
  validate,
  authenticate,
  optionalAuthenticate,
  requireEmailVerification,
  adminOnly,
  rateLimit,
  publicUser,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../http';
import { findSponsor, findCnicConflict } from '../members';
import { generateRandomToken, hashToken, generateTokenPair, verifyRefreshToken } from '../jwt';
import { sendPasswordResetOtpEmail, sendWelcomeEmail, sendOtpEmail, canSendEmail } from '../email';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  addressSchema,
  changePasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from '@/shared';
import { newId } from '../db';

const router = new Router();

const refreshSchema = z.object({ refreshToken: z.string().min(1, 'refreshToken is required') });

const generateOtp = (): string => String(crypto.randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashPassword = (password: string) => bcrypt.hash(password, 12);
const isFuture = (v: unknown) => Boolean(v) && new Date(v as string).getTime() > Date.now();

const authLimiter = rateLimit('auth', 15 * 60 * 1000, 20, 'Too many login attempts. Please try again in 15 minutes.');

router.post('/register', authLimiter, validate(registerSchema), async ({ body }) => {
  const { firstName, lastName, email, password, phone, cnic } = body;
  const normalizedEmail = email.toLowerCase().trim();
  const sponsor = await findSponsor(body.refCode);
  const referral = sponsor ? { referredBy: sponsor._id, referredAt: new Date().toISOString() } : {};

  const cnicDigits = cnic.replace(/-/g, '').trim();
  const conflict = await findCnicConflict(cnicDigits);
  if (conflict) {
    throw new ConflictError('This CNIC number is already registered with another account. Same CNIC number cannot be used to register multiple accounts.');
  }

  const existing = await db.users.findOne({ email: normalizedEmail });
  if (existing && existing.isEmailVerified) {
    throw new ConflictError('An account with this email already exists. Please sign in.');
  }

  // No email service configured yet: there is no way to deliver a code, so the
  // account is verified straight away and signed in (codes resume once email is set up).
  if (!canSendEmail()) {
    if (existing) throw new ConflictError('An account with this email already exists. Please sign in.');
    const created = await db.users.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      cnic: cnicDigits,
      password: await hashPassword(password),
      isEmailVerified: true,
      isActive: true,
      role: 'customer',
      ...referral,
      addresses: [],
      wishlist: [],
      compare: [],
      recentlyViewed: [],
      refreshTokens: [],
      lastLogin: new Date().toISOString(),
    });
    const tokens = generateTokenPair({ sub: created._id, email: created.email, role: created.role });
    created.refreshTokens = [hashToken(tokens.refreshToken)];
    await db.users.save(created);
    return json({ success: true, message: 'Account created. Welcome to Azeeora!', data: { user: publicUser(created), tokens } }, 201);
  }

  const otp = generateOtp();
  const otpFields = {
    otpCode: hashToken(otp),
    otpExpiry: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(),
    otpAttempts: 0,
    otpLastSent: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, { firstName, lastName, phone, password: await hashPassword(password), ...otpFields });
    if (!existing.referredBy) Object.assign(existing, referral);
    await db.users.save(existing);
    await sendOtpEmail(normalizedEmail, firstName, otp);
    return json({
      success: true,
      message: 'Verification code sent to your email.',
      data: { email: normalizedEmail, requiresOtp: true },
    });
  }

  await db.users.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password: await hashPassword(password),
    phone,
    isEmailVerified: false,
    isActive: true,
    role: 'customer',
    ...referral,
    ...otpFields,
    addresses: [],
    wishlist: [],
    compare: [],
    recentlyViewed: [],
    refreshTokens: [],
  });
  await sendOtpEmail(normalizedEmail, firstName, otp);

  return json(
    { success: true, message: 'Verification code sent to your email.', data: { email: normalizedEmail, requiresOtp: true } },
    201
  );
});

router.post('/verify-otp', validate(verifyOtpSchema), async ({ body }) => {
  const normalizedEmail = String(body.email).toLowerCase().trim();
  const user = await db.users.findOne({ email: normalizedEmail });
  if (!user) throw new UnauthorizedError('No pending registration found for this email.');
  if (user.isEmailVerified) throw new BadRequestError('Email is already verified. Please sign in.');
  if (!user.otpCode || !user.otpExpiry) throw new BadRequestError('No OTP was generated. Please register again.');
  if ((user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    throw new ForbiddenError('Too many failed attempts. Please request a new code.');
  }
  if (!isFuture(user.otpExpiry)) throw new BadRequestError('Verification code has expired. Please request a new one.');

  if (hashToken(body.otp) !== user.otpCode) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    await db.users.save(user);
    const remaining = OTP_MAX_ATTEMPTS - user.otpAttempts;
    throw new UnauthorizedError(`Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
  }

  user.isEmailVerified = true;
  delete user.otpCode;
  delete user.otpExpiry;
  user.otpAttempts = 0;

  const tokens = generateTokenPair({ sub: user._id, email: user.email, role: user.role });
  user.refreshTokens = [hashToken(tokens.refreshToken)];
  user.lastLogin = new Date().toISOString();
  await db.users.save(user);

  void sendWelcomeEmail(user.email, user.firstName);

  return json({
    success: true,
    message: 'Email verified successfully. Welcome to AZEEORA COSMETICS!',
    data: { user: publicUser(user), tokens },
  });
});

router.post('/resend-otp', validate(resendOtpSchema), async ({ body }) => {
  const normalizedEmail = String(body.email).toLowerCase().trim();
  const user = await db.users.findOne({ email: normalizedEmail });

  if (!user || user.isEmailVerified) {
    return json({ success: true, message: 'If a pending account exists, a new code has been sent.' });
  }

  const lastSent = user.otpLastSent ? new Date(user.otpLastSent).getTime() : 0;
  if (lastSent && Date.now() - lastSent < OTP_RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
    throw new BadRequestError(`Please wait ${waitSec} seconds before requesting a new code.`);
  }

  const otp = generateOtp();
  user.otpCode = hashToken(otp);
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
  user.otpAttempts = 0;
  user.otpLastSent = new Date().toISOString();
  await db.users.save(user);
  await sendOtpEmail(normalizedEmail, user.firstName, otp);

  return json({ success: true, message: 'A new verification code has been sent to your email.' });
});

router.post('/login', authLimiter, validate(loginSchema), async ({ body }) => {
  const normalizedEmail = String(body.email).toLowerCase().trim();
  const user = await db.users.findOne({ email: normalizedEmail });
  if (!user) throw new UnauthorizedError('No account found with this email. Please sign up to create one.');
  if (user.isActive === false) throw new ForbiddenError('Your account is inactive. Please contact support.');

  const ok = user.password ? await bcrypt.compare(body.password, user.password) : false;
  if (!ok) throw new UnauthorizedError('Incorrect password. Please try again or reset your password.');
  if (!user.isEmailVerified) {
    throw new ForbiddenError('Please verify your email first. Check your inbox for the verification code.');
  }

  const tokens = generateTokenPair({ sub: user._id, email: user.email, role: user.role });
  user.refreshTokens = [...(user.refreshTokens ?? []), hashToken(tokens.refreshToken)].slice(-5);
  user.lastLogin = new Date().toISOString();
  await db.users.save(user);

  return json({ success: true, message: 'Login successful', data: { user: publicUser(user), tokens } });
});

router.post('/refresh', validate(refreshSchema), async ({ body }) => {
  let payload: any;
  try {
    payload = verifyRefreshToken(body.refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  if (payload?.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

  const user = await db.users.findById(payload.sub);
  if (!user) throw new UnauthorizedError('Invalid refresh token');

  const refreshHash = hashToken(body.refreshToken);
  if (!(user.refreshTokens ?? []).includes(refreshHash)) throw new UnauthorizedError('Invalid refresh token');

  const newTokens = generateTokenPair({ sub: user._id, email: user.email, role: user.role });
  user.refreshTokens = [
    ...(user.refreshTokens ?? []).filter((t: string) => t !== refreshHash),
    hashToken(newTokens.refreshToken),
  ].slice(-5);
  await db.users.save(user);

  return json({ success: true, message: 'Token refreshed', data: { user: publicUser(user), tokens: newTokens } });
});

router.post('/logout', validate(refreshSchema), authenticate, async ({ body, user: me }) => {
  const user = await db.users.findById(me!._id);
  if (!user) throw new NotFoundError('User');
  const refreshHash = hashToken(body.refreshToken);
  user.refreshTokens = (user.refreshTokens ?? []).filter((t: string) => t !== refreshHash);
  await db.users.save(user);
  return json({ success: true, message: 'Logged out' });
});

router.get('/verify-email', async ({ query }) => {
  const token = String(query.token ?? '').trim();
  if (!token) throw new BadRequestError('token is required');

  const user = await db.users.findOne({ emailVerificationToken: hashToken(token) });
  if (!user || !isFuture(user.emailVerificationExpiry)) {
    throw new UnauthorizedError('Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpiry;
  await db.users.save(user);
  await sendWelcomeEmail(user.email, user.firstName);

  return json({ success: true, message: 'Email verified successfully', data: { user: publicUser(user) } });
});

const resetLimiter = rateLimit('pwreset', 60 * 60 * 1000, 10, 'Too many requests. Please try again later.');

router.post('/forgot-password', resetLimiter, validate(forgotPasswordSchema), async ({ body }) => {
  const user = await db.users.findOne({ email: String(body.email).toLowerCase().trim() });
  if (!user) throw new NotFoundError('User not registered. Please create an account.');

  const otp = generateOtp();
  user.passwordResetToken = hashToken(otp);
  user.passwordResetExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  user.passwordResetAttempts = 0;
  await db.users.save(user);
  await sendPasswordResetOtpEmail(user.email, user.firstName, otp);

  return json({ success: true, message: 'A verification code has been sent to your email.' });
});

router.post('/verify-password-reset-otp', resetLimiter, validate(verifyOtpSchema), async ({ body }) => {
  const user = await db.users.findOne({ email: String(body.email).toLowerCase().trim() });
  if (!user || !user.passwordResetToken || !isFuture(user.passwordResetExpiry)) throw new UnauthorizedError('Invalid or expired verification code');
  // 5 wrong tries burns the code, so 6 digits can't be brute forced
  if ((user.passwordResetAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    throw new ForbiddenError('Too many wrong codes. Please request a new one.');
  }
  if (hashToken(body.otp) !== user.passwordResetToken) {
    user.passwordResetAttempts = (user.passwordResetAttempts ?? 0) + 1;
    if (user.passwordResetAttempts >= OTP_MAX_ATTEMPTS) {
      delete user.passwordResetToken;
      delete user.passwordResetExpiry;
    }
    await db.users.save(user);
    throw new UnauthorizedError('Invalid or expired verification code');
  }
  user.passwordResetAttempts = 0;

  const secureToken = generateRandomToken(32);
  user.passwordResetToken = hashToken(secureToken);
  user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.users.save(user);

  return json({ success: true, message: 'Code verified successfully', data: { token: secureToken } });
});

router.post('/reset-password', validate(resetPasswordSchema), async ({ body }) => {
  const user = await db.users.findOne({ passwordResetToken: hashToken(body.token) });
  if (!user || !isFuture(user.passwordResetExpiry)) throw new UnauthorizedError('Invalid or expired reset token');

  user.password = await hashPassword(body.password);
  delete user.passwordResetToken;
  delete user.passwordResetExpiry;
  user.refreshTokens = []; // sign out everywhere after a reset
  await db.users.save(user);

  return json({ success: true, message: 'Password reset successful. Please log in.' });
});

router.get('/me', optionalAuthenticate, async ({ user }) => {
  if (!user) return json({ success: true, message: 'Not authenticated', data: null });
  return json({ success: true, message: 'Current user', data: user });
});

router.put('/profile', authenticate, requireEmailVerification, validate(updateProfileSchema), async ({ body, user: me }) => {
  const user = await db.users.findById(me!._id);
  if (!user) throw new NotFoundError('User');
  user.firstName = body.firstName ?? user.firstName;
  user.lastName = body.lastName ?? user.lastName;
  user.phone = body.phone ?? user.phone;
  await db.users.save(user);
  return json({ success: true, message: 'Profile updated', data: publicUser(user) });
});

router.post('/addresses', authenticate, requireEmailVerification, validate(addressSchema), async ({ body, user: me }) => {
  const user = await db.users.findById(me!._id);
  if (!user) throw new NotFoundError('User');
  const isDefault = Boolean(body.isDefault);
  user.addresses = user.addresses ?? [];
  if (isDefault) user.addresses.forEach((a: any) => (a.isDefault = false));
  user.addresses.push({ country: 'Pakistan', ...body, isDefault, _id: newId() });
  await db.users.save(user);
  return json({ success: true, message: 'Address added', data: user.addresses }, 201);
});

router.delete('/addresses/:addressId', authenticate, requireEmailVerification, async ({ params, user: me }) => {
  const user = await db.users.findById(me!._id);
  if (!user) throw new NotFoundError('User');
  const before = user.addresses?.length ?? 0;
  user.addresses = (user.addresses ?? []).filter((a: any) => String(a._id ?? '') !== params.addressId);
  if (before === user.addresses.length) throw new NotFoundError('Address');
  await db.users.save(user);
  return json({ success: true, message: 'Address deleted', data: user.addresses });
});

router.post(
  '/change-password',
  authenticate,
  requireEmailVerification,
  validate(changePasswordSchema),
  async ({ body, user: me }) => {
    const user = await db.users.findById(me!._id);
    if (!user) throw new NotFoundError('User');
    if (!user.password) throw new BadRequestError('Password not set');
    if (!(await bcrypt.compare(body.currentPassword, user.password))) {
      throw new UnauthorizedError('Current password is incorrect');
    }
    user.password = await hashPassword(body.newPassword);
    await db.users.save(user);
    return json({ success: true, message: 'Password updated successfully' });
  }
);

router.get('/admin/health', adminOnly, () => json({ success: true, message: 'Admin OK' }));

export default router;

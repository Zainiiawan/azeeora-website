'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { m as motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { authApi } from '@/lib/api/authApi';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { Suspense } from 'react';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const email = searchParams.get('email') ?? '';
  const nextParam = searchParams.get('redirect');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.replace('/register');
    }
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const char = value.slice(-1);
    const next = [...otp];
    next[index] = char;
    setOtp(next);
    setError('');

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    const next = [...otp];
    for (let i = 0; i < text.length; i++) {
      next[i] = text[i];
    }
    setOtp(next);
    const focusIdx = Math.min(text.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await authApi.verifyOtp(email, code);
      if (result.tokens) {
        dispatch(
          setCredentials({
            user: result.user,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
          })
        );
        setSuccess('Email verified! Redirecting...');
        setTimeout(() => router.replace(next), 1000);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Verification failed. Please try again.';
      setError(msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [otp, email, dispatch, router]);

  // Auto-submit when all digits filled
  useEffect(() => {
    if (otp.every((d) => d) && otp.join('').length === OTP_LENGTH && !isVerifying && !success) {
      handleVerify();
    }
  }, [otp, isVerifying, success, handleVerify]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');

    try {
      await authApi.resendOtp(email);
      setSuccess('A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f0ed]">
            <ShieldCheck className="h-8 w-8 text-[#C9956A]" />
          </div>
          <h2 className="mt-4 text-3xl font-serif font-bold text-black">Verify Your Email</h2>
          <p className="mt-2 text-gray-600">
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* OTP Inputs */}
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-xl border-2 border-gray-300 bg-white text-center text-2xl font-bold text-gray-900 transition-all focus:border-[#C9956A] focus:ring-2 focus:ring-[#C9956A]/30 focus:outline-none sm:h-16 sm:w-14"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            loading={isVerifying}
            onClick={handleVerify}
          >
            Verify Email
          </Button>

          {/* Resend */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {"Didn't receive the code? "}
              {cooldown > 0 ? (
                <span className="text-gray-500">
                  Resend in <span className="font-semibold tabular-nums">{cooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-1 font-medium text-[#C9956A] hover:text-[#b07d52] transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resend Code
                </button>
              )}
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/register"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Register
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}

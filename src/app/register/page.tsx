'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { m as motion } from 'framer-motion';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Phone, CreditCard } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, register as registerUser } from '@/store/slices/authSlice';
import { RootState } from '@/store';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getRef } from '@/lib/member/referral';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cnic: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}



export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const dispatch = useDispatch();
  const router = useRouter();
  const { isLoading, error: storeError } = useSelector((state: RootState) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>();

  const password = watch('password');
  const displayError = formError || storeError;
  const alreadyExists =
    !!displayError && /already exists|sign in/i.test(displayError);
  const cnicAlreadyRegistered =
    !!displayError && /cnic.*already registered|same cnic/i.test(displayError);

  const onSubmit = async (data: RegisterFormData) => {
    setFormError('');
    dispatch(clearError());
    const { terms: _terms, ...registerData } = data;
    const refCode = getRef();
    const result = await dispatch(registerUser({ ...registerData, ...(refCode ? { refCode } : {}) }) as any);
    const next = new URLSearchParams(window.location.search).get('redirect');
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '';

    if (registerUser.fulfilled.match(result)) {
      const payload = result.payload;
      if (payload?.requiresOtp && payload?.email) {
        router.push(`/verify-otp?email=${encodeURIComponent(payload.email)}${safeNext ? `&redirect=${encodeURIComponent(safeNext)}` : ''}`);
        return;
      }
      if (payload?.tokens) {
        router.replace(safeNext || '/');
        return;
      }
    }

    const message =
      (typeof result.payload === 'string' && result.payload) ||
      'Unable to create your account. Please check your details.';
    setFormError(message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold text-black">Create Account</h2>
          <p className="mt-2 text-gray-600">Join us and discover your true beauty</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="Enter your first name"
              autoComplete="given-name"
              icon={<User className="w-5 h-5 text-gray-500" />}
              {...register('firstName', {
                required: 'Please enter your first name.',
              })}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name"
              placeholder="Enter your last name"
              autoComplete="family-name"
              icon={<User className="w-5 h-5 text-gray-500" />}
              {...register('lastName', {
                required: 'Please enter your last name.',
              })}
              error={errors.lastName?.message}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            icon={<Mail className="w-5 h-5 text-gray-500" />}
            {...register('email', {
              required: 'Please enter your email address.',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address.',
              },
            })}
            error={errors.email?.message}
          />

          <Input
            label="Phone Number (Optional)"
            type="tel"
            autoComplete="tel"
            placeholder="+92 300 1234567"
            icon={<Phone className="w-5 h-5 text-gray-500" />}
            {...register('phone', {
              pattern: {
                value: /^[\d\s+()-]+$/,
                message: 'Invalid phone number',
              },
            })}
            error={errors.phone?.message}
          />

          <Input
            label="CNIC Number *"
            type="text"
            placeholder="35202-1234567-1"
            icon={<CreditCard className="w-5 h-5 text-gray-500" />}
            {...register('cnic', {
              required: 'CNIC number is required.',
              pattern: {
                value: /^\d{5}-?\d{7}-?\d$/,
                message: 'CNIC format must be like 35202-1234567-1 (13 digits)',
              },
            })}
            error={errors.cnic?.message}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Enter your password"
              icon={<Lock className="w-5 h-5 text-gray-500" />}
              {...register('password', {
                required: 'Please enter your password.',
                minLength: { value: 8, message: 'Password must contain at least 8 characters.' },
              })}
              error={errors.password?.message}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-700 hover:text-gray-900"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm your password"
              icon={<Lock className="w-5 h-5 text-gray-500" />}
              {...register('confirmPassword', {
                required: 'Please confirm your password.',
                validate: (value) => value === password || 'Passwords do not match.',
              })}
              error={errors.confirmPassword?.message}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-9 text-gray-700 hover:text-gray-900"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                id="terms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-gold focus:ring-rose-gold"
                {...register('terms', {
                  required: 'You must accept the terms and conditions',
                })}
              />
              <span>
                I accept the{' '}
                <Link href="/terms" className="text-rose-gold hover:text-rose-gold-dark">
                  Terms and Conditions
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1 text-sm font-medium text-red-600">{errors.terms.message}</p>
            )}
          </div>

          {displayError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{displayError}</p>
              {alreadyExists && (
                <Link
                  href="/login"
                  className="mt-2 inline-block font-semibold text-rose-gold hover:text-rose-gold-dark"
                >
                  Go to Sign In →
                </Link>
              )}
              {cnicAlreadyRegistered && (
                <p className="mt-1 font-medium">
                  ⚠️ Is yeh aapka apna CNIC hai? Customer Care se rabta karen.
                </p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" loading={isLoading}>
            Create Account
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-rose-gold hover:text-rose-gold-dark">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

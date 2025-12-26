'use client';

// next
import { useState } from 'react';
import Image from 'next/image';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';

// auth
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// assets
const logo = '/assets/images/logo-dark.svg';
const leftImage = '/assets/images/landing/login_mv.jpg';

// ==============================|| LOGIN PAGE ||============================== //

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signOut, signInWithGoogle, signInWithAzure } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  // Basic email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validation
  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
      isValid = false;
    } else if (!isValidEmail(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = 'パスワードを入力してください';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle field blur
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm();
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        setErrors({ email: '', password: error.message || 'ログインに失敗しました' });
        return;
      }

      if (data?.session) {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

        if (profileError || !profile) {
          router.push('/dashboard/default');
        } else if (profile.status === 'pending') {
          router.push('/pending-approval');
        } else if (profile.status === 'rejected') {
          await signOut();
          setErrors({ email: '', password: 'アカウントが却下されています。管理者にお問い合わせください。' });
          return;
        } else if (profile.status === 'approved') {
          if (profile.role === 'admin') {
            router.push('/admin/approvals');
          } else {
            router.push('/dashboard/default');
          }
        } else {
          router.push('/dashboard/default');
        }
      }
    } catch (error) {
      setErrors({ email: '', password: 'ログインに失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        console.error('Google sign-in error:', error);
        setErrors({ email: '', password: 'Googleログインに失敗しました' });
      }
      // OAuth will redirect automatically
    } catch (error) {
      console.error('Unexpected Google sign-in error:', error);
      setErrors({ email: '', password: 'Googleログインに失敗しました' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Microsoft sign-in
  const handleMicrosoftSignIn = async () => {
    setIsMicrosoftLoading(true);
    try {
      const { data, error } = await signInWithAzure();

      if (error) {
        console.error('Microsoft sign-in error:', error);
        setErrors({ email: '', password: 'Microsoftログインに失敗しました' });
      }
      // OAuth will redirect automatically
    } catch (error) {
      console.error('Unexpected Microsoft sign-in error:', error);
      setErrors({ email: '', password: 'Microsoftログインに失敗しました' });
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  // Check if form is valid
  const isFormValid = email.trim() && isValidEmail(email) && password.trim();

  return (
    <div className="auth-main relative overflow-hidden bg-gray-50">
      <div className="flex min-h-screen w-full">
        {/* LEFT PANEL - Image with overlay */}
        <div className="relative hidden bg-gray-900 lg:flex lg:w-[55%]">
          <div className="relative h-full w-full">
            <Image
              src={leftImage}
              alt="Authentication"
              fill
              className="object-cover"
              priority
              onError={(e) => {
                // Graceful fallback - hide broken image
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-white">
              <h1 className="mb-4 text-5xl font-bold drop-shadow-lg">Nurse Note AI</h1>
              <p className="max-w-md text-center text-xl text-white/95 drop-shadow-md">
                看護記録をスマートに管理し、患者ケアの質を向上させます
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Form */}
        <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:px-12">
          <div className="w-full max-w-[420px]">
            {/* Logo */}
            <div className="mb-8 text-center">
              <NextLink href="/">
                <Image src={logo} alt="Nurse Note AI" className="mx-auto" width={120} height={60} priority />
              </NextLink>
            </div>

            {/* Title */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold">ログイン</h1>
              <p className="text-gray-600">Nurse Note AIへようこそ</p>
            </div>

            {/* Social Login Buttons */}
            <div className="mb-6 space-y-3">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading || isMicrosoftLoading}
                aria-busy={isGoogleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-3 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-700">Googleで続行</span>
              </button>

              {/* Microsoft Button */}
              <button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={isMicrosoftLoading || isLoading || isGoogleLoading}
                aria-busy={isMicrosoftLoading}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-3 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMicrosoftLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path fill="#F25022" d="M1 1h10v10H1z" />
                    <path fill="#00A4EF" d="M13 1h10v10H13z" />
                    <path fill="#7FBA00" d="M1 13h10v10H1z" />
                    <path fill="#FFB900" d="M13 13h10v10H13z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-700">Microsoft（Outlook）で続行</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">または</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="example@email.com"
                  className="form-control w-full"
                  aria-invalid={touched.email && errors.email ? 'true' : 'false'}
                  aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                />
                {touched.email && errors.email && (
                  <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  className="form-control w-full"
                  aria-invalid={touched.password && errors.password ? 'true' : 'false'}
                  aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                />
                {touched.password && errors.password && (
                  <p id="password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="form-check-input input-primary"
                  />
                  <label htmlFor="remember" className="ml-2 cursor-pointer text-sm text-gray-700">
                    ログイン状態を保持
                  </label>
                </div>
                <NextLink
                  href="/forgot-password"
                  className="text-primary-500 rounded text-sm hover:underline focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  パスワードを忘れた方
                </NextLink>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={!isFormValid || isLoading || isGoogleLoading || isMicrosoftLoading}
                aria-busy={isLoading}
                className="btn btn-primary flex w-full items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>ログイン中...</span>
                  </>
                ) : (
                  'ログイン'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                アカウントをお持ちでない方は{' '}
                <NextLink
                  href="/register"
                  className="text-primary-500 rounded font-medium hover:underline focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  アカウント作成
                </NextLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

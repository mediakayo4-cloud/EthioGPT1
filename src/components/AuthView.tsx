import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UIStrings } from '../i18n/translations';
import type { AuthTab } from '../types/chat';
import { Logo } from './Logo';

interface AuthViewProps {
  initialTab?: AuthTab;
  strings: UIStrings;
  onBackToChat: () => void;
  onOpenProfile: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialTab = 'login',
  strings,
  onBackToChat,
  onOpenProfile,
}) => {
  const {
    user,
    profile,
    isConfigured,
    isVerified,
    authError,
    clearAuthError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    refreshUser,
    logout,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    setLocalError(null);
    setStatusMessage(null);
    clearAuthError();
  }, [initialTab]);

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setLocalError(null);
    setStatusMessage(null);
    clearAuthError();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setStatusMessage(null);
    if (!email.trim() || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }
    setSubmitting(true);
    try {
      const ok = await signInWithEmail(email, password);
      if (ok) {
        onBackToChat();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setStatusMessage(null);
    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-type your confirmation password.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await signUpWithEmail(name.trim(), email, password);
      if (ok) {
        setStatusMessage(
          `Account created! A verification email has been sent to ${email.trim()}. Please check your inbox and verify your email.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setStatusMessage(null);
    if (!email.trim()) {
      setLocalError('Please enter the email address associated with your account.');
      return;
    }
    setSubmitting(true);
    try {
      const ok = await sendPasswordReset(email);
      if (ok) {
        setStatusMessage(
          `Password reset link sent to ${email.trim()}. Check your inbox and spam folder to choose a new password.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const ok = await signInWithGoogle();
      if (ok) {
        onBackToChat();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const ok = await resendVerificationEmail();
      if (ok && user?.email) {
        setStatusMessage(`Verification link resent to ${user.email}.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshVerification = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await refreshUser();
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-6 sm:py-10">
      <button
        type="button"
        onClick={onBackToChat}
        className="mb-5 min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] px-3.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{strings.backToChat}</span>
      </button>

      <div className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
              {user
                ? strings.profile
                : tab === 'login'
                  ? strings.signIn
                  : tab === 'signup'
                    ? strings.createAccount
                    : 'Reset Password'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              {user
                ? 'Manage your EthioGPT session and verification status.'
                : tab === 'forgot'
                  ? 'Receive a password reset link via Firebase Authentication.'
                  : 'Sync your profile, settings, and conversations securely across devices.'}
            </p>
          </div>
          <Logo size="md" showWordmark={false} />
        </div>

        {!isConfigured ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-semibold">Firebase is not configured</p>
            <p className="leading-relaxed">
              EthioGPT is currently running in local browser mode. To enable user accounts and
              cloud sync, configure <code className="font-mono">firebase-applet-config.json</code>.
            </p>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-stone-50 dark:bg-[#161E19] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-semibold text-stone-900 dark:text-white truncate">
                  {profile?.displayName || user.displayName || 'EthioGPT User'}
                </span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertCircle className="h-4 w-4" />
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
              <p className="text-xs text-stone-600 dark:text-stone-300 pt-1">
                {isVerified ? strings.cloudSynced : strings.verifyEmailNotice}
              </p>
            </div>

            {!isVerified && (
              <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
                <p className="leading-relaxed">{strings.verifyEmailNotice}</p>
                {statusMessage && (
                  <p className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{statusMessage}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={submitting}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-amber-600 text-white px-3.5 py-2 text-xs font-semibold hover:bg-amber-700"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Resend verification email</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshVerification}
                    disabled={submitting}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#121815] px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>I verified — refresh</span>
                  </button>
                </div>
              </div>
            )}

            {displayError && (
              <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3 text-xs text-red-800 dark:text-red-200">
                {displayError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenProfile}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors"
              >
                <UserIcon className="h-4 w-4" />
                <span>{strings.myProfile}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                }}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-stone-100 dark:bg-[#171E1A] text-stone-800 dark:text-stone-100 text-sm font-medium hover:bg-stone-200 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{strings.logout}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {tab !== 'forgot' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={submitting}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2.5 rounded-xl border border-stone-300 dark:border-emerald-900/80 bg-white dark:bg-[#171E1A] px-4 py-2.5 text-sm font-semibold text-stone-900 dark:text-white hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3 text-xs text-stone-400">
                  <div className="h-px flex-1 bg-stone-200 dark:bg-emerald-950/70" />
                  <span>or with email</span>
                  <div className="h-px flex-1 bg-stone-200 dark:bg-emerald-950/70" />
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 dark:bg-[#171E1A] p-1">
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                      tab === 'login'
                        ? 'bg-white dark:bg-[#212B25] text-stone-900 dark:text-white shadow-xs'
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {strings.signIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                      tab === 'signup'
                        ? 'bg-white dark:bg-[#212B25] text-stone-900 dark:text-white shadow-xs'
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {strings.createAccount}
                  </button>
                </div>
              </>
            )}

            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchTab('forgot')}
                      className="text-xs font-semibold text-emerald-800 dark:text-amber-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] pl-3.5 pr-11 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {displayError && (
                  <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3 text-xs text-red-800 dark:text-red-200 leading-relaxed">
                    {displayError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{strings.signIn}</span>
                </button>
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Abebe Bikila"
                    className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] pl-3.5 pr-11 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                  />
                </div>

                {displayError && (
                  <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3 text-xs text-red-800 dark:text-red-200 leading-relaxed">
                    {displayError}
                  </div>
                )}

                {statusMessage && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    {statusMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{strings.createAccount}</span>
                </button>
              </form>
            )}

            {tab === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-stone-50 dark:bg-[#161E19] p-3.5 text-xs text-stone-600 dark:text-stone-300 flex items-start gap-2.5">
                  <KeyRound className="h-4 w-4 text-emerald-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Enter your registered email address and we will send you a secure Firebase
                    password reset link.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                  />
                </div>

                {displayError && (
                  <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3 text-xs text-red-800 dark:text-red-200 leading-relaxed">
                    {displayError}
                  </div>
                )}

                {statusMessage && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    {statusMessage}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Send Reset Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="min-h-[46px] px-4 rounded-xl border border-stone-200 dark:border-emerald-950/70 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/30"
                  >
                    Back to Log in
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

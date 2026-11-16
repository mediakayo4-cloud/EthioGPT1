import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Shield,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LANGUAGES, type UIStrings } from '../i18n/translations';
import type { ChatMessage, ChatSession, LanguageCode, ThemeMode, VoiceMode } from '../types/chat';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  voiceMode: VoiceMode;
  onVoiceModeChange: (mode: VoiceMode) => void;
  saveHistory: boolean;
  onSaveHistoryChange: (enabled: boolean) => void;
  sessions: ChatSession[];
  messagesByChat: Record<string, ChatMessage[]>;
  geminiConfigured: boolean | null;
  strings: UIStrings;
  onClearAllConversations: () => Promise<void>;
  onBackToChat: () => void;
  onOpenAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  voiceMode,
  onVoiceModeChange,
  saveHistory,
  onSaveHistoryChange,
  sessions,
  messagesByChat,
  geminiConfigured,
  strings,
  onClearAllConversations,
  onBackToChat,
  onOpenAuth,
}) => {
  const { user, isVerified, providerIds, sendPasswordReset, logout, deleteAccount } = useAuth();

  const [securityNotice, setSecurityNotice] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const hasPasswordProvider = providerIds.includes('password');

  const handleExportHistory = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'EthioGPT',
      sessionCount: sessions.length,
      sessions: sessions.map((s) => ({
        ...s,
        messages: messagesByChat[s.id] ?? [],
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ethiogpt-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = async () => {
    setClearingHistory(true);
    try {
      await onClearAllConversations();
      setConfirmClearHistory(false);
      setSecurityNotice('All saved conversations have been cleared.');
    } finally {
      setClearingHistory(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setSecurityNotice(null);
    setSecurityError(null);
    const ok = await sendPasswordReset(user.email);
    if (ok) {
      setSecurityNotice(`Password reset email sent to ${user.email}.`);
    } else {
      setSecurityError('Could not send password reset email right now. Please try again.');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    if (deletePhrase.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE in all caps to confirm account deletion.');
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccount(deletePassword || undefined);
      setShowDeleteConfirm(false);
      onBackToChat();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Account deletion failed.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToChat}
          className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] px-3.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{strings.backToChat}</span>
        </button>
        <h1 className="font-display text-lg sm:text-xl font-bold text-stone-900 dark:text-white">
          {strings.settings}
        </h1>
      </div>

      {/* Language Settings */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
          <Globe className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>{strings.languageLabel}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => {
            const active = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => onLanguageChange(lang.code)}
                className={`min-h-[46px] rounded-xl border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-emerald-700 dark:border-amber-400 bg-emerald-700/10 dark:bg-emerald-950/60 text-emerald-900 dark:text-amber-300'
                    : 'border-stone-200 dark:border-emerald-950/70 hover:bg-stone-50 dark:hover:bg-emerald-950/30 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="text-xs font-semibold">{lang.nativeName}</div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {lang.name} · {lang.regionHint}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Theme Settings */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-3">
        <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
          Appearance Theme
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`min-h-[46px] flex items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-colors ${
              theme === 'light'
                ? 'border-emerald-700 bg-emerald-700/10 text-emerald-900'
                : 'border-stone-200 dark:border-emerald-950/70 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>{strings.themeLight}</span>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`min-h-[46px] flex items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-colors ${
              theme === 'dark'
                ? 'border-amber-400 bg-emerald-950/60 text-amber-300'
                : 'border-stone-200 dark:border-emerald-950/70 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Moon className="h-4 w-4" />
            <span>{strings.themeDark}</span>
          </button>
        </div>
      </section>

      {/* Voice Settings */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
          <Volume2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>Voice & Speech Settings</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'auto', label: 'Auto', hint: 'Best per language' },
              { id: 'ai', label: 'AI Voice', hint: 'Gemini audio' },
              { id: 'browser', label: 'Device', hint: 'Browser speech' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVoiceModeChange(opt.id)}
              className={`min-h-[48px] rounded-xl border px-2.5 py-2 text-left transition-colors ${
                voiceMode === opt.id
                  ? 'border-emerald-700 dark:border-amber-400 bg-emerald-700/10 dark:bg-emerald-950/60 text-emerald-900 dark:text-amber-300'
                  : 'border-stone-200 dark:border-emerald-950/70 text-stone-700 dark:text-stone-300'
              }`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">{opt.hint}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Privacy & Chat History Management */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
          <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>Privacy &amp; Chat History Management</span>
        </div>

        <label className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-stone-50 dark:bg-[#161E19] p-3.5 cursor-pointer">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Save new chat history
            </p>
            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              When turned off, new conversations stay in memory only for your active tab and are
              not saved to local storage or Firestore.
            </p>
          </div>
          <input
            type="checkbox"
            checked={saveHistory}
            onChange={(e) => onSaveHistoryChange(e.target.checked)}
            className="mt-1 h-4 w-4 accent-emerald-700 shrink-0"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportHistory}
            disabled={sessions.length === 0}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/40 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export Conversations ({sessions.length})</span>
          </button>

          {!confirmClearHistory ? (
            <button
              type="button"
              onClick={() => setConfirmClearHistory(true)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/70 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/25 px-3.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/45"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All History</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearingHistory}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                {clearingHistory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Clear</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearHistory(false)}
                className="min-h-[44px] px-3 rounded-xl border border-stone-200 dark:border-emerald-950/70 text-xs font-medium text-stone-600 dark:text-stone-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Account Security & AI Backend */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Account Security &amp; Service
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {geminiConfigured === false ? strings.modelMissing : strings.modelReady}
          </span>
        </div>

        {securityNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
            {securityNotice}
          </div>
        )}
        {securityError && (
          <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3 text-xs text-red-800 dark:text-red-200">
            {securityError}
          </div>
        )}

        {user ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-stone-50 dark:bg-[#161E19] p-3.5 text-xs space-y-1">
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                Signed in as {user.email}
              </p>
              <p className="text-stone-500 dark:text-stone-400">
                Sign-in method:{' '}
                {providerIds.includes('google.com') && hasPasswordProvider
                  ? 'Google & Email/Password'
                  : providerIds.includes('google.com')
                    ? 'Google Sign-In'
                    : 'Email & Password'}{' '}
                · {isVerified ? 'Email verified' : 'Verification pending'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasPasswordProvider && user.email && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 px-3.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/30"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Send Password Reset Email</span>
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  onBackToChat();
                }}
                className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 px-3.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/30"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{strings.logout}</span>
              </button>
            </div>

            {/* Delete Account Zone */}
            <div className="pt-3 border-t border-stone-200/80 dark:border-emerald-950/60">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteError(null);
                  }}
                  className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-red-300/70 dark:border-red-900/60 px-3.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/35"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Delete Account</span>
                </button>
              ) : (
                <form
                  onSubmit={handleDeleteAccount}
                  className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50/70 dark:bg-red-950/25 p-4 space-y-3"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-red-900 dark:text-red-200">
                      Permanently delete your EthioGPT account
                    </p>
                    <p className="text-[11px] leading-relaxed text-red-800 dark:text-red-300">
                      This will permanently erase your profile, preferences, all cloud-synced chats,
                      and your Firebase Authentication login. This action cannot be undone.
                    </p>
                  </div>

                  {hasPasswordProvider && (
                    <div>
                      <label className="block text-[11px] font-medium text-red-900 dark:text-red-200 mb-1">
                        Current Password (required if you signed in earlier)
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full min-h-[40px] rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-[#161E19] px-3 text-xs text-stone-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-red-900 dark:text-red-200 mb-1">
                      Type <code className="font-mono font-bold">DELETE</code> to confirm
                    </label>
                    <input
                      type="text"
                      required
                      value={deletePhrase}
                      onChange={(e) => setDeletePhrase(e.target.value)}
                      placeholder="DELETE"
                      className="w-full min-h-[40px] rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-[#161E19] px-3 text-xs font-mono text-stone-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {deleteError && (
                    <p className="text-xs font-medium text-red-700 dark:text-red-300">
                      {deleteError}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={deletingAccount}
                      className="min-h-[40px] px-4 inline-flex items-center gap-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                    >
                      {deletingAccount && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Permanently Delete Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePhrase('');
                        setDeletePassword('');
                        setDeleteError(null);
                      }}
                      className="min-h-[40px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#121815] text-xs font-medium text-stone-700 dark:text-stone-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="min-h-[44px] px-4 inline-flex items-center justify-center rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500"
          >
            {strings.signIn} / {strings.createAccount}
          </button>
        )}

        <PWAInstallButton label={strings.installApp} />
      </section>
    </div>
  );
};

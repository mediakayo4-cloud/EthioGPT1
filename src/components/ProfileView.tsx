import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LANGUAGES, type UIStrings } from '../i18n/translations';
import type { LanguageCode } from '../types/chat';

interface ProfileViewProps {
  strings: UIStrings;
  onBackToChat: () => void;
  onOpenAuth: () => void;
  onLanguageChange: (lang: LanguageCode) => void;
}

const COUNTRIES = [
  'Ethiopia',
  'Kenya',
  'Eritrea',
  'Djibouti',
  'Somalia',
  'Sudan',
  'South Sudan',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Egypt',
  'Nigeria',
  'South Africa',
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'Sweden',
  'Norway',
  'Netherlands',
  'France',
  'Italy',
  'Switzerland',
  'Australia',
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Israel',
  'India',
  'China',
  'Japan',
  'South Korea',
  'Other',
];

function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process image on this browser.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length > 180000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        }
        if (dataUrl.length > 195000) {
          reject(new Error('Image could not be compressed enough. Please choose a smaller photo.'));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Invalid or unsupported image file.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  strings,
  onBackToChat,
  onOpenAuth,
  onLanguageChange,
}) => {
  const {
    user,
    profile,
    isConfigured,
    isVerified,
    updateUserProfile,
    resendVerificationEmail,
    refreshUser,
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [countrySelect, setCountrySelect] = useState('Ethiopia');
  const [customCountry, setCustomCountry] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('om');
  const [photoDataUrl, setPhotoDataUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setPreferredLanguage(profile.preferredLanguage || 'om');
    setPhotoDataUrl(profile.photoDataUrl || '');

    const rawCountry = (profile.country || 'Ethiopia').trim();
    if (COUNTRIES.includes(rawCountry) && rawCountry !== 'Other') {
      setCountrySelect(rawCountry);
      setCustomCountry('');
    } else if (rawCountry) {
      setCountrySelect('Other');
      setCustomCountry(rawCountry);
    } else {
      setCountrySelect('Ethiopia');
      setCustomCountry('');
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a JPEG, PNG, or WebP image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Selected image exceeds 10 MB.');
      return;
    }
    try {
      const compressed = await compressAvatarFile(file);
      setPhotoDataUrl(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const resolvedCountry =
      countrySelect === 'Other' ? customCountry.trim() : countrySelect;

    if (!displayName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      setErrorMsg('Username must be 3–30 characters using only letters, numbers, and underscores.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        country: resolvedCountry,
        preferredLanguage,
        photoDataUrl,
      });
      onLanguageChange(preferredLanguage);
      setSuccessMsg('Profile updated and saved securely.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSaving(false);
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
      </div>

      {!isConfigured || !user ? (
        <div className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-800/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              {strings.myProfile}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">
              {isConfigured
                ? 'Sign in or create an account to edit your full name, username, avatar, biography, and synced preferences.'
                : 'Firebase Authentication is not configured in this environment yet.'}
            </p>
          </div>
          {isConfigured && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors"
            >
              <span>{strings.signIn} / {strings.createAccount}</span>
            </button>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-7 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-stone-200/80 dark:border-emerald-950/60">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-stone-200 dark:border-emerald-900/70 bg-emerald-800/10 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt={displayName || 'Profile avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {(displayName || user.email || 'E').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h1 className="font-display text-xl font-bold text-stone-900 dark:text-white truncate">
                  {strings.myProfile}
                </h1>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Personal details are private to your account and never shared publicly.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-emerald-900/70 bg-stone-50 dark:bg-[#161E19] px-3 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{photoDataUrl ? 'Change photo' : 'Upload photo'}</span>
                </button>
                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl('')}
                    className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 px-3 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {!isVerified && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Verify your email address ({user.email}) before saving profile edits to the cloud.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void resendVerificationEmail()}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-3 text-xs font-semibold"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Resend email</span>
                </button>
                <button
                  type="button"
                  onClick={() => void refreshUser()}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#121815] px-3 text-xs font-semibold text-stone-800 dark:text-stone-200"
                >
                  <span>Refresh verification status</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Abebe Bikila"
                className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Username
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                  @
                </span>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]{3,30}"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="abebe_eth"
                  className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] pl-8 pr-3.5 text-sm text-stone-900 dark:text-white font-mono focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                />
              </div>
              <p className="mt-1 text-[11px] text-stone-400">
                3–30 characters: letters, numbers, underscore
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
                About Me (Biography)
              </label>
              <span className="text-[11px] font-mono tabular-nums text-stone-400">
                {bio.length}/300
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share a short bio about your interests, studies, or work..."
              className="w-full rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 py-2.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Country
              </label>
              <select
                value={countrySelect}
                onChange={(e) => setCountrySelect(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {countrySelect === 'Other' && (
                <input
                  type="text"
                  maxLength={80}
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  placeholder="Enter your country"
                  className="mt-2 w-full min-h-[42px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                Preferred Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
                className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#161E19] px-3.5 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
              Email Address
            </label>
            <div className="flex items-center justify-between gap-2 min-h-[44px] rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-stone-50 dark:bg-[#161E19]/70 px-3.5">
              <span className="text-sm text-stone-600 dark:text-stone-300 truncate">
                {user.email}
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
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3 text-xs text-red-800 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving || !isVerified}
              className="min-h-[46px] px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-900 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

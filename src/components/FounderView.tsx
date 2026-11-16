import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Compass,
  Quote,
  Target,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type { UIStrings } from '../i18n/translations';

interface FounderViewProps {
  strings: UIStrings;
  onBackToChat: () => void;
  onOpenAbout: () => void;
}

const FOUNDER_PHOTO_KEY = 'ethiogpt_founder_photo_v1';

const MISSION_POINTS = [
  'Promote Ethiopian languages in AI technology.',
  'Create learning and innovation opportunities for young people.',
  'Make information and knowledge accessible.',
  'Make AI technology accessible to everyone.',
];

function loadSavedFounderPhoto(): string {
  try {
    return localStorage.getItem(FOUNDER_PHOTO_KEY) || '';
  } catch {
    return '';
  }
}

function compressFounderPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to process photo in this browser.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (dataUrl.length > 600000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export const FounderView: React.FC<FounderViewProps> = ({
  strings,
  onBackToChat,
  onOpenAbout,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>(() => loadSavedFounderPhoto());
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError(null);
    setPhotoSaved(false);

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose a PNG, JPEG, or WebP image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image file must be 10 MB or smaller.');
      return;
    }

    try {
      const compressed = await compressFounderPhoto(file);
      localStorage.setItem(FOUNDER_PHOTO_KEY, compressed);
      setPhotoUrl(compressed);
      setPhotoSaved(true);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Unable to save founder photo.');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoError(null);
    setPhotoSaved(false);
    try {
      localStorage.removeItem(FOUNDER_PHOTO_KEY);
    } catch {
      // ignore
    }
    setPhotoUrl('');
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToChat}
          className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] px-3.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{strings.backToChat}</span>
        </button>

        <button
          type="button"
          onClick={onOpenAbout}
          className="min-h-[40px] px-3.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-[#121815] text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          {strings.aboutEthioGPT}
        </button>
      </div>

      {/* Founder Hero Card with Editable Profile Photo */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Editable Photo Slot */}
          <div className="flex flex-col items-center sm:items-start gap-2.5 shrink-0">
            <div className="relative h-32 w-32 sm:h-36 sm:w-36 rounded-2xl overflow-hidden border border-stone-200 dark:border-emerald-900/80 bg-gradient-to-br from-emerald-900 via-emerald-800 to-amber-700 flex items-center justify-center shadow-sm">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Obsa Adem Amin — Founder & Creator of EthioGPT"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center px-3">
                  <span className="font-display text-3xl font-bold tracking-tight text-white">
                    OAA
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-amber-200">
                    Founder Photo
                  </span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-emerald-900/70 bg-stone-50 dark:bg-[#161E19] px-3 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{photoUrl ? 'Change Photo' : 'Edit Photo'}</span>
              </button>

              {photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  aria-label="Remove founder photo"
                  title="Remove photo"
                  className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-stone-200 dark:border-emerald-950/70 text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Prominent Name & Title */}
          <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
            <p className="text-xs font-semibold tracking-wide text-emerald-800 dark:text-amber-400">
              {strings.aboutFounder}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white text-balance">
              Obsa Adem Amin
            </h1>
            <p className="text-sm sm:text-base font-semibold text-stone-700 dark:text-stone-200">
              Founder &amp; Creator of EthioGPT 🇪🇹
            </p>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed pt-1">
              Building AI for Ethiopia and beyond.
            </p>

            {photoError && (
              <p className="text-xs text-red-700 dark:text-red-300 pt-1">{photoError}</p>
            )}
            {photoSaved && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 pt-1">
                Profile photo updated.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Biography */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-7 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-amber-400">
          <UserCheck className="h-4 w-4" />
          <span>Biography</span>
        </div>
        <div className="space-y-3.5 text-sm sm:text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
          <p>
            Obsa Adem Amin is the founder and creator of EthioGPT. He is passionate about using
            technology and digital innovation to help his community and create new opportunities.
          </p>
          <p>
            He founded EthioGPT with a vision of making Artificial Intelligence accessible to
            everyone without requiring them to abandon their language, culture, or identity.
          </p>
          <p>
            His mission is to bring AI technology closer to the people of Ethiopia and Africa,
            especially by expanding quality AI services in Ethiopian languages.
          </p>
        </div>
      </section>

      {/* Vision & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-amber-400">
            <Compass className="h-4 w-4" />
            <span>Vision</span>
          </div>
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            To help build a generation in Ethiopia that participates in digital technology and
            Artificial Intelligence, innovates, and competes globally.
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-amber-400">
            <Target className="h-4 w-4" />
            <span>Mission</span>
          </div>
          <ul className="space-y-2.5">
            {MISSION_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300"
              >
                <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Personal Message */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-stone-50 dark:bg-[#141B17] p-5 sm:p-7 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-amber-400">
          <Quote className="h-4 w-4" />
          <span>Personal Message</span>
        </div>
        <blockquote className="font-display text-base sm:text-lg font-medium leading-relaxed text-stone-900 dark:text-stone-100">
          &ldquo;Our languages, cultures, and identities deserve an important place in technological
          progress. Every great transformation begins with an idea. EthioGPT is a journey of
          turning that idea into reality.&rdquo;
        </blockquote>
      </section>

      {/* Founder Footer */}
      <footer className="rounded-2xl border border-stone-200/80 dark:border-emerald-950/70 bg-white dark:bg-[#111613] px-5 py-5 text-center space-y-1">
        <p className="font-display text-sm font-bold text-stone-900 dark:text-white">
          Obsa Adem Amin
        </p>
        <p className="text-xs font-medium text-emerald-800 dark:text-amber-400">
          Founder &amp; Creator of EthioGPT
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Building AI for Ethiopia and beyond.
        </p>
      </footer>
    </div>
  );
};

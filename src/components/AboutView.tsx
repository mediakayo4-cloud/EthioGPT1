import React from 'react';
import { ArrowLeft, Compass, Globe, HeartHandshake, Mail, Sparkles } from 'lucide-react';
import { LANGUAGES, type UIStrings } from '../i18n/translations';
import { Logo } from './Logo';

interface AboutViewProps {
  strings: UIStrings;
  onBackToChat: () => void;
  onOpenFounder: () => void;
  onOpenLegal: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  strings,
  onBackToChat,
  onOpenFounder,
  onOpenLegal,
}) => {
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
          {strings.aboutEthioGPT}
        </h1>
      </div>

      {/* Overview Card */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-7 space-y-4">
        <div className="flex items-center gap-3.5">
          <Logo size="lg" showWordmark={false} />
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              EthioGPT
            </h2>
            <p className="text-xs font-medium text-emerald-800 dark:text-amber-400">
              {strings.tagline}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          EthioGPT is an independent, web-based multilingual AI assistant built specifically for
          Ethiopia and Ethiopian communities worldwide. It brings conversational AI, voice input
          and read-aloud speech, image analysis, and PDF/text document understanding into a single
          fast, mobile-friendly workspace tailored to Ethiopian languages.
        </p>
      </section>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-amber-400">
            <Compass className="h-4 w-4" />
            <span>Our Mission</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Make modern AI practical, respectful, and accessible in everyday Ethiopian languages
            so students, educators, farmers, entrepreneurs, and developers can learn and work
            without language barriers.
          </p>
        </section>

        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
            <span>Our Vision</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            A digital ecosystem where speakers of Afaan Oromo, Amharic, Tigrinya, Somali, and
            English experience high-accuracy orthography, cultural context, and dependable tools on
            any phone or computer.
          </p>
        </section>
      </div>

      {/* Ethiopian Language Support */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
          <Globe className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>Supported Languages &amp; Orthography</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className="rounded-xl border border-stone-200/80 dark:border-emerald-950/60 bg-stone-50 dark:bg-[#161E19] px-3.5 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  {lang.nativeName}
                </span>
                <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                  {lang.regionHint}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                {lang.name} interface &amp; AI responses
                {lang.code === 'om' ? ' with dedicated Qubee accuracy' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Purpose & Contact Placeholder */}
      <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
            <HeartHandshake className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>Built for Ethiopian Users</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            From drafting cover letters and translating study guides to inspecting agricultural
            images or summarizing PDF assignments on low-bandwidth mobile connections, EthioGPT is
            designed from the ground up for practical daily use.
          </p>
        </div>

        <div className="pt-3 border-t border-stone-200/80 dark:border-emerald-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <Mail className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Contact Information (Placeholder)</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              General inquiries: <code className="font-mono">contact@ethiogpt.example</code>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onOpenFounder}
              className="min-h-[40px] px-3.5 rounded-xl bg-emerald-800 dark:bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors"
            >
              {strings.aboutFounder}
            </button>
            <button
              type="button"
              onClick={onOpenLegal}
              className="min-h-[40px] px-3.5 rounded-xl border border-stone-200 dark:border-emerald-950/70 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-emerald-950/30"
            >
              {strings.licenseLegal}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

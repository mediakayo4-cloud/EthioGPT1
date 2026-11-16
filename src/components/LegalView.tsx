import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Copyright, FileText, Lock } from 'lucide-react';
import type { UIStrings } from '../i18n/translations';

interface LegalViewProps {
  strings: UIStrings;
  onBackToChat: () => void;
}

type LegalSection = 'copyright' | 'terms' | 'privacy' | 'oss';

const THIRD_PARTY_LICENSES = [
  { name: 'React & React DOM', license: 'MIT License', role: 'User interface rendering' },
  { name: 'Vite', license: 'MIT License', role: 'Frontend build & dev server' },
  { name: 'Tailwind CSS', license: 'MIT License', role: 'Utility-first responsive styling' },
  { name: 'Lucide React', license: 'ISC License', role: 'Interface iconography' },
  { name: 'Motion', license: 'MIT License', role: 'UI transitions' },
  { name: 'Firebase JS SDK', license: 'Apache-2.0 License', role: 'Authentication & Cloud Firestore' },
  { name: '@google/genai', license: 'Apache-2.0 License', role: 'Server-side AI API client' },
  { name: 'Express', license: 'MIT License', role: 'Backend API routing' },
  { name: 'Multer', license: 'MIT License', role: 'Document multipart upload handling' },
  { name: 'pdf-parse', license: 'MIT License', role: 'PDF text extraction' },
  { name: 'react-markdown & remark-gfm', license: 'MIT License', role: 'Markdown & table formatting' },
  { name: 'vite-plugin-pwa', license: 'MIT License', role: 'Progressive Web App manifest & offline support' },
];

export const LegalView: React.FC<LegalViewProps> = ({ strings, onBackToChat }) => {
  const [section, setSection] = useState<LegalSection>('copyright');
  const currentYear = new Date().getFullYear();

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
          {strings.licenseLegal}
        </h1>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-1.5">
        {(
          [
            { id: 'copyright', label: 'Ownership', icon: Copyright },
            { id: 'terms', label: 'Terms', icon: FileText },
            { id: 'privacy', label: 'Privacy', icon: Lock },
            { id: 'oss', label: 'Open Source', icon: BookOpen },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-emerald-800 dark:bg-emerald-600 text-white'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-emerald-950/40'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {section === 'copyright' && (
        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-7 space-y-4">
          <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
            Copyright &amp; Brand Ownership
          </h2>
          <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <p>
              <strong>&copy; {currentYear} EthioGPT. All rights reserved.</strong>
            </p>
            <p>
              The <strong>EthioGPT</strong> name, tagline (&ldquo;Your Ethiopian AI
              Assistant&rdquo;), custom website interface, visual design, and original source
              code are owned and operated by the EthioGPT creator and project owner.
            </p>
            <p>
              EthioGPT is provided as an independent web application project. No separate legal
              corporate entity, commercial registration number, or government certification is
              claimed or implied on this page.
            </p>
            <p>
              You retain ownership of the prompts you write, documents/images you upload, and the
              conversations you save in your personal account.
            </p>
          </div>
        </section>
      )}

      {section === 'terms' && (
        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-7 space-y-4">
          <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
            Terms of Service
          </h2>
          <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <p>
              By accessing or using EthioGPT, you agree to use the service responsibly and in
              compliance with applicable laws.
            </p>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                1. Acceptable Use
              </h3>
              <p>
                Do not use EthioGPT to generate unlawful, abusive, fraudulent, or harmful material,
                or to attempt unauthorized access to other users&rsquo; accounts or backend APIs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                2. AI Output Accuracy
              </h3>
              <p>
                AI responses, translations, and document summaries are generated automatically and
                may occasionally contain inaccuracies. Always verify critical medical, legal,
                financial, or academic information independently.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                3. Account Responsibility
              </h3>
              <p>
                You are responsible for keeping your sign-in credentials secure. You may export or
                delete your conversations and permanently delete your account at any time from
                Settings.
              </p>
            </div>
          </div>
        </section>
      )}

      {section === 'privacy' && (
        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-7 space-y-4">
          <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
            Privacy Policy
          </h2>
          <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                1. Data Stored in Your Account
              </h3>
              <p>
                When you create an account and verify your email, EthioGPT stores your profile
                details (full name, username, optional profile picture, biography, country, email,
                preferred language, theme, voice setting, and history preference) and your saved
                conversations in Cloud Firestore under strict owner-only access rules.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                2. Guest &amp; Privacy Controls
              </h3>
              <p>
                In guest mode, conversations are stored locally in your browser unless you disable{' '}
                <strong>Save new chat history</strong> in Settings. You can clear local or cloud
                history at any time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                3. AI Processing &amp; API Security
              </h3>
              <p>
                Your prompts, voice audio, images, and extracted document text are sent securely to
                EthioGPT server endpoints solely to generate your response. Server API keys are
                never exposed in browser code.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                4. Account Deletion
              </h3>
              <p>
                Deleting your account from Settings removes your Firestore profile, all cloud chat
                threads, local browser history, and your Firebase Authentication record.
              </p>
            </div>
          </div>
        </section>
      )}

      {section === 'oss' && (
        <section className="rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-5 sm:p-7 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">
              Open-Source Third-Party Licenses
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              EthioGPT is built with open-source libraries distributed under their respective
              licenses.
            </p>
          </div>
          <div className="divide-y divide-stone-200/80 dark:divide-emerald-950/60 border border-stone-200/80 dark:border-emerald-950/60 rounded-xl overflow-hidden">
            {THIRD_PARTY_LICENSES.map((pkg) => (
              <div
                key={pkg.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-3 bg-stone-50/50 dark:bg-[#141B17]/60"
              >
                <div>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    {pkg.name}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">{pkg.role}</p>
                </div>
                <span className="text-[11px] font-mono text-emerald-800 dark:text-amber-400 shrink-0">
                  {pkg.license}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

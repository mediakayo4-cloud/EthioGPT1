import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  label: string;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  label,
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700/20 dark:border-emerald-500/30 bg-emerald-700/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-medium hover:bg-emerald-700/15 dark:hover:bg-emerald-500/25 transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[40px] px-3 py-1.5 text-xs' : 'w-full min-h-[44px] px-4 py-2 text-sm'
        }`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-emerald-950/70 bg-white dark:bg-emerald-950/25 text-stone-700 dark:text-stone-200 font-medium hover:bg-stone-50 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap shrink-0 ${
            compact ? 'min-h-[40px] px-3 py-1.5 text-xs' : 'w-full min-h-[44px] px-4 py-2 text-sm'
          }`}
        >
          <Share className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-stone-200 dark:border-emerald-950/80 bg-white dark:bg-[#111613] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-white">
                  Install EthioGPT on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="space-y-2.5 text-sm text-stone-600 dark:text-stone-300 list-decimal pl-5">
                <li>
                  Tap the <strong>Share</strong> icon in your Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to launch EthioGPT like a native app.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

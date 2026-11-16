import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showWordmark = true }) => {
  const iconDims =
    size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const textDims =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDims} shrink-0`}
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="16" className="fill-[#0A2E1F]" />
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="13"
          className="stroke-amber-500/35"
          strokeWidth="1.5"
        />
        {/* Ethiopian geometric lattice */}
        <path
          d="M32 10L39.5 17.5H49.5V27.5L57 35L49.5 42.5V52.5H39.5L32 60L24.5 52.5H14.5V42.5L7 35L14.5 27.5V17.5H24.5L32 10Z"
          transform="translate(0 -3)"
          className="stroke-amber-400"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M32 16.5L44.5 32L32 47.5L19.5 32L32 16.5Z"
          className="fill-emerald-500/20 stroke-emerald-400"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Star of knowledge */}
        <path
          d="M32 21L34.75 29.25L43 32L34.75 34.75L32 43L29.25 34.75L21 32L29.25 29.25L32 21Z"
          className="fill-amber-300"
        />
        <circle cx="32" cy="32" r="2.4" className="fill-[#0A2E1F]" />
      </svg>

      {showWordmark && (
        <span
          className={`font-display font-bold tracking-tight whitespace-nowrap text-stone-900 dark:text-stone-50 ${textDims}`}
        >
          Ethio<span className="text-emerald-700 dark:text-emerald-400">GPT</span>
        </span>
      )}
    </div>
  );
};

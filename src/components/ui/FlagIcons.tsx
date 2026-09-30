import React from 'react';

interface FlagProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * High-definition Indonesian Flag (Merah Putih)
 * Crisp vector with subtle border to ensure white field is distinctly visible.
 */
export const FlagIndonesia: React.FC<FlagProps> = ({ className = 'h-3.5 w-5', size }) => {
  const sizeClasses = size === 'sm' ? 'h-3 w-4' : size === 'lg' ? 'h-5 w-7' : className;

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-xs border border-slate-300/70 shadow-2xs ${sizeClasses}`}
      title="Indonesia"
      aria-label="Bendera Indonesia"
    >
      <svg
        viewBox="0 0 24 16"
        className="h-full w-full object-cover"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Red upper band */}
        <rect width="24" height="8" fill="#E70011" />
        {/* White lower band */}
        <rect y="8" width="24" height="8" fill="#FFFFFF" />
      </svg>
    </span>
  );
};

/**
 * High-definition English / United Kingdom Flag (Union Jack)
 * Crisp vector representation of the UK / English flag.
 */
export const FlagEnglish: React.FC<FlagProps> = ({ className = 'h-3.5 w-5', size }) => {
  const sizeClasses = size === 'sm' ? 'h-3 w-4' : size === 'lg' ? 'h-5 w-7' : className;

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-xs border border-slate-300/70 shadow-2xs ${sizeClasses}`}
      title="English (UK)"
      aria-label="English Flag"
    >
      <svg
        viewBox="0 0 60 30"
        className="h-full w-full object-cover"
        xmlns="http://www.w3.org/2000/svg"
      >
        <clipPath id="uk-flag-clip">
          <rect width="60" height="30" />
        </clipPath>
        <g clipPath="url(#uk-flag-clip)">
          {/* Blue field */}
          <rect width="60" height="30" fill="#012169" />
          {/* White saltire */}
          <path d="M0 0 L60 30 M60 0 L0 30" stroke="#FFFFFF" strokeWidth="6" />
          {/* Red saltire */}
          <path
            d="M0 0 L30 15 M60 30 L30 15 M60 0 L30 15 M0 30 L30 15"
            stroke="#C8102E"
            strokeWidth="2"
          />
          {/* White central cross */}
          <path d="M30 0 v30 M0 15 h60" stroke="#FFFFFF" strokeWidth="10" />
          {/* Red central cross */}
          <path d="M30 0 v30 M0 15 h60" stroke="#C8102E" strokeWidth="6" />
        </g>
      </svg>
    </span>
  );
};

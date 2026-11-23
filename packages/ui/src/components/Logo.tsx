import React from 'react';

export interface LogoProps {
  size?: number | string;
  variant?: 'horizontal' | 'symbol' | 'full' | 'icon';
  showText?: boolean;
  className?: string;
  imageSrc?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 38,
  variant = 'horizontal',
  showText = true,
  className = '',
  imageSrc,
}) => {
  const [imgError, setImgError] = React.useState(false);

  // If specific imageSrc provided, use it
  if (imageSrc && !imgError) {
    return (
      <img
        src={imageSrc}
        alt="تربتینو | Torbatino"
        style={{ height: size, objectFit: 'contain' }}
        className={`shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Horizontal Header Layout with the official transparent branding
  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        {!imgError ? (
          <img
            src="/brand/horizontal-logo-transparent.png"
            alt="تربتینو"
            style={{ height: size, objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center gap-2">
            {/* SVG Symbol */}
            <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="#F5F3F8" />
              {/* Islamic Arch */}
              <path
                d="M 14 36 L 14 26 C 14 18 24 10 24 10 C 24 10 34 18 34 26 L 34 36"
                stroke="#7541A5"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Saffron Flower */}
              <path d="M 24 30 C 22 25 20 22 20 18 C 24 18 26 24 24 30 Z" fill="#7541A5" />
              <path d="M 24 30 C 26 25 28 22 28 18 C 24 18 22 24 24 30 Z" fill="#7541A5" />
              {/* Stamens */}
              <path d="M 23 20 L 22 14 M 24 20 L 24 13 M 25 20 L 26 14" stroke="#F0B52E" strokeWidth="1.5" strokeLinecap="round" />
              {/* Ascending Golden Road */}
              <path d="M 12 36 Q 24 34 36 30 L 36 33 Q 24 37 12 40 Z" fill="#F0B52E" />
            </svg>

            {showText && (
              <div className="flex flex-col text-right leading-tight">
                <div className="flex items-baseline gap-1 font-extrabold text-base tracking-tight">
                  <span className="text-[#7541A5]">تربتینو</span>
                </div>
                <span className="text-[9px] font-semibold text-slate-400 tracking-wider">
                  — TORBATINO —
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // App Icon variant
  if (variant === 'icon') {
    return (
      <img
        src="/brand/app-icon.png"
        alt="تربتینو"
        style={{ width: size, height: size, objectFit: 'contain' }}
        className={`rounded-2xl shadow-sm ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Full Brand Logo variant
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {!imgError ? (
        <img
          src="/brand/full-logo-transparent.png"
          alt="تربتینو | Torbatino"
          style={{ height: size, objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex flex-col items-center text-center">
          <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
            <path
              d="M 14 36 L 14 26 C 14 18 24 10 24 10 C 24 10 34 18 34 26 L 34 36"
              stroke="#7541A5"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M 24 30 C 22 25 20 22 20 18 C 24 18 26 24 24 30 Z" fill="#7541A5" />
            <path d="M 24 30 C 26 25 28 22 28 18 C 24 18 22 24 24 30 Z" fill="#7541A5" />
            <path d="M 23 20 L 22 14 M 24 20 L 24 13 M 25 20 L 26 14" stroke="#F0B52E" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 12 36 Q 24 34 36 30 L 36 33 Q 24 37 12 40 Z" fill="#F0B52E" />
          </svg>
          <div className="flex items-baseline gap-1 font-black text-xl tracking-tight mt-1">
            <span className="text-[#7541A5]">تربتینو</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 tracking-widest mt-0.5">
            — TORBATINO —
          </span>
          <span className="text-[11px] font-medium text-slate-500 mt-1">
            شهر تو، همراه تو
          </span>
        </div>
      )}
    </div>
  );
};

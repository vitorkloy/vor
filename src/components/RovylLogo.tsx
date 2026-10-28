import React, { useId } from 'react';

interface RovylLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

/** Hub mark: logo-v2 inlined so the packaged file:// page does not depend on /logo.svg. */
export const RovylLogo: React.FC<RovylLogoProps> = ({
  size = 512,
  className = '',
}) => {
  const raw = useId().replace(/:/g, '');
  const bg = `bg-${raw}`;
  const tl = `tl-${raw}`;
  const cur = `cur-${raw}`;
  const sh = `sh-${raw}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="0.5" stopColor="#2c2c2c" />
          <stop offset="1" stopColor="#171717" />
        </linearGradient>
        <linearGradient id={tl} gradientUnits="userSpaceOnUse" x1="110" y1="110" x2="190" y2="190">
          <stop offset="0" stopColor="#f6f6f6" />
          <stop offset="1" stopColor="#d4d4d4" />
        </linearGradient>
        <linearGradient id={cur} gradientUnits="userSpaceOnUse" x1="252" y1="252" x2="340" y2="360">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dcdcdc" />
        </linearGradient>
        <filter id={sh} x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="132" ry="132" fill={`url(#${bg})`} />
      <g strokeWidth="12" strokeLinejoin="round">
        <path d="M197.77 81.46 A184 184 0 0 1 314.23 81.46 L302.71 109.26 A154 154 0 0 0 209.29 109.26 Z" fill="#a9a9a9" stroke="#a9a9a9" />
        <path d="M338.25 91.41 A184 184 0 0 1 420.59 173.75 L392.79 185.27 A154 154 0 0 0 326.73 119.21 Z" fill="#9d9d9d" stroke="#9d9d9d" />
        <path d="M430.54 197.77 A184 184 0 0 1 430.54 314.23 L402.74 302.71 A154 154 0 0 0 402.74 209.29 Z" fill="#999999" stroke="#999999" />
        <path d="M420.59 338.25 A184 184 0 0 1 338.25 420.59 L326.73 392.79 A154 154 0 0 0 392.79 326.73 Z" fill="#909090" stroke="#909090" />
        <path d="M314.23 430.54 A184 184 0 0 1 197.77 430.54 L209.29 402.74 A154 154 0 0 0 302.71 402.74 Z" fill="#8f8f8f" stroke="#8f8f8f" />
        <path d="M173.75 420.59 A184 184 0 0 1 91.41 338.25 L119.21 326.73 A154 154 0 0 0 185.27 392.79 Z" fill="#9a9a9a" stroke="#9a9a9a" />
        <path d="M81.46 314.23 A184 184 0 0 1 81.46 197.77 L109.26 209.29 A154 154 0 0 0 109.26 302.71 Z" fill="#a6a6a6" stroke="#a6a6a6" />
        <path d="M91.41 173.75 A184 184 0 0 1 173.75 91.41 L185.27 119.21 A154 154 0 0 0 119.21 185.27 Z" fill={`url(#${tl})`} stroke={`url(#${tl})`} />
      </g>
      <path d="M260 264 L331 331 L289 340 L260 360 Z" fill={`url(#${cur})`} stroke={`url(#${cur})`} strokeWidth="12" strokeLinejoin="round" filter={`url(#${sh})`} />
    </svg>
  );
};

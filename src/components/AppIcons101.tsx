/** v10.1 icons — original artwork in the portfolio's squircle style. */
const R = { x: 6, y: 6, width: 88, height: 88, rx: 21 };

export function MirroringIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}mi`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5ac8fa" />
          <stop offset="1" stopColor="#5856d6" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}mi)`} />
      <rect x="20" y="30" width="44" height="32" rx="4" fill="none" stroke="#fff" strokeWidth="4" opacity="0.65" />
      <rect x="52" y="22" width="26" height="50" rx="6" fill="#fff" />
      <rect x="56" y="28" width="18" height="36" rx="2" fill="#1c1c1e" />
      <rect x="61" y="25" width="8" height="2" rx="1" fill="#1c1c1e" />
      <path d="M26 74h28M40 62v12" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

export function TimeMachineIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`${u}tm`} cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#2fd0a8" />
          <stop offset="1" stopColor="#0b6e5e" />
        </radialGradient>
      </defs>
      <rect {...R} fill={`url(#${u}tm)`} />
      <circle cx="50" cy="51" r="25" fill="#fff" />
      <path d="M50 35v17l11 7" stroke="#0b6e5e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M22 51a28 28 0 1 1 9 20.6" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M14 46l8 9 9-8" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LearningIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}lh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb703" />
          <stop offset="1" stopColor="#fb5607" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}lh)`} />
      <path d="M50 30 18 44l32 14 32-14z" fill="#fff" />
      <path d="M30 50v14c0 5 9 10 20 10s20-5 20-10V50L50 59z" fill="#fff" opacity="0.9" />
      <path d="M78 46v18" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="78" cy="66" r="4" fill="#fff" />
    </svg>
  );
}

export function WhatsNewIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}wn`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e5ce6" />
          <stop offset="1" stopColor="#bf5af2" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}wn)`} />
      <path d="M50 22l7 17 18 1-14 11 5 18-16-10-16 10 5-18-14-11 18-1z" fill="#fff" />
      <path d="M28 78h44" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

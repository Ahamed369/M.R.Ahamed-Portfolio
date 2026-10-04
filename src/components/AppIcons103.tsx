/** v10.3 — icons for the study, planning and guide apps (original artwork, Apple-style squircle). */
const R = { x: 6, y: 6, width: 88, height: 88, rx: 21 };

function Grad({ id, a, b, v }: { id: string; a: string; b: string; v?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={v ? '0' : '1'} y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
}

export function FlashcardsIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <Grad id={`${u}fc`} a="#34c7ff" b="#2a5cff" />
      </defs>
      <rect {...R} fill={`url(#${u}fc)`} />
      <rect x="27" y="26" width="44" height="32" rx="6" fill="#fff" opacity="0.45" transform="rotate(-9 49 42)" />
      <rect x="25" y="34" width="50" height="36" rx="7" fill="#fff" />
      <path d="M38 47h24M38 55h16" stroke="#2a5cff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="68" cy="66" r="11" fill="#30d158" stroke="#fff" strokeWidth="3" />
      <path d="m63 66 3.5 3.5L73 62" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FocusplannerIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <Grad id={`${u}fp`} a="#ff7a59" b="#e8335b" />
      </defs>
      <rect {...R} fill={`url(#${u}fp)`} />
      <circle cx="50" cy="53" r="25" fill="#fff" />
      <path d="M50 53V35A18 18 0 0 1 67.1 47.4Z" fill="#ff5a5f" />
      <circle cx="50" cy="53" r="25" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="44" y="20" width="12" height="6" rx="3" fill="#fff" />
      <circle cx="50" cy="53" r="3.4" fill="#3a3a3c" />
    </svg>
  );
}

export function GoalsIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <Grad id={`${u}gl`} a="#5ee7a7" b="#0f9d73" />
      </defs>
      <rect {...R} fill={`url(#${u}gl)`} />
      <rect x="22" y="26" width="16" height="48" rx="5" fill="#fff" opacity="0.95" />
      <rect x="42" y="26" width="16" height="36" rx="5" fill="#fff" opacity="0.8" />
      <rect x="62" y="26" width="16" height="24" rx="5" fill="#fff" opacity="0.62" />
      <rect x="25.5" y="31" width="9" height="5" rx="2.5" fill="#0f9d73" />
      <rect x="25.5" y="40" width="9" height="5" rx="2.5" fill="#0f9d73" />
      <rect x="45.5" y="31" width="9" height="5" rx="2.5" fill="#0f9d73" />
      <rect x="65.5" y="31" width="9" height="5" rx="2.5" fill="#0f9d73" />
    </svg>
  );
}

export function BizplannerIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <Grad id={`${u}bp`} a="#ffd25e" b="#f08a00" />
      </defs>
      <rect {...R} fill={`url(#${u}bp)`} />
      <rect x="20" y="24" width="60" height="52" rx="7" fill="#fff" />
      <path d="M40 24v52M60 24v34M20 58h60M40 41h20" stroke="#f0a020" strokeWidth="3" />
      <path d="M50 66l7-6 6 4 9-9" fill="none" stroke="#e8335b" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlaygroundIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <Grad id={`${u}pg`} a="#2b2d42" b="#0b0c14" v />
        <Grad id={`${u}pg2`} a="#9b5cff" b="#22d3ee" />
      </defs>
      <rect {...R} fill={`url(#${u}pg)`} />
      <rect x="18" y="22" width="64" height="56" rx="8" fill="#1c1d2b" stroke="#3a3c55" strokeWidth="1.5" />
      <circle cx="27" cy="30" r="2.6" fill="#ff5f57" />
      <circle cx="35" cy="30" r="2.6" fill="#febc2e" />
      <circle cx="43" cy="30" r="2.6" fill="#28c840" />
      <path d="m36 47-9 8 9 8M64 47l9 8-9 8M55 43l-10 25" fill="none" stroke={`url(#${u}pg2)`} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DocumentsIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <Grad id={`${u}dc`} a="#f5f7fb" b="#d9dee8" v />
        <Grad id={`${u}dc2`} a="#5aa7ff" b="#1f6fe5" v />
      </defs>
      <rect {...R} fill={`url(#${u}dc)`} />
      <path d="M30 22h28l14 14v40a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V26a4 4 0 0 1 4-4z" fill="#fff" stroke="#c7ccd6" strokeWidth="1.5" />
      <path d="M58 22v10a4 4 0 0 0 4 4h10" fill="#e9edf3" stroke="#c7ccd6" strokeWidth="1.5" />
      <path d="M34 46h28M34 54h28M34 62h18" stroke="#9aa3b2" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="52" y="60" width="26" height="20" rx="5" fill={`url(#${u}dc2)`} />
      <text x="65" y="74.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="-apple-system, system-ui, sans-serif">
        DOC
      </text>
    </svg>
  );
}

export function GuidebookIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <Grad id={`${u}gb`} a="#7b61ff" b="#3d2fd6" />
        <Grad id={`${u}gb2`} a="#ffd25e" b="#ff9f0a" v />
      </defs>
      <rect {...R} fill={`url(#${u}gb)`} />
      <path d="M50 30c-8-6-19-7-28-5v44c9-2 20-1 28 5 8-6 19-7 28-5V25c-9-2-20-1-28 5z" fill="#fff" />
      <path d="M50 30v44" stroke="#c9c2ff" strokeWidth="2.4" />
      <path d="M29 38c5-1 10 0 14 2M29 46c5-1 10 0 14 2M57 40c4-2 9-3 14-2M57 48c4-2 9-3 14-2" stroke="#7b61ff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M62 56l4 8 8 1-6 5 2 8-8-4-7 4 1-8-6-5 8-1z" fill={`url(#${u}gb2)`} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

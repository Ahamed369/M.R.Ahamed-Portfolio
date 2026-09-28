/**
 * v8 icons — original drawings in the same visual language as AppIcons.tsx
 * (brand-inspired colours only; no official logos are reproduced).
 */
const R = { x: 6, y: 6, width: 88, height: 88, rx: 21 };

export function WhatsAppIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}wa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ef08a" />
          <stop offset="1" stopColor="#1fb24a" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}wa)`} />
      <path d="M50 22c-15.5 0-28 11.6-28 26 0 5.4 1.8 10.4 4.8 14.6L23 76l14-4.4c3.9 2 8.4 3.2 13 3.2 15.5 0 28-11.6 28-26S65.5 22 50 22Z" fill="#fff" />
      <circle cx="38" cy="49" r="3.6" fill="#1fb24a" />
      <circle cx="50" cy="49" r="3.6" fill="#1fb24a" />
      <circle cx="62" cy="49" r="3.6" fill="#1fb24a" />
    </svg>
  );
}

export function TelegramIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}tg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ac8fa" />
          <stop offset="1" stopColor="#1c8adb" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}tg)`} />
      <path d="M24 49.5 72 30c2.4-1 4.6.6 3.9 3.6l-8.2 38.6c-.6 2.7-2.3 3.4-4.6 2.1L50.6 65l-6 5.8c-.7.7-1.3 1.2-2.6 1.2l.9-12.6 23-20.8c1-.9-.2-1.4-1.5-.5L35.9 56.2l-12.2-3.8c-2.6-.8-2.7-2.6.3-2.9Z" fill="#fff" />
    </svg>
  );
}

export function XIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}xx`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2b2e" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}xx)`} />
      <path d="M30 28h11l29 44H59Z" fill="#fff" />
      <path d="M68 28 34 72" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function YahooMailIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ym`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8c4dff" />
          <stop offset="1" stopColor="#5a1fc9" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ym)`} />
      <rect x="22" y="32" width="56" height="38" rx="7" fill="#fff" />
      <path d="M24 36l26 19 26-19" fill="none" stroke="#6d28d9" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="74" cy="30" r="8" fill="#ffd60a" stroke="#6d28d9" strokeWidth="2" />
    </svg>
  );
}

export function HireMeIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}hm`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}hm)`} />
      <rect x="24" y="36" width="52" height="36" rx="7" fill="#fff" />
      <path d="M40 36v-5a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v5" fill="none" stroke="#fff" strokeWidth="5" />
      <path d="M24 50h52" stroke="#0d9488" strokeWidth="3" />
      <path d="m41 57 6 6 12-12" fill="none" stroke="#0d9488" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CaseStudyIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}cs`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb340" />
          <stop offset="1" stopColor="#ff6b22" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}cs)`} />
      <rect x="27" y="22" width="46" height="58" rx="6" fill="#fff" />
      <rect x="34" y="30" width="32" height="14" rx="3" fill="#ff8a2a" opacity=".85" />
      <path d="M34 52h32M34 60h24M34 68h28" stroke="#9aa0a6" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="68" cy="68" r="10" fill="none" stroke="#1d1d1f" strokeWidth="4" />
      <path d="m75 75 7 7" stroke="#1d1d1f" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function AskAIIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ai`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset=".55" stopColor="#c84bff" />
          <stop offset="1" stopColor="#ff5fa2" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ai)`} />
      <path d="M26 36a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10H46l-12 9v-9h2a10 10 0 0 1-10-10Z" fill="#fff" />
      <path d="M50 34l3 7.5 7.5 3-7.5 3L50 55l-3-7.5-7.5-3 7.5-3Z" fill="#a855f7" />
      <circle cx="63" cy="36" r="2.6" fill="#ff5fa2" />
    </svg>
  );
}

export function GuestbookIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}gb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08457" />
          <stop offset="1" stopColor="#8a5530" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}gb)`} />
      <path d="M22 30c10-4 20-4 28 2 8-6 18-6 28-2v42c-10-4-20-4-28 2-8-6-18-6-28-2Z" fill="#fff8ec" />
      <path d="M50 32v42" stroke="#c9a57f" strokeWidth="2" />
      <path d="M29 42h14M29 50h14M57 42h14M57 50h10" stroke="#b08968" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M58 64c4-4 8 4 12 0" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function WalletIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}wl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2c2e" />
          <stop offset="1" stopColor="#0b0b0c" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}wl)`} />
      <rect x="22" y="24" width="56" height="16" rx="4" fill="#2f80ed" />
      <rect x="22" y="33" width="56" height="16" rx="4" fill="#ffcc00" />
      <rect x="22" y="42" width="56" height="16" rx="4" fill="#34c759" />
      <rect x="22" y="51" width="56" height="16" rx="4" fill="#ff453a" />
      <path d="M18 58h26c2 5 10 5 12 0h26v18a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6Z" fill="#d9d9dc" />
    </svg>
  );
}

export function PlayStoreIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ps`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9edf2" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ps)`} />
      <path d="M32 24 58 50 32 76c-1.6-.6-2.6-2.2-2.6-4.2V28.2c0-2 1-3.6 2.6-4.2Z" fill="#00c3ff" />
      <path d="m32 24 34 19.4L58 50Z" fill="#00e676" />
      <path d="m32 76 26-26 8 6.6Z" fill="#ff3d57" />
      <path d="m66 43.4 8.6 4.9c2.2 1.3 2.2 2.7 0 4l-8.6 4.3L58 50Z" fill="#ffc400" />
    </svg>
  );
}

export function ShareIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}sh`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa8ff" />
          <stop offset="1" stopColor="#0a6cf0" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}sh)`} />
      <path d="M36 44h-4a4 4 0 0 0-4 4v24a4 4 0 0 0 4 4h36a4 4 0 0 0 4-4V48a4 4 0 0 0-4-4h-4" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 22v36M38 33l12-12 12 12" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CvIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}cv`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b6b" />
          <stop offset="1" stopColor="#e03131" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}cv)`} />
      <path d="M32 20h26l12 12v46a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4Z" fill="#fff" />
      <path d="M58 20v12h12" fill="#ffd4d4" />
      <path d="M50 44v22M41 58l9 9 9-9" fill="none" stroke="#e03131" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

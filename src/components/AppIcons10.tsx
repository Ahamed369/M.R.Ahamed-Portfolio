/**
 * v10 icons — original artwork in the portfolio's squircle style.
 */
const R = { x: 6, y: 6, width: 88, height: 88, rx: 21 };

export function PhoneAppIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ph`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6cf08a" />
          <stop offset="1" stopColor="#1fbf45" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ph)`} />
      <path
        fill="#fff"
        d="M36.5 26.5c2-1.2 4.6-.6 5.9 1.4l4.6 7.2c1.2 1.9.8 4.4-.9 5.8l-3.4 2.8c2.6 5.5 6.9 9.8 12.4 12.4l2.8-3.4c1.4-1.7 3.9-2.1 5.8-.9l7.2 4.6c2 1.3 2.6 3.9 1.4 5.9l-2.4 4c-1.6 2.6-4.7 3.9-7.6 3.1C46.6 65.7 34.3 53.4 30.6 37.7c-.8-2.9.5-6 3.1-7.6z"
      />
    </svg>
  );
}

export function ShortcutsIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}sc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5f9e" />
          <stop offset=".5" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#2ea8ff" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}sc)`} />
      <rect x="27" y="27" width="34" height="34" rx="9" fill="#fff" opacity=".55" transform="rotate(-8 44 44)" />
      <rect x="39" y="39" width="34" height="34" rx="9" fill="#fff" transform="rotate(-8 56 56)" />
    </svg>
  );
}

export function ChessIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ch`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6a4b" />
          <stop offset="1" stopColor="#4a3524" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ch)`} />
      <path fill="#f4e7d4" d="M50 22a7 7 0 0 1 4.5 12.4c3.5 2.2 5.5 5.3 5.5 9.6 0 3-1.2 5.4-3 7.1l4 14H39l4-14c-1.8-1.7-3-4.1-3-7.1 0-4.3 2-7.4 5.5-9.6A7 7 0 0 1 50 22z" />
      <rect x="32" y="67" width="36" height="10" rx="4" fill="#f4e7d4" />
    </svg>
  );
}

export function TextEditIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}te`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e3e6ec" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}te)`} />
      {[30, 40, 50, 60].map((y, i) => (
        <rect key={y} x="26" y={y} width={i === 3 ? 30 : 48} height="4" rx="2" fill="#9aa3b2" />
      ))}
      <path d="M66 58l10-10 6 6-10 10-8 2z" fill="#f5a524" />
      <path d="M76 48l3-3 6 6-3 3z" fill="#ff6b6b" />
    </svg>
  );
}

export function FilesIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}fl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#eef2f7" />
        </linearGradient>
        <linearGradient id={`${u}fl2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ac8fa" />
          <stop offset="1" stopColor="#1e88e5" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}fl)`} />
      <path d="M22 34a5 5 0 0 1 5-5h14l5 6h27a5 5 0 0 1 5 5v27a5 5 0 0 1-5 5H27a5 5 0 0 1-5-5z" fill={`url(#${u}fl2)`} />
    </svg>
  );
}

export function AppLibraryIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#2c2c2e" data-u={u} />
      {[
        [26, 26, '#ff9f0a'],
        [54, 26, '#30d158'],
        [26, 54, '#0a84ff'],
        [54, 54, '#bf5af2'],
      ].map(([x, y, c]) => (
        <rect key={`${x}${y}`} x={x as number} y={y as number} width="20" height="20" rx="6" fill={c as string} />
      ))}
    </svg>
  );
}

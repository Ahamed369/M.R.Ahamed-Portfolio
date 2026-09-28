/**
 * v9 icons — original artwork in the portfolio's squircle style
 * (no third-party logos are reproduced; web services use generic glyphs).
 */
const R = { x: 6, y: 6, width: 88, height: 88, rx: 21 };

/** Live clock: the hands turn in real time (CSS animations started at the current time). */
export function LiveClockIcon(_: { u: string }) {
  const d = new Date();
  const s = d.getSeconds() + d.getMilliseconds() / 1000;
  const m = d.getMinutes() * 60 + s;
  const h = (d.getHours() % 12) * 3600 + m;
  const hand = (period: number, t: number) => ({ animation: `lclk ${period}s linear infinite`, animationDelay: `-${t}s` });
  return (
    <svg viewBox="0 0 100 100" className="live-clock">
      <rect {...R} fill="#111" />
      <circle cx="50" cy="50" r="34" fill="#fff" />
      {Array.from({ length: 12 }, (_x, i) => (
        <rect key={i} x="49" y="18" width="2" height={i % 3 === 0 ? 7 : 4} fill="#111" transform={`rotate(${i * 30} 50 50)`} />
      ))}
      <g className="lc-hand" style={hand(43200, h)}>
        <path d="M50 50V32" stroke="#111" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="lc-hand" style={hand(3600, m)}>
        <path d="M50 50V22" stroke="#111" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="lc-hand" style={hand(60, s)}>
        <path d="M50 57V21" stroke="#ff9f0a" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="3" fill="#ff9f0a" />
    </svg>
  );
}

export function BatteryIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}bt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ee07b" />
          <stop offset="1" stopColor="#1fa84a" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}bt)`} />
      <rect x="22" y="36" width="50" height="28" rx="7" fill="none" stroke="#fff" strokeWidth="4" />
      <rect x="74" y="44" width="5" height="12" rx="2" fill="#fff" />
      <rect x="27" y="41" width="30" height="18" rx="3" fill="#fff" />
    </svg>
  );
}

export function ActivityIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}am`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3f" />
          <stop offset="1" stopColor="#111114" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}am)`} />
      <rect x="18" y="22" width="64" height="56" rx="6" fill="#0b0b0d" stroke="#2c2c30" strokeWidth="2" />
      <path d="M22 58h12l6-18 9 30 8-22 5 10h16" fill="none" stroke="#35e06a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ServicesIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}sv`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6e8bff" />
          <stop offset="0.55" stopColor="#8a5cff" />
          <stop offset="1" stopColor="#ff5c9a" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}sv)`} />
      <rect x="24" y="36" width="52" height="38" rx="7" fill="#fff" opacity="0.95" />
      <path d="M40 36v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6" fill="none" stroke="#fff" strokeWidth="4" />
      <rect x="24" y="50" width="52" height="5" fill="#8a5cff" opacity="0.35" />
      <rect x="45" y="47" width="10" height="10" rx="2.5" fill="#8a5cff" />
    </svg>
  );
}

export function StickiesIcon(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#f6f1e4" />
      <rect x="20" y="18" width="46" height="46" rx="3" fill="#ffd84d" transform="rotate(-6 43 41)" />
      <rect x="34" y="34" width="46" height="46" rx="3" fill="#8fe388" transform="rotate(5 57 57)" />
      <path d="M42 50h28M42 58h24M42 66h18" stroke="#3b7a36" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" transform="rotate(5 57 57)" />
    </svg>
  );
}

export function SysPrefsIcon({ u }: { u: string }) {
  const teeth = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`${u}sp`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#c9ccd3" />
          <stop offset="1" stopColor="#7b7f88" />
        </radialGradient>
      </defs>
      <rect {...R} fill={`url(#${u}sp)`} />
      <g transform="translate(50 50)">
        {teeth.map((a) => (
          <rect key={a} x="-4.5" y="-33" width="9" height="12" rx="2" fill="#4a4d55" transform={`rotate(${a})`} />
        ))}
        <circle r="24" fill="#5b5e66" />
        <circle r="17" fill="#d6d8de" />
        <circle r="7" fill="#5b5e66" />
      </g>
    </svg>
  );
}

export function TranslateIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}tr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3aa0ff" />
          <stop offset="1" stopColor="#0a5cd6" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}tr)`} />
      <rect x="18" y="22" width="36" height="32" rx="7" fill="#fff" />
      <text x="36" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0a5cd6" fontFamily="-apple-system, Helvetica, Arial">A</text>
      <rect x="46" y="46" width="36" height="32" rx="7" fill="#0b1f45" stroke="#fff" strokeWidth="2" />
      <text x="64" y="70" textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff" fontFamily="-apple-system, Helvetica, Arial">文</text>
    </svg>
  );
}

export function FontBookIcon(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#fbfbfd" />
      <path d="M28 6V94H27C15 94 6 85 6 73V27C6 15 15 6 27 6Z" fill="#8c3a2b" />
      <text x="60" y="66" textAnchor="middle" fontSize="44" fontFamily="Georgia, 'Times New Roman', serif" fill="#222">Aa</text>
    </svg>
  );
}

export function GrapherIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}gr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2b4f" />
          <stop offset="1" stopColor="#0b1226" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}gr)`} />
      <path d="M18 50h64M50 18v64" stroke="#5b6a90" strokeWidth="1.5" />
      <path d="M18 70C30 70 34 30 50 30s20 40 32 40" fill="none" stroke="#ff9f0a" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M18 34c12 0 20 30 32 30s20-30 32-30" fill="none" stroke="#5ac8fa" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ColorMeterIcon({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}cm`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5f6d" />
          <stop offset="0.33" stopColor="#ffc371" />
          <stop offset="0.66" stopColor="#47e3a5" />
          <stop offset="1" stopColor="#4a7dff" />
        </linearGradient>
      </defs>
      <rect {...R} fill="#2a2a2e" />
      <circle cx="50" cy="50" r="30" fill={`url(#${u}cm)`} />
      <circle cx="50" cy="50" r="12" fill="#2a2a2e" stroke="#fff" strokeWidth="3" />
      <path d="M50 38v-8M50 70v-8M38 50h-8M70 50h-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Generic web-service tiles (letter mark on a colour — not the services' own logos) */
function Tile({ bg, fg = '#fff', mark, size = 40 }: { bg: string; fg?: string; mark: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill={bg} />
      <text x="50" y={50 + size * 0.36} textAnchor="middle" fontSize={size} fontWeight="800" fill={fg} fontFamily="-apple-system, 'Segoe UI', Helvetica, Arial">
        {mark}
      </text>
    </svg>
  );
}
export const DiscordIcon = () => <Tile bg="#5865f2" mark="D" />;
export const RedditIcon = () => <Tile bg="#ff5700" mark="r/" size={36} />;
export const StackIcon = () => <Tile bg="#f48024" mark="{ }" size={34} />;
export const PinterestIcon = () => <Tile bg="#e60023" mark="P" />;
export const CanvaIcon = () => <Tile bg="#00c4cc" mark="C" />;
export const GoogleDocsIcon = () => <Tile bg="#4285f4" mark="≡" size={46} />;

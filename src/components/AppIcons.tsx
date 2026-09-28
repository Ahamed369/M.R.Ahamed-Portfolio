/**
 * Original, hand-drawn SVG app icons in a macOS-like visual language.
 * (No proprietary icon assets are used.)
 */
import { useId, type ReactElement, type ReactNode } from 'react';
import { ActivityIcon, BatteryIcon, CanvaIcon, ColorMeterIcon, DiscordIcon, FontBookIcon, GoogleDocsIcon, GrapherIcon, LiveClockIcon, PinterestIcon, RedditIcon, ServicesIcon, StackIcon, StickiesIcon, SysPrefsIcon, TranslateIcon } from './AppIcons9';
import { AskAIIcon, CaseStudyIcon, CvIcon, GuestbookIcon, HireMeIcon, PlayStoreIcon, ShareIcon, TelegramIcon, WalletIcon, WhatsAppIcon, XIcon, YahooMailIcon } from './AppIcons8';

export type IconName =
  | 'finder'
  | 'safari'
  | 'notes'
  | 'slides'
  | 'xcode'
  | 'mail'
  | 'settings'
  | 'terminal'
  | 'preview'
  | 'pdf'
  | 'folder'
  | 'linkedin'
  | 'github'
  | 'email'
  | 'phone'
  | 'trash'
  | 'launchpad'
  | 'messages'
  | 'calendar'
  | 'photos'
  | 'music'
  | 'spotify'
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'youtube'
  | 'figma'
  | 'w3schools'
  | 'downloads'
  | 'briefcase'
  | 'graduation'
  | 'star'
  | 'timeline'
  | 'reminders'
  | 'maps'
  | 'google'
  | 'calculator'
  | 'clock'
  | 'contacts'
  | 'camera'
  | 'voicememos'
  | 'measure'
  | 'findmy'
  | 'home'
  | 'weather'
  | 'pages'
  | 'numbers'
  | 'appstore'
  | 'tips'
  | 'missioncontrol'
  | 'screentime'
  | 'shield'
  | 'books'
  | 'facetime'
  | 'podcasts'
  | 'tv'
  | 'journal'
  | 'stocks'
  | 'freeform'
  | 'siri'
  | 'passwords'
  | 'dictionary'
  | 'gamecenter'
  | 'keynote'
  | 'photobooth'
  | 'gmail'
  | 'drive'
  | 'gphotos'
  | 'classroom'
  | 'chatgpt'
  | 'deepseek'
  | 'gemini'
  | 'claude'
  | 'snapchat'
  | 'shazam'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'pdfreader'
  | 'trashfull'
  | 'whatsapp'
  | 'telegram'
  | 'xapp'
  | 'yahoomail'
  | 'hireme'
  | 'casestudies'
  | 'askai'
  | 'guestbook'
  | 'wallet'
  | 'playstore'
  | 'share'
  | 'cv'
  | 'battery'
  | 'activity'
  | 'services'
  | 'stickies'
  | 'sysprefs'
  | 'translate'
  | 'fontbook'
  | 'grapher'
  | 'colormeter'
  | 'discord'
  | 'reddit'
  | 'stackoverflow'
  | 'pinterest'
  | 'canva'
  | 'gdocs';

// Squircle-ish rounded square
const R = { x: 6, y: 6, width: 88, height: 88, rx: 21 };

function Finder({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}fi-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fdcff" />
          <stop offset="1" stopColor="#1f9bf0" />
        </linearGradient>
        <linearGradient id={`${u}fi-r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9f5ff" />
          <stop offset="1" stopColor="#bcdcf7" />
        </linearGradient>
        <clipPath id={`${u}fi-c`}>
          <rect {...R} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${u}fi-c)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${u}fi-r)`} />
        <path d="M0 0H56C50 22 46 40 49 58H40c-2 12 0 26 4 42H0Z" fill={`url(#${u}fi-l)`} />
        <path d="M56 0C50 22 46 40 49 58H40c-2 12 0 26 4 42" fill="none" stroke="#123a64" strokeWidth="3" />
        <rect x="30" y="30" width="5" height="13" rx="2.5" fill="#123a64" />
        <rect x="66" y="30" width="5" height="13" rx="2.5" fill="#123a64" />
        <path d="M25 66c14 10 36 10 50 0" fill="none" stroke="#123a64" strokeWidth="3.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Safari({ u }: { u: string }) {
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}sa-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe3ea" />
        </linearGradient>
        <radialGradient id={`${u}sa-f`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#4fc3ff" />
          <stop offset="1" stopColor="#0a63d8" />
        </radialGradient>
      </defs>
      <rect {...R} fill={`url(#${u}sa-b)`} />
      <circle cx="50" cy="50" r="35" fill={`url(#${u}sa-f)`} />
      {ticks.map((a) => (
        <line
          key={a}
          x1="50"
          y1="17"
          x2="50"
          y2={a % 45 === 0 ? 23 : 20}
          stroke="#fff"
          strokeWidth="1.2"
          opacity="0.85"
          transform={`rotate(${a} 50 50)`}
        />
      ))}
      <g transform="rotate(45 50 50)">
        <path d="M50 22 56 50H44Z" fill="#ff3b30" />
        <path d="M50 78 44 50h12Z" fill="#fff" />
      </g>
      <circle cx="50" cy="50" r="2.5" fill="#fff" />
    </svg>
  );
}

function Notes({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <clipPath id={`${u}no-c`}>
          <rect {...R} />
        </clipPath>
        <linearGradient id={`${u}no-t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe066" />
          <stop offset="1" stopColor="#f7c325" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${u}no-c)`}>
        <rect x="0" y="0" width="100" height="100" fill="#fbfbf8" />
        <rect x="0" y="0" width="100" height="30" fill={`url(#${u}no-t)`} />
        <line x1="6" y1="30" x2="94" y2="30" stroke="#d9a90f" strokeWidth="1" />
        {[46, 60, 74].map((y) => (
          <line key={y} x1="16" y1={y} x2="84" y2={y} stroke="#c9c9c4" strokeWidth="2" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} cx={18 + i * 8} cy="36" r="1.2" fill="#b8b8b3" />
        ))}
      </g>
    </svg>
  );
}

function Slides({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}sl-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a4d" />
          <stop offset="1" stopColor="#d43a1a" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}sl-b)`} />
      <rect x="22" y="26" width="56" height="38" rx="4" fill="#fff" />
      <path d="M50 34a11 11 0 1 0 11 11H50Z" fill="#e2502a" />
      <path d="M53 31a11 11 0 0 1 11 11H53Z" fill="#ffb199" />
      <rect x="47" y="64" width="6" height="10" fill="#fff" />
      <rect x="36" y="73" width="28" height="4" rx="2" fill="#fff" />
    </svg>
  );
}

function Xcode({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}xc-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ec8ff" />
          <stop offset="1" stopColor="#1570ef" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}xc-b)`} />
      <rect x="10" y="10" width="80" height="80" rx="18" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
      <path d="M38 34 22 50l16 16M62 34l16 16-16 16" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M55 28 45 72" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

function Mail({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ma-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fc2ff" />
          <stop offset="1" stopColor="#1c7cf4" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ma-b)`} />
      <rect x="20" y="30" width="60" height="42" rx="5" fill="#fff" />
      <path d="M21 32 50 55l29-23" fill="none" stroke="#7fb8f5" strokeWidth="3" strokeLinejoin="round" />
      <path d="M21 70 42 50M79 70 58 50" stroke="#cfe2f9" strokeWidth="2" />
    </svg>
  );
}

function Settings({ u }: { u: string }) {
  const teeth = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}se-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9ccd1" />
          <stop offset="1" stopColor="#8a8f97" />
        </linearGradient>
        <radialGradient id={`${u}se-g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e8eaee" />
          <stop offset="1" stopColor="#5d636c" />
        </radialGradient>
      </defs>
      <rect {...R} fill={`url(#${u}se-b)`} />
      <circle cx="50" cy="50" r="33" fill="#3f444c" />
      {teeth.map((a) => (
        <rect key={a} x="46.5" y="18" width="7" height="12" rx="1.5" fill={`url(#${u}se-g)`} transform={`rotate(${a} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="22" fill={`url(#${u}se-g)`} />
      <circle cx="50" cy="50" r="12" fill="#3f444c" />
      <circle cx="50" cy="50" r="6" fill="#b9bcc2" />
    </svg>
  );
}

function Terminal({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}te-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4d52" />
          <stop offset="1" stopColor="#1d1f22" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}te-b)`} />
      <rect x="12" y="14" width="76" height="72" rx="10" fill="#0d0f11" />
      <path d="M24 36 36 46 24 56" fill="none" stroke="#e8e8e8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="42" y="54" width="22" height="5" rx="2.5" fill="#e8e8e8" />
    </svg>
  );
}

function Pdf(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <path d="M24 6h38l20 20v64a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" fill="#fff" stroke="#d6d6d6" />
      <path d="M62 6v16a4 4 0 0 0 4 4h16" fill="#eaeaea" stroke="#d6d6d6" />
      <rect x="20" y="50" width="62" height="22" fill="#e5342b" />
      <text x="51" y="66.5" fontFamily="-apple-system, Helvetica, Arial" fontWeight="800" fontSize="14" fill="#fff" textAnchor="middle">
        PDF
      </text>
      {[30, 36, 42].map((y) => (
        <line key={y} x1="28" y1={y} x2="58" y2={y} stroke="#cfcfcf" strokeWidth="2" />
      ))}
      {[80, 86].map((y) => (
        <line key={y} x1="28" y1={y} x2="72" y2={y} stroke="#cfcfcf" strokeWidth="2" />
      ))}
    </svg>
  );
}

function Preview({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}pv-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f5f8" />
          <stop offset="1" stopColor="#cfd6df" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}pv-b)`} />
      <g transform="translate(14 8) scale(.72)">
        <Pdf u={u} />
      </g>
    </svg>
  );
}

function Folder({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}fo-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--folder-hi, #74c4ff)' }} />
          <stop offset="1" style={{ stopColor: 'var(--folder-lo, #2d8ff0)' }} />
        </linearGradient>
      </defs>
      <path d="M8 24a6 6 0 0 1 6-6h24l8 8h40a6 6 0 0 1 6 6v6H8Z" style={{ fill: 'var(--folder-tab, #3b95e8)' }} />
      <path d="M8 34a6 6 0 0 1 6-6h72a6 6 0 0 1 6 6v44a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6Z" fill={`url(#${u}fo-b)`} />
      <path d="M8 36h84" stroke="rgba(255,255,255,.45)" strokeWidth="1.5" />
    </svg>
  );
}

function LinkedIn(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#0a66c2" />
      <rect x="25" y="41" width="11" height="34" rx="1.5" fill="#fff" />
      <circle cx="30.5" cy="30" r="6.5" fill="#fff" />
      <path d="M44 41h10.5v5c2-3.4 5.7-6 11.2-6C74 40 77 45.5 77 54v21H66V56c0-4.5-1.6-7-5.3-7-4 0-6 2.8-6 7v19H44Z" fill="#fff" />
    </svg>
  );
}

function GitHub(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#16181c" />
      <g transform="translate(22 22) scale(2.34)" fill="#fff">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </g>
    </svg>
  );
}

function Email({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}em-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b5f" />
          <stop offset="1" stopColor="#d9302c" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}em-b)`} />
      <circle cx="50" cy="50" r="10.5" fill="none" stroke="#fff" strokeWidth="6" />
      <path d="M60.5 44v10c0 5 3 8 7 8s7-4 7-12a24.5 24.5 0 1 0-10 19.8" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function Phone({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ph-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ee07a" />
          <stop offset="1" stopColor="#1fb83a" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ph-b)`} />
      <path
        d="M37 25c2-1 4 0 5 2l5 10c1 2 .5 4-1 5.5l-4 3.5c3 6.5 8 11.5 14.5 14.5l3.5-4c1.5-1.5 3.5-2 5.5-1l10 5c2 1 3 3 2 5l-2.5 6c-1 2.5-3.5 4-6 3.8C47 73 27 53 25.2 31.5c-.2-2.5 1.3-5 3.8-6Z"
        fill="#fff"
      />
    </svg>
  );
}

/* ───────────── additional icons ───────────── */

function Launchpad({ u }: { u: string }) {
  const cols = ['#ff5f57', '#febc2e', '#28c840', '#5ac8fa', '#0a84ff', '#bf5af2', '#ff375f', '#ff9f0a', '#30d158'];
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}lp-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9ebef" />
          <stop offset="1" stopColor="#b9bec7" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}lp-b)`} />
      {cols.map((c, i) => (
        <rect key={c} x={22 + (i % 3) * 20} y={22 + Math.floor(i / 3) * 20} width="14" height="14" rx="4" fill={c} />
      ))}
    </svg>
  );
}

function Messages({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ms-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ef07c" />
          <stop offset="1" stopColor="#1dbb3a" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ms-b)`} />
      <path d="M50 24c-17.7 0-32 11.6-32 26 0 8 4.5 15.2 11.6 20L27 80l12.6-5.6A37 37 0 0 0 50 76c17.7 0 32-11.6 32-26S67.7 24 50 24Z" fill="#fff" />
    </svg>
  );
}

function Calendar({ u }: { u: string }) {
  const d = new Date();
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <clipPath id={`${u}ca-c`}>
          <rect {...R} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${u}ca-c)`}>
        <rect x="0" y="0" width="100" height="100" fill="#fff" />
        <rect x="0" y="0" width="100" height="30" fill="#ff3b30" />
      </g>
      <text x="50" y="24" textAnchor="middle" fontFamily="-apple-system, Helvetica, Arial" fontWeight="700" fontSize="14" fill="#fff">
        {mon}
      </text>
      <text x="50" y="76" textAnchor="middle" fontFamily="-apple-system, Helvetica, Arial" fontWeight="300" fontSize="44" fill="#1d1d1f">
        {d.getDate()}
      </text>
    </svg>
  );
}

function Photos({ u }: { u: string }) {
  const petals = ['#ff9500', '#ffcc00', '#34c759', '#30b0c7', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f'];
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <clipPath id={`${u}ph-c`}>
          <rect {...R} />
        </clipPath>
      </defs>
      <rect {...R} fill="#fff" />
      <g clipPath={`url(#${u}ph-c)`} style={{ mixBlendMode: 'multiply' }}>
        {petals.map((c, i) => (
          <ellipse key={c} cx="50" cy="31" rx="11" ry="19" fill={c} opacity="0.85" transform={`rotate(${i * 45} 50 50)`} />
        ))}
      </g>
    </svg>
  );
}

function Music({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}mu-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b81" />
          <stop offset="1" stopColor="#f5264b" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}mu-b)`} />
      <path d="M40 30 68 24v36a8 8 0 1 1-5-7.4V36l-18 4v26a8 8 0 1 1-5-7.4Z" fill="#fff" />
    </svg>
  );
}

function Spotify(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#121212" />
      <circle cx="50" cy="50" r="30" fill="#1ed760" />
      <path d="M34 42c11-4 24-3 33 2.5M36 51c9-3 19-2 27 2.5M38 59c7-2 14-1.5 21 2" fill="none" stroke="#121212" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

function Instagram({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <radialGradient id={`${u}ig-b`} cx="0.3" cy="1.05" r="1.2">
          <stop offset="0" stopColor="#fdd26a" />
          <stop offset="0.25" stopColor="#f77737" />
          <stop offset="0.5" stopColor="#e1306c" />
          <stop offset="0.75" stopColor="#c13584" />
          <stop offset="1" stopColor="#5b51d8" />
        </radialGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ig-b)`} />
      <rect x="27" y="27" width="46" height="46" rx="13" fill="none" stroke="#fff" strokeWidth="5.5" />
      <circle cx="50" cy="50" r="11" fill="none" stroke="#fff" strokeWidth="5.5" />
      <circle cx="63.5" cy="36.5" r="3.4" fill="#fff" />
    </svg>
  );
}

function Facebook(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#1877f2" />
      <path d="M55 84V56h9.5l1.5-11H55v-7c0-3.2 1-5.4 5.6-5.4H66v-9.8a77 77 0 0 0-8.4-.4C49.3 22.4 44 27.4 44 36.7V45h-9.4v11H44v28Z" fill="#fff" />
    </svg>
  );
}

function Threads(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#0b0b0b" />
      <path
        d="M63 47c-1.4-8-7-12-14-12-8 0-13.6 5.2-14.5 12.6M64.5 48c8 3.6 10.6 11.2 7 18.3C67.8 73.6 60 77 50 77c-15 0-24-10-24-27s9-27 24-27c11.6 0 19.6 5.8 22.6 16M63 50.5C62.5 59 58 64 51 64c-5.6 0-9-3-9-7.2 0-4.8 4.4-8 11-8 4 0 7.2.5 10 1.7"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function YouTube(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#fff" />
      <rect x="18" y="30" width="64" height="42" rx="12" fill="#ff0000" />
      <path d="M44 40v22l19-11Z" fill="#fff" />
    </svg>
  );
}

function Figma(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#1e1e1e" />
      <path d="M40 22h10v18H40a9 9 0 0 1 0-18Z" fill="#f24e1e" />
      <path d="M50 22h10a9 9 0 0 1 0 18H50Z" fill="#ff7262" />
      <path d="M40 40h10v18H40a9 9 0 0 1 0-18Z" fill="#a259ff" />
      <circle cx="60" cy="49" r="9" fill="#1abcfe" />
      <path d="M40 58h10v9a9 9 0 1 1-10-9Z" fill="#0acf83" />
    </svg>
  );
}

function W3Schools(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#04aa6d" />
      <text x="50" y="62" textAnchor="middle" fontFamily="-apple-system, Helvetica, Arial" fontWeight="800" fontSize="32" fill="#fff">
        W3
      </text>
    </svg>
  );
}

function Downloads({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}dl-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--folder-hi, #74c4ff)' }} />
          <stop offset="1" style={{ stopColor: 'var(--folder-lo, #2d8ff0)' }} />
        </linearGradient>
      </defs>
      <path d="M8 24a6 6 0 0 1 6-6h24l8 8h40a6 6 0 0 1 6 6v6H8Z" style={{ fill: 'var(--folder-tab, #3b95e8)' }} />
      <path d="M8 34a6 6 0 0 1 6-6h72a6 6 0 0 1 6 6v44a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6Z" fill={`url(#${u}dl-b)`} />
      <path d="M50 42v24M40 57l10 10 10-10" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Glyph({ u, from, to, children }: { u: string; from: string; to: string; children: ReactElement }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}gl-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}gl-b)`} />
      {children}
    </svg>
  );
}

const Briefcase = ({ u }: { u: string }) => (
  <Glyph u={u} from="#a57a52" to="#6d4a2b">
    <g fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round">
      <rect x="24" y="38" width="52" height="34" rx="6" />
      <path d="M40 38v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6M24 52h52" />
    </g>
  </Glyph>
);
const Graduation = ({ u }: { u: string }) => (
  <Glyph u={u} from="#5e8bff" to="#2342b8">
    <g fill="#fff">
      <path d="M50 26 16 42l34 16 34-16Z" />
      <path d="M30 51v12c0 5 9 10 20 10s20-5 20-10V51L50 61Z" />
      <rect x="78" y="42" width="3.5" height="20" rx="1.7" />
    </g>
  </Glyph>
);
const Star = ({ u }: { u: string }) => (
  <Glyph u={u} from="#ffd24a" to="#f59e0b">
    <path d="m50 22 8.6 17.5 19.4 2.8-14 13.6 3.3 19.3L50 66.1 32.7 75.2 36 55.9 22 42.3l19.4-2.8Z" fill="#fff" />
  </Glyph>
);
const Timeline = ({ u }: { u: string }) => (
  <Glyph u={u} from="#34c7c7" to="#0f766e">
    <g stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="#fff">
      <path d="M32 26v48" />
      <circle cx="32" cy="32" r="5" />
      <circle cx="32" cy="50" r="5" />
      <circle cx="32" cy="68" r="5" />
      <path d="M44 32h24M44 50h18M44 68h22" />
    </g>
  </Glyph>
);

function Reminders(_: { u: string }) {
  const rows = [
    ['#ff9f0a', 36],
    ['#0a84ff', 52],
    ['#ff375f', 68],
  ] as const;
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#fff" />
      {rows.map(([c, y]) => (
        <g key={y}>
          <circle cx="30" cy={y} r="6" fill="none" stroke={c} strokeWidth="3" />
          <circle cx="30" cy={y} r="2.6" fill={c} />
          <rect x="42" y={y - 2} width="36" height="4" rx="2" fill="#d1d1d6" />
        </g>
      ))}
    </svg>
  );
}

function Maps({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <clipPath id={`${u}mp-c`}>
          <rect {...R} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${u}mp-c)`}>
        <rect x="0" y="0" width="100" height="100" fill="#dff2d8" />
        <path d="M0 64 40 44 100 70V100H0Z" fill="#bfe5b3" />
        <path d="M-5 30 105 76" stroke="#fff" strokeWidth="10" />
        <path d="M-5 30 105 76" stroke="#fcd34d" strokeWidth="3" />
        <path d="M62 0 44 100" stroke="#fff" strokeWidth="8" />
      </g>
      <path d="M50 20a15 15 0 0 0-15 15c0 11 15 27 15 27s15-16 15-27a15 15 0 0 0-15-15Z" fill="#ea4335" />
      <circle cx="50" cy="35" r="5.5" fill="#fff" />
    </svg>
  );
}

function Google(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#fff" />
      <path d="M72 51.5c0-1.6-.1-3.1-.4-4.5H50v8.6h12.3a10.6 10.6 0 0 1-4.6 6.9v5.7h7.4c4.3-4 6.9-9.9 6.9-16.7Z" fill="#4285f4" />
      <path d="M50 74c6.2 0 11.4-2 15.1-5.5l-7.4-5.7c-2 1.4-4.7 2.2-7.7 2.2-5.9 0-11-4-12.8-9.4h-7.6v5.9A22.8 22.8 0 0 0 50 74Z" fill="#34a853" />
      <path d="M37.2 55.6a13.7 13.7 0 0 1 0-8.8v-5.9h-7.6a22.8 22.8 0 0 0 0 20.6Z" fill="#fbbc05" />
      <path d="M50 37.5c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6A22.1 22.1 0 0 0 50 28.2a22.8 22.8 0 0 0-20.4 12.6l7.6 5.9c1.8-5.4 6.9-9.2 12.8-9.2Z" fill="#ea4335" />
    </svg>
  );
}

function Calculator({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ca-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4a4f" />
          <stop offset="1" stopColor="#1f1f22" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ca-b)`} />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <circle key={`${r}${c}`} cx={26 + c * 16} cy={30 + r * 14} r="5.6" fill={c === 3 ? '#ff9f0a' : r === 0 ? '#a5a5aa' : '#636366'} />
        )),
      )}
      <rect x="18" y="80" width="64" height="4" rx="2" fill="#636366" opacity=".4" />
    </svg>
  );
}

function Contacts({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}ct-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9b98f" />
          <stop offset="1" stopColor="#a8845b" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}ct-b)`} />
      <rect x="22" y="16" width="58" height="70" rx="6" fill="#f7f1e8" />
      <rect x="16" y="26" width="8" height="8" rx="2" fill="#7a5c3b" />
      <rect x="16" y="46" width="8" height="8" rx="2" fill="#7a5c3b" />
      <rect x="16" y="66" width="8" height="8" rx="2" fill="#7a5c3b" />
      <circle cx="51" cy="42" r="11" fill="#9a9aa0" />
      <path d="M32 72c2-11 10-16 19-16s17 5 19 16Z" fill="#9a9aa0" />
    </svg>
  );
}


function Camera({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}cm-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b5b61" />
          <stop offset="1" stopColor="#1c1c1f" />
        </linearGradient>
        <radialGradient id={`${u}cm-l`} cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#6fb6ff" />
          <stop offset=".45" stopColor="#1b3f8f" />
          <stop offset="1" stopColor="#05070f" />
        </radialGradient>
      </defs>
      <rect {...R} fill={`url(#${u}cm-b)`} />
      <rect x="18" y="32" width="64" height="44" rx="10" fill="#d8d8dc" />
      <rect x="36" y="25" width="22" height="10" rx="4" fill="#d8d8dc" />
      <circle cx="50" cy="54" r="17" fill="#2b2b30" />
      <circle cx="50" cy="54" r="13" fill={`url(#${u}cm-l)`} />
      <circle cx="45" cy="49" r="3.4" fill="#fff" opacity=".75" />
      <circle cx="72" cy="40" r="3" fill="#ffd60a" />
    </svg>
  );
}

function VoiceMemos(_: { u: string }) {
  const bars = [8, 16, 26, 14, 34, 22, 40, 18, 28, 12, 22, 9, 16, 6];
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#111113" />
      {bars.map((h, i) => (
        <rect key={i} x={17 + i * 4.8} y={50 - h / 2} width="2.6" height={h} rx="1.3" fill={i < 7 ? '#ff453a' : '#f2f2f7'} />
      ))}
      <rect x="49" y="18" width="2" height="64" rx="1" fill="#0a84ff" />
      <circle cx="50" cy="18" r="3" fill="#0a84ff" />
    </svg>
  );
}

function Measure(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#1c1c1e" />
      <g transform="rotate(-35 50 50)">
        <rect x="12" y="38" width="76" height="24" rx="4" fill="#ffd60a" />
        {Array.from({ length: 13 }, (_x, i) => (
          <rect key={i} x={17 + i * 5.6} y="38" width="1.6" height={i % 2 ? 7 : 12} fill="#1c1c1e" />
        ))}
      </g>
    </svg>
  );
}

function FindMy({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}fm-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f7f9" />
          <stop offset="1" stopColor="#d9d9de" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}fm-b)`} />
      <circle cx="50" cy="52" r="32" fill="#34c759" />
      <circle cx="50" cy="52" r="23" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
      <circle cx="50" cy="52" r="13" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
      <circle cx="50" cy="52" r="6.5" fill="#fff" />
      <circle cx="50" cy="52" r="3.6" fill="#0a84ff" />
    </svg>
  );
}

function Home({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#fff" />
      <defs>
        <linearGradient id={`${u}hm-h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb340" />
          <stop offset="1" stopColor="#ff8a00" />
        </linearGradient>
      </defs>
      <path d="M50 20 16 48h9v30h50V48h9Z" fill={`url(#${u}hm-h)`} strokeLinejoin="round" />
      <rect x="42" y="56" width="16" height="22" rx="3" fill="#fff" opacity=".9" />
    </svg>
  );
}

function Weather({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}wx-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3aa0ff" />
          <stop offset="1" stopColor="#1661d6" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}wx-b)`} />
      <circle cx="62" cy="38" r="15" fill="#ffd60a" />
      <path d="M30 72a13 13 0 0 1 2-26 17 17 0 0 1 32 4 11 11 0 0 1 2 22Z" fill="#fff" />
    </svg>
  );
}

function Pages({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}pg-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb340" />
          <stop offset="1" stopColor="#ff8a00" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}pg-b)`} />
      <path d="M28 74 70 26l6 5-42 49-9 3Z" fill="#fff" />
      <path d="M70 26l6 5 3-4a4 4 0 0 0-6-5Z" fill="#ffe2b8" />
      <rect x="24" y="80" width="52" height="3" rx="1.5" fill="#fff" opacity=".8" />
    </svg>
  );
}

function Numbers({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}nb-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3ddc6a" />
          <stop offset="1" stopColor="#15a63d" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}nb-b)`} />
      {[
        [24, 58],
        [38, 44],
        [52, 30],
        [66, 20],
      ].map(([x, y]) => (
        <rect key={x} x={x} y={y} width="10" height={78 - y} rx="3" fill="#fff" />
      ))}
    </svg>
  );
}

function AppStore({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}as-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35c3ff" />
          <stop offset="1" stopColor="#1473e6" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}as-b)`} />
      <path d="M30 40h40l-3 36H33Z" fill="#fff" />
      <path d="M40 42v-6a10 10 0 0 1 20 0v6" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 58h12M50 52v12" stroke="#1473e6" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Tips({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}tp-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd84a" />
          <stop offset="1" stopColor="#ffb300" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}tp-b)`} />
      <path d="M50 18a22 22 0 0 0-13 40c3 2 4 5 4 8h18c0-3 1-6 4-8a22 22 0 0 0-13-40Z" fill="#fff" />
      <rect x="41" y="70" width="18" height="5" rx="2.5" fill="#fff" opacity=".85" />
      <rect x="43" y="78" width="14" height="4" rx="2" fill="#fff" opacity=".7" />
    </svg>
  );
}

function MissionControl(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#1c1c1e" />
      <rect x="17" y="22" width="30" height="24" rx="4" fill="#f2f2f7" />
      <rect x="53" y="22" width="30" height="36" rx="4" fill="#d1d1d6" />
      <rect x="17" y="52" width="30" height="26" rx="4" fill="#d1d1d6" />
      <rect x="53" y="64" width="30" height="14" rx="4" fill="#f2f2f7" />
      <rect x="21" y="26" width="8" height="3" rx="1.5" fill="#34c759" />
    </svg>
  );
}

function ScreenTime({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}st-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8e7bff" />
          <stop offset="1" stopColor="#5b3fd6" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}st-b)`} />
      <path d="M32 20h36M32 80h36M36 22c0 16 14 18 14 28S36 62 36 78h28c0-16-14-18-14-28s14-12 14-28" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Shield(_: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <rect {...R} fill="#5e5ce6" />
      <path d="M50 18 24 28v20c0 17 11 29 26 34 15-5 26-17 26-34V28Z" fill="#fff" />
      <path d="m38 50 9 9 16-18" fill="none" stroke="#5e5ce6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Books({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}bk-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffa24a" />
          <stop offset="1" stopColor="#ff6a00" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}bk-b)`} />
      <path d="M50 30c-8-5-18-6-28-4v46c10-2 20-1 28 4Z" fill="#fff" />
      <path d="M50 30c8-5 18-6 28-4v46c-10-2-20-1-28 4Z" fill="#ffe9d4" />
    </svg>
  );
}

/* ───────────── v7 icons (original drawings) ───────────── */

const SANS = '-apple-system, "SF Pro Display", Helvetica, Arial, sans-serif';

/** Shared tile with a vertical gradient background. */
function Tile({ u, id, from, to, children }: { u: string; id: string; from: string; to: string; children?: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}${id}-b)`} />
      {children}
    </svg>
  );
}

function FaceTime({ u }: { u: string }) {
  return (
    <Tile u={u} id="ft" from="#6af07f" to="#15b534">
      <rect x="20" y="35" width="42" height="30" rx="8" fill="#fff" />
      <path d="M64 46.5 79 37.5a2 2 0 0 1 3 1.7v21.6a2 2 0 0 1-3 1.7L64 53.5Z" fill="#fff" />
    </Tile>
  );
}

function Podcasts({ u }: { u: string }) {
  return (
    <Tile u={u} id="pc" from="#e07cff" to="#8a2fd8">
      <g fill="none" stroke="#fff" strokeLinecap="round">
        <path d="M34.5 62a22 22 0 1 1 31 0" strokeWidth="5" />
        <path d="M40.5 55a13 13 0 1 1 19 0" strokeWidth="4.5" />
      </g>
      <circle cx="50" cy="45" r="6.5" fill="#fff" />
      <path d="M45 58a5 5 0 0 1 10 0l-1.6 16a3.4 3.4 0 0 1-6.8 0Z" fill="#fff" />
    </Tile>
  );
}

function TV({ u }: { u: string }) {
  return (
    <Tile u={u} id="tv" from="#3a3a3e" to="#0d0d0f">
      <rect x="22" y="26" width="56" height="36" rx="5" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M40 70h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <text x="50" y="50.5" fontFamily={SANS} fontWeight="700" fontSize="16" fill="#fff" textAnchor="middle">
        TV
      </text>
    </Tile>
  );
}

function Journal({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}jo-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb38a" />
          <stop offset=".5" stopColor="#f472b6" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      <rect {...R} fill={`url(#${u}jo-b)`} />
      <rect x="28" y="22" width="44" height="56" rx="6" fill="#fff" />
      <rect x="28" y="22" width="9" height="56" rx="4" fill="#f1e8ff" />
      <path d="M58 22h9v22l-4.5-4-4.5 4Z" fill="#ff6b8b" />
      {[52, 60, 68].map((y) => (
        <line key={y} x1="43" y1={y} x2="65" y2={y} stroke="#d9cfee" strokeWidth="2.4" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function Stocks({ u }: { u: string }) {
  return (
    <Tile u={u} id="st" from="#2a2a2d" to="#050506">
      {[36, 50, 64].map((y) => (
        <line key={y} x1="18" y1={y} x2="82" y2={y} stroke="#48484c" strokeWidth="1.4" />
      ))}
      <path d="M18 66 30 56l9 5 11-16 10 7 10-15 12-9" fill="none" stroke="#30d158" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="82" cy="28" r="3.5" fill="#30d158" />
    </Tile>
  );
}

function Freeform({ u }: { u: string }) {
  return (
    <Tile u={u} id="ff" from="#ffffff" to="#e9edf3">
      <rect x="54" y="22" width="24" height="24" rx="3" fill="#ffd84d" transform="rotate(6 66 34)" />
      <path d="M22 70c8-22 16-30 22-24s-6 18 2 20 14-18 22-12" fill="none" stroke="#0a84ff" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="30" cy="32" r="9" fill="none" stroke="#ff375f" strokeWidth="4" />
      <path d="M58 74h20" stroke="#30d158" strokeWidth="4.5" strokeLinecap="round" />
    </Tile>
  );
}

function Siri({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}si-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d2f38" />
          <stop offset="1" stopColor="#07070b" />
        </linearGradient>
        <radialGradient id={`${u}si-1`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff5ec4" stopOpacity=".95" />
          <stop offset="1" stopColor="#ff5ec4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}si-2`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#3ab8ff" stopOpacity=".95" />
          <stop offset="1" stopColor="#3ab8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}si-3`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#8c5bff" stopOpacity=".95" />
          <stop offset="1" stopColor="#8c5bff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${u}si-c`} cx=".45" cy=".4" r=".6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect {...R} fill={`url(#${u}si-b)`} />
      <circle cx="50" cy="50" r="27" fill="#0b0b14" />
      <ellipse cx="42" cy="44" rx="22" ry="18" fill={`url(#${u}si-1)`} />
      <ellipse cx="59" cy="48" rx="20" ry="22" fill={`url(#${u}si-2)`} />
      <ellipse cx="48" cy="60" rx="22" ry="16" fill={`url(#${u}si-3)`} />
      <circle cx="50" cy="49" r="12" fill={`url(#${u}si-c)`} opacity=".7" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.2" />
    </svg>
  );
}

function Passwords({ u }: { u: string }) {
  return (
    <Tile u={u} id="pw" from="#62d0ff" to="#0a6fe0">
      <circle cx="38" cy="42" r="15" fill="none" stroke="#fff" strokeWidth="7" />
      <path d="M49 53 72 76M62 66l6-6M68 72l5-5" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
    </Tile>
  );
}

function Dictionary({ u }: { u: string }) {
  return (
    <Tile u={u} id="dc" from="#b3423a" to="#6e1712">
      <path d="M26 24h44a6 6 0 0 1 6 6v46H32a6 6 0 0 1-6-6Z" fill="#fbf7ef" />
      <path d="M26 70a6 6 0 0 1 6-6h44v12H32a6 6 0 0 1-6-6Z" fill="#e9dfcc" />
      <text x="51" y="54" fontFamily={'Georgia, "Times New Roman", serif'} fontWeight="700" fontSize="24" fill="#6e1712" textAnchor="middle">
        Aa
      </text>
    </Tile>
  );
}

function GameCenter({ u }: { u: string }) {
  return (
    <Tile u={u} id="gc" from="#ffffff" to="#e8eaee">
      <circle cx="40" cy="40" r="17" fill="#ff4f9a" opacity=".92" />
      <circle cx="62" cy="36" r="13" fill="#ffc53d" opacity=".92" />
      <circle cx="60" cy="61" r="15" fill="#34c3ff" opacity=".9" />
      <circle cx="38" cy="65" r="10" fill="#34d399" opacity=".92" />
    </Tile>
  );
}

function Keynote({ u }: { u: string }) {
  return (
    <Tile u={u} id="kn" from="#54a8ff" to="#1560d8">
      <rect x="20" y="22" width="60" height="36" rx="4" fill="#fff" />
      <path d="M30 50l10-12 8 8 7-6 11 10Z" fill="#78b8ff" />
      <path d="M40 62h20l-4 16H44Z" fill="#dbeafe" />
      <rect x="32" y="76" width="36" height="5" rx="2.5" fill="#fff" />
    </Tile>
  );
}

function PhotoBooth({ u }: { u: string }) {
  return (
    <Tile u={u} id="pb" from="#ff5a4f" to="#b3121a">
      <rect x="33" y="16" width="34" height="70" rx="3" fill="#fff" transform="rotate(-8 50 51)" />
      <g transform="rotate(-8 50 51)">
        {[20, 41, 62].map((y, i) => (
          <rect key={y} x="37" y={y} width="26" height="18" rx="2" fill={['#ffd166', '#7ad3ff', '#b692ff'][i]} />
        ))}
      </g>
    </Tile>
  );
}

function Gmail({ u }: { u: string }) {
  return (
    <Tile u={u} id="gm" from="#ffffff" to="#eef0f3">
      <rect x="20" y="30" width="60" height="42" rx="6" fill="#fff" stroke="#e1e3e8" />
      <path d="M22 34 50 55 78 34" fill="none" stroke="#ea4335" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M22 34v36M78 34v36" stroke="#c5221f" strokeWidth="6" strokeLinecap="round" />
    </Tile>
  );
}

function Drive({ u }: { u: string }) {
  return (
    <Tile u={u} id="dr" from="#ffffff" to="#eef0f3">
      <path d="M20 34a5 5 0 0 1 5-5h16l6 6h28a5 5 0 0 1 5 5v6H20Z" fill="#fbbc04" />
      <path d="M20 44h60v25a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5Z" fill="#1a73e8" />
      <path d="M20 44h60v10H20Z" fill="#34a853" />
      <path d="M44 58h12l6 10H38Z" fill="#fff" opacity=".9" />
    </Tile>
  );
}

function GPhotos({ u }: { u: string }) {
  const c = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
  return (
    <Tile u={u} id="gp" from="#ffffff" to="#eef0f3">
      {c.map((col, i) => (
        <ellipse key={col} cx="50" cy="35" rx="11" ry="15" fill={col} opacity=".9" transform={`rotate(${i * 90 + 20} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="5" fill="#fff" />
    </Tile>
  );
}

function Classroom({ u }: { u: string }) {
  return (
    <Tile u={u} id="cl" from="#ffffff" to="#eef0f3">
      <rect x="16" y="24" width="68" height="46" rx="4" fill="#f9c02e" />
      <rect x="20" y="28" width="60" height="38" rx="2" fill="#1e8e3e" />
      <circle cx="50" cy="42" r="6" fill="#fff" />
      <path d="M40 60a10 8 0 0 1 20 0Z" fill="#fff" />
      <circle cx="33" cy="46" r="4" fill="#a8dab5" />
      <circle cx="67" cy="46" r="4" fill="#a8dab5" />
      <rect x="58" y="72" width="16" height="4" rx="2" fill="#bdbdbd" />
    </Tile>
  );
}

function Sparkle({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const k = r * 0.16;
  return (
    <path
      d={`M${cx} ${cy - r}C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy}C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r}C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy}C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r}Z`}
      fill={fill}
    />
  );
}

function ChatGPT({ u }: { u: string }) {
  return (
    <Tile u={u} id="cg" from="#19c79a" to="#0b6b53">
      <path d="M50 24c16 0 28 10 28 23S66 70 50 70c-3 0-6-.4-9-1.2L28 76l3.6-11C25.6 60.8 22 54.3 22 47c0-13 12-23 28-23Z" fill="#fff" />
      <Sparkle cx={50} cy={47} r={13} fill="#0f8a6a" />
    </Tile>
  );
}

function DeepSeek({ u }: { u: string }) {
  return (
    <Tile u={u} id="ds" from="#6a86ff" to="#2f46d6">
      <path d="M18 58c10-4 16-16 30-18 14-2 24 6 34 2-4 12-16 22-32 22-6 0-10-2-13-4l-9 6 2-9c-5 1-9 1-12 1Z" fill="#fff" />
      <path d="M58 40c2-8 8-14 16-16-2 6-3 12-2 18" fill="#fff" />
      <circle cx="66" cy="50" r="2.6" fill="#2f46d6" />
      <path d="M22 72c8 4 16 4 24 0s16-4 24 0" fill="none" stroke="#bcc8ff" strokeWidth="3.4" strokeLinecap="round" />
    </Tile>
  );
}

function Gemini({ u }: { u: string }) {
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}gm-s`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1f6bff" />
          <stop offset=".55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ff7ab8" />
        </linearGradient>
      </defs>
      <rect {...R} fill="#fff" />
      <Sparkle cx={50} cy={50} r={32} fill={`url(#${u}gm-s)`} />
    </svg>
  );
}

function Claude({ u }: { u: string }) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <Tile u={u} id="cd" from="#e58a64" to="#c25d38">
      <g transform="translate(50 50)">
        {rays.map((a, i) => (
          <rect key={a} x="-3" y={-30 + (i % 2) * 5} width="6" height={25 - (i % 2) * 5} rx="3" fill="#fff" transform={`rotate(${a + (i % 3) * 4})`} />
        ))}
        <circle r="7" fill="#fff" />
      </g>
    </Tile>
  );
}

function Snapchat({ u }: { u: string }) {
  return (
    <Tile u={u} id="sc" from="#fffc3a" to="#f5e400">
      <path
        d="M50 22c12 0 20 9 20 20v8l6-1c2 0 3 2 1 3l-6 3c1 5 5 9 10 11-1 2-5 3-9 3l-2 4-6-1c-4 0-8 6-14 6s-10-6-14-6l-6 1-2-4c-4 0-8-1-9-3 5-2 9-6 10-11l-6-3c-2-1-1-3 1-3l6 1v-8c0-11 8-20 20-20Z"
        fill="#fff"
        stroke="#1b1b1b"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </Tile>
  );
}

function Shazam({ u }: { u: string }) {
  return (
    <Tile u={u} id="sz" from="#2fa4ff" to="#0060e6">
      <circle cx="50" cy="50" r="28" fill="none" stroke="#fff" strokeWidth="3" opacity=".35" />
      <g fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M56 30 40 46a6 6 0 0 0 0 8l6 6" />
        <path d="M44 70l16-16a6 6 0 0 0 0-8l-6-6" />
      </g>
    </Tile>
  );
}

function OfficeDoc({ u, id, from, to, letter, children }: { u: string; id: string; from: string; to: string; letter: string; children: ReactElement }) {
  return (
    <Tile u={u} id={id} from={from} to={to}>
      <path d="M44 20h26l12 12v44a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4Z" fill="#fff" opacity=".96" />
      {children}
      <rect x="16" y="34" width="36" height="36" rx="6" fill="rgba(0,0,0,.28)" />
      <text x="34" y="61" fontFamily={SANS} fontWeight="800" fontSize="25" fill="#fff" textAnchor="middle">
        {letter}
      </text>
    </Tile>
  );
}

const Word = ({ u }: { u: string }) => (
  <OfficeDoc u={u} id="wd" from="#3a86e8" to="#133f9a" letter="W">
    <g stroke="#9cbdf0" strokeWidth="3" strokeLinecap="round">
      <path d="M56 38h18M56 47h18M56 56h18M56 65h14" />
    </g>
  </OfficeDoc>
);

const Excel = ({ u }: { u: string }) => (
  <OfficeDoc u={u} id="xl" from="#2fb46a" to="#0b5e30" letter="X">
    <g stroke="#9fd8b6" strokeWidth="2.4">
      <path d="M54 36h24M54 46h24M54 56h24M54 66h24M66 32v40" />
    </g>
  </OfficeDoc>
);

const PowerPoint = ({ u }: { u: string }) => (
  <OfficeDoc u={u} id="pp" from="#f07a4c" to="#b23512" letter="P">
    <g>
      <circle cx="66" cy="52" r="12" fill="#f7b79d" />
      <path d="M66 52V40a12 12 0 0 1 12 12Z" fill="#e2572b" />
    </g>
  </OfficeDoc>
);

function PdfReader({ u }: { u: string }) {
  return (
    <Tile u={u} id="pr" from="#ff5a4a" to="#b3140c">
      <path d="M30 18h28l14 14v46a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4Z" fill="#fff" />
      <path d="M58 18v10a4 4 0 0 0 4 4h10" fill="#f2d4d1" />
      <path d="M38 64c6-10 10-22 10-28 0-4-4-4-4 0 0 8 10 20 20 22 4 1 4-3 0-3-10 0-22 6-26 9-2 2 0 4 0 0Z" fill="none" stroke="#e5342b" strokeWidth="2.6" strokeLinejoin="round" />
      <text x="49" y="77" fontFamily={SANS} fontWeight="800" fontSize="9" fill="#e5342b" textAnchor="middle">
        PDF
      </text>
    </Tile>
  );
}

/** macOS-style mesh trash can; `full` adds crumpled paper poking out. */
function TrashCan({ u, full }: { u: string; full?: boolean }) {
  const rows = [30, 40, 50, 60, 70, 80];
  const cols = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`${u}tc-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9ced6" stopOpacity=".92" />
          <stop offset=".45" stopColor="#f7f8fa" stopOpacity=".95" />
          <stop offset="1" stopColor="#b3b9c2" stopOpacity=".92" />
        </linearGradient>
        <linearGradient id={`${u}tc-i`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d737c" />
          <stop offset="1" stopColor="#a4aab2" />
        </linearGradient>
        <linearGradient id={`${u}tc-p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9dde3" />
        </linearGradient>
      </defs>
      {/* opening (inside of the can) */}
      <ellipse cx="50" cy="20" rx="31" ry="7" fill={`url(#${u}tc-i)`} />
      {full && (
        <g stroke="#b8bec7" strokeWidth=".8" strokeLinejoin="round">
          <path d="M56 22 60 4l17 5-6 16Z" fill="#fdfdfd" transform="rotate(8 66 14)" />
          <path d="M62 8h9M61 12h9M60 16h7" stroke="#c6d4ea" strokeWidth="1.4" transform="rotate(8 66 14)" />
          <path d="M30 20c-2-7 3-12 9-11 3-4 10-3 11 2 5 0 7 6 4 10-2 3-7 3-9 1-3 3-10 3-12 1-2 1-3-1-3-3Z" fill={`url(#${u}tc-p)`} />
          <path d="M36 12l4 4-2 4M45 11l-3 6 5 2" fill="none" stroke="#c3c8cf" />
          <path d="M48 22c-1-6 4-10 9-8 4-2 8 2 7 6 2 3-1 6-4 5-3 3-9 2-12-3Z" fill="#f1f3f6" />
          <path d="M52 16l5 4 4-3" fill="none" stroke="#c3c8cf" />
        </g>
      )}
      {/* body */}
      <path d="M19 20h62l-6.2 70a6 6 0 0 1-6 5.5H31.2a6 6 0 0 1-6-5.5Z" fill={`url(#${u}tc-b)`} stroke="#9ea4ad" strokeWidth=".9" />
      {rows.map((y) =>
        cols.map((c) => {
          const taper = 1 - (y - 26) * 0.0022;
          const x = 50 + c * 6.2 * taper;
          const w = 3.6 * (1 - Math.abs(c) * 0.09);
          return <rect key={`${y}-${c}`} x={x - w / 2} y={y} width={w} height="6.4" rx={w / 2} fill="#8e949d" opacity={0.55 - Math.abs(c) * 0.03} />;
        }),
      )}
      {/* rim */}
      <path d="M19 20a31 7 0 0 0 62 0" fill="none" stroke="#e9ecf0" strokeWidth="3.2" />
      <ellipse cx="50" cy="20" rx="31" ry="7" fill="none" stroke="#9ea4ad" strokeWidth="1" />
    </svg>
  );
}

const TrashEmpty = ({ u }: { u: string }) => <TrashCan u={u} />;
const TrashFull = ({ u }: { u: string }) => <TrashCan u={u} full />;

const MAP: Record<IconName, (p: { u: string }) => ReactElement> = {
  battery: BatteryIcon,
  activity: ActivityIcon,
  services: ServicesIcon,
  stickies: StickiesIcon,
  sysprefs: SysPrefsIcon,
  translate: TranslateIcon,
  fontbook: FontBookIcon,
  grapher: GrapherIcon,
  colormeter: ColorMeterIcon,
  discord: DiscordIcon,
  reddit: RedditIcon,
  stackoverflow: StackIcon,
  pinterest: PinterestIcon,
  canva: CanvaIcon,
  gdocs: GoogleDocsIcon,
  facetime: FaceTime,
  podcasts: Podcasts,
  tv: TV,
  journal: Journal,
  stocks: Stocks,
  freeform: Freeform,
  siri: Siri,
  passwords: Passwords,
  dictionary: Dictionary,
  gamecenter: GameCenter,
  keynote: Keynote,
  photobooth: PhotoBooth,
  gmail: Gmail,
  drive: Drive,
  gphotos: GPhotos,
  classroom: Classroom,
  chatgpt: ChatGPT,
  deepseek: DeepSeek,
  gemini: Gemini,
  claude: Claude,
  snapchat: Snapchat,
  shazam: Shazam,
  word: Word,
  excel: Excel,
  powerpoint: PowerPoint,
  pdfreader: PdfReader,
  trashfull: TrashFull,
  camera: Camera,
  voicememos: VoiceMemos,
  measure: Measure,
  findmy: FindMy,
  home: Home,
  weather: Weather,
  pages: Pages,
  numbers: Numbers,
  appstore: AppStore,
  tips: Tips,
  missioncontrol: MissionControl,
  screentime: ScreenTime,
  shield: Shield,
  books: Books,
  calculator: Calculator,
  clock: LiveClockIcon,
  contacts: Contacts,
  reminders: Reminders,
  maps: Maps,
  google: Google,
  launchpad: Launchpad,
  messages: Messages,
  calendar: Calendar,
  photos: Photos,
  music: Music,
  spotify: Spotify,
  instagram: Instagram,
  facebook: Facebook,
  threads: Threads,
  youtube: YouTube,
  figma: Figma,
  w3schools: W3Schools,
  downloads: Downloads,
  briefcase: Briefcase,
  graduation: Graduation,
  star: Star,
  timeline: Timeline,
  finder: Finder,
  safari: Safari,
  notes: Notes,
  slides: Slides,
  xcode: Xcode,
  mail: Mail,
  settings: Settings,
  terminal: Terminal,
  preview: Preview,
  pdf: Pdf,
  folder: Folder,
  linkedin: LinkedIn,
  github: GitHub,
  email: Email,
  phone: Phone,
  trash: TrashEmpty,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  xapp: XIcon,
  yahoomail: YahooMailIcon,
  hireme: HireMeIcon,
  casestudies: CaseStudyIcon,
  askai: AskAIIcon,
  guestbook: GuestbookIcon,
  wallet: WalletIcon,
  playstore: PlayStoreIcon,
  share: ShareIcon,
  cv: CvIcon,
};

export function AppIcon({ name, className }: { name: IconName; className?: string }) {
  const C = MAP[name];
  const u = useId().replace(/:/g, '');
  return (
    <span className={`app-icon ${className ?? ''}`} aria-hidden="true">
      <C u={u} />
    </span>
  );
}


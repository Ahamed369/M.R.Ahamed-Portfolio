import { DesktopV10, DevicesPane, SoundsV10, TrashPane } from './settings/PanesV10';
import { WallpaperLibrary } from '../components/WallpaperLibrary';
import { DynamicIslandV101, MacExtrasV101, NotificationsV101, ScreenTimeLimitsV101 } from './settings/PanesV101';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useSettings, ACCENTS } from '../system/SettingsContext';
import { useSystem, type AirDrop } from '../system/SystemContext';
import { useMusic } from '../system/MusicContext';
import { useWM } from '../system/WindowManager';
import { WallpaperThumb } from '../components/Wallpaper';
import { DragBar, Lights } from '../components/Window';
import { AppIcon } from '../components/AppIcons';
import { personal } from '../data/portfolio';
import { ALERT_SOUNDS, playAlert, playChime, playNotification } from '../system/sounds';
import { notificationPermission, notificationsSupported, requestNotificationPermission } from '../system/webNotify';
import { LANGS } from '../system/i18n';
import { fmtTime, sunTimes } from '../system/sun';
import { currentSeason } from '../components/SystemExtras';
import type { HotCornerAction } from '../system/types';
import { useScreenTime, fmtDuration, dayKey, usageFor } from '../system/screenTime';
import { useBatteryLog } from '../system/batteryLog';
import { wallFromFile, wallNotice } from '../system/customWallpaper';
import { SPOTLIGHT_CATS, spotOn } from '../system/spotlight';
import { LAUNCH_ITEMS } from '../system/launch';
import { APPS } from '../system/apps';
import { readStore, writeStore } from '../system/storage';
import { notify, openAppLink } from '../system/notify';
import type { AppProps } from '../components/Desktop';
import type { AppId } from '../system/types';
import { GameCenterPane, InternetAccountsPane, KeyboardPane, MenuBarPane, PrintersPane, SiriPane, TouchIdPane, TrackpadPane, WalletPane } from './settings/PanesV9';
import { HIGHLIGHTS, LOGIN_APPS } from '../components/PrefEffects';
import { WallImage } from '../components/Wallpaper';
import { SETTINGS_ROWS } from '../data/settingsRows';
import { LOCK_COLORS, LOCK_FONTS, lockClockStyle } from '../system/lockStyle';
import { flashSettingRow } from '../system/settingsSearch';

/* ═══════════════════════════════ Routes & metadata ═══════════════════════════════ */

type PaneId =
  | 'wifi'
  | 'bluetooth'
  | 'network'
  | 'battery'
  | 'general'
  | 'accessibility'
  | 'appearance'
  | 'controlcenter'
  | 'dock'
  | 'display'
  | 'screensaver'
  | 'spotlight'
  | 'wallpaper'
  | 'notifications'
  | 'sound'
  | 'focus'
  | 'screentime'
  | 'lock'
  | 'privacy'
  | 'users'
  | 'trackpad'
  | 'keyboard'
  | 'menubar'
  | 'siri'
  | 'touchid'
  | 'internet'
  | 'gamecenter'
  | 'wallet'
  | 'printers'
  | 'devices'
  | 'trash';
type SubId = 'about' | 'update' | 'storage' | 'airdrop' | 'language' | 'datetime' | 'login';
type Route = PaneId | `general/${SubId}`;

export type GlyphName =
  | 'wifi'
  | 'bluetooth'
  | 'network'
  | 'battery'
  | 'gear'
  | 'accessibility'
  | 'appearance'
  | 'controlcenter'
  | 'dock'
  | 'display'
  | 'screensaver'
  | 'spotlight'
  | 'wallpaper'
  | 'bell'
  | 'sound'
  | 'moon'
  | 'hourglass'
  | 'lock'
  | 'hand'
  | 'users'
  | 'laptop'
  | 'update'
  | 'storage'
  | 'airdrop'
  | 'globe'
  | 'calendar'
  | 'list'
  | 'camera'
  | 'mic'
  | 'location'
  | 'gamepad'
  | 'briefcase'
  | 'shield'
  | 'play'
  | 'grid'
  | 'person'
  | 'trackpad'
  | 'keyboard'
  | 'menubar'
  | 'siri'
  | 'fingerprint'
  | 'at'
  | 'card'
  | 'printer';

interface PaneMeta {
  id: PaneId;
  label: string;
  color: string;
  glyph: GlyphName;
  keys: string;
  group: number;
}

const PANES: PaneMeta[] = [
  { id: 'wifi', label: 'Wi-Fi', color: '#0a84ff', glyph: 'wifi', keys: 'wireless internet network online', group: 0 },
  { id: 'bluetooth', label: 'Bluetooth', color: '#0a84ff', glyph: 'bluetooth', keys: 'devices wireless pair', group: 0 },
  { id: 'network', label: 'Network', color: '#0a84ff', glyph: 'network', keys: 'internet connection online offline speed downlink latency', group: 0 },
  { id: 'battery', label: 'Battery', color: '#30c55a', glyph: 'battery', keys: 'power charging energy low power mode level', group: 0 },
  { id: 'general', label: 'General', color: '#8e8e93', glyph: 'gear', keys: 'about software update storage airdrop handoff language region date time login items', group: 1 },
  { id: 'accessibility', label: 'Accessibility', color: '#0a84ff', glyph: 'accessibility', keys: 'reduce motion contrast text size zoom transparency assistivetouch', group: 1 },
  { id: 'appearance', label: 'Appearance', color: '#1c1c1e', glyph: 'appearance', keys: 'dark mode light mode auto theme accent colour color highlight', group: 1 },
  { id: 'controlcenter', label: 'Control Center', color: '#8e8e93', glyph: 'controlcenter', keys: 'menu bar modules privacy shield battery percentage', group: 1 },
  { id: 'dock', label: 'Desktop & Dock', color: '#1c1c1e', glyph: 'dock', keys: 'dock size magnification mission control hot corners windows desktop icons stacks dynamic island notch multitasking widgets', group: 1 },
  { id: 'display', label: 'Displays', color: '#0a84ff', glyph: 'display', keys: 'brightness night shift resolution full screen monitor refresh', group: 1 },
  { id: 'screensaver', label: 'Screen Saver', color: '#34aadc', glyph: 'screensaver', keys: 'saver idle', group: 1 },
  { id: 'spotlight', label: 'Spotlight', color: '#8e8e93', glyph: 'spotlight', keys: 'search find', group: 1 },
  { id: 'wallpaper', label: 'Wallpaper', color: '#32ade6', glyph: 'wallpaper', keys: 'background desktop picture image live wallpaper dynamic wallpaper motion lock screen wallpaper categories', group: 1 },
  { id: 'notifications', label: 'Notifications', color: '#ff3b30', glyph: 'bell', keys: 'banners alerts previews scheduled summary per app badges', group: 2 },
  { id: 'sound', label: 'Sound', color: '#ff2d55', glyph: 'sound', keys: 'volume alert output input speakers microphone mute startup', group: 2 },
  { id: 'focus', label: 'Focus', color: '#5e5ce6', glyph: 'moon', keys: 'do not disturb dnd silence', group: 2 },
  { id: 'screentime', label: 'Screen Time', color: '#5e5ce6', glyph: 'hourglass', keys: 'usage apps activity limits downtime', group: 2 },
  { id: 'lock', label: 'Lock Screen', color: '#1c1c1e', glyph: 'lock', keys: 'inactivity message lock now password', group: 3 },
  { id: 'privacy', label: 'Privacy & Security', color: '#0a84ff', glyph: 'hand', keys: 'camera microphone location notifications permissions https secure', group: 3 },
  { id: 'users', label: 'Users & Groups', color: '#0a84ff', glyph: 'users', keys: 'account profile name email', group: 3 },
  /* v9 */
  { id: 'siri', label: 'Assistant', color: '#bf5af2', glyph: 'siri', keys: 'assistant siri voice ask ai speak shortcut option space', group: 1 },
  { id: 'menubar', label: 'Menu Bar', color: '#0a84ff', glyph: 'menubar', keys: 'menu bar extras autohide background cv now playing language', group: 1 },
  { id: 'touchid', label: 'Login & Password', color: '#ff375f', glyph: 'lock', keys: 'password login unlock passkey demo guest touch id fingerprint', group: 3 },
  { id: 'internet', label: 'Internet Accounts', color: '#0a84ff', glyph: 'at', keys: 'google github linkedin accounts sign in', group: 3 },
  { id: 'gamecenter', label: 'Game Center', color: '#ff2d55', glyph: 'gamepad', keys: 'games nickname achievements', group: 3 },
  { id: 'wallet', label: 'Wallet & Pay', color: '#1c1c1e', glyph: 'card', keys: 'wallet passes cards', group: 3 },
  { id: 'keyboard', label: 'Keyboard', color: '#8e8e93', glyph: 'keyboard', keys: 'shortcuts key repeat input', group: 4 },
  { id: 'trackpad', label: 'Trackpad', color: '#8e8e93', glyph: 'trackpad', keys: 'tap to click scroll zoom tracking speed force click secondary natural', group: 4 },
  /* v10 */
  { id: 'devices', label: 'Devices & View', color: '#5856d6', glyph: 'laptop', keys: 'view as iphone ipad mac device home screen assistivetouch assistive touch standby always on three finger gestures reset layout', group: 1 },
  { id: 'trash', label: 'Trash & Undo', color: '#8e8e93', glyph: 'storage', keys: 'trash recently deleted undo redo restore recover delete confirmation', group: 3 },
  { id: 'printers', label: 'Printers & Scanners', color: '#8e8e93', glyph: 'printer', keys: 'print pdf paper', group: 4 },
];

const SUBS: { id: SubId; label: string; color: string; glyph: GlyphName; keys: string }[] = [
  { id: 'about', label: 'About', color: '#8e8e93', glyph: 'laptop', keys: 'system information browser memory display serial version' },
  { id: 'update', label: 'Software Update', color: '#8e8e93', glyph: 'update', keys: 'version upgrade' },
  { id: 'storage', label: 'Storage', color: '#8e8e93', glyph: 'storage', keys: 'disk space quota' },
  { id: 'airdrop', label: 'AirDrop & Handoff', color: '#0a84ff', glyph: 'airdrop', keys: 'share receive' },
  { id: 'language', label: 'Language & Region', color: '#0a84ff', glyph: 'globe', keys: 'locale format' },
  { id: 'datetime', label: 'Date & Time', color: '#0a84ff', glyph: 'calendar', keys: 'clock time zone' },
  { id: 'login', label: 'Login Items', color: '#8e8e93', glyph: 'list', keys: 'startup open at login' },
];

const ALIASES: Record<string, Route> = {
  displays: 'display',
  desktop: 'dock',
  'desktop-dock': 'dock',
  lockscreen: 'lock',
  'lock-screen': 'lock',
  'privacy-security': 'privacy',
  'screen-time': 'screentime',
  'control-center': 'controlcenter',
  account: 'users',
  about: 'general/about',
  'software-update': 'general/update',
  storage: 'general/storage',
  airdrop: 'general/airdrop',
  language: 'general/language',
  datetime: 'general/datetime',
  'menu-bar': 'menubar',
  intelligence: 'siri',
  'touch-id': 'touchid',
  password: 'touchid',
  accounts: 'internet',
  'internet-accounts': 'internet',
  printer: 'printers',
};

function resolveRoute(p?: string): Route | null {
  if (!p) return null;
  const k = p.toLowerCase();
  if (PANES.some((x) => x.id === k)) return k as PaneId;
  if (k.startsWith('general/') && SUBS.some((s) => `general/${s.id}` === k)) return k as Route;
  return ALIASES[k] ?? null;
}

function routeMeta(r: Route): { label: string; color: string; glyph: GlyphName } {
  if (r.startsWith('general/')) {
    const s = SUBS.find((x) => `general/${x.id}` === r);
    if (s) return s;
  }
  return PANES.find((p) => p.id === r) ?? PANES[4];
}

/* ═══════════════════════════════ Persisted simulated prefs ═══════════════════════════════ */

interface Prefs {
  appearanceMode: 'auto' | 'manual';
  flags: Record<string, boolean>;
  choices: Record<string, string>;
  lastUpdateCheck: number;
  lastLockMessage: string;
}
const PREFS_KEY = 'mra-settings-app-v5';
const DEFAULT_PREFS: Prefs = { appearanceMode: 'manual', flags: {}, choices: {}, lastUpdateCheck: 0, lastLockMessage: '' };

interface PrefsApi {
  prefs: Prefs;
  setPrefs: (fn: (p: Prefs) => Prefs) => void;
  flag: (k: string, d: boolean) => boolean;
  setFlag: (k: string, v: boolean) => void;
  choice: (k: string, d: string) => string;
  setChoice: (k: string, v: string) => void;
}
const PrefsCtx = createContext<PrefsApi | null>(null);
export function usePrefs(): PrefsApi {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error('usePrefs outside SettingsApp');
  return c;
}

/* ═══════════════════════════════ Small building blocks ═══════════════════════════════ */

const GEAR_TEETH = Array.from({ length: 10 }, (_, i) => (i * Math.PI * 2) / 10);
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8);

const GLYPHS: Record<GlyphName, ReactNode> = {
  wifi: (
    <>
      <path d="M3.8 9.6a12 12 0 0 1 16.4 0M6.9 12.8a7.6 7.6 0 0 1 10.2 0M9.9 15.9a3.2 3.2 0 0 1 4.2 0" />
      <circle className="f" cx="12" cy="18.6" r="1.4" />
    </>
  ),
  bluetooth: (
    <>
      <circle className="f" cx="12" cy="12" r="2" />
      <path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="12" r="8" />
      <ellipse cx="12" cy="12" rx="3.4" ry="8" />
      <path d="M4 12h16M5.6 8h12.8M5.6 16h12.8" />
    </>
  ),
  battery: (
    <>
      <rect x="2.8" y="7.5" width="16.4" height="9" rx="2.4" />
      <rect className="f" x="4.8" y="9.5" width="10.5" height="5" rx="1" />
      <path d="M21.2 10.6v2.8" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2.2" />
      {GEAR_TEETH.map((a) => (
        <path key={a} d={`M${12 + Math.cos(a) * 6.2} ${12 + Math.sin(a) * 6.2}L${12 + Math.cos(a) * 8.6} ${12 + Math.sin(a) * 8.6}`} strokeWidth="2.6" />
      ))}
    </>
  ),
  accessibility: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle className="f" cx="12" cy="7.4" r="1.5" />
      <path d="M7.4 10.1l4.6 1.1 4.6-1.1M12 11.2v3.4M12 14.6l-2.4 4M12 14.6l2.4 4" />
    </>
  ),
  appearance: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <path className="f" d="M12 4.4a7.6 7.6 0 0 1 0 15.2z" />
    </>
  ),
  controlcenter: (
    <>
      <rect x="4" y="4.6" width="16" height="6.2" rx="3.1" />
      <circle className="f" cx="7.3" cy="7.7" r="1.7" />
      <rect x="4" y="13.2" width="16" height="6.2" rx="3.1" />
      <circle className="f" cx="16.7" cy="16.3" r="1.7" />
    </>
  ),
  dock: (
    <>
      <rect x="3.4" y="5" width="17.2" height="14" rx="2.2" />
      <rect className="f" x="6.4" y="14.6" width="11.2" height="2.2" rx="1.1" />
    </>
  ),
  display: (
    <>
      <circle className="f" cx="12" cy="12" r="3.6" />
      {SUN_RAYS.map((a) => (
        <path key={a} d={`M${12 + Math.cos(a) * 6} ${12 + Math.sin(a) * 6}L${12 + Math.cos(a) * 8.2} ${12 + Math.sin(a) * 8.2}`} />
      ))}
    </>
  ),
  screensaver: (
    <>
      <rect x="3.4" y="4.8" width="17.2" height="12" rx="2" />
      <path d="M9 20h6" />
      <path className="f" d="M12 7.6l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" />
    </>
  ),
  spotlight: (
    <>
      <circle cx="10.4" cy="10.4" r="5.6" />
      <path d="M14.6 14.6l5 5" strokeWidth="2.4" />
    </>
  ),
  wallpaper: (
    <>
      {[0, 60, 120, 180, 240, 300].map((d) => (
        <circle key={d} cx={12 + Math.cos((d * Math.PI) / 180) * 4.6} cy={12 + Math.sin((d * Math.PI) / 180) * 4.6} r="3.2" strokeWidth="1.4" />
      ))}
      <circle className="f" cx="12" cy="12" r="1.8" />
    </>
  ),
  bell: (
    <>
      <path className="f" d="M12 3.8a5.2 5.2 0 0 0-5.2 5.2v3.8l-1.9 3.1h14.2l-1.9-3.1V9A5.2 5.2 0 0 0 12 3.8z" />
      <path className="f" d="M9.8 17.6a2.2 2.2 0 0 0 4.4 0z" />
    </>
  ),
  sound: (
    <>
      <path className="f" d="M3.8 9.4h3.4L11.8 5.8v12.4l-4.6-3.6H3.8z" />
      <path d="M14.8 9a4.2 4.2 0 0 1 0 6M17.4 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
  moon: <path className="f" d="M15.6 4.2a8.2 8.2 0 1 0 4.4 12.9A6.8 6.8 0 0 1 15.6 4.2z" />,
  hourglass: (
    <>
      <path d="M6.8 4h10.4M6.8 20h10.4" />
      <path d="M8 4.2v2.2c0 2.2 2.8 3.8 3.6 5.6-.8 1.8-3.6 3.4-3.6 5.6v2.2M16 4.2v2.2c0 2.2-2.8 3.8-3.6 5.6.8 1.8 3.6 3.4 3.6 5.6v2.2" />
      <path className="f" d="M9.6 18.6c0-1.4 1.6-2.4 2.4-3.4.8 1 2.4 2 2.4 3.4z" />
    </>
  ),
  lock: (
    <>
      <rect className="f" x="5.6" y="10.6" width="12.8" height="9.4" rx="2.2" />
      <path d="M8.4 10.6V8.2a3.6 3.6 0 0 1 7.2 0v2.4" />
    </>
  ),
  hand: (
    <path
      className="f"
      d="M8.2 12.4V6.9a1.25 1.25 0 0 1 2.5 0v4.3h.4V5.4a1.25 1.25 0 0 1 2.5 0v5.8h.4V6.4a1.25 1.25 0 0 1 2.5 0v5.9h.4V8.6a1.2 1.2 0 0 1 2.4 0v5.9c0 3.6-2.6 6.3-6.2 6.3-2.4 0-3.8-1-5.1-2.9l-2.9-4.3a1.25 1.25 0 0 1 2-1.5z"
    />
  ),
  users: (
    <>
      <circle className="f" cx="9.2" cy="8.8" r="3" />
      <path className="f" d="M3.4 19.2c0-3.3 2.6-5.4 5.8-5.4s5.8 2.1 5.8 5.4z" />
      <circle className="f" cx="16.4" cy="9.4" r="2.4" />
      <path className="f" d="M16 13.6c2.8 0 4.8 1.8 4.8 4.6h-4.6a6.6 6.6 0 0 0-2-4.3c.5-.2 1.1-.3 1.8-.3z" />
    </>
  ),
  laptop: (
    <>
      <rect x="5" y="5.6" width="14" height="9.6" rx="1.4" />
      <path d="M2.8 18.4h18.4" />
    </>
  ),
  update: (
    <>
      <path d="M18.2 9.2A6.6 6.6 0 0 0 6.4 7.6M5.8 14.8a6.6 6.6 0 0 0 11.8 1.6" />
      <path d="M6.2 4.4v3.4h3.4M17.8 19.6v-3.4h-3.4" />
    </>
  ),
  storage: (
    <>
      <rect x="3.6" y="6.4" width="16.8" height="11.2" rx="2.4" />
      <path d="M3.6 12.2h16.8" />
      <circle className="f" cx="16.8" cy="15" r="1" />
    </>
  ),
  airdrop: (
    <>
      <circle className="f" cx="12" cy="12" r="2" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="8.2" opacity=".7" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <ellipse cx="12" cy="12" rx="3.4" ry="8" />
      <path d="M4 12h16" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.4" width="16" height="14.4" rx="2.4" />
      <path d="M4 9.6h16M8.4 3.6v3.2M15.6 3.6v3.2" />
      <circle className="f" cx="8.6" cy="13.4" r="1" />
      <circle className="f" cx="12" cy="13.4" r="1" />
      <circle className="f" cx="15.4" cy="13.4" r="1" />
    </>
  ),
  list: (
    <>
      <path d="M9.4 7h10M9.4 12h10M9.4 17h10" />
      <circle className="f" cx="5.4" cy="7" r="1.2" />
      <circle className="f" cx="5.4" cy="12" r="1.2" />
      <circle className="f" cx="5.4" cy="17" r="1.2" />
    </>
  ),
  camera: (
    <>
      <rect className="f" x="3.4" y="7" width="12.2" height="10" rx="2.2" />
      <path className="f" d="M16.4 10.8l4.4-2.8v8l-4.4-2.8z" />
    </>
  ),
  mic: (
    <>
      <rect className="f" x="9.4" y="3.4" width="5.2" height="10.4" rx="2.6" />
      <path d="M6.6 11a5.4 5.4 0 0 0 10.8 0M12 16.4v3.6" />
    </>
  ),
  location: <path className="f" d="M20 4L4.4 10.9l7 1.7 1.7 7z" />,
  gamepad: (
    <>
      <rect x="3" y="7.6" width="18" height="9.6" rx="4.8" />
      <path d="M7.4 12.4h3.2M9 10.8V14" />
      <circle className="f" cx="15.4" cy="11.4" r="1" />
      <circle className="f" cx="17.2" cy="13.4" r="1" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.8" y="8" width="16.4" height="11" rx="2" />
      <path d="M9 8V6.2h6V8M3.8 12.6h16.4" />
    </>
  ),
  shield: <path d="M12 3.6l7 2.6v5.4c0 4.3-3 7.5-7 8.8-4-1.3-7-4.5-7-8.8V6.2z" />,
  play: <path className="f" d="M8 5.6l10.4 6.4L8 18.4z" />,
  grid: (
    <>
      <rect x="4" y="4.6" width="7" height="6" rx="1.2" />
      <rect x="13" y="4.6" width="7" height="6" rx="1.2" />
      <rect x="4" y="13.4" width="7" height="6" rx="1.2" />
      <rect x="13" y="13.4" width="7" height="6" rx="1.2" />
    </>
  ),
  person: (
    <>
      <circle className="f" cx="12" cy="8.4" r="3.4" />
      <path className="f" d="M5.4 19.6c0-3.8 3-6 6.6-6s6.6 2.2 6.6 6z" />
    </>
  ),
  trackpad: (
    <>
      <rect x="3.6" y="5" width="16.8" height="14" rx="2.6" />
      <path d="M12 15.6v3.2" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="2" />
      <path d="M6 9.6h.01M9 9.6h.01M12 9.6h.01M15 9.6h.01M18 9.6h.01M6 12.4h.01M9 12.4h.01M12 12.4h.01M15 12.4h.01M18 12.4h.01M8 15h8" strokeWidth="2" />
    </>
  ),
  menubar: (
    <>
      <rect x="3" y="4.6" width="18" height="14.8" rx="2.2" />
      <path className="f" d="M3 6.8a2.2 2.2 0 0 1 2.2-2.2h13.6A2.2 2.2 0 0 1 21 6.8V8H3z" />
    </>
  ),
  siri: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M5.6 12c1.6-3.2 3-3.2 4.2 0s2.8 3.2 4.3 0 2.8-3.2 4.3 0" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M7.4 18.4c1.2-1.6 1.8-3.6 1.8-6.4a2.8 2.8 0 0 1 5.6 0c0 2.4-.3 4.6-1.2 6.6" />
      <path d="M5 15.2c.6-1 .9-2 .9-3.2a6.1 6.1 0 0 1 12.2 0c0 1.8-.2 3.4-.6 4.8" />
      <path d="M12 12c0 3-.8 5.4-2 7.2M15.6 15.4c-.3 1.4-.8 2.6-1.4 3.6" />
    </>
  ),
  at: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M15.4 9v4.2c0 1.4.9 2.4 2.2 2.4 1.6 0 2.6-1.6 2.6-3.6a8.2 8.2 0 1 0-3.2 6.5" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12.4" rx="2.2" />
      <path d="M3 10h18M6.4 14.6h4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V4.4h10V9" />
      <rect x="3.6" y="9" width="16.8" height="7.4" rx="1.8" />
      <rect x="7" y="13.6" width="10" height="6" rx=".8" />
    </>
  ),
};

export function Glyph({ name, color, size = 20 }: { name: GlyphName; color: string; size?: number }) {
  return (
    <span className="ss-glyph" style={{ background: color, width: size, height: size, borderRadius: size * 0.26 }} aria-hidden="true">
      <svg viewBox="0 0 24 24">{GLYPHS[name]}</svg>
    </span>
  );
}

const Chevron = () => (
  <svg className="ss-chev" viewBox="0 0 8 14" aria-hidden="true">
    <path d="M1.5 1.5L6.5 7l-5 5.5" />
  </svg>
);

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`toggle ss-toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function PopUp<T extends string>({ value, options, onChange, label, disabled, swatch }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string; disabled?: boolean; swatch?: string }) {
  return (
    <span className={`ss-pop ${disabled ? 'dis' : ''}`}>
      {swatch && <i className="ss-pop-swatch" style={{ background: swatch }} />}
      <select value={value} aria-label={label} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <span className="ss-pop-arrows" aria-hidden="true">
        <svg viewBox="0 0 10 14">
          <path d="M2 5l3-3 3 3M2 9l3 3 3-3" />
        </svg>
      </span>
    </span>
  );
}

/** v9 — segmented control (Dock position, Low Power Mode, …) */
export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ss-seg ss-seg-inline" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, min, max, step, onChange, label, disabled, left, right }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; disabled?: boolean; left?: ReactNode; right?: ReactNode }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <span className={`ss-slider-wrap ${disabled ? 'dis' : ''}`}>
      {left && <span className="ss-slider-cap">{left}</span>}
      <input className="ss-slider" type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label} style={{ ['--p' as string]: `${pct}%` }} onChange={(e) => onChange(Number(e.target.value))} />
      {right && <span className="ss-slider-cap">{right}</span>}
    </span>
  );
}

export function Row({ label, sub, glyph, children, onClick, className }: { label: ReactNode; sub?: ReactNode; glyph?: ReactNode; children?: ReactNode; onClick?: () => void; className?: string }) {
  const inner = (
    <>
      {glyph}
      <span className="ss-row-text">
        <span className="ss-row-label">{label}</span>
        {sub && <span className="ss-row-sub">{sub}</span>}
      </span>
      {(children || onClick) && (
        <span className="ss-row-end">
          {children}
          {onClick && <Chevron />}
        </span>
      )}
    </>
  );
  return onClick ? (
    <button type="button" className={`ss-row ss-row-link ${className ?? ''}`} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={`ss-row ${className ?? ''}`}>{inner}</div>
  );
}

export function Section({ title, sub, children, footer, bare }: { title?: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; bare?: boolean }) {
  return (
    <section className="ss-sec">
      {title && <h3 className="ss-sec-title">{title}</h3>}
      {sub && <p className="ss-sec-sub">{sub}</p>}
      {bare ? children : <div className="ss-card">{children}</div>}
      {footer}
    </section>
  );
}

export const Sim = ({ children = 'Simulated' }: { children?: ReactNode }) => <span className="ss-sim">{children}</span>;
export const Note = ({ children }: { children: ReactNode }) => <p className="ss-note">{children}</p>;

export function Hero({ glyph, color, title, desc }: { glyph: GlyphName; color: string; title: string; desc: ReactNode }) {
  return (
    <div className="ss-hero">
      <Glyph name={glyph} color={color} size={60} />
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  );
}

/* ═══════════════════════════════ Hooks ═══════════════════════════════ */

function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

function useOnline(): boolean {
  const [on, setOn] = useState(() => navigator.onLine);
  useEffect(() => {
    const f = () => setOn(navigator.onLine);
    window.addEventListener('online', f);
    window.addEventListener('offline', f);
    return () => {
      window.removeEventListener('online', f);
      window.removeEventListener('offline', f);
    };
  }, []);
  return on;
}

interface NetInfo {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (t: string, f: () => void) => void;
  removeEventListener?: (t: string, f: () => void) => void;
}
function useConnection(): NetInfo | null {
  const conn = (navigator as Navigator & { connection?: NetInfo }).connection ?? null;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!conn?.addEventListener) return;
    const f = () => setTick((t) => t + 1);
    conn.addEventListener('change', f);
    return () => conn.removeEventListener?.('change', f);
  }, [conn]);
  return conn;
}

export function useMedia(q: string): boolean {
  const get = () => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };
  const [m, setM] = useState(get);
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(q);
    } catch {
      return;
    }
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}

function fmtBytes(b: number): string {
  if (!Number.isFinite(b)) return '—';
  const u = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = b;
  while (v >= 1000 && i < u.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

function parseUA(ua: string): { browser: string; os: string } {
  const tests: [string, RegExp][] = [
    ['Microsoft Edge', /Edg(?:e|A|iOS)?\/(\d+)/],
    ['Opera', /OPR\/(\d+)/],
    ['Samsung Internet', /SamsungBrowser\/(\d+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
    ['Chrome', /(?:Chrome|CriOS)\/(\d+)/],
    ['Safari', /Version\/(\d+(?:\.\d+)?).*Safari/],
  ];
  let browser = 'Unknown browser';
  for (const [name, re] of tests) {
    const m = ua.match(re);
    if (m) {
      browser = `${name} ${m[1]}`;
      break;
    }
  }
  if (/HeadlessChrome/.test(ua)) browser = browser.replace('Chrome', 'Chrome (headless)');
  let os = 'Unknown';
  if (/iPhone|iPod/.test(ua)) os = 'iOS';
  else if (/iPad/.test(ua)) os = 'iPadOS';
  else if (/Android (\d+)/.test(ua)) os = `Android ${ua.match(/Android (\d+)/)?.[1] ?? ''}`.trim();
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  return { browser, os };
}

/* ═══════════════════════════════ App ═══════════════════════════════ */

const GROUPS = [0, 1, 2, 3, 4];
/* macOS sidebar order inside each group (v9 panes slot in where macOS puts them) */
const SIDE_ORDER = ['wifi', 'bluetooth', 'network', 'battery', 'general', 'accessibility', 'appearance', 'siri', 'controlcenter', 'dock', 'display', 'menubar', 'screensaver', 'spotlight', 'wallpaper', 'notifications', 'sound', 'focus', 'screentime', 'lock', 'privacy', 'touchid', 'users', 'internet', 'gamecenter', 'wallet', 'keyboard', 'trackpad', 'printers'];

export default function SettingsApp({ win }: AppProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const initial = resolveRoute(win.args?.pane) ?? 'appearance';
  const [hist, setHist] = useState<{ stack: Route[]; i: number }>(() => ({ stack: [initial], i: 0 }));
  const route = hist.stack[hist.i];
  const [narrow, setNarrow] = useState(false);
  const [detail, setDetail] = useState(!!win.args?.pane);
  const [q, setQ] = useState(win.args?.q ?? '');
  const [searchFocus, setSearchFocus] = useState(!!win.args?.q);
  // v10.2 — the Assistant's "find … settings" opens Settings with the search filled in
  useEffect(() => {
    if (win.args?.q) {
      setQ(win.args.q);
      setSearchFocus(true);
      window.setTimeout(() => searchRef.current?.focus(), 200);
    }
  }, [win.launchKey, win.args?.q]);
  const [hi, setHi] = useState(0);

  const [prefs, setPrefsState] = useState<Prefs>(() => {
    const p = readStore(PREFS_KEY, DEFAULT_PREFS);
    return { ...p, flags: { ...p.flags }, choices: { ...p.choices } };
  });
  useEffect(() => {
    writeStore(PREFS_KEY, prefs);
    window.dispatchEvent(new Event('mra-prefs'));
  }, [prefs]);
  const prefsApi = useMemo<PrefsApi>(
    () => ({
      prefs,
      setPrefs: (fn) => setPrefsState(fn),
      flag: (k, d) => prefs.flags[k] ?? d,
      setFlag: (k, v) => setPrefsState((p) => ({ ...p, flags: { ...p.flags, [k]: v } })),
      choice: (k, d) => prefs.choices[k] ?? d,
      setChoice: (k, v) => setPrefsState((p) => ({ ...p, choices: { ...p.choices, [k]: v } })),
    }),
    [prefs],
  );

  const go = useCallback((r: Route) => {
    setHist((h) => {
      if (h.stack[h.i] === r) return h;
      const stack = [...h.stack.slice(0, h.i + 1), r].slice(-50);
      return { stack, i: stack.length - 1 };
    });
    setDetail(true);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const r = resolveRoute(win.args?.pane);
    if (r) go(r);
  }, [win.launchKey, win.args?.pane, go]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 560));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Appearance → Auto: follow the device while enabled (applies on open + listens while open). */
  const { settings, update } = useSettings();
  const sysDark = useMedia('(prefers-color-scheme: dark)');
  useEffect(() => {
    if (prefs.appearanceMode !== 'auto') return;
    const want = sysDark ? 'dark' : 'light';
    if (settings.appearance !== want) update({ appearance: want });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.appearanceMode, sysDark]);

  /* Search */
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchText = (s: string) => words.every((w) => s.toLowerCase().includes(w));
  const suggestions = useMemo(() => {
    if (!words.length) return [] as { route: Route; label: string; color: string; glyph: GlyphName }[];
    const panes = PANES.filter((p) => matchText(`${p.label} ${p.keys}`)).map((p) => ({ route: p.id as Route, label: p.label, color: p.color, glyph: p.glyph }));
    const subs = SUBS.filter((s) => matchText(`${s.label} ${s.keys}`)).map((s) => ({ route: `general/${s.id}` as Route, label: s.label, color: s.color, glyph: s.glyph }));
    // v10.3 — individual settings rows (e.g. "keyboard navigation")
    const rows: { route: Route; label: string; color: string; glyph: GlyphName }[] = [];
    for (const [rid, labels] of Object.entries(SETTINGS_ROWS)) {
      const meta = rid.startsWith('general/') ? SUBS.find((s) => `general/${s.id}` === rid) : PANES.find((p) => p.id === rid);
      if (!meta) continue;
      for (const l of labels) {
        if (matchText(`${l} ${meta.label}`) && !matchText(meta.label)) rows.push({ route: rid as Route, label: `${l.replace(/…$/, '')} — ${meta.label}`, color: meta.color, glyph: meta.glyph });
      }
    }
    // labels that start with the query first
    const all = [...panes, ...subs];
    all.sort((a, b) => Number(!a.label.toLowerCase().startsWith(words[0])) - Number(!b.label.toLowerCase().startsWith(words[0])));
    const seen = new Set<string>();
    const rowsU = rows.filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true)));
    return [...all.slice(0, 5), ...rowsU].slice(0, 9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const sideMatch = (p: PaneMeta) => !words.length || matchText(`${p.label} ${p.keys}`) || (p.id === 'general' && SUBS.some((s) => matchText(`${s.label} ${s.keys}`)));

  const pick = (r: Route, label?: string) => {
    go(r);
    // v10.3 — jump to the exact setting on that page
    const rowLabel = label && label.includes(' — ') ? label.split(' — ')[0] : '';
    const w = rowLabel ? rowLabel.toLowerCase().split(/\s+/).filter(Boolean) : [...words];
    window.setTimeout(() => flashSettingRow(mainRef.current, w), 380);
    setQ('');
    setSearchFocus(false);
    searchRef.current?.blur();
  };
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter' && suggestions[hi]) pick(suggestions[hi].route, suggestions[hi].label);
    else if (e.key === 'Escape') {
      setQ('');
      searchRef.current?.blur();
    }
  };

  const meta = routeMeta(route);
  const isSub = route.startsWith('general/');
  const selSide: PaneId = isSub ? 'general' : (route as PaneId);
  const canBack = hist.i > 0;
  const canFwd = hist.i < hist.stack.length - 1;
  const showDetail = !narrow || detail;

  return (
    <PrefsCtx.Provider value={prefsApi}>
      <div ref={rootRef} className={`ss ${narrow ? 'narrow' : ''} ${narrow && detail ? 'show-detail' : ''}`}>
        <aside className="ss-side" aria-label="Settings panes">
          <DragBar className="ss-side-top">
            <Lights />
          </DragBar>
          <div className="ss-search">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="6.8" cy="6.8" r="4.6" />
              <path d="M10.2 10.2l3.6 3.6" />
            </svg>
            <input
              ref={searchRef}
              placeholder="Search"
              value={q}
              aria-label="Search settings"
              role="combobox"
              aria-expanded={searchFocus && suggestions.length > 0}
              aria-controls="ss-suggest"
              onChange={(e) => {
                setQ(e.target.value);
                setHi(0);
              }}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              onKeyDown={onSearchKey}
            />
            {q && (
              <button type="button" className="ss-search-clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ('')}>
                ×
              </button>
            )}
            {searchFocus && words.length > 0 && (
              <div className="ss-suggest" id="ss-suggest" role="listbox">
                <div className="ss-suggest-h">{suggestions.length ? 'Suggestions' : 'No Results'}</div>
                {suggestions.map((s, i) => (
                  <button key={s.route + s.label} type="button" role="option" aria-selected={i === hi} className={i === hi ? 'hi' : ''} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(s.route, s.label)}>
                    <Glyph name={s.glyph} color={s.color} size={20} />
                    {s.label}
                    {s.route.startsWith('general/') && <small>General</small>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <nav className="ss-side-list scroll-smooth">
            <button type="button" className={`ss-account ${selSide === 'users' ? 'on' : ''}`} onClick={() => go('users')}>
              <img src={personal.avatar} alt="" />
              <span>
                <b>{personal.name}</b>
                <small>Portfolio Account</small>
              </span>
              {narrow && <Chevron />}
            </button>
            {GROUPS.map((g) => {
              const items = PANES.filter((p) => p.group === g && sideMatch(p)).sort((a, b) => SIDE_ORDER.indexOf(a.id) - SIDE_ORDER.indexOf(b.id));
              if (!items.length) return null;
              return (
                <div key={g} className="ss-side-group">
                  {items.map((p) => (
                    <button key={p.id} type="button" className={`ss-nav ${selSide === p.id && !narrow ? 'on' : ''}`} aria-current={selSide === p.id ? 'page' : undefined} onClick={() => go(p.id)}>
                      <Glyph name={p.glyph} color={p.color} size={narrow ? 28 : 20} />
                      <span>{p.label}</span>
                      {narrow && <Chevron />}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </aside>

        {showDetail && (
          <section className="ss-main" aria-label={meta.label}>
            <DragBar className="ss-head">
              {narrow && <Lights />}
              {narrow ? (
                <button type="button" className="ss-mback" onClick={() => (isSub ? go('general') : setDetail(false))}>
                  <svg viewBox="0 0 8 14" aria-hidden="true">
                    <path d="M6.5 1.5L1.5 7l5 5.5" />
                  </svg>
                  {isSub ? 'General' : 'Settings'}
                </button>
              ) : (
                <div className="ss-histnav">
                  <button type="button" aria-label="Back" disabled={!canBack} onClick={() => setHist((h) => ({ ...h, i: Math.max(0, h.i - 1) }))}>
                    <svg viewBox="0 0 8 14" aria-hidden="true">
                      <path d="M6.5 1.5L1.5 7l5 5.5" />
                    </svg>
                  </button>
                  <i />
                  <button type="button" aria-label="Forward" disabled={!canFwd} onClick={() => setHist((h) => ({ ...h, i: Math.min(h.stack.length - 1, h.i + 1) }))}>
                    <svg viewBox="0 0 8 14" aria-hidden="true">
                      <path d="M1.5 1.5L6.5 7l-5 5.5" />
                    </svg>
                  </button>
                </div>
              )}
              <h1 className="ss-title">{meta.label}</h1>
            </DragBar>
            <div ref={mainRef} className="ss-body scroll-smooth" key={route}>
              <div className="ss-content fade-swap">
                <PaneView route={route} go={go} />
              </div>
            </div>
          </section>
        )}
      </div>
    </PrefsCtx.Provider>
  );
}

function PaneView({ route, go }: { route: Route; go: (r: Route) => void }) {
  switch (route) {
    case 'general':
      return <GeneralPane go={go} />;
    case 'general/about':
      return <AboutPane />;
    case 'general/update':
      return <UpdatePane />;
    case 'general/storage':
      return <StoragePane />;
    case 'general/airdrop':
      return <AirDropPane />;
    case 'general/language':
      return <LanguagePane />;
    case 'general/datetime':
      return <DateTimePane />;
    case 'general/login':
      return <LoginPane />;
    case 'appearance':
      return <AppearancePane />;
    case 'wallpaper':
      return <WallpaperPane />;
    case 'display':
      return <DisplayPane />;
    case 'dock':
      return <DockPane />;
    case 'controlcenter':
      return <ControlCenterPane />;
    case 'battery':
      return <BatteryPane />;
    case 'sound':
      return <SoundPane />;
    case 'focus':
      return <FocusPane />;
    case 'notifications':
      return <NotificationsPane />;
    case 'screentime':
      return <ScreenTimePane />;
    case 'lock':
      return <LockPane />;
    case 'privacy':
      return <PrivacyPane />;
    case 'wifi':
      return <WifiPane />;
    case 'network':
      return <NetworkPane />;
    case 'bluetooth':
      return <BluetoothPane />;
    case 'accessibility':
      return <AccessibilityPane />;
    case 'spotlight':
      return <SpotlightPane />;
    case 'screensaver':
      return <ScreenSaverPane />;
    case 'users':
      return <UsersPane />;
    case 'trackpad':
      return <TrackpadPane />;
    case 'keyboard':
      return <KeyboardPane />;
    case 'menubar':
      return <MenuBarPane />;
    case 'siri':
      return <SiriPane />;
    case 'touchid':
      return <TouchIdPane />;
    case 'internet':
      return <InternetAccountsPane />;
    case 'gamecenter':
      return <GameCenterPane />;
    case 'wallet':
      return <WalletPane />;
    case 'printers':
      return <PrintersPane />;
    case 'devices':
      return <DevicesPane />;
    case 'trash':
      return <TrashPane />;
    default:
      return null;
  }
}

/* ═══════════════════════════════ General ═══════════════════════════════ */

function SubRow({ id, go }: { id: SubId; go: (r: Route) => void }) {
  const s = SUBS.find((x) => x.id === id)!;
  return <Row label={s.label} glyph={<Glyph name={s.glyph} color={s.color} />} onClick={() => go(`general/${id}`)} />;
}

function GeneralPane({ go }: { go: (r: Route) => void }) {
  return (
    <>
      <Hero glyph="gear" color="#8e8e93" title="General" desc="Manage your overall setup and preferences for this portfolio, such as software updates, device language, AirDrop, and more." />
      <Section>
        <SubRow id="about" go={go} />
        <SubRow id="update" go={go} />
        <SubRow id="storage" go={go} />
      </Section>
      <Section>
        <SubRow id="airdrop" go={go} />
      </Section>
      <Section>
        <SubRow id="datetime" go={go} />
        <SubRow id="language" go={go} />
        <SubRow id="login" go={go} />
      </Section>
      <Section title="Portfolio Guide">
        <Row label="Guidebook" sub="An A–Z guide to every app, gesture, widget and feature, with screenshots and Try It buttons">
          <button type="button" className="ss-btn" onClick={() => openAppLink('guidebook')}>
            Open
          </button>
        </Row>
        <Row label="Welcome guide" sub="The short first-visit guide">
          <button type="button" className="ss-btn" onClick={() => window.dispatchEvent(new Event('mra-onboarding'))}>
            Show Again
          </button>
        </Row>
      </Section>
      <SeasonalSection />
    </>
  );
}

function SeasonalSection() {
  const { settings, update } = useSettings();
  const season = currentSeason();
  const preview = (id: string | null) => {
    try {
      if (id) sessionStorage.setItem('mra-season-preview', id);
      else sessionStorage.removeItem('mra-season-preview');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('mra-season-change'));
  };
  return (
    <Section title="Seasonal" sub="Snow at Christmas, lanterns for Vesak, lamps for Deepavali, moons for Eid, flowers for Avurudu and confetti at New Year — shown automatically on those dates.">
      <Row label="Seasonal decorations" sub={season ? `Now: ${season.name}` : 'Nothing seasonal today'}>
        <Toggle label="Seasonal decorations" on={settings.seasonal} onChange={(v) => update({ seasonal: v })} />
      </Row>
      <Row label="Preview (this session)">
        <PopUp
          label="Preview seasonal decorations"
          value="none"
          options={[
            ['none', 'Choose…'],
            ['xmas', 'Christmas snow'],
            ['vesak', 'Vesak lanterns'],
            ['deepavali', 'Deepavali lamps'],
            ['eid', 'Eid moons'],
            ['avurudu', 'Avurudu flowers'],
            ['ny', 'New Year confetti'],
            ['off', 'Stop preview'],
          ]}
          onChange={(v) => preview(v === 'none' || v === 'off' ? null : v)}
        />
      </Row>
    </Section>
  );
}

function AboutPane() {
  const { settings } = useSettings();
  const info = useMemo(() => {
    const { browser, os } = parseUA(navigator.userAgent);
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return {
      browser,
      os,
      memory: mem ? `${mem} GB (as reported by your browser)` : 'Not reported by this browser',
      cores: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} logical cores` : 'Not reported',
      display: `${screen.width} × ${screen.height} @ ${Math.round(window.devicePixelRatio * 100) / 100}x`,
    };
  }, []);
  return (
    <>
      <div className="ss-about">
        <div className="ss-mac" aria-hidden="true">
          <div className="ss-mac-screen">
            <WallpaperThumb id={settings.wallpaper} />
          </div>
          <div className="ss-mac-base" />
        </div>
        <h2>{personal.name}’s Portfolio</h2>
        <p>Portfolio v5</p>
      </div>
      <Section>
        <Row label="Name">{personal.name}’s Portfolio</Row>
        <Row label="Chip">React 19 + TypeScript</Row>
        <Row label="Memory">{info.memory}</Row>
        <Row label="Processor">{info.cores}</Row>
        <Row label="Display">{info.display}</Row>
        <Row label="Serial number">MRA-2026</Row>
      </Section>
      <Section title="Software">
        <Row label="Portfolio">Version 5</Row>
        <Row label="Browser">{info.browser}</Row>
        <Row label="Operating system">{info.os}</Row>
        <Row label="Owner">{personal.name}</Row>
      </Section>
      <Note>Hardware values come from your own browser; nothing is sent anywhere.</Note>
    </>
  );
}

function UpdatePane() {
  const { prefs, setPrefs } = usePrefs();
  const [state, setState] = useState<'idle' | 'checking' | 'done'>('idle');
  useEffect(() => {
    if (state !== 'checking') return;
    const t = window.setTimeout(() => {
      setState('done');
      setPrefs((p) => ({ ...p, lastUpdateCheck: Date.now() }));
    }, 1800);
    return () => window.clearTimeout(t);
  }, [state, setPrefs]);
  return (
    <>
      <Section>
        <div className="ss-update">
          <Glyph name="update" color="#8e8e93" size={44} />
          <div>
            {state === 'checking' ? (
              <>
                <b>Checking for updates…</b>
                <span className="spinner ss-spin" aria-hidden="true" />
              </>
            ) : (
              <>
                <b>Your portfolio is up to date — v5</b>
                <small>{prefs.lastUpdateCheck ? `Last checked ${new Date(prefs.lastUpdateCheck).toLocaleString()}` : 'Portfolio v5 · React 19 + TypeScript'}</small>
              </>
            )}
          </div>
          <button type="button" className="ss-btn" disabled={state === 'checking'} onClick={() => setState('checking')}>
            Check Now
          </button>
        </div>
      </Section>
      <Note>Web apps update themselves: every visit loads the latest published version of {personal.name}’s portfolio, so there is never anything to install.</Note>
    </>
  );
}

function StoragePane() {
  const [est, setEst] = useState<{ usage: number; quota: number } | null | 'unsupported'>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const s = navigator.storage;
    if (!s?.estimate) {
      setEst('unsupported');
      return;
    }
    s.estimate()
      .then((e) => alive && setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
      .catch(() => alive && setEst('unsupported'));
    s.persisted?.()
      .then((p) => alive && setPersisted(p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const pct = est && est !== 'unsupported' && est.quota ? Math.max(0.6, (est.usage / est.quota) * 100) : 0;
  return (
    <>
      <Section>
        <div className="ss-storage">
          <div className="ss-storage-h">
            <Glyph name="storage" color="#8e8e93" size={36} />
            <div>
              <b>This site’s storage</b>
              <small>
                {est === null
                  ? 'Calculating…'
                  : est === 'unsupported'
                    ? 'Storage estimate isn’t available in this browser'
                    : `${fmtBytes(est.usage)} used of ${fmtBytes(est.quota)} available to this site`}
              </small>
            </div>
          </div>
          <div className="ss-bar" role="img" aria-label={`${pct.toFixed(2)}% used`}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="ss-legend">
            <span>
              <i style={{ background: 'var(--accent)' }} /> Portfolio data (settings, notes, cache)
            </span>
            <span>
              <i style={{ background: 'var(--ss-track)' }} /> Available
            </span>
          </div>
        </div>
      </Section>
      <Section>
        <Row label="Persistent storage">{persisted === null ? '—' : persisted ? 'Granted' : 'Best effort (browser may clear it)'}</Row>
        <Row label="Where it lives">On this device only</Row>
      </Section>
      <Note>Figures come from navigator.storage.estimate(); browsers round them for privacy.</Note>
    </>
  );
}

function AirDropPane() {
  const sys = useSystem();
  return (
    <>
      <Section sub="AirDrop lets you share instantly with people nearby. You can be discoverable in AirDrop to receive from everyone or only people in your contacts.">
        <Row label="AirDrop" glyph={<Glyph name="airdrop" color="#0a84ff" />}>
          <PopUp<AirDrop>
            label="AirDrop"
            value={sys.airdrop}
            onChange={(v) => sys.set({ airdrop: v })}
            options={[
              ['off', 'No One'],
              ['contacts', 'Contacts Only'],
              ['everyone', 'Everyone for 10 Minutes'],
            ]}
          />
        </Row>
      </Section>
      <Note>Browsers can’t send files over AirDrop or hand off to other devices — this AirDrop setting only changes the portfolio’s own status (shared with Control Center).</Note>
    </>
  );
}

function LanguagePane() {
  const now = useNow(1000);
  const d = useMemo(() => {
    const lang = navigator.language || 'en';
    const ro = Intl.DateTimeFormat().resolvedOptions();
    let region = '—';
    try {
      const r = new Intl.Locale(lang).maximize().region;
      region = r ? (new Intl.DisplayNames([lang], { type: 'region' }).of(r) ?? r) : '—';
    } catch {
      /* Intl.Locale unsupported */
    }
    let langName = lang;
    try {
      langName = new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang;
    } catch {
      /* ignore */
    }
    return { lang, langName, langs: navigator.languages?.length ? navigator.languages : [lang], tz: ro.timeZone, calendar: ro.calendar, numbering: ro.numberingSystem, region };
  }, []);
  const fmt = (o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(d.lang, o).format(now);
    } catch {
      return now.toString();
    }
  };
  const { settings, update } = useSettings();
  return (
    <>
      <Section title="Portfolio language" sub="Menu bar, notifications, lock screen, Hire Me and Guestbook. Portfolio content stays in English (the language of my CV).">
        <Row label="Interface language">
          <PopUp label="Interface language" value={settings.language ?? 'en'} options={LANGS.map((l) => [l.id, `${l.native}${l.id !== 'en' ? ` (${l.label})` : ''}`] as [typeof l.id, string])} onChange={(v) => update({ language: v })} />
        </Row>
      </Section>
      <Section title="Preferred Languages" sub="Reported by your browser, in order of preference.">
        {d.langs.map((l, i) => {
          let name = l;
          try {
            name = new Intl.DisplayNames([d.lang], { type: 'language' }).of(l) ?? l;
          } catch {
            /* ignore */
          }
          return (
            <Row key={l} label={name} sub={i === 0 ? 'Primary' : undefined}>
              <code className="ss-code">{l}</code>
            </Row>
          );
        })}
      </Section>
      <Section>
        <Row label="Region">{d.region}</Row>
        <Row label="Calendar">{d.calendar}</Row>
        <Row label="Time zone">{d.tz}</Row>
        <Row label="Numbering system">{d.numbering}</Row>
        <Row label="Number format">{new Intl.NumberFormat(d.lang).format(1234567.89)}</Row>
      </Section>
      <Section title="Format Samples">
        <div className="ss-sample">
          <b>{fmt({ dateStyle: 'full', timeStyle: 'short' })}</b>
          <span>{fmt({ dateStyle: 'short' })}</span>
          <span>{fmt({ dateStyle: 'medium', timeStyle: 'medium' })}</span>
        </div>
      </Section>
    </>
  );
}

function DateTimePane() {
  const now = useNow(1000);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const off = -now.getTimezoneOffset();
  const offStr = `UTC${off >= 0 ? '+' : '−'}${String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')}:${String(Math.abs(off) % 60).padStart(2, '0')}`;
  const his = (() => {
    try {
      return new Intl.DateTimeFormat(undefined, { timeZone: personal.timezone, hour: 'numeric', minute: '2-digit', weekday: 'short' }).format(now);
    } catch {
      return '—';
    }
  })();
  const deg = (n: number, of: number) => (n / of) * 360;
  return (
    <>
      <div className="ss-clock-wrap">
        <div className="ss-clock" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
          <b className="h" style={{ transform: `rotate(${deg((now.getHours() % 12) + now.getMinutes() / 60, 12)}deg)` }} />
          <b className="m" style={{ transform: `rotate(${deg(now.getMinutes() + now.getSeconds() / 60, 60)}deg)` }} />
          <b className="s" style={{ transform: `rotate(${deg(now.getSeconds(), 60)}deg)` }} />
        </div>
        <div>
          <div className="ss-clock-time">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</div>
          <div className="ss-clock-date">{now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      <Section>
        <Row label="Set time and date automatically" sub="Your device’s clock is used">
          <Toggle label="Set time automatically" on onChange={() => undefined} disabled />
        </Row>
        <Row label="Time zone">
          {tz} ({offStr})
        </Row>
        <Row label={`${personal.name}’s local time`} sub={`${personal.location} · ${personal.timezone}`}>
          {his}
        </Row>
      </Section>
    </>
  );
}

function LoginPane() {
  const { flag, setFlag } = usePrefs();
  return (
    <>
      <Section title="Open at Login" sub="Apps you switch on here open automatically after the portfolio starts up and you unlock it (once per visit).">
        {LOGIN_APPS.map((id) => (
          <Row key={id} label={APPS[id].title} sub="Application" glyph={<AppIcon name={APPS[id].icon} className="ss-appicon" />}>
            <Toggle label={`Open ${APPS[id].title} at login`} on={flag(`login-${id}`, false)} onChange={(v) => setFlag(`login-${id}`, v)} />
          </Row>
        ))}
      </Section>
      <Section title="Allow in the Background">
        <Row label="Screen Time tracker" sub="Counts how long each app is focused (stored on this device)" glyph={<Glyph name="hourglass" color="#5e5ce6" />}>
          On
        </Row>
      </Section>
    </>
  );
}

/* ═══════════════════════════════ Appearance & Wallpaper ═══════════════════════════════ */

function AppearancePane() {
  const { settings, update } = useSettings();
  const { choice, setChoice } = usePrefs();
  const mode: 'auto' | 'light' | 'dark' = settings.autoAppearance !== 'off' ? 'auto' : settings.appearance;
  const choose = (m: 'auto' | 'light' | 'dark') => {
    if (m === 'auto') update({ autoAppearance: settings.autoAppearance === 'off' ? 'system' : settings.autoAppearance });
    else update({ appearance: m, autoAppearance: 'off' });
  };
  const sun = sunTimes();
  const accent = ACCENTS.find((a) => a.id === settings.accent) ?? ACCENTS[0];
  return (
    <>
      <Section>
        <Row label="Appearance" className="ss-row-top">
          <div className="ss-thumbs" role="radiogroup" aria-label="Appearance">
            {(['auto', 'light', 'dark'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={`ss-thumb-opt ${mode === m ? 'on' : ''}`} onClick={() => choose(m)}>
                <span className={`ss-thumb ${m}`}>
                  <i className="w1" />
                  <i className="w2" />
                </span>
                <span>{m === 'auto' ? 'Auto' : m === 'light' ? 'Light' : 'Dark'}</span>
              </button>
            ))}
          </div>
        </Row>
        {mode === 'auto' && (
          <Row label="Auto switches" sub={settings.autoAppearance === 'sunset' ? `Dark from sunset (${fmtTime(sun.sunset)}) to sunrise (${fmtTime(sun.sunrise)})` : 'Follows your device’s light / dark setting live'}>
            <PopUp
              label="Auto appearance"
              value={settings.autoAppearance === 'sunset' ? 'sunset' : 'system'}
              options={[
                ['system', 'With my device'],
                ['sunset', 'At sunset & sunrise'],
              ]}
              onChange={(v) => update({ autoAppearance: v })}
            />
          </Row>
        )}
      </Section>
      <Section title="Theme">
        <Row label="Color" className="ss-row-top">
          <div className="ss-accents" role="radiogroup" aria-label="Accent colour">
            {ACCENTS.map((a) => (
              <span key={a.id} className="ss-accent-cell">
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.accent === a.id}
                  aria-label={a.label}
                  className={`ss-accent ${a.id === 'multicolor' ? 'multi' : ''} ${settings.accent === a.id ? 'on' : ''}`}
                  style={{ background: a.id === 'multicolor' ? undefined : a.color }}
                  onClick={() => update({ accent: a.id })}
                />
                {settings.accent === a.id && <small>{a.label}</small>}
              </span>
            ))}
          </div>
        </Row>
        <Row label="Text highlight color">
          <PopUp label="Text highlight color" value={choice('highlight', 'auto')} swatch={HIGHLIGHTS.find((h) => h[0] === choice('highlight', 'auto'))?.[2] || accent.color} options={HIGHLIGHTS.map(([k, l]) => [k, l] as [string, string])} onChange={(v) => setChoice('highlight', v)} />
        </Row>
      </Section>
      <Section title="Icon & widget style">
        <Row label="" className="ss-row-top">
          <div className="ss-iconstyles" role="radiogroup" aria-label="Icon and widget style">
            {(
              [
                ['default', 'Default'],
                ['dark', 'Dark'],
                ['clear', 'Clear'],
                ['tinted', 'Tinted'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={(settings.iconStyle ?? 'default') === v} className={`ss-iconstyle ${(settings.iconStyle ?? 'default') === v ? 'on' : ''}`} onClick={() => update({ iconStyle: v })}>
                <span className={`ss-is-prev is-${v}`}>
                  <AppIcon name="safari" />
                  <AppIcon name="notes" />
                  <AppIcon name="photos" />
                  <AppIcon name="music" />
                </span>
                <span>{l}</span>
              </button>
            ))}
          </div>
        </Row>
        <Row label="Folder color" sub="Folders on the desktop, in Finder and in Launchpad">
          <div className="ss-folder-colors" role="radiogroup" aria-label="Folder color">
            {FOLDER_COLORS.map(([c, l]) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={(settings.folderColor ?? 'auto') === c}
                aria-label={l}
                title={l}
                className={`ss-fc ${(settings.folderColor ?? 'auto') === c ? 'on' : ''} ${c === 'auto' ? 'auto' : ''}`}
                style={c === 'auto' ? undefined : { background: c }}
                onClick={() => update({ folderColor: c })}
              />
            ))}
          </div>
        </Row>
      </Section>
      <Section title="Liquid Glass" sub="Choose how glass looks in the menu bar, Dock, widgets, Control Center and sidebars.">
        <Row label="" className="ss-row-top">
          <div className="ss-glass-opts" role="radiogroup" aria-label="Liquid Glass">
            {(
              [
                ['clear', 'Clear', 'More transparent, shows the wallpaper through'],
                ['tinted', 'Tinted', 'More opaque with higher contrast'],
              ] as const
            ).map(([v, l, d]) => (
              <button key={v} type="button" role="radio" aria-checked={(settings.liquidGlass ?? 'clear') === v} className={`ss-glass ${(settings.liquidGlass ?? 'clear') === v ? 'on' : ''}`} onClick={() => update({ liquidGlass: v })}>
                <span className={`ss-glass-prev g-${v}`}>
                  <WallpaperThumb id={settings.wallpaper} />
                  <i />
                </span>
                <b>{l}</b>
                <small>{d}</small>
              </button>
            ))}
          </div>
        </Row>
      </Section>
      <Section>
        <Row label="Tint wallpaper in Dark Mode" sub="Gives the wallpaper a graphite tint while Dark Mode is on">
          <Toggle label="Tint wallpaper in Dark Mode" on={settings.darkWallpaperTint} onChange={(v) => update({ darkWallpaperTint: v })} />
        </Row>
        <Row label="Reduce motion" sub="Also in Accessibility">
          <Toggle label="Reduce motion" on={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        </Row>
      </Section>
      <Note>Dark Mode changes windows, the menu bar, the Dock, Control Center and Notification Center.</Note>
    </>
  );
}

const FOLDER_COLORS: [string, string][] = [
  ['auto', 'Automatic (accent)'],
  ['#0a84ff', 'Blue'],
  ['#8e5cf5', 'Purple'],
  ['#ff375f', 'Pink'],
  ['#ff453a', 'Red'],
  ['#ff9f0a', 'Orange'],
  ['#ffd60a', 'Yellow'],
  ['#30d158', 'Green'],
  ['#8e8e93', 'Graphite'],
];


function WallpaperPane() {
  const { settings, update } = useSettings();
  const wm = useWM();
  return (
    <>
      <WallpaperLibrary device="mac" />
      <Section title="Your Photos" sub="Use any picture from Photos, or upload one from your device (kept in this browser only).">
        <div className="ss-wp-mine">
          {settings.customWallpaper && (
            <button type="button" className={`ss-wp-opt ${settings.wallpaper === 'custom' ? 'on' : ''}`} onClick={() => update({ wallpaper: 'custom' })} aria-pressed={settings.wallpaper === 'custom'}>
              <span className="ss-wp-img">
                <WallpaperThumb id="custom" />
              </span>
              <span className="ss-wp-name">Your Photo</span>
            </button>
          )}
          <button type="button" className="ss-btn" onClick={() => {
              wm.open('photos', { album: 'Portraits', pick: 'wallpaper' });
              notify({ app: 'Photos', icon: 'photos', title: 'Pick a photo for your wallpaper', body: 'Open any photo and click “Use as Wallpaper” — or right-click it.' });
            }}>
            Choose from Photos…
          </button>
          <label className="ss-btn ss-upload">
            Upload Image…
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const w = await wallFromFile(f);
                  update({ customWallpaper: w.src, customTone: w.tone, wallpaper: 'custom' });
                  wallNotice(f.name);
                } catch (err) {
                  notify({ app: 'Wallpaper', icon: 'photos', title: 'Couldn’t use that file', body: (err as Error).message || 'Try a JPEG or PNG image.' });
                }
              }}
            />
          </label>
        </div>
      </Section>
      <Note>Original wallpapers created for this portfolio, plus some supplied by {personal.name}. Your choice is remembered on this device.</Note>
    </>
  );
}

/* ═══════════════════════════════ Displays & Dock ═══════════════════════════════ */

function useRefreshRate(): number | null {
  const [hz, setHz] = useState<number | null>(null);
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      frames++;
      if (t - t0 < 1000) raf = requestAnimationFrame(loop);
      else setHz(Math.round((frames * 1000) / (t - t0)));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return hz;
}

function DisplayPane() {
  const sys = useSystem();
  const { settings } = useSettings();
  const hz = useRefreshRate();
  const p3 = useMedia('(color-gamut: p3)');
  const hdr = useMedia('(dynamic-range: high)');
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return (
    <>
      <div className="ss-display">
        <div className="ss-monitor" aria-hidden="true">
          <div className="ss-monitor-screen" style={{ filter: `brightness(${0.4 + sys.brightness * 0.6})${sys.nightShift ? ' sepia(.35) saturate(1.2)' : ''}` }}>
            <WallpaperThumb id={settings.wallpaper} />
          </div>
          <div className="ss-monitor-stand" />
        </div>
        <b>This Display</b>
        <small>
          {screen.width} × {screen.height}
        </small>
      </div>
      <Section>
        <Row label="Brightness">
          <Slider
            label="Brightness"
            min={0.25}
            max={1}
            step={0.01}
            value={sys.brightness}
            onChange={(v) => sys.set({ brightness: v })}
            left={<Glyph name="display" color="transparent" size={16} />}
            right={<Glyph name="display" color="transparent" size={20} />}
          />
        </Row>
        <Row label="Night Shift" sub="Warms the colours of the portfolio">
          <Toggle label="Night Shift" on={sys.nightShift} onChange={(v) => sys.set({ nightShift: v })} />
        </Row>
        <Row label="Full Screen" sub="Uses your browser’s full-screen mode">
          <Toggle label="Full Screen" on={sys.fullscreen} onChange={() => sys.toggleFullscreen()} />
        </Row>
      </Section>
      <DisplayV9 hz={hz} />
      <Section title="Display Information">
        <Row label="Resolution">
          {screen.width} × {screen.height} points
        </Row>
        <Row label="Pixels">
          {Math.round(screen.width * window.devicePixelRatio)} × {Math.round(screen.height * window.devicePixelRatio)} ({window.devicePixelRatio}x)
        </Row>
        <Row label="Browser window">
          {vp.w} × {vp.h}
        </Row>
        <Row label="Colour depth">{screen.colorDepth}-bit</Row>
        <Row label="Colour gamut">{p3 ? 'Display P3' : 'sRGB'}</Row>
        <Row label="High dynamic range">{hdr ? 'Supported' : 'Not detected'}</Row>
        <Row label="Refresh rate">{hz ? `≈ ${hz} Hz (measured)` : 'Measuring…'}</Row>
      </Section>
      <Note>Brightness dims the portfolio itself — your screen’s hardware brightness is not changed.</Note>
    </>
  );
}

/* ───────── v9: Resolution (scaled), Refresh Rate, Extended Displays ───────── */
interface ScreenDetailed {
  label?: string;
  width: number;
  height: number;
  devicePixelRatio: number;
  isPrimary?: boolean;
  isInternal?: boolean;
  left: number;
  top: number;
}
const SCALES: { v: number; label: string; sub: string }[] = [
  { v: 1.25, label: 'Larger Text', sub: '125%' },
  { v: 1.1, label: '', sub: '110%' },
  { v: 1, label: 'Default', sub: '100%' },
  { v: 0.9, label: '', sub: '90%' },
  { v: 0.8, label: 'More Space', sub: '80%' },
];

function DisplayV9({ hz }: { hz: number | null }) {
  const { settings, update } = useSettings();
  const [screens, setScreens] = useState<ScreenDetailed[] | null>(null);
  const [perm, setPerm] = useState<'idle' | 'denied' | 'unsupported'>('idle');
  const scale = settings.displayScale || 1;
  const extended = (window.screen as Screen & { isExtended?: boolean }).isExtended;
  const detect = async () => {
    const w = window as Window & { getScreenDetails?: () => Promise<{ screens: ScreenDetailed[] }> };
    if (!w.getScreenDetails) {
      setPerm('unsupported');
      return;
    }
    try {
      const d = await w.getScreenDetails();
      setScreens(d.screens);
    } catch {
      setPerm('denied');
    }
  };
  const openOnOther = (sc?: ScreenDetailed) => {
    const f = sc ? `left=${sc.left + 40},top=${sc.top + 40},width=${Math.min(1440, sc.width - 80)},height=${Math.min(900, sc.height - 80)}` : 'width=1280,height=800';
    window.open(window.location.href.split('#')[0], '_blank', `popup,${f}`);
  };
  return (
    <>
      <Section title="Resolution" sub="Scales the content of every window — like choosing a “Looks like” resolution on a Mac.">
        <Row label="" className="ss-row-top ss-res-row">
          <div className="ss-res" role="radiogroup" aria-label="Resolution">
            {SCALES.map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={Math.abs(scale - o.v) < 0.01} className={Math.abs(scale - o.v) < 0.01 ? 'on' : ''} onClick={() => update({ displayScale: o.v })}>
                <span className="ss-res-screen" style={{ ['--s' as string]: String(o.v) }}>
                  <i />
                  <i />
                  <i />
                </span>
                <b>{o.label || ' '}</b>
                <small>
                  Looks like {Math.round(window.screen.width / o.v)} × {Math.round(window.screen.height / o.v)}
                </small>
              </button>
            ))}
          </div>
        </Row>
      </Section>
      <Section>
        <Row label="Refresh rate" sub="Measured in this browser. Change it in your computer’s own display settings — a website can’t.">
          {hz ? `≈ ${hz} Hz${hz > 75 ? ' (ProMotion-class)' : ''}` : 'Measuring…'}
        </Row>
        <Row label="Rotation" sub="Set by your device">
          Standard
        </Row>
      </Section>
      <Section title="Extended Displays" sub="Use a second screen: open another portfolio window on it and pick its scaling.">
        <Row label="Displays connected" sub={extended === undefined ? 'Your browser doesn’t report extended displays' : extended ? 'An extended display is connected' : 'Only this display is connected'}>
          <button type="button" className="ss-btn" onClick={() => void detect()}>
            Detect Displays
          </button>
        </Row>
        {perm === 'unsupported' && <Row label="Screen details" sub="Needs Chrome or Edge (Window Management API)">Not available</Row>}
        {perm === 'denied' && <Row label="Screen details" sub="Allow “Window management” for this site to see each display">Permission needed</Row>}
        {screens?.map((sc, i) => (
          <Row key={i} label={`${sc.label || (sc.isInternal ? 'Built-in Display' : `Display ${i + 1}`)}${sc.isPrimary ? ' · Main' : ''}`} sub={`${sc.width} × ${sc.height} points · ${sc.devicePixelRatio}× scaling · ${Math.round(sc.width * sc.devicePixelRatio)} × ${Math.round(sc.height * sc.devicePixelRatio)} pixels`}>
            <button type="button" className="ss-btn" onClick={() => openOnOther(sc)}>
              Open Window Here
            </button>
          </Row>
        ))}
        <Row label="Extended display size" sub="Scaling used for windows opened on another display">
          <PopUp
            label="Extended display scaling"
            value={String(settings.extScale ?? 1)}
            options={[
              ['1.25', 'Larger Text (125%)'],
              ['1', 'Default (100%)'],
              ['0.9', 'More Space (90%)'],
              ['0.8', 'Most Space (80%)'],
            ]}
            onChange={(v) => update({ extScale: Number(v) })}
          />
        </Row>
        <Row label="Open portfolio in a new window" sub="Drag it to your other display">
          <button type="button" className="ss-btn" onClick={() => openOnOther()}>
            Open Window
          </button>
        </Row>
      </Section>
    </>
  );
}

function HotCornersSheet({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const opts: [HotCornerAction, string][] = [
    ['none', '—'],
    ['mc', 'Mission Control'],
    ['desktop', 'Desktop'],
    ['nc', 'Notification Center'],
    ['cc', 'Control Center'],
    ['launchpad', 'Launchpad'],
    ['hireme', 'Hire Me'],
    ['switcher', 'App Switcher'],
    ['screensaver', 'Start Screen Saver'],
    ['sleep', 'Put Display to Sleep'],
    ['lock', 'Lock Screen'],
  ];
  const corners = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];
  const cur = settings.hotCorners ?? ['none', 'none', 'none', 'nc'];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.querySelector('select')?.focus(), []);
  return (
    <div className="ss-sheet-back" onClick={onClose}>
      <div ref={ref} className="ss-sheet" role="dialog" aria-modal="true" aria-label="Hot Corners" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h4>Hot Corners</h4>
        <div className="ss-corners">
          <div className="ss-corners-screen" aria-hidden="true" />
          {corners.map((c, i) => (
            <label key={c} className={`ss-corner c${i}`}>
              <span>{c}</span>
              <PopUp
                label={`${c} hot corner`}
                value={cur[i] ?? 'none'}
                options={opts}
                onChange={(v) => {
                  const next = [...cur];
                  next[i] = v;
                  update({ hotCorners: next });
                }}
              />
            </label>
          ))}
        </div>
        <p className="ss-inline-note">Move the pointer into a screen corner to run the action.</p>
        <div className="ss-sheet-foot">
          <button type="button" className="ss-btn ss-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function DockPane() {
  const { settings, update } = useSettings();
  const sys = useSystem();
  const { flag, setFlag } = usePrefs();
  const [sheet, setSheet] = useState(false);
  const simRow = (k: string, label: string, d: boolean, sub?: string) => (
    <Row key={k} label={label} sub={sub}>
      <Toggle label={label} on={flag(k, d)} onChange={(v) => setFlag(k, v)} />
    </Row>
  );
  return (
    <>
      <Section title="Dock">
        <Row label="Size">
          <Slider label="Dock size" min={36} max={64} step={1} value={settings.dockSize} onChange={(v) => update({ dockSize: v })} left={<small>Small</small>} right={<small>Large</small>} />
        </Row>
        <Row label="Magnification">
          <Toggle label="Magnification" on={settings.magnification} onChange={(v) => update({ magnification: v })} />
        </Row>
        <Row label="Magnification amount">
          <Slider
            label="Magnification amount"
            min={0.2}
            max={1}
            step={0.05}
            value={settings.magnificationAmount}
            disabled={!settings.magnification}
            onChange={(v) => update({ magnificationAmount: v })}
            left={<small>Small</small>}
            right={<small>Large</small>}
          />
        </Row>
        <Row label="Position on screen">
          <Seg
            label="Position on screen"
            value={settings.dockPosition ?? 'bottom'}
            options={[
              ['left', 'Left'],
              ['bottom', 'Bottom'],
              ['right', 'Right'],
            ]}
            onChange={(v) => update({ dockPosition: v })}
          />
        </Row>
        <Row label="Minimize windows using">
          <PopUp
            label="Minimize windows using"
            value={settings.minimizeEffect ?? 'genie'}
            options={[
              ['genie', 'Genie Effect'],
              ['scale', 'Scale Effect'],
            ]}
            onChange={(v) => update({ minimizeEffect: v })}
          />
        </Row>
        <Row label="Double-click a window’s title bar to">
          <PopUp
            label="Double-click a window’s title bar to"
            value={settings.titleBarDoubleClick ?? 'zoom'}
            options={[
              ['zoom', 'Zoom'],
              ['minimize', 'Minimize'],
              ['none', 'Do Nothing'],
            ]}
            onChange={(v) => update({ titleBarDoubleClick: v })}
          />
        </Row>
        <Row label="Minimize windows into application icon">
          <Toggle label="Minimize windows into application icon" on={!!settings.minimizeToAppIcon} onChange={(v) => update({ minimizeToAppIcon: v })} />
        </Row>
        <Row label="Automatically hide and show the Dock">
          <Toggle label="Automatically hide and show the Dock" on={!!settings.dockAutohide} onChange={(v) => update({ dockAutohide: v })} />
        </Row>
        <Row label="Animate opening applications">
          <Toggle label="Animate opening applications" on={settings.dockAnimateOpen !== false} onChange={(v) => update({ dockAnimateOpen: v })} />
        </Row>
        <Row label="Show indicators for open applications">
          <Toggle label="Show indicators for open applications" on={settings.dockIndicators !== false} onChange={(v) => update({ dockIndicators: v })} />
        </Row>
        <Row label="Show suggested and recent apps in Dock">
          <Toggle label="Show suggested and recent apps in Dock" on={settings.dockRecents !== false} onChange={(v) => update({ dockRecents: v })} />
        </Row>
      </Section>
      <Section title="Windows">
        <Row label="Drag windows to screen edges to tile" sub="Left / right halves, corners for quarters, the menu bar to fill">
          <Toggle label="Drag windows to screen edges to tile" on={settings.windowTiling} onChange={(v) => update({ windowTiling: v })} />
        </Row>
        <Row label="Stage Manager" sub="Keeps the front window centred; other apps wait on the left (⌃⌥S)">
          <Toggle label="Stage Manager" on={settings.stageManager} onChange={(v) => update({ stageManager: v })} />
        </Row>
        {simRow('win-close-quit', 'Close windows when quitting an application', true, 'When this is off, apps reopen where you last left their window')}
      </Section>
      <Section title="Mission Control" sub="Mission Control shows an overview of your open windows, all arranged in a unified view.">
        {simRow('mc-top', 'Drag windows to top of screen to enter Mission Control', true, 'Hold a window you are dragging against the top edge of the screen')}
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => sys.setOverlay('missioncontrol')}>
          Open Mission Control
        </button>
        <button type="button" className="ss-btn" onClick={() => setSheet(true)}>
          Hot Corners…
        </button>
        <button type="button" className="ss-btn" onClick={() => window.dispatchEvent(new Event('mra-shortcuts'))}>
          Keyboard Shortcuts…
        </button>
      </div>
      <DesktopV10 />
      <MacExtrasV101 />
      <DynamicIslandV101 />
      <Note>Hover the Dock and sweep across it — icons magnify by cursor proximity with spring physics.</Note>
      {sheet && <HotCornersSheet onClose={() => setSheet(false)} />}
    </>
  );
}

/* ═══════════════════════════════ Control Center ═══════════════════════════════ */

function ControlCenterPane() {
  const { settings, update } = useSettings();
  const { choice, setChoice, flag, setFlag } = usePrefs();
  const full: [string, string][] = [
    ['show', 'Show in Menu Bar'],
    ['active', 'Show When Active'],
    ['hide', 'Don’t Show in Menu Bar'],
  ];
  const two: [string, string][] = [
    ['show', 'Show in Menu Bar'],
    ['hide', 'Don’t Show in Menu Bar'],
  ];
  const mods: { k: string; label: string; glyph: GlyphName; color: string; d: string; opts: [string, string][] }[] = [
    { k: 'wifi', label: 'Wi-Fi', glyph: 'wifi', color: '#0a84ff', d: 'show', opts: two },
    { k: 'bluetooth', label: 'Bluetooth', glyph: 'bluetooth', color: '#0a84ff', d: 'hide', opts: two },
    { k: 'airdrop', label: 'AirDrop', glyph: 'airdrop', color: '#0a84ff', d: 'hide', opts: two },
    { k: 'focus', label: 'Focus', glyph: 'moon', color: '#5e5ce6', d: 'active', opts: full },
    { k: 'display', label: 'Display', glyph: 'display', color: '#0a84ff', d: 'active', opts: full },
    { k: 'sound', label: 'Sound', glyph: 'sound', color: '#ff2d55', d: 'active', opts: full },
    { k: 'nowplaying', label: 'Now Playing', glyph: 'play', color: '#ff9500', d: 'active', opts: full },
  ];
  return (
    <>
      <Section title="Control Center Modules" sub={<>These modules are always visible in Control Center. You can choose when they should also show in the menu bar. <Sim>Simulated except Privacy Shield</Sim></>}>
        {mods.map((m) => (
          <Row key={m.k} label={m.label} glyph={<Glyph name={m.glyph} color={m.color} />}>
            <PopUp label={`${m.label} in menu bar`} value={choice(`cc-${m.k}`, m.d)} options={m.opts} onChange={(v) => setChoice(`cc-${m.k}`, v)} />
          </Row>
        ))}
        <Row label="Privacy Shield" sub="Portfolio privacy status in the menu bar" glyph={<Glyph name="shield" color="#34c759" />}>
          <PopUp label="Privacy Shield in menu bar" value={settings.showShield ? 'show' : 'hide'} options={two} onChange={(v) => update({ showShield: v === 'show' })} />
        </Row>
      </Section>
      <Section title="Other Modules">
        <Row label="Battery" glyph={<Glyph name="battery" color="#30c55a" />} sub="Battery status in the menu bar">
          <Toggle label="Show Battery in Menu Bar" on={flag('cc-battery', true)} onChange={(v) => setFlag('cc-battery', v)} />
        </Row>
        <Row label="Show Percentage" sub="Battery percentage next to the menu-bar icon">
          <Toggle label="Show battery percentage" on={settings.showBatteryPct} onChange={(v) => update({ showBatteryPct: v })} />
        </Row>
      </Section>
    </>
  );
}

/* ═══════════════════════════════ Battery ═══════════════════════════════ */

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}
interface BatSample {
  t: number;
  l: number;
  c: boolean;
}
const BAT_KEY = 'mra-settings-battery-v1';

function fmtMins(s: number): string {
  const m = Math.round(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

function BatteryPane() {
  const { settings, update } = useSettings();
  const [healthInfo, setHealthInfo] = useState(false);
  const [bat, setBat] = useState<{ level: number; charging: boolean; chargingTime: number; dischargingTime: number } | null | 'unsupported'>(null);
  const [samples, setSamples] = useState<BatSample[]>(() => readStore<{ samples: BatSample[] }>(BAT_KEY, { samples: [] }).samples.slice(-48));

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) {
      setBat('unsupported');
      return;
    }
    let mgr: BatteryManagerLike | null = null;
    let alive = true;
    const read = () => {
      if (!mgr || !alive) return;
      setBat({ level: mgr.level, charging: mgr.charging, chargingTime: mgr.chargingTime, dischargingTime: mgr.dischargingTime });
    };
    const sample = (force = false) => {
      if (!mgr || !alive) return;
      const m = mgr;
      setSamples((s) => {
        const last = s[s.length - 1];
        if (!force && last && Date.now() - last.t < 55_000) return s;
        const next = [...s, { t: Date.now(), l: m.level, c: m.charging }].slice(-48);
        writeStore(BAT_KEY, { samples: next });
        return next;
      });
    };
    nav
      .getBattery()
      .then((m) => {
        if (!alive) return;
        mgr = m;
        read();
        sample();
        ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((e) => m.addEventListener(e, read));
      })
      .catch(() => alive && setBat('unsupported'));
    const t = window.setInterval(() => sample(true), 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
      if (mgr) ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((e) => mgr?.removeEventListener(e, read));
    };
  }, []);

  const lowPower = (
    <Section>
      <Row label="Low Power Mode" sub="Reduces energy usage: turns off blur, glass and extra animations in the portfolio.">
        <PopUp
          label="Low Power Mode"
          value={settings.lowPowerMode ?? 'never'}
          onChange={(v) => update({ lowPowerMode: v })}
          options={[
            ['never', 'Never'],
            ['always', 'Always'],
            ['battery', 'Only on Battery'],
            ['adapter', 'Only on Power Adapter'],
          ]}
        />
      </Row>
      <Row label="Battery Health" sub="Maximum capacity and cycle count aren’t shared with websites">
        <span className="ss-health">
          Not reported by the browser <button type="button" className="ss-info" aria-label="About Battery Health" onClick={() => setHealthInfo((v) => !v)}>ⓘ</button>
        </span>
      </Row>
      {healthInfo && (
        <p className="ss-inline-note">
          Browsers only expose the battery level, charging state and time estimates. Full health details (maximum capacity, cycle count, condition) are available in the real System Settings of your device.
        </p>
      )}
    </Section>
  );
  const history = <BatteryHistory current={bat && bat !== 'unsupported' ? bat : null} />;

  if (bat === 'unsupported')
    return (
      <>
        <Hero glyph="battery" color="#30c55a" title="Battery" desc="Battery information isn’t available in this browser." />
        {lowPower}
        {history}
        <Note>The Battery Status API is only offered by some Chromium-based browsers.</Note>
      </>
    );
  if (!bat) return <p className="ss-loading">Reading battery…</p>;

  const pct = Math.round(bat.level * 100);
  const timeLine = bat.charging
    ? Number.isFinite(bat.chargingTime) && bat.chargingTime > 0
      ? `${fmtMins(bat.chargingTime)} until full`
      : bat.level >= 1
        ? 'Fully charged'
        : 'Charging'
    : Number.isFinite(bat.dischargingTime)
      ? `${fmtMins(bat.dischargingTime)} remaining`
      : 'On battery';
  const color = pct <= 20 && !bat.charging ? '#ff3b30' : '#34c759';
  return (
    <>
      <div className="ss-bat-head">
        <span className="ss-bat-icon" aria-hidden="true">
          <i style={{ width: `${pct}%`, background: color }} />
          {bat.charging && (
            <svg viewBox="0 0 10 16">
              <path d="M6 0L0 9h4l-1 7 6-9H5z" />
            </svg>
          )}
        </span>
        <div>
          <b>Battery Level: {pct}%</b>
          <small>
            {bat.charging ? 'Power Adapter' : 'Battery'} · {timeLine}
          </small>
        </div>
      </div>
      {lowPower}
      {history}
      <Section title="Battery Level" sub={`${samples.length} sample${samples.length === 1 ? '' : 's'} recorded on this device — a new one every minute while this pane is open.`}>
        <div className="ss-chart" role="img" aria-label={`Battery level history, latest ${pct}%`}>
          <div className="ss-chart-grid">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          <div className="ss-chart-bars">
            {Array.from({ length: 48 }, (_, i) => {
              const s = samples[i - (48 - samples.length)];
              return (
                <span key={i} className={s ? (s.c ? 'chg' : s.l <= 0.2 ? 'low' : '') : 'empty'} style={{ height: s ? `${Math.max(2, s.l * 100)}%` : 0 }} title={s ? `${new Date(s.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — ${Math.round(s.l * 100)}%${s.c ? ' (charging)' : ''}` : undefined} />
              );
            })}
          </div>
          {samples.length > 0 && (
            <div className="ss-chart-x">
              <span>{new Date(samples[0].t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              <span>{new Date(samples[samples.length - 1].t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
        <div className="ss-chart-legend">
          <span>
            <i style={{ background: '#34c759' }} /> On battery
          </span>
          <span>
            <i style={{ background: '#248a3d' }} /> Charging
          </span>
        </div>
      </Section>
      <Section>
        <Row label="Charging">{bat.charging ? 'Yes' : 'No'}</Row>
        <Row label="Time to full">{bat.charging && Number.isFinite(bat.chargingTime) && bat.chargingTime > 0 ? fmtMins(bat.chargingTime) : '—'}</Row>
        <Row label="Time to empty">{!bat.charging && Number.isFinite(bat.dischargingTime) ? fmtMins(bat.dischargingTime) : '—'}</Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => window.dispatchEvent(new Event('mra-lowbattery-test'))}>
          Test Low-Battery Warning
        </button>
      </div>
      <Note>Real values from your device’s Battery Status API. Desktops without a battery report 100% and charging. You’re warned at 20%, 10% and 5% when not charging.</Note>
    </>
  );
}

/** v9 — Last 24 Hours / Last 10 Days: battery level + Screen On Usage (like macOS) */
function BatteryHistory({ current }: { current: { level: number; charging: boolean } | null }) {
  const [range, setRange] = useState<'24h' | '10d'>('24h');
  const log = useBatteryLog();
  const st = useScreenTime();
  const now = new Date();
  // buckets: 24 × 1 h or 10 × 1 day, oldest → newest
  const n = range === '24h' ? 24 : 10;
  const bucketStart = (i: number) => {
    if (range === '24h') {
      const d = new Date(now);
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() - (n - 1 - i));
      return d;
    }
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  };
  const span = range === '24h' ? 3600000 : 86400000;
  const levels = Array.from({ length: n }, (_, i) => {
    const a = bucketStart(i).getTime();
    const pts = log.filter((p) => p.t >= a && p.t < a + span);
    if (i === n - 1 && current && !pts.length) return { l: current.level, c: current.charging };
    if (!pts.length) return null;
    const last = pts[pts.length - 1];
    return { l: last.l, c: pts.some((p) => p.c) };
  });
  const usage = Array.from({ length: n }, (_, i) => {
    const d = bucketStart(i);
    if (range === '24h') {
      const u = dayKey(d) === st.day ? st.hours : usageFor(dayKey(d))?.hours;
      return u?.[d.getHours()] ?? 0;
    }
    return dayKey(d) === st.day ? st.total : (usageFor(dayKey(d))?.total ?? 0);
  });
  const maxU = Math.max(range === '24h' ? 60 * 60000 : 60 * 60000, ...usage);
  const totalU = usage.reduce((a, b) => a + b, 0);
  const xl = range === '24h' ? [0, 6, 12, 18].map((k) => bucketStart(k).toLocaleTimeString([], { hour: 'numeric' })) : [0, 3, 6, 9].map((k) => bucketStart(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  return (
    <>
      <div className="ss-bh-seg">
        <Seg
          label="History range"
          value={range}
          options={[
            ['24h', 'Last 24 Hours'],
            ['10d', 'Last 10 Days'],
          ]}
          onChange={setRange}
        />
      </div>
      <Section title="Battery Level" sub={log.length ? `Recorded on this device every 5 minutes while the portfolio is open.` : 'No readings yet — history builds up while the portfolio is open.'}>
        <div className="ss-chart ss-bh-chart" role="img" aria-label="Battery level history">
          <div className="ss-chart-grid">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          <div className="ss-chart-bars">
            {levels.map((v, i) => (
              <span key={i} className={v ? (v.c ? 'chg' : v.l <= 0.2 ? 'low' : '') : 'empty'} style={{ height: v ? `${Math.max(2, v.l * 100)}%` : 0 }} title={v ? `${Math.round(v.l * 100)}%${v.c ? ' · charging' : ''}` : 'No reading'} />
            ))}
          </div>
          <div className="ss-chart-x four">
            {xl.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>
      </Section>
      <Section title="Screen On Usage" sub={`${fmtDuration(totalU)} with the portfolio on screen ${range === '24h' ? 'in the last 24 hours' : 'in the last 10 days'}.`}>
        <div className="ss-chart ss-bh-chart" role="img" aria-label="Screen on usage">
          <div className="ss-chart-grid">
            <span>{range === '24h' ? '60m' : fmtDuration(maxU)}</span>
            <span>{range === '24h' ? '30m' : ''}</span>
            <span>0m</span>
          </div>
          <div className="ss-chart-bars">
            {usage.map((ms, i) => (
              <span key={i} className="blue" style={{ height: ms ? `${Math.max(3, (ms / maxU) * 100)}%` : 0 }} title={fmtDuration(ms)} />
            ))}
          </div>
          <div className="ss-chart-x four">
            {xl.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════ Sound ═══════════════════════════════ */

function SoundPane() {
  const { settings, update } = useSettings();
  const music = useMusic();
  const { flag, setFlag } = usePrefs();
  const [tab, setTab] = useState<'output' | 'input'>('output');
  const [devices, setDevices] = useState<MediaDeviceInfo[] | null | 'unsupported'>(null);

  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) {
      setDevices('unsupported');
      return;
    }
    let alive = true;
    const load = () =>
      md
        .enumerateDevices()
        .then((d) => alive && setDevices(d))
        .catch(() => alive && setDevices('unsupported'));
    load();
    md.addEventListener?.('devicechange', load);
    return () => {
      alive = false;
      md.removeEventListener?.('devicechange', load);
    };
  }, []);

  const list = devices && devices !== 'unsupported' ? devices.filter((d) => d.kind === (tab === 'output' ? 'audiooutput' : 'audioinput')) : [];
  const named = list.filter((d) => d.label);
  const typeOf = (label: string) => (/built-?in|internal|macbook|speakers \(|realtek/i.test(label) ? 'Built-in' : /bluetooth|airpods|headset|buds/i.test(label) ? 'Bluetooth' : /usb/i.test(label) ? 'USB' : /virtual|fake|default/i.test(label) ? 'Virtual' : 'Audio device');

  return (
    <>
      <Section title="Sound Effects">
        <Row label="Alert sound">
          <PopUp
            label="Alert sound"
            value={settings.alertSound}
            options={Object.keys(ALERT_SOUNDS).map((k) => [k, k] as [string, string])}
            onChange={(v) => {
              update({ alertSound: v });
              playAlert(v, settings.alertVolume);
            }}
          />
          <button type="button" className="ss-round" aria-label="Play alert sound" onClick={() => playAlert(settings.alertSound, settings.alertVolume)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 7l8 5-8 5z" />
            </svg>
          </button>
        </Row>
        <Row label="Play sound effects through">
          <PopUp label="Play sound effects through" value="default" options={[['default', 'Selected Sound Output Device']]} onChange={() => undefined} disabled />
        </Row>
        <Row label="Alert volume">
          <Slider label="Alert volume" min={0} max={1} step={0.05} value={settings.alertVolume} onChange={(v) => update({ alertVolume: v })} left={<SpeakerIcon level={0} />} right={<SpeakerIcon level={3} />} />
        </Row>
        <Row label="Play sound on startup">
          <Toggle label="Play sound on startup" on={settings.startupSound} onChange={(v) => update({ startupSound: v })} />
        </Row>
        <Row label="Start-up chime" sub="Original tones — preview plays when you choose">
          <PopUp
            label="Start-up chime"
            value={settings.startupChime ?? 'classic'}
            disabled={!settings.startupSound}
            options={[
              ['classic', 'Classic'],
              ['soft', 'Soft'],
              ['bright', 'Bright'],
            ]}
            onChange={(v) => {
              update({ startupChime: v });
              playChime(v, settings.alertVolume);
            }}
          />
        </Row>
        <Row label="Notification sound" sub="A soft chime when a banner appears">
          <Toggle label="Notification sound" on={settings.notificationSounds} onChange={(v) => update({ notificationSounds: v })} />
        </Row>
        <Row label="Play user interface sound effects">
          <Toggle label="Play user interface sound effects" on={settings.uiSounds} onChange={(v) => update({ uiSounds: v })} />
        </Row>
        <Row label="Play feedback when volume is changed" sub="A short click when you change the volume"> 
          <Toggle label="Play feedback when volume is changed" on={flag('vol-feedback', false)} onChange={(v) => setFlag('vol-feedback', v)} />
        </Row>
      </Section>
      <Section title="Output & Input" bare>
        <div className="ss-card ss-io">
          <div className="ss-seg" role="tablist" aria-label="Output or input">
            <button type="button" role="tab" aria-selected={tab === 'output'} className={tab === 'output' ? 'on' : ''} onClick={() => setTab('output')}>
              Output
            </button>
            <button type="button" role="tab" aria-selected={tab === 'input'} className={tab === 'input' ? 'on' : ''} onClick={() => setTab('input')}>
              Input
            </button>
          </div>
          <table className="ss-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {devices === 'unsupported' ? (
                <tr>
                  <td colSpan={2}>Device list isn’t available in this browser</td>
                </tr>
              ) : devices === null ? (
                <tr>
                  <td colSpan={2}>Looking for devices…</td>
                </tr>
              ) : named.length ? (
                named.map((d, i) => (
                  <tr key={`${d.deviceId}-${i}`} className={i === 0 ? 'sel' : ''}>
                    <td>{d.label}</td>
                    <td>{typeOf(d.label)}</td>
                  </tr>
                ))
              ) : (
                <tr className="sel">
                  <td>Default {tab === 'output' ? 'Output' : 'Input'}</td>
                  <td>System</td>
                </tr>
              )}
            </tbody>
          </table>
          {devices !== 'unsupported' && devices !== null && !named.length && (
            <p className="ss-inline-note">
              {list.length ? `${list.length} device${list.length === 1 ? '' : 's'} found — ` : ''}
              {tab === 'output' && list.length === 0 ? 'Your browser doesn’t list output devices. ' : ''}Names stay hidden until you allow microphone access (Privacy & Security → Microphone → Test).
            </p>
          )}
        </div>
      </Section>
      <Section>
        <Row label="Output volume" sub="Controls the portfolio’s music player">
          <Slider label="Output volume" min={0} max={1} step={0.01} value={music.muted ? 0 : music.volume} onChange={(v) => music.setVolume(v)} left={<SpeakerIcon level={0} />} right={<SpeakerIcon level={3} />} />
        </Row>
        <Row label="Mute">
          <Toggle label="Mute" on={music.muted} onChange={() => music.toggleMute()} />
        </Row>
      </Section>
      <SoundsV10 />
    </>
  );
}

function SpeakerIcon({ level }: { level: number }) {
  return (
    <svg className="ss-spk" viewBox="0 0 24 24" aria-hidden="true">
      <path className="f" d="M3.8 9.4h3.4L11.8 5.8v12.4l-4.6-3.6H3.8z" />
      {level > 0 && <path d="M14.8 9.4a3.8 3.8 0 0 1 0 5.2" />}
      {level > 1 && <path d="M17.2 7.2a7 7 0 0 1 0 9.6" />}
      {level > 2 && <path d="M19.6 5a10.2 10.2 0 0 1 0 14" />}
    </svg>
  );
}

/* ═══════════════════════════════ Focus & Notifications ═══════════════════════════════ */

const FOCUS_INFO: Record<'dnd' | 'work' | 'sleep' | 'personal', string> = {
  dnd: 'all banners are silenced (critical alerts still show)',
  work: 'only Mail, Messages, Calendar, Reminders and Clock can show banners',
  personal: 'only Messages, WhatsApp, Phone, Music and Clock can show banners',
  sleep: 'all banners are silenced (critical alerts still show)',
};

function FocusPane() {
  const sys = useSystem();
  const { settings, update } = useSettings();
  const cur = sys.focus ? (settings.focusMode && settings.focusMode !== 'off' ? settings.focusMode : 'dnd') : 'off';
  // v10.3 — the same Focus modes as iPhone/iPad Control Centre; each really filters banners
  const set = (mode: 'off' | 'dnd' | 'work' | 'sleep' | 'personal', name: string) => {
    update({ focusMode: mode });
    sys.set({ focus: mode !== 'off' });
    notify({ app: 'Focus', icon: 'settings', title: mode !== 'off' ? `${name} is on` : 'Focus is off', body: mode === 'off' ? 'Notifications will show again.' : FOCUS_INFO[mode], critical: true });
  };
  const rows: ['dnd' | 'work' | 'sleep' | 'personal', string, GlyphName, string][] = [
    ['dnd', 'Do Not Disturb', 'moon', '#5e5ce6'],
    ['work', 'Work', 'briefcase', '#30b0c7'],
    ['personal', 'Personal', 'users', '#bf5af2'],
    ['sleep', 'Sleep', 'moon', '#30d158'],
  ];
  return (
    <>
      <Section>
        {rows.map(([id, label, glyph, color]) => (
          <Row key={id} label={label} sub={cur === id ? `On — ${FOCUS_INFO[id]}` : FOCUS_INFO[id]} glyph={<Glyph name={glyph} color={color} size={30} />}>
            <Toggle label={label} on={cur === id} onChange={(v) => set(v ? id : 'off', label)} />
          </Row>
        ))}
      </Section>
      <Section>
        <Row label="Focus status" sub="When you give an app permission, it can share that you have notifications silenced when using Focus.">
          {sys.focus ? 'On' : 'Off'}
        </Row>
      </Section>
    </>
  );
}

function NotificationsPane() {
  const { settings, update } = useSettings();
  const sys = useSystem();
  const [perm, setPerm] = useState(notificationPermission());
  const enableSystem = async (v: boolean) => {
    if (!v) return update({ systemNotifications: false });
    const r = await requestNotificationPermission();
    setPerm(r);
    update({ systemNotifications: r === 'granted' });
  };
  return (
    <>
      <Section title="Portfolio notifications">
        <Row label="Notification sound" sub="Soft chime when a banner appears">
          <Toggle label="Notification sound" on={settings.notificationSounds} onChange={(v) => update({ notificationSounds: v })} />
        </Row>
        <Row
          label="Show in my browser when this tab is in the background"
          sub={!notificationsSupported() ? 'Not supported by this browser' : perm === 'denied' ? 'Blocked — allow notifications for this site in your browser settings' : 'Uses the Web Notifications API (asks your permission)'}
        >
          <Toggle label="Browser notifications" on={settings.systemNotifications && perm === 'granted'} disabled={!notificationsSupported() || perm === 'denied'} onChange={(v) => void enableSystem(v)} />
        </Row>
        <Row label="Unread">{sys.unreadCount}</Row>
      </Section>
      <div className="ss-btnrow">
        <button
          type="button"
          className="ss-btn"
          onClick={() => {
            playNotification(settings.alertVolume);
            notify({ app: 'System Settings', icon: 'settings', label: 'Test', title: 'This is a test notification', body: 'Hover to pause it, swipe it away or use Options.', options: [{ label: 'Mark as Read' }, { label: 'Open Notification Center', run: () => sys.setOverlay('notifications') }] });
          }}
        >
          Send Test Notification
        </button>
        <button
          type="button"
          className="ss-btn"
          onClick={() => {
            try {
              ['welcome', 'follow', 'reminder', 'weather', 'casestudy'].forEach((k) => sessionStorage.removeItem(`mra-sched-${k}`));
            } catch {
              /* ignore */
            }
            notify({ app: 'System Settings', icon: 'settings', title: 'Welcome tour reset', body: 'Lock and unlock (⌃⌘Q) or reload to see the welcome notifications again.' });
          }}
        >
          Replay Welcome Notifications
        </button>
        <button type="button" className="ss-btn" onClick={sys.markAllRead} disabled={!sys.unreadCount}>
          Mark All as Read
        </button>
      </div>
      <NotificationsV101 />
      <Note>To silence every banner for real, turn on Focus → Do Not Disturb.</Note>
    </>
  );
}

/* ═══════════════════════════════ Screen Time ═══════════════════════════════ */

function ScreenTimePane() {
  const st = useScreenTime(); // re-renders live while today is shown
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [sel, setSel] = useState(() => new Date());
  const todayKey = dayKey(new Date());
  const selKey = dayKey(sel);
  const shift = (n: number) =>
    setSel((d) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n * (mode === 'week' ? 7 : 1));
      return x > new Date() ? new Date() : x;
    });
  // week = the 7 days ending on the selected date's Saturday (Sun → Sat)
  const weekDays = useMemo(() => {
    const start = new Date(sel);
    start.setDate(sel.getDate() - sel.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [sel]);
  const empty = { perApp: {}, total: 0, opens: 0, hours: Array(24).fill(0) as number[] };
  const day = selKey === todayKey ? { perApp: st.perApp, total: st.total, opens: st.opens, hours: st.hours } : (usageFor(selKey) ?? empty);
  const weekData = weekDays.map((d) => (dayKey(d) === todayKey ? { perApp: st.perApp, total: st.total, opens: st.opens, hours: st.hours } : (usageFor(dayKey(d)) ?? empty)));
  const agg = mode === 'day' ? day : weekData.reduce((acc, d) => {
    const perApp = { ...acc.perApp } as Partial<Record<AppId, number>>;
    (Object.entries(d.perApp) as [AppId, number][]).forEach(([k, v]) => (perApp[k] = (perApp[k] ?? 0) + v));
    return { perApp, total: acc.total + d.total, opens: acc.opens + d.opens, hours: acc.hours };
  }, { ...empty, perApp: {} as Partial<Record<AppId, number>> });

  const apps = (Object.entries(agg.perApp) as [AppId, number][]).filter(([id, ms]) => APPS[id] && ms > 0).sort((a, b) => b[1] - a[1]);
  const maxApp = apps[0]?.[1] ?? 1;
  const bars = mode === 'day' ? day.hours : weekData.map((d) => d.total);
  const maxB = Math.max(60_000, ...bars);
  const nowH = new Date().getHours();
  const scaleMin = Math.ceil(maxB / 60000);
  const fmtScale = (m: number) => (m >= 120 ? `${Math.round(m / 60)}h` : `${m}m`);
  const label =
    mode === 'day'
      ? selKey === todayKey
        ? 'Today'
        : sel.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: sel.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
      : `${weekDays[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  const atEnd = mode === 'day' ? selKey === todayKey : weekDays.some((d) => dayKey(d) === todayKey);
  return (
    <>
      <Hero glyph="hourglass" color="#5e5ce6" title="Screen Time" desc="Real usage of this portfolio on this device — measured while the tab is visible. Pick a day or a week to filter." />
      <div className="ss-st-filter">
        <Seg
          label="Range"
          value={mode}
          options={[
            ['day', 'Day'],
            ['week', 'Week'],
          ]}
          onChange={(v) => setMode(v)}
        />
        <div className="ss-st-date">
          <button type="button" aria-label="Previous" onClick={() => shift(-1)}>
            ‹
          </button>
          <b>{label}</b>
          <button type="button" aria-label="Next" disabled={atEnd} onClick={() => shift(1)}>
            ›
          </button>
        </div>
        <input
          type="date"
          className="ss-st-pick"
          aria-label="Choose a date"
          max={todayKey}
          value={selKey}
          onChange={(e) => {
            const [y, m, d] = e.target.value.split('-').map(Number);
            if (y) setSel(new Date(y, m - 1, d));
          }}
        />
        {!atEnd && (
          <button type="button" className="ss-btn" onClick={() => setSel(new Date())}>
            Today
          </button>
        )}
      </div>
      <Section>
        <div className="ss-st-head">
          <div>
            <small>{mode === 'day' ? (selKey === todayKey ? 'Today' : 'That day') : 'This week'}</small>
            <b>{fmtDuration(agg.total)}</b>
          </div>
          <div>
            <small>{mode === 'day' ? 'Apps opened' : 'Daily average'}</small>
            <b>{mode === 'day' ? agg.opens : fmtDuration(agg.total / Math.max(1, weekData.filter((d) => d.total > 0).length || 1))}</b>
          </div>
          <div>
            <small>Most used</small>
            <b>{apps[0] ? APPS[apps[0][0]].title : '—'}</b>
          </div>
        </div>
        <div className="ss-chart ss-st-chart" role="img" aria-label={mode === 'day' ? 'Usage per hour' : 'Usage per day'}>
          <div className="ss-chart-grid">
            <span>{fmtScale(scaleMin)}</span>
            <span>{scaleMin < 2 ? '30s' : fmtScale(Math.round(scaleMin / 2))}</span>
            <span>0m</span>
          </div>
          <div className={`ss-chart-bars ${mode === 'week' ? 'week' : ''}`}>
            {bars.map((ms, i) => (
              <span
                key={i}
                className={`blue ${mode === 'day' ? (selKey === todayKey && i === nowH ? 'now' : '') : dayKey(weekDays[i]) === selKey ? 'now' : ''}`}
                style={{ height: ms ? `${Math.max(3, (ms / maxB) * 100)}%` : 0 }}
                title={mode === 'day' ? `${i}:00 — ${fmtDuration(ms)}` : `${weekDays[i].toLocaleDateString(undefined, { weekday: 'long' })} — ${fmtDuration(ms)}`}
                onClick={mode === 'week' ? () => (setSel(weekDays[i]), setMode('day')) : undefined}
              />
            ))}
          </div>
          {mode === 'day' ? (
            <div className="ss-chart-x four">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
            </div>
          ) : (
            <div className="ss-chart-x seven">
              {weekDays.map((d) => (
                <span key={d.getDay()}>{d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</span>
              ))}
            </div>
          )}
        </div>
      </Section>
      <Section title="App Usage">
        {apps.length === 0 ? (
          <Row label="No app usage recorded" sub={selKey === todayKey && mode === 'day' ? 'Open a few apps and come back.' : 'Nothing was recorded on this device for this period.'} />
        ) : (
          apps.map(([id, ms]) => (
            <Row key={id} label={APPS[id].title} glyph={<AppIcon name={APPS[id].icon} className="ss-appicon" />} sub={<span className="ss-usage-bar"><i style={{ width: `${(ms / maxApp) * 100}%` }} /></span>}>
              {fmtDuration(ms)}
            </Row>
          ))
        )}
      </Section>
      <Note>Stored on this device only. Up to 60 days are kept; earlier days roll off automatically.</Note>
      <ScreenTimeLimitsV101 />
    </>
  );
}

/* ═══════════════════════════════ Lock Screen & Privacy ═══════════════════════════════ */

function LockPane() {
  const { settings, update } = useSettings();
  const { prefs, setPrefs, choice, setChoice } = usePrefs();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings.lockMessage);
  const showMsg = settings.lockMessage.trim() !== '';
  const fallbackMsg = prefs.lastLockMessage || `Thanks for visiting — ${personal.name}`;
  return (
    <>
      <Section>
        <Row label="Lock screen after inactivity" sub="Real — the lock screen appears after this long without input">
          <PopUp
            label="Lock screen after inactivity"
            value={String(settings.lockAfter)}
            onChange={(v) => update({ lockAfter: Number(v) })}
            options={[
              ['0', 'Never'],
              ['1', 'For 1 minute'],
              ['5', 'For 5 minutes'],
              ['15', 'For 15 minutes'],
              ['30', 'For 30 minutes'],
            ]}
          />
        </Row>
        <Row label="Require password after screen saver begins" sub={<>No password is needed for a portfolio. <Sim /></>}>
          <PopUp label="Require password" value="never" disabled options={[['never', 'Never']]} onChange={() => undefined} />
        </Row>
      </Section>
      <Section>
        <Row label="Show message when locked" sub={showMsg ? `“${settings.lockMessage}”` : undefined}>
          <Toggle
            label="Show message when locked"
            on={showMsg}
            onChange={(v) => {
              if (v) update({ lockMessage: fallbackMsg });
              else {
                setPrefs((p) => ({ ...p, lastLockMessage: settings.lockMessage }));
                update({ lockMessage: '' });
              }
            }}
          />
          <button
            type="button"
            className="ss-btn"
            disabled={!showMsg}
            onClick={() => {
              setDraft(settings.lockMessage);
              setEditing(true);
            }}
          >
            Set…
          </button>
        </Row>
        {editing && (
          <form
            className="ss-edit"
            onSubmit={(e) => {
              e.preventDefault();
              update({ lockMessage: draft.trim() || fallbackMsg });
              setEditing(false);
            }}
          >
            <input autoFocus value={draft} maxLength={120} onChange={(e) => setDraft(e.target.value)} aria-label="Lock screen message" onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} />
            <button type="button" className="ss-btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="ss-btn ss-btn-primary">
              Save
            </button>
          </form>
        )}
      </Section>
      <Section title="Clock">
        <div className="ss-lockclock">
          <div className="ss-lockclock-prev" style={{ ['--lc' as string]: (LOCK_COLORS.find((c) => c.id === choice('lock-color', 'white')) ?? LOCK_COLORS[0]).color }}>
            <span style={lockClockStyle(choice('lock-font', 'classic'), choice('lock-color', 'white'))}>{new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: !settings.clock24 }).replace(/\s?[AP]M$/i, '')}</span>
          </div>
          <div className="ss-lockclock-fonts" role="radiogroup" aria-label="Clock font">
            {LOCK_FONTS.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={choice('lock-font', 'classic') === f.id} className={choice('lock-font', 'classic') === f.id ? 'on' : ''} onClick={() => setChoice('lock-font', f.id)}>
                <span style={f.style}>12</span>
                <small>{f.label}</small>
              </button>
            ))}
          </div>
          <div className="ss-lockclock-colors" role="radiogroup" aria-label="Clock colour">
            {LOCK_COLORS.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={choice('lock-color', 'white') === c.id} aria-label={c.label} title={c.label} className={choice('lock-color', 'white') === c.id ? 'on' : ''} style={{ background: c.color }} onClick={() => setChoice('lock-color', c.id)} />
            ))}
          </div>
        </div>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => window.dispatchEvent(new Event('mra-lock'))}>
          <Glyph name="lock" color="#1c1c1e" size={16} /> Lock Screen Now
        </button>
      </div>
    </>
  );
}

type Perm = 'camera' | 'microphone' | 'geolocation' | 'notifications';
type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking';

function usePermission(name: Perm, tick: number): PermState {
  const [state, setState] = useState<PermState>('checking');
  useEffect(() => {
    let alive = true;
    let status: PermissionStatus | null = null;
    const fallback = (): PermState => {
      if (name === 'notifications') {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission === 'default' ? 'prompt' : (Notification.permission as PermState);
      }
      if (name === 'geolocation') return 'geolocation' in navigator ? 'prompt' : 'unsupported';
      return typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'prompt' : 'unsupported';
    };
    if (!navigator.permissions?.query) {
      setState(fallback());
      return;
    }
    navigator.permissions
      .query({ name: name as PermissionName })
      .then((s) => {
        if (!alive) return;
        status = s;
        setState(s.state as PermState);
        s.onchange = () => setState(s.state as PermState);
      })
      .catch(() => alive && setState(fallback()));
    return () => {
      alive = false;
      if (status) status.onchange = null;
    };
  }, [name, tick]);
  return state;
}

function PermRow({ name, label, glyph, color, why }: { name: Perm; label: string; glyph: GlyphName; color: string; why: string }) {
  const [tick, setTick] = useState(0);
  const state = usePermission(name, tick);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const run = async () => {
    setBusy(true);
    setMsg('');
    try {
      if (name === 'camera' || name === 'microphone') {
        const s = await navigator.mediaDevices.getUserMedia(name === 'camera' ? { video: true } : { audio: true });
        const tr = s.getTracks();
        setMsg(`Works — ${tr[0]?.label || (name === 'camera' ? 'camera' : 'microphone')} responded. Stopped again immediately.`);
        tr.forEach((t) => t.stop());
      } else if (name === 'geolocation') {
        await new Promise<void>((res, rej) =>
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setMsg(`Works — position received (accuracy ±${Math.round(p.coords.accuracy)} m). Not stored or sent anywhere.`);
              res();
            },
            (e) => rej(new Error(e.message || 'Location unavailable')),
            { timeout: 10000 },
          ),
        );
      } else {
        const r = await Notification.requestPermission();
        if (r === 'granted') {
          new Notification(`${personal.name}’s Portfolio`, { body: 'Notifications work.' });
          setMsg('Works — a test notification was sent.');
        } else setMsg(r === 'denied' ? 'Blocked — change it in your browser’s site settings.' : 'No decision yet.');
      }
    } catch (e) {
      setMsg(`Not available — ${e instanceof Error ? e.message : 'request failed'}.`);
    } finally {
      setBusy(false);
      setTick((t) => t + 1);
    }
  };
  const badge: Record<PermState, string> = { granted: 'Allowed', denied: 'Blocked', prompt: 'Ask', unsupported: 'Unsupported', checking: '…' };
  return (
    <Row
      label={label}
      glyph={<Glyph name={glyph} color={color} size={24} />}
      sub={
        <>
          {why}
          {msg && <span className="ss-perm-msg">{msg}</span>}
        </>
      }
      className="ss-row-perm"
    >
      <span className={`ss-badge ${state}`}>{badge[state]}</span>
      <button type="button" className="ss-btn" disabled={busy || state === 'unsupported' || state === 'checking'} onClick={run}>
        {busy ? '…' : state === 'granted' ? 'Test' : 'Request'}
      </button>
    </Row>
  );
}

function PrivacyPane() {
  const secure = window.isSecureContext;
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  return (
    <>
      <Hero glyph="hand" color="#0a84ff" title="Privacy & Security" desc="Live permission states for this site, straight from your browser. Tests run only when you press a button." />
      <Section title="Privacy">
        <PermRow name="camera" label="Camera" glyph="camera" color="#34c759" why="Used by the Camera app for photo booth shots." />
        <PermRow name="microphone" label="Microphone" glyph="mic" color="#ff9500" why="Used by Voice Memos to record." />
        <PermRow name="geolocation" label="Location Services" glyph="location" color="#0a84ff" why="Used by Maps and Weather to find you." />
        <PermRow name="notifications" label="Notifications" glyph="bell" color="#ff3b30" why="Lets the portfolio show system notifications." />
      </Section>
      <Section title="Security">
        <Row label="Connection" sub={secure ? 'Secure context — traffic is encrypted' : 'Not a secure context'} glyph={<Glyph name="lock" color={secure ? '#34c759' : '#ff9500'} />}>
          {location.protocol.replace(':', '').toUpperCase()}
        </Row>
        <Row label="Cookies">{navigator.cookieEnabled ? 'Enabled' : 'Disabled'}</Row>
        <Row label="Global Privacy Control">{gpc === undefined ? 'Not reported' : gpc ? 'On' : 'Off'}</Row>
        <Row label="Your data">Stored on this device only</Row>
      </Section>
    </>
  );
}

/* ═══════════════════════════════ Network ═══════════════════════════════ */

function WifiPane() {
  const sys = useSystem();
  const online = useOnline();
  const conn = useConnection();
  return (
    <>
      <Section>
        <Row label="Wi-Fi" glyph={<Glyph name="wifi" color="#0a84ff" size={30} />} sub={<Sim>Switch is simulated</Sim>}>
          <Toggle label="Wi-Fi" on={sys.wifi} onChange={(v) => sys.set({ wifi: v })} />
        </Row>
        {sys.wifi && (
          <Row label="Portfolio Network" sub={online ? 'Connected' : 'No internet connection'} glyph={<span className="ss-dot-wrap"><i className={`ss-dot ${online ? 'ok' : 'bad'}`} /></span>}>
            {conn?.effectiveType ? `${conn.effectiveType.toUpperCase()} quality` : ''}
          </Row>
        )}
      </Section>
      <Section title="Your Connection">
        <Row label="Internet">{online ? 'Online' : 'Offline'}</Row>
        {conn?.type && <Row label="Type">{conn.type}</Row>}
      </Section>
      <Note>Browsers can’t switch your Wi-Fi. The online status above is real and updates live.</Note>
    </>
  );
}

function NetworkPane() {
  const online = useOnline();
  const conn = useConnection();
  return (
    <>
      <Hero glyph="network" color="#0a84ff" title="Network" desc="Live connection details reported by your browser." />
      <Section>
        <Row label="Status" glyph={<span className="ss-dot-wrap"><i className={`ss-dot ${online ? 'ok' : 'bad'}`} /></span>}>
          {online ? 'Connected' : 'Offline'}
        </Row>
        <Row label="Connection quality">{conn?.effectiveType ? conn.effectiveType.toUpperCase() : 'Not reported'}</Row>
        <Row label="Estimated downlink">{conn?.downlink !== undefined ? `${conn.downlink} Mbps` : 'Not reported'}</Row>
        <Row label="Round-trip time">{conn?.rtt !== undefined ? `${conn.rtt} ms` : 'Not reported'}</Row>
        <Row label="Data Saver">{conn?.saveData === undefined ? 'Not reported' : conn.saveData ? 'On' : 'Off'}</Row>
        <Row label="Secure connection">{window.isSecureContext ? 'Yes' : 'No'}</Row>
      </Section>
      {!conn && <Note>This browser doesn’t expose the Network Information API, so only online/offline is shown.</Note>}
    </>
  );
}

function BluetoothPane() {
  const sys = useSystem();
  return (
    <>
      <Section>
        <Row label="Bluetooth" glyph={<Glyph name="bluetooth" color="#0a84ff" size={30} />} sub={<Sim>{sys.bluetooth ? 'On — simulated switch, no real devices are connected' : 'Off — simulated switch'}</Sim>}>
          <Toggle label="Bluetooth" on={sys.bluetooth} onChange={(v) => sys.set({ bluetooth: v })} />
        </Row>
      </Section>
      <Section title="Nearby Devices">
        <Row label={sys.bluetooth ? 'No devices found' : 'Turn on Bluetooth to see devices'} sub={<Sim />} />
      </Section>
      <Note>Web pages can’t control your Bluetooth radio — this switch is shared with Control Center and is simulated.</Note>
    </>
  );
}

/* ═══════════════════════════════ Misc panes ═══════════════════════════════ */

function AccessibilityPane() {
  const { settings, update } = useSettings();
  const osReduced = useMedia('(prefers-reduced-motion: reduce)');
  const moreContrast = useMedia('(prefers-contrast: more)');
  return (
    <>
      <Hero glyph="accessibility" color="#0a84ff" title="Accessibility" desc="Personalise the portfolio in ways that work for you." />
      <Section title="Vision">
        <Row label="Text size" sub={`${Math.round((settings.textScale || 1) * 100)}% — scales the whole interface`}>
          <Slider label="Text size" min={0.9} max={1.3} step={0.05} value={settings.textScale || 1} onChange={(v) => update({ textScale: Math.round(v * 100) / 100 })} left={<small>A</small>} right={<b>A</b>} />
        </Row>
        <Row label="Bold text">
          <Toggle label="Bold text" on={settings.boldText} onChange={(v) => update({ boldText: v })} />
        </Row>
        <Row label="Increase contrast" sub={moreContrast ? 'Your device also asks for more contrast' : 'Stronger borders and focus rings'}>
          <Toggle label="Increase contrast" on={settings.increaseContrast} onChange={(v) => update({ increaseContrast: v })} />
        </Row>
        <Row label="Reduce transparency" sub="Solid backgrounds instead of glass">
          <Toggle label="Reduce transparency" on={settings.reduceTransparency} onChange={(v) => update({ reduceTransparency: v })} />
        </Row>
      </Section>
      <Section title="Motion">
        <Row label="Reduce motion" sub="Reduces window, Dock, genie and slide animations">
          <Toggle label="Reduce motion" on={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        </Row>
        <Row label="Device setting">{osReduced ? 'Reduce motion is on (always respected)' : 'Reduce motion is off'}</Row>
      </Section>
      <Section title="Keyboard">
        <Row label="Full keyboard navigation" sub="Tab through every control; Esc closes menus, sheets and overlays">
          ✓ Always on
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => window.dispatchEvent(new Event('mra-shortcuts'))}>
          Keyboard Shortcuts…
        </button>
        <button type="button" className="ss-btn" onClick={() => update({ textScale: 1, boldText: false, increaseContrast: false, reduceTransparency: false, reduceMotion: false })}>
          Reset Accessibility
        </button>
      </div>
    </>
  );
}

function SpotlightPane() {
  const sys = useSystem();
  const { settings, update } = useSettings();
  const cfg = settings.spotlight ?? {};
  const [privacy, setPrivacy] = useState(false);
  const setCat = (k: string, v: boolean) => update({ spotlight: { ...cfg, [k]: v } });
  const excl = settings.spotlightExclude ?? [];
  return (
    <>
      <Hero glyph="spotlight" color="#8e8e93" title="Spotlight" desc="Spotlight helps you quickly find apps, projects, skills, services and settings in this portfolio. Choose which categories appear in results." />
      <Section>
        <Row label="Keyboard shortcut">
          <kbd className="ss-kbd">⌃ Space</kbd>
        </Row>
      </Section>
      <Section title="Search results" sub="Only selected categories will appear in Spotlight search results.">
        {SPOTLIGHT_CATS.map((c) => (
          <Row key={c.id} label={c.label} sub={c.sub}>
            <Toggle label={c.label} on={spotOn(cfg, c.id)} onChange={(v) => setCat(c.id, v)} />
          </Row>
        ))}
      </Section>
      <Section>
        <Row label="Results from System" sub="System apps and System Settings panes">
          <Toggle label="Results from System" on={spotOn(cfg, 'system')} onChange={(v) => setCat('system', v)} />
        </Row>
        <Row label="Clipboard Search" sub="Find text you copied inside this portfolio (kept in memory only, never saved)">
          <Toggle label="Clipboard Search" on={spotOn(cfg, 'clipboard')} onChange={(v) => setCat('clipboard', v)} />
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => setPrivacy(true)}>
          Search Privacy…
        </button>
        <button type="button" className="ss-btn" onClick={() => update({ spotlight: {}, spotlightExclude: [] })}>
          Restore Defaults
        </button>
        <button type="button" className="ss-btn ss-btn-primary" onClick={() => sys.setOverlay('spotlight')}>
          Open Spotlight
        </button>
      </div>
      {privacy && (
        <div className="ss-sheet-back" onClick={() => setPrivacy(false)}>
          <div className="ss-sheet ss-privacy" role="dialog" aria-modal="true" aria-label="Search Privacy" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && setPrivacy(false)}>
            <h4>Search Privacy</h4>
            <p className="ss-inline-note">Prevent Spotlight from showing these apps in results. {excl.length ? `${excl.length} excluded.` : ''}</p>
            <div className="ss-privacy-list">
              {LAUNCH_ITEMS.filter((i, k, arr) => arr.findIndex((x) => x.id === i.id) === k)
                .sort((x, y) => x.label.localeCompare(y.label))
                .map((i) => (
                  <label key={i.id} className="ss-privacy-item">
                    <input
                      type="checkbox"
                      checked={excl.includes(i.id)}
                      onChange={(e) => update({ spotlightExclude: e.target.checked ? [...excl, i.id] : excl.filter((x) => x !== i.id) })}
                    />
                    <AppIcon name={i.icon} className="ss-appicon" />
                    <span>{i.label}</span>
                  </label>
                ))}
            </div>
            <div className="ss-sheet-foot">
              <button type="button" className="ss-btn" onClick={() => update({ spotlightExclude: [] })}>
                Clear
              </button>
              <button type="button" className="ss-btn ss-btn-primary" onClick={() => setPrivacy(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ScreenSaverPane() {
  const { choice, setChoice } = usePrefs();
  const settingsCtx = useSettings();
  const kind = choice('saver', 'wallpaper');
  return (
    <>
      <div className={`ss-saver ${kind}`} aria-hidden="true">
        {kind !== 'mono' && <WallImage id={kind === 'aurora' ? 'live-aurora' : kind === 'sunrise' ? 'grad-sunrise' : kind === 'space' ? 'live-space' : settingsCtx.settings.wallpaper} thumb />}
        <span>{personal.name}</span>
      </div>
      <Section sub="The screen saver shows a clock over the style you choose. Move the mouse or press a key to return.">
        <Row label="Start after">
          <PopUp
            label="Start screen saver after"
            value={choice('saver-after', '0')}
            onChange={(v) => setChoice('saver-after', v)}
            options={[
              ['0', 'Never'],
              ['1', '1 minute'],
              ['2', '2 minutes'],
              ['5', '5 minutes'],
              ['10', '10 minutes'],
            ]}
          />
        </Row>
        <Row label="Style">
          <PopUp
            label="Screen saver style"
            value={kind}
            onChange={(v) => setChoice('saver', v)}
            options={[
              ['wallpaper', 'Your Wallpaper'],
              ['aurora', 'Aurora (live)'],
              ['space', 'Space (live)'],
              ['sunrise', 'Sunrise'],
              ['mono', 'Monochrome'],
            ]}
          />
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => window.setTimeout(() => window.dispatchEvent(new Event('mra-screensaver')), 300)}>
          Start Screen Saver Now
        </button>
      </div>
    </>
  );
}

function UsersPane() {
  const wm = useWM();
  return (
    <>
      <div className="ss-user">
        <img src={personal.avatar} alt={personal.name} />
        <h2>{personal.name}</h2>
        <p>Portfolio Account</p>
      </div>
      <Section>
        <Row label="Full name">{personal.name}</Row>
        <Row label="Role">{personal.shortTitle}</Row>
        <Row label="Email">
          <a className="ss-link" href={`mailto:${personal.email}`}>
            {personal.email}
          </a>
        </Row>
        <Row label="Location">{personal.location}</Row>
        <Row label="Status">
          <span className="ss-dot-wrap inline">
            <i className="ss-dot ok" />
          </span>
          {personal.status}
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => wm.open('contacts')}>
          Open Contact Card
        </button>
        <button type="button" className="ss-btn" onClick={() => wm.open('about')}>
          About {personal.name}
        </button>
      </div>
    </>
  );
}

export type AppId =
  | 'about'
  | 'safari'
  | 'notes'
  | 'slides'
  | 'xcode'
  | 'mail'
  | 'settings'
  | 'terminal'
  | 'finder'
  | 'preview'
  | 'photos'
  | 'messages'
  | 'calendar'
  | 'music'
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
  | 'facetime'
  | 'podcasts'
  | 'tv'
  | 'books'
  | 'stocks'
  | 'journal'
  | 'freeform'
  | 'siri'
  | 'passwords'
  | 'dictionary'
  | 'gamecenter'
  | 'webapp'
  | 'hireme'
  | 'casestudies'
  | 'askai'
  | 'guestbook'
  | 'wallet'
  | 'whatsapp'
  | 'telegram'
  | 'xapp'
  | 'yahoomail'
  /* v9 */
  | 'services'
  | 'sysprefs'
  | 'activity'
  | 'stickies'
  | 'translate'
  | 'fontbook'
  | 'grapher'
  | 'colormeter';

export type WindowPhase = 'opening' | 'open' | 'closing' | 'minimizing' | 'minimized' | 'restoring';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowState {
  id: AppId;
  rect: Rect;
  z: number;
  phase: WindowPhase;
  maximized: boolean;
  prevRect?: Rect;
  /** Arbitrary launch arguments (e.g. which project / folder to show). */
  args?: Record<string, string>;
  /** Incremented each time the app is re-launched with new args. */
  launchKey: number;
  /** v8 — the current 'restoring' phase comes from the Dock (genie target) */
  fromMin?: boolean;
  /** v8 — which half/quarter the window is tiled to */
  tile?: string;
}

export type Appearance = 'light' | 'dark';
/** Wallpaper id — see src/data/media.ts → wallpapers */
export type WallpaperId = string;

export interface Settings {
  appearance: Appearance;
  wallpaper: WallpaperId;
  magnification: boolean;
  magnificationAmount: number; // 0..1
  dockSize: number; // px
  reduceMotion: boolean;
  /** Tint the wallpaper graphite in Dark Mode (as in the reference) */
  darkWallpaperTint: boolean;
  /** Accent colour (System Settings → Appearance) — 'multicolor' uses blue */
  accent: string;
  /** Play the start-up chime when the portfolio boots */
  startupSound: boolean;
  /** Play small interface sounds (e.g. emptying Trash, screenshots) */
  uiSounds: boolean;
  /** Alert sound name (System Settings → Sound) */
  alertSound: string;
  /** Alert volume 0..1 */
  alertVolume: number;
  /** Show the privacy shield in the menu bar */
  showShield: boolean;
  /** Show the battery percentage in the menu bar */
  showBatteryPct: boolean;
  /** Minutes of inactivity before the lock screen appears (0 = never) */
  lockAfter: number;
  /** Message shown on the lock screen */
  lockMessage: string;
  /** v8 — Auto appearance: follow the device, or switch at sunset/sunrise */
  autoAppearance: 'off' | 'system' | 'sunset';
  /** v8 — Minimize animation (System Settings → Desktop & Dock) */
  minimizeEffect: 'genie' | 'scale';
  /** v8 — soft sound when a notification banner appears */
  notificationSounds: boolean;
  /** v8 — mirror banners as real browser notifications while the tab is in the background */
  systemNotifications: boolean;
  /** v8 — Hot Corners: [top-left, top-right, bottom-left, bottom-right] */
  hotCorners: HotCornerAction[];
  /** v8 — drag windows to screen edges to tile them */
  windowTiling: boolean;
  /** v8 — Stage Manager */
  stageManager: boolean;
  /** v8 — interface language */
  language: 'en' | 'si' | 'ta';
  /** v8 — accessibility */
  textScale: number;
  boldText: boolean;
  increaseContrast: boolean;
  reduceTransparency: boolean;
  /** v8 — start-up chime style */
  startupChime: 'classic' | 'soft' | 'bright';
  /** v8 — seasonal decorations on the desktop */
  seasonal: boolean;
  /** v9 — Desktop & Dock */
  dockPosition: 'bottom' | 'left' | 'right';
  dockAutohide: boolean;
  dockIndicators: boolean;
  dockAnimateOpen: boolean;
  minimizeToAppIcon: boolean;
  dockRecents: boolean;
  menubarAutohide: 'never' | 'fullscreen' | 'always';
  menubarBg: boolean;
  naturalScroll: boolean;
  pinchZoom: boolean;
  titleBarDoubleClick: 'zoom' | 'minimize' | 'none';
  /** v9 — Appearance */
  iconStyle: 'default' | 'dark' | 'clear' | 'tinted';
  folderColor: string;
  liquidGlass: 'clear' | 'tinted';
  /** v9 — Displays: interface scale ("resolution"), rotation and refresh rate */
  displayScale: number;
  extScale: number;
  displayRotation: 0 | 90 | 180 | 270;
  refreshRate: 'auto' | '60' | '120';
  /** v9 — Battery */
  lowPowerMode: 'never' | 'always' | 'battery' | 'adapter';
  /** v9 — Spotlight result categories */
  spotlight: Record<string, boolean>;
  spotlightExclude: string[];
  /** v9 — Menu Bar extras */
  menuExtras: { cv: boolean; nowPlaying: boolean; language: boolean };
  /** v9 — custom wallpaper image (data URL) chosen from Photos or uploaded */
  customWallpaper: string;
  customTone: 'light' | 'dark';
}

export type HotCornerAction = 'none' | 'mc' | 'desktop' | 'nc' | 'launchpad' | 'lock' | 'cc' | 'sleep' | 'screensaver' | 'hireme';

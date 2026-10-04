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
  | 'timemachine'
  | 'mirroring'
  | 'learning'
  | 'whatsnew'
  | 'flashcards'
  | 'focusplanner'
  | 'goals'
  | 'bizplanner'
  | 'playground'
  | 'documents'
  | 'guidebook'
  | 'translate'
  | 'fontbook'
  | 'grapher'
  | 'colormeter'
  /* v10 */
  | 'phone'
  | 'shortcuts'
  | 'chess'
  | 'textedit';

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
  arrivalAnim: 'soft' | 'full' | 'off';
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
  /* ───────── v10 ───────── */
  /** which shell to show: Automatic (by screen), Mac, iPhone or iPad */
  viewAs: 'auto' | 'mac' | 'iphone' | 'ipad';
  /** trackpad pinch / Ctrl+scroll — never zooms the page */
  pinchAction: 'missioncontrol' | 'launchpad' | 'off';
  /** two-finger horizontal swipe on the desktop switches Desktops (Spaces) */
  swipeSpaces: boolean;
  /** wallpaper follows the pointer slightly */
  parallax: boolean;
  /** Performance: auto lowers blur/effects when the frame rate drops */
  perfMode: 'auto' | 'quality' | 'speed';
  /** Mac notch with Dynamic Island */
  macNotch: boolean;
  /** Liquid Glass light edge on panels and the Dock */
  glassEdge: boolean;
  /** Notification sound: an original tone, or the visitor's own uploaded file */
  notifTone: string;
  /** Ringtone for incoming demo calls, alarms and timers */
  ringtone: string;
  /** iPhone: what a long press on an empty Home Screen area does */
  iosLongPress: 'switcher' | 'edit';
  /** iPhone/iPad Home Screen look */
  iosIconLook: 'default' | 'dark' | 'clear' | 'tinted';
  iosIconMode: 'light' | 'dark' | 'auto';
  iosTint: string;
  iosLabels: boolean;
  iosLargeIcons: boolean;
  iosLockFont: 'rounded' | 'serif' | 'mono' | 'thin';
  iosLockColor: string;
  iosDepth: boolean;
  /** three-finger gestures on touch devices */
  threeFinger: boolean;
  /** AssistiveTouch */
  atOn: boolean;
  atIcons: string[];
  atSingle: string;
  atDouble: string;
  atLong: string;
  atOpacity: number;
  /** v10 — AssistiveTouch custom gestures (x, y as 0–1 of the screen, t in ms) */
  atGestures?: { name: string; pts: [number, number, number][] }[];
  /** Delete safety */
  askBeforeDelete: boolean;
  trashAutoEmpty: 0 | 7 | 30;
  undoLimit: number;
  /** StandBy when an iPhone is landscape and charging */
  standBy: boolean;
  alwaysOn: boolean;
  focusMode: 'off' | 'dnd' | 'work' | 'sleep' | 'personal';
  /** v10.3 — 24-hour time in the menu bar, status bar and Lock Screen (undefined = follow the device) */
  clock24?: boolean;
  /** Login: optional user picker */
  userPicker: boolean;
  /** iPad Stage Manager */
  ipadStage: boolean;
  /* ───────── v10.1 ───────── */
  /** iPhone Dock: exactly four apps (launch item ids) */
  dockApps: string[];
  showPageDots: boolean;
  appLibrary: boolean;
  /** v10.3 — iPad: what the Dock's app button opens ('library' = App Library page, 'launchpad' = custom Launchpad-style grid) */
  ipadAppBrowser?: 'library' | 'launchpad';
  showBadges: boolean;
  homeSearch: boolean;
  /** where newly added apps go */
  newApps: 'home' | 'library';
  lockTorchBtn: boolean;
  lockCameraBtn: boolean;
  notifStyle: 'count' | 'stack' | 'list';
  showPreviews: 'always' | 'unlocked' | 'never';
  /** per-app notification switches (app label → allowed) */
  notifApps: Record<string, { banners: boolean; sounds: boolean; badges: boolean }>;
  scheduledSummary: boolean;
  summaryTime: string;
  backTapDouble: string;
  backTapTriple: string;
  siriSuggestions: boolean;
  /** which live activities the Dynamic Island shows */
  diShow: { music: boolean; timer: boolean; call: boolean; rec: boolean; torch: boolean; notif: boolean };
  /** Control Centre controls that are hidden */
  ccHidden: string[];
  displayZoom: 'standard' | 'larger';
  keyClicks: boolean;
  lockSound: boolean;
  /** Screen Time: minutes per day per app (0 = no limit) */
  appLimits: Record<string, number>;
  downtime: { on: boolean; from: string; to: string };
  /** Mac desktop */
  iconSize: number;
  iconSpacing: number;
  iconSort: 'none' | 'name' | 'kind';
  desktopStacks: boolean;
  mouseSpeed: number;
  mouseNatural: boolean;
  /** Mac & all */
  appSwitcherCorner: boolean;
  dictation: boolean;
  weatherFx: boolean;
  helloScreen: boolean;
  achievements: boolean;
  /* ───────── v10.2 ───────── */
  /** Control Centre layout (Favourites and Portfolio groups) */
  ccLayout: { fav: CCItem[]; work: CCItem[] };
  /** iPad Dock favourites */
  ipadDockApps: string[];
  /** device wallpapers ('' = that device's default); the Mac uses `wallpaper` */
  wallIphone: string;
  wallIpad: string;
  /** Lock Screen wallpaper per device ('' = same as Home Screen / Desktop) */
  lockWall: { mac: string; ipad: string; iphone: string };
  /** saved Lock Screens (iPhone / iPad): switch between them from the Lock Screen */
  lockScreens: { id: string; wall: string; font: string; color: string }[];
  lockScreenId: string;
  /** app-icon tint follows the wallpaper's colours */
  iosTintAuto: boolean;
  /** blur the Home Screen wallpaper (0–20 px) */
  wallBlur: number;
  /** live wallpapers move (off = still frame) */
  wallMotion: boolean;
  /** Recruiter / Client / Developer / Presentation (or free exploring) */
  portfolioMode: PortfolioMode;
  presentStep: number;
}

export type PortfolioMode = 'explore' | 'recruiter' | 'client' | 'developer' | 'presentation';
export type CCSize = 's' | 'm' | 't' | 'l';
export interface CCItem {
  id: string;
  s: CCSize;
}

export type HotCornerAction = 'none' | 'mc' | 'desktop' | 'nc' | 'launchpad' | 'lock' | 'cc' | 'sleep' | 'screensaver' | 'hireme' | 'switcher';

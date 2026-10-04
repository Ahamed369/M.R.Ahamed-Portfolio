import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppProps } from '../components/Desktop';
import { DragBar, Lights } from '../components/Window';
import { AppIcon, type IconName } from '../components/AppIcons';
import { ModePicker } from '../components/ModeBar';
import { replayOnboarding } from '../components/Onboarding';
import { SHORTCUTS } from '../components/SystemExtras';
import { IOS, type IOSCtx } from '../components/ios/ctx';
import { useWM } from '../system/WindowManager';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { useMusic } from '../system/MusicContext';
import { APPS } from '../system/apps';
import { LAUNCH_ITEMS, LAUNCH_GROUPS, type LaunchItem } from '../system/launch';
import { chooseView } from '../system/ios';
import { startTimer } from '../system/timer';
import { islandPing, islandTorch, isTorch } from '../system/island';
import { notify } from '../system/notify';
import { personal } from '../data/portfolio';
import type { AppId, Settings } from '../system/types';

/**
 * v10.3 — Portfolio Guide: an A–Z guidebook of THIS portfolio.
 *  • Chapters with step-by-step instructions for Mac, iPad and iPhone (the
 *    device you are using comes first; switch to read the others).
 *  • "Try it" buttons that open the real feature (windows, overlays, panels,
 *    Dynamic Island activities, settings panes).
 *  • Small looping gesture demos (CSS/SVG; still when motion is reduced).
 *  • Screenshots captured from the build (public/assets/guide/, refreshed by
 *    the capture script described in the v10.3 report).
 *  • Every app has an entry generated from the app registry (system/apps.ts +
 *    system/launch.ts) with an "Open" button.
 *  • Search across everything. Deep link: open('guidebook', { chapter, section }).
 */

type Dev = 'mac' | 'ipad' | 'iphone';
type Lang = 'en' | 'si' | 'ta';
type Demo = 'swipeUp' | 'swipeUpHold' | 'pullRight' | 'pullLeft' | 'swipeSide' | 'longPress' | 'pinch' | 'drag' | 'tap' | 'three' | 'rightClick' | 'hover' | 'edge';

interface Ctx {
  wm: ReturnType<typeof useWM>;
  sys: ReturnType<typeof useSystem>;
  ios: IOSCtx | null;
  dev: Dev;
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  music: ReturnType<typeof useMusic>;
}
interface Try {
  label: string;
  /** devices where this button works (default: all) */
  dev?: Dev[];
  run: (c: Ctx) => void;
}
interface Sec {
  id: string;
  h: string;
  /** only for these devices (default: all) */
  dev?: Dev[];
  p?: string;
  steps?: string[];
  tips?: string[];
  demo?: Demo;
  tries?: Try[];
  shot?: Partial<Record<Dev, string>>;
  keys?: [string, string][];
  extra?: 'modes' | 'shortcuts';
}
interface Chapter {
  id: string;
  group: 'start' | 'devices' | 'system' | 'portfolio' | 'help';
  icon: Glyph;
  intro: string;
  secs: Sec[];
}

/* ───────────────────────── interface words (EN / SI / TA) ───────────────────────── */
const L: Record<string, Record<Lang, string>> = {
  guide: { en: 'Portfolio Guide', si: 'Portfolio මාර්ගෝපදේශය', ta: 'Portfolio வழிகாட்டி' },
  search: { en: 'Search the Guidebook', si: 'මාර්ගෝපදේශ පොතේ සොයන්න', ta: 'வழிகாட்டி நூலில் தேடு' },
  clear: { en: 'Clear search', si: 'සෙවුම මකන්න', ta: 'தேடலை அழி' },
  results: { en: '{n} results', si: 'ප්‍රතිඵල {n}', ta: '{n} முடிவுகள்' },
  none: { en: 'Nothing found. Try “widgets”, “swipe” or an app name.', si: 'කිසිවක් හමු නොවීය. “widgets”, “swipe” හෝ යෙදුමක නමක් උත්සාහ කරන්න.', ta: 'எதுவும் கிடைக்கவில்லை. “widgets”, “swipe” அல்லது ஒரு செயலியின் பெயரை முயலுங்கள்.' },
  try: { en: 'Try it', si: 'උත්සාහ කරන්න', ta: 'முயன்று பார்' },
  open: { en: 'Open', si: 'විවෘත කරන්න', ta: 'திற' },
  back: { en: 'Chapters', si: 'පරිච්ඡේද', ta: 'அத்தியாயங்கள்' },
  for: { en: 'Instructions for', si: 'උපදෙස් සඳහා', ta: 'இதற்கான வழிமுறைகள்' },
  thisDev: { en: 'this device', si: 'මෙම උපාංගය', ta: 'இந்தச் சாதனம்' },
  onlyOn: { en: 'Try it when viewing as {d}', si: '{d} ලෙස බලන විට උත්සාහ කරන්න', ta: '{d} ஆகப் பார்க்கும்போது முயலுங்கள்' },
  steps: { en: 'Step by step', si: 'පියවරෙන් පියවර', ta: 'படிப்படியாக' },
  tips: { en: 'Good to know', si: 'දැනගත යුතු දේ', ta: 'தெரிந்துகொள்ள' },
  shot: { en: 'Screenshot of this portfolio', si: 'මෙම portfolio එකේ තිර රුවක්', ta: 'இந்த portfolio-வின் திரைப்பிடிப்பு' },
  demo: { en: 'Gesture demo', si: 'ඉඟි නිරූපණය', ta: 'சைகை விளக்கம்' },
  alsoAs: { en: 'Also listed as', si: 'වෙනත් නම්', ta: 'வேறு பெயர்கள்' },
  next: { en: 'Next chapter', si: 'ඊළඟ පරිච්ඡේදය', ta: 'அடுத்த அத்தியாயம்' },
  prev: { en: 'Previous chapter', si: 'පෙර පරිච්ඡේදය', ta: 'முந்தைய அத்தியாயம்' },
  appsN: { en: '{n} apps', si: 'යෙදුම් {n}', ta: '{n} செயலிகள்' },
  ext: { en: 'External', si: 'බාහිර', ta: 'வெளிப்புறம்' },
  'g.start': { en: 'Getting started', si: 'ආරම්භය', ta: 'தொடக்கம்' },
  'g.devices': { en: 'Devices', si: 'උපාංග', ta: 'சாதனங்கள்' },
  'g.system': { en: 'System features', si: 'පද්ධති විශේෂාංග', ta: 'கணினி அம்சங்கள்' },
  'g.portfolio': { en: 'Portfolio & apps', si: 'Portfolio සහ යෙදුම්', ta: 'Portfolio மற்றும் செயலிகள்' },
  'g.help': { en: 'Help', si: 'උදව්', ta: 'உதவி' },
  'c.welcome': { en: 'Welcome', si: 'සාදරයෙන් පිළිගනිමු', ta: 'வரவேற்பு' },
  'c.startup': { en: 'Start-up & Lock Screen', si: 'ආරම්භය සහ Lock Screen', ta: 'தொடக்கம் மற்றும் Lock Screen' },
  'c.mac': { en: 'Mac basics', si: 'Mac මූලික කරුණු', ta: 'Mac அடிப்படைகள்' },
  'c.ipad': { en: 'iPad basics', si: 'iPad මූලික කරුණු', ta: 'iPad அடிப்படைகள்' },
  'c.iphone': { en: 'iPhone basics', si: 'iPhone මූලික කරුණු', ta: 'iPhone அடிப்படைகள்' },
  'c.widgets': { en: 'Widgets', si: 'Widgets', ta: 'Widgets' },
  'c.island': { en: 'Dynamic Island', si: 'Dynamic Island', ta: 'Dynamic Island' },
  'c.cc': { en: 'Control Centre', si: 'Control Centre', ta: 'Control Centre' },
  'c.notifications': { en: 'Notifications', si: 'දැනුම්දීම්', ta: 'அறிவிப்புகள்' },
  'c.gestures': { en: 'Gestures & touch', si: 'ඉඟි සහ ස්පර්ශය', ta: 'சைகைகள் மற்றும் தொடுதல்' },
  'c.settings': { en: 'Settings', si: 'සැකසුම්', ta: 'அமைப்புகள்' },
  'c.modes': { en: 'Portfolio Modes', si: 'Portfolio ප්‍රකාර', ta: 'Portfolio பயன்முறைகள்' },
  'c.apps': { en: 'Every app, A–Z', si: 'සියලු යෙදුම්, A–Z', ta: 'அனைத்து செயலிகளும், A–Z' },
  'c.access': { en: 'Accessibility & Motion', si: 'ප්‍රවේශ්‍යතාව සහ චලනය', ta: 'அணுகல்தன்மை மற்றும் இயக்கம்' },
  'c.privacy': { en: 'Privacy', si: 'පෞද්ගලිකත්වය', ta: 'தனியுரிமை' },
  'c.faq': { en: 'Troubleshooting & FAQ', si: 'ගැටලු විසඳීම සහ නිති අසන ප්‍රශ්න', ta: 'சிக்கல் தீர்வு மற்றும் கேள்விகள்' },
  'lg.Portfolio': { en: 'Portfolio', si: 'Portfolio', ta: 'Portfolio' },
  'lg.Developer': { en: 'Developer', si: 'සංවර්ධක', ta: 'டெவலப்பர்' },
  'lg.Internet & Social': { en: 'Internet & Social', si: 'අන්තර්ජාලය සහ සමාජ මාධ්‍ය', ta: 'இணையம் மற்றும் சமூக ஊடகம்' },
  'lg.Study': { en: 'Study', si: 'අධ්‍යයනය', ta: 'படிப்பு' },
  'lg.System': { en: 'System', si: 'පද්ධතිය', ta: 'கணினி' },
  'lg.Media': { en: 'Media', si: 'මාධ්‍ය', ta: 'ஊடகம்' },
};
const DEV_NAME: Record<Dev, string> = { mac: 'Mac', ipad: 'iPad', iphone: 'iPhone' };

/* ───────────────────────── helpers used by "Try it" ───────────────────────── */
const ev = (name: string, detail?: unknown) => window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail }));
const panel = (c: Ctx, p: 'cc' | 'nc' | 'switcher' | 'search') => (c.ios ? c.ios.setPanel(p) : ev('mra-ios-panel', p));
const iosEdit = (c: Ctx) => {
  c.ios?.goHome();
  window.setTimeout(() => c.ios?.setEdit(true), 450);
};
/** open a Settings pane — Mac and iPhone/iPad Settings use different page names */
const settingsPane = (c: Ctx, mac: string, ios: string | { q: string }) => (c.dev === 'mac' ? c.wm.open('settings', { pane: mac }) : c.wm.open('settings', typeof ios === 'string' ? { pane: ios } : { q: ios.q }));

const T_CC: Try = { label: 'Open Control Centre', run: (c) => (c.dev === 'mac' ? c.sys.setOverlay('control') : panel(c, 'cc')) };
const T_NC: Try = { label: 'Open Notification Centre', run: (c) => (c.dev === 'mac' ? c.sys.setOverlay('notifications') : panel(c, 'nc')) };
const T_SEARCH: Try = { label: 'Open Spotlight / Search', run: (c) => (c.dev === 'mac' ? c.sys.setOverlay('spotlight') : panel(c, 'search')) };
const T_SWITCH: Try = { label: 'Open the App Switcher', dev: ['ipad', 'iphone'], run: (c) => panel(c, 'switcher') };
const T_HOME: Try = { label: 'Go to the Home Screen', dev: ['ipad', 'iphone'], run: (c) => c.ios?.goHome() };
const T_EDITHOME: Try = { label: 'Edit the Home Screen', dev: ['ipad', 'iphone'], run: iosEdit };
const T_EDITW: Try = { label: 'Edit desktop widgets', dev: ['mac'], run: () => ev('mra-edit-widgets') };

/* ───────────────────────── the chapters ───────────────────────── */
const CHAPTERS: Chapter[] = [
  {
    id: 'welcome',
    group: 'start',
    icon: 'star',
    intro: `This is the interactive portfolio of ${personal.name} — ${personal.shortTitle.toLowerCase()} in ${personal.city}. It looks and behaves like macOS on computers, iPadOS on tablets and iOS on phones, and every app tells you something real about his work, skills and experience. It is inspired by Apple’s designs but is not made by, or affiliated with, Apple.`,
    secs: [
      {
        id: 'what',
        h: 'What you can do here',
        steps: ['Open About Me for a quick profile, then the CV in Preview.', 'Browse projects in Xcode, App Store and Case Studies; skills live in Notes.', 'Use the real tools — Notes, Reminders, Calendar, Music, Weather, games and more. What you create stays in this browser.', 'Contact him through Hire Me, Mail, Messages, WhatsApp or the Guestbook — those open your own apps or send only what you write.'],
        tries: [
          { label: 'Open About Me', run: (c) => c.wm.open('about') },
          { label: 'Open the CV', run: (c) => c.wm.open('preview') },
          { label: 'Open Hire Me', run: (c) => c.wm.open('hireme') },
        ],
      },
      {
        id: 'devices',
        h: 'Three devices in one website',
        p: 'The portfolio picks the device automatically: Mac on computers, iPad on tablets, iPhone on phones. You can switch at any time — your notes, settings and files are shared between all three.',
        steps: ['Mac: logo menu → View as iPhone / View as iPad.', 'iPhone/iPad: Settings → Devices & View → View as.', 'Mac: iPhone Mirroring shows the iPhone version in a window.'],
        tries: [
          { label: 'View as Mac', run: (c) => chooseView(c.update, 'mac') },
          { label: 'View as iPad', run: (c) => chooseView(c.update, 'ipad') },
          { label: 'View as iPhone', run: (c) => chooseView(c.update, 'iphone') },
          { label: 'Open iPhone Mirroring', dev: ['mac'], run: (c) => c.wm.open('mirroring') },
        ],
      },
      {
        id: 'guide',
        h: 'Using this Guidebook',
        steps: ['Pick a chapter in the sidebar (on iPhone, in the list).', 'Instructions for the device you are using come first; switch with the Mac · iPad · iPhone buttons to read the others.', '“Try it” buttons open the real feature. Press Escape or tap outside to close what they open.', 'Search finds chapters, steps and apps.'],
        tries: [{ label: 'Replay the welcome guide', run: () => replayOnboarding() }],
      },
    ],
  },
  {
    id: 'startup',
    group: 'start',
    icon: 'lock',
    intro: 'Each visit starts like a real device: a short start-up screen, then the Lock Screen with the time, date and widgets.',
    secs: [
      {
        id: 'boot',
        h: 'Start-up',
        p: 'The start-up animation plays once per browser session. Reloading the page in the same session goes straight to the Lock Screen.',
      },
      {
        id: 'unlock-mac',
        h: 'Unlocking the Mac',
        dev: ['mac'],
        steps: ['Click anywhere, press Enter or swipe up on the Lock Screen.', 'There is no password and no biometrics — the padlock animation is only a visual.', 'Lock again with Ctrl + ⌘ + Q, Ctrl + Alt + L, the logo menu → Lock Screen, or a hot corner.'],
        shot: { mac: 'mac-lock' },
        tries: [
          { label: 'Lock the screen now', run: () => ev('mra-lock') },
          { label: 'Lock Screen settings', dev: ['mac'], run: (c) => c.wm.open('settings', { pane: 'lock' }) },
        ],
      },
      {
        id: 'unlock-ios',
        h: 'Unlocking iPhone and iPad',
        dev: ['ipad', 'iphone'],
        demo: 'swipeUp',
        steps: ['Swipe up from the bottom of the Lock Screen (or press Enter on a keyboard).', 'The torch and camera buttons at the bottom work; touch and hold the Lock Screen to customise it.', 'Lock again from Control Centre, AssistiveTouch or the power-off slider.'],
        shot: { iphone: 'iphone-lock', ipad: 'ipad-lock' },
        tries: [{ label: 'Lock the screen now', run: () => ev('mra-lock') }],
      },
    ],
  },
  {
    id: 'mac',
    group: 'devices',
    icon: 'laptop',
    intro: 'On a computer the portfolio is a Mac desktop: a menu bar at the top, the Dock at the bottom, windows, widgets and the usual macOS tools.',
    secs: [
      {
        id: 'menubar',
        h: 'Menu bar',
        dev: ['mac'],
        steps: ['The logo menu (far left): About, Portfolio Mode, View as iPhone/iPad, Sleep, Restart, Lock Screen.', 'App menus (File, Edit, View, Go, Window, Help) change with the focused window.', 'Status icons on the right: language, Wi-Fi, battery, Control Centre, Spotlight and the clock (opens Notification Centre).', 'Help → Portfolio Guidebook reopens this guide.'],
        shot: { mac: 'mac-desktop' },
      },
      {
        id: 'dock',
        h: 'Dock',
        dev: ['mac'],
        demo: 'hover',
        steps: ['Click an icon to open the app; a dot shows it is running.', 'Hover to magnify (turn it on or off in Settings → Desktop & Dock).', 'Right-click an icon for Options, Show in Finder, Quit and Keep in Dock.', 'Drag icons to reorder them. Minimised windows sit at the right end.'],
        tries: [{ label: 'Desktop & Dock settings', dev: ['mac'], run: (c) => c.wm.open('settings', { pane: 'dock' }) }],
      },
      {
        id: 'windows',
        h: 'Windows',
        dev: ['mac'],
        demo: 'drag',
        steps: ['Drag the title bar to move a window; drag any edge or corner to resize.', 'Red closes, yellow minimises with the Genie effect, green makes the window fill the screen.', 'Hover over the green button for the tiling menu: Fill, Center, Left/Right Half and quarters.', 'Drag a window to the left or right edge of the screen to tile it; double-click the title bar to fill.', 'Keyboard: Alt + M minimise, Alt + W close, Ctrl + Alt + ← / → tile, Ctrl + Alt + ↑ fill.'],
        shot: { mac: 'mac-tile' },
        tries: [{ label: 'Open Notes to practise', dev: ['mac'], run: (c) => c.wm.open('notes') }],
      },
      {
        id: 'launchpad',
        h: 'Launchpad',
        dev: ['mac'],
        steps: ['Press F4 or click Launchpad in the Dock to see every app, with folders.', 'Type to filter. Swipe or scroll for more pages.', 'Click Edit (or press and hold an icon) to rearrange; × moves an app to the Trash, and Finder → Trash → Put Back restores it.'],
        shot: { mac: 'mac-launchpad' },
        tries: [{ label: 'Open Launchpad', dev: ['mac'], run: (c) => c.sys.setOverlay('launchpad') }],
      },
      {
        id: 'mission',
        h: 'Mission Control & Spaces',
        dev: ['mac'],
        demo: 'three',
        steps: ['Press F3 or Ctrl + ↑ to spread out every open window.', 'Click a window to bring it forward. The bar at the top shows your Spaces (desktops) — add one with +.', 'Drag a window onto another Space to move it there; Ctrl + ← / → switches Spaces.', 'Stage Manager (Ctrl + Alt + S) groups windows into a strip at the side.'],
        shot: { mac: 'mac-mission' },
        tries: [
          { label: 'Open Mission Control', dev: ['mac'], run: (c) => c.sys.setOverlay('missioncontrol') },
          { label: 'Show the App Switcher', dev: ['mac'], run: () => ev('mra-app-switcher') },
          { label: 'Turn Stage Manager on or off', dev: ['mac'], run: (c) => c.update({ stageManager: !c.settings.stageManager }) },
        ],
      },
      {
        id: 'hotcorners',
        h: 'Hot corners',
        dev: ['mac'],
        p: 'Move the pointer into a screen corner to run an action. By default the bottom-right corner opens Notification Centre. Choose actions such as Mission Control, Launchpad, Lock Screen or Hire Me for each corner.',
        tries: [{ label: 'Choose hot corners', dev: ['mac'], run: (c) => c.wm.open('settings', { pane: 'dock' }) }],
      },
      {
        id: 'spotlight',
        h: 'Spotlight',
        dev: ['mac'],
        steps: ['Press ⌘ Space, Ctrl + Space or ⌘ K (or click the magnifier in the menu bar).', 'Type an app, project, skill or setting; use ↑ ↓ and Enter to open.'],
        shot: { mac: 'mac-spotlight' },
        tries: [{ label: 'Open Spotlight', dev: ['mac'], run: (c) => c.sys.setOverlay('spotlight') }],
      },
      {
        id: 'desktop',
        h: 'Desktop, files and Quick Look',
        dev: ['mac'],
        demo: 'rightClick',
        steps: ['Right-click the desktop for New Folder, Change Wallpaper, Edit Widgets and appearance.', 'Click a desktop icon to select it and press Space for Quick Look.', 'Drag files from your computer onto Finder → My Files; they stay in this browser.'],
        tries: [T_EDITW, { label: 'Change the wallpaper', dev: ['mac'], run: (c) => c.wm.open('settings', { pane: 'wallpaper' }) }],
      },
      {
        id: 'keys',
        h: 'Keyboard shortcuts',
        dev: ['mac'],
        p: 'The list below is read from the portfolio itself, so it always matches. Press Ctrl + / or F1 to show it as a sheet.',
        extra: 'shortcuts',
        tries: [{ label: 'Show the shortcuts sheet', dev: ['mac'], run: () => ev('mra-shortcuts') }],
      },
    ],
  },
  {
    id: 'ipad',
    group: 'devices',
    icon: 'tablet',
    intro: 'On a tablet the portfolio is an iPad: a Home Screen with widgets, a Dock, and multitasking with Split View, Slide Over and Stage Manager.',
    secs: [
      { id: 'status', h: 'Status bar', dev: ['ipad'], p: 'Time and date on the left; Wi-Fi and battery on the right. Swipe down (or tap) on the right half for Control Centre, on the left half for Notification Centre.', demo: 'pullRight', tries: [T_CC, T_NC] },
      {
        id: 'home',
        h: 'Home Screen and Dock',
        dev: ['ipad'],
        demo: 'swipeSide',
        steps: ['Tap an icon to open an app. Swipe left or right for more pages; swipe right from the first page for Today View.', 'The Dock holds favourites on the left and recent apps on the right, plus the App Library.', 'Touch and hold an icon for quick actions, or the background to edit the Home Screen.'],
        shot: { ipad: 'ipad-home' },
        tries: [T_HOME, T_EDITHOME],
      },
      { id: 'library', h: 'App Library', dev: ['ipad'], p: 'Open it from the Dock (or swipe past the last page). Apps are grouped automatically; search at the top finds any app — including ones you removed from the Home Screen.', tries: [T_HOME] },
      {
        id: 'switcher',
        h: 'App Switcher',
        dev: ['ipad'],
        demo: 'swipeUpHold',
        steps: ['Swipe up from the bottom edge and pause, or swipe up with three fingers.', 'Tap a card to switch; flick a card up to close the app.', 'Swipe sideways along the bottom edge to jump between recent apps.'],
        shot: { ipad: 'ipad-switcher' },
        tries: [T_SWITCH],
      },
      {
        id: 'multi',
        h: 'Split View, Slide Over and Stage Manager',
        dev: ['ipad'],
        steps: ['Tap ••• at the top of an app and choose Split View, then pick a second app.', 'Drag the divider to resize; drag it to an edge to close one side.', 'Choose Slide Over to float an app over another.', 'Stage Manager (Settings → Multitasking & Gestures) shows resizable windows with recent apps at the side.'],
        tries: [{ label: 'Multitasking settings', dev: ['ipad'], run: (c) => c.wm.open('settings', { q: 'Stage Manager' }) }],
      },
      { id: 'cc', h: 'Control Centre and Notification Centre', dev: ['ipad'], p: 'Swipe down from the top-right corner for Control Centre; from the top-left (or the middle) for Notification Centre. See their chapters for details.', shot: { ipad: 'ipad-cc' }, tries: [T_CC, T_NC] },
    ],
  },
  {
    id: 'iphone',
    group: 'devices',
    icon: 'phone',
    intro: 'On a phone the portfolio is an iPhone: Home Screen pages, the Dock, the Dynamic Island and gestures with the Home indicator.',
    secs: [
      {
        id: 'home',
        h: 'Home Screen, pages and Dock',
        dev: ['iphone'],
        demo: 'swipeSide',
        steps: ['Tap an icon to open an app. The Dock (Phone, Safari, Messages, Music) stays on every page.', 'Swipe left for more pages and finally the App Library; swipe right from the first page for Today View.', 'Touch and hold an icon for quick actions; hold the background to edit.'],
        shot: { iphone: 'iphone-home' },
        tries: [T_HOME, T_EDITHOME],
      },
      {
        id: 'indicator',
        h: 'Home indicator gestures',
        dev: ['iphone'],
        demo: 'swipeUp',
        steps: ['Swipe up from the bar at the bottom to go Home.', 'Swipe up and hold to open the App Switcher; flick a card up to close an app.', 'Swipe left or right along the bar to switch between recent apps.', 'Swipe in from the left edge inside an app to go back.'],
        shot: { iphone: 'iphone-switcher' },
        tries: [T_SWITCH, T_HOME],
      },
      { id: 'library', h: 'App Library and Search', dev: ['iphone'], p: 'Swipe left past the last page for the App Library. Swipe down on the Home Screen (or tap Search) to find apps, projects and settings.', tries: [T_SEARCH] },
      { id: 'island', h: 'Dynamic Island', dev: ['iphone'], p: 'The black pill at the top shows live activities — music, timers, recordings, calls, the torch and short alerts. Tap to open the app; touch and hold to expand. See the Dynamic Island chapter.', shot: { iphone: 'iphone-island' } },
      { id: 'cc', h: 'Control Centre and Notification Centre', dev: ['iphone'], demo: 'pullRight', p: 'Pull down from the top-right corner for Control Centre and from the top-left for Notification Centre.', shot: { iphone: 'iphone-cc' }, tries: [T_CC, T_NC] },
      { id: 'at', h: 'AssistiveTouch', dev: ['iphone', 'ipad'], p: 'A floating button with Home, Control Centre, Notification Centre, App Switcher, Screenshot, Lock and more. Turn it on in Settings → Accessibility → AssistiveTouch; you can also record custom gestures there.', tries: [{ label: 'Accessibility settings', dev: ['iphone', 'ipad'], run: (c) => c.wm.open('settings', { pane: 'accessibility' }) }] },
    ],
  },
  {
    id: 'widgets',
    group: 'system',
    icon: 'widgets',
    intro: 'Widgets show live information — clock, weather in Kandy, calendar, reminders, music, battery, projects and more. Tap or click a widget to open its app. Widgets only move in edit mode, so you can’t disturb them by accident.',
    secs: [
      {
        id: 'mac',
        h: 'Widgets on the Mac desktop',
        dev: ['mac'],
        demo: 'rightClick',
        steps: ['Right-click an empty part of the desktop and choose Edit Widgets… (or use Notification Centre → Edit Widgets).', 'Drag widgets from the gallery onto the desktop; they snap to a grid and never overlap the Dock or menu bar.', 'Drag a placed widget to move it, use − to remove it, and pick small, medium or large sizes.', 'Click Done to save the layout.'],
        shot: { mac: 'mac-widgets' },
        tries: [T_EDITW],
      },
      {
        id: 'ios',
        h: 'Widgets on iPhone and iPad',
        dev: ['ipad', 'iphone'],
        demo: 'longPress',
        steps: ['Touch and hold an empty part of the Home Screen until the icons jiggle (edit mode).', 'Tap Edit / + to open the widget gallery, choose a widget and a size (small 2×2, medium 4×2, large 4×4).', 'Drag widgets and icons to new slots — others move aside; if there is no room the move is undone.', 'Tap Done to stop editing and save.'],
        shot: { iphone: 'iphone-edit', ipad: 'ipad-edit' },
        tries: [T_EDITHOME],
      },
      { id: 'stacks', h: 'Smart Stacks', p: 'A Smart Stack holds several widgets in one place. Swipe up or down on it to flip through them; tap opens the widget that is showing. In edit mode, touch and hold the stack → Edit Stack to add, remove or reorder widgets.', demo: 'swipeUp' },
      { id: 'folders', h: 'Folders', dev: ['ipad', 'iphone'], demo: 'drag', steps: ['In edit mode, drag one app onto another to make a folder.', 'Open the folder to rename it or drag apps out again.', 'Removing an app from the Home Screen keeps it in the App Library.'], tries: [T_EDITHOME] },
    ],
  },
  {
    id: 'island',
    group: 'system',
    icon: 'island',
    intro: 'The Dynamic Island shows what is happening right now. It lives at the top of the iPhone, and in a notch on the Mac when “Notch with Dynamic Island” is on.',
    secs: [
      { id: 'use', h: 'Tap, hold and expand', demo: 'longPress', steps: ['Tap the island to open the activity’s app.', 'Touch and hold (or hover on the Mac) to expand it with controls.', 'When two activities run, a small bubble appears beside it — tap it to swap.'] },
      { id: 'music', h: 'Music', p: 'While music plays the island shows the artwork and a live waveform. Expanded: previous, play/pause, next and Open Music.', tries: [{ label: 'Play music', run: (c) => c.music.play() }] },
      { id: 'timer', h: 'Timer', p: 'Timers from Clock, Focus Planner and Shortcuts count down in the island. Expanded: pause/resume and cancel.', tries: [{ label: 'Start a 1-minute timer', run: () => startTimer(60000) }] },
      { id: 'assistant', h: 'Assistant', p: 'When the portfolio Assistant listens, thinks or speaks, the island shows its state. Tap to open it.', tries: [{ label: 'Open the Assistant', run: (c) => c.wm.open('siri') }] },
      { id: 'rec', h: 'Recording', p: 'Voice Memos and screen recording show a red recording indicator and a timer. Tap to return to the recording.', tries: [{ label: 'Open Voice Memos', run: (c) => c.wm.open('voicememos') }] },
      { id: 'call', h: 'Calls', p: 'Demo calls from Phone and FaceTime show a green call timer. Calls to M.R. Ahamed’s real number hand over to your own phone app.', tries: [{ label: 'Open Phone', run: (c) => c.wm.open('phone') }] },
      { id: 'torch', h: 'Torch', dev: ['iphone', 'mac'], p: 'Turning on the torch (Control Centre or the Lock Screen) brightens the screen and shows a torch icon in the island.', tries: [{ label: 'Turn the torch on or off', dev: ['iphone'], run: () => islandTorch(!isTorch()) }] },
      { id: 'alerts', h: 'Short alerts', p: 'Quick confirmations — for example “Opening your email app” or a finished shortcut — appear briefly and disappear on their own.', tries: [{ label: 'Send a test alert', run: () => islandPing({ icon: '✓', title: 'Portfolio Guide', sub: 'Test alert', tint: '#30d158', ms: 2200 }) }] },
      { id: 'macnotch', h: 'On the Mac', dev: ['mac'], p: 'Turn on Settings → Desktop & Dock → Notch with Dynamic Island (or use the button below) to see the island in a MacBook-style notch.', tries: [{ label: 'Show the Mac notch', dev: ['mac'], run: (c) => c.update({ macNotch: true }) }] },
    ],
  },
  {
    id: 'cc',
    group: 'system',
    icon: 'switches',
    intro: 'Control Centre puts the most-used switches in one place: connectivity, Focus, brightness, volume, Now Playing, appearance, torch, timers and more. Every control changes the portfolio for real (network and Bluetooth controls are simulated and say so).',
    secs: [
      { id: 'open-mac', h: 'Opening it on the Mac', dev: ['mac'], steps: ['Click the switches icon in the menu bar, or press Ctrl + Alt + C.', 'Click a tile’s arrow to expand it (Focus, Display, Sound, Now Playing).'], shot: { mac: 'mac-cc' }, tries: [T_CC] },
      { id: 'open-ios', h: 'Opening it on iPhone and iPad', dev: ['ipad', 'iphone'], demo: 'pullRight', steps: ['Pull down from the top-right corner.', 'Touch and hold a group (such as connectivity) to expand it.', 'Swipe up, tap outside or press Escape to close.'], shot: { iphone: 'iphone-cc', ipad: 'ipad-cc' }, tries: [T_CC] },
      { id: 'edit', h: 'Editing controls', dev: ['ipad', 'iphone'], steps: ['In Control Centre, touch and hold an empty area (or tap +) to enter edit mode.', 'Drag controls to rearrange them, use − to remove, and drag a corner to resize.', 'Tap Add a Control to browse the gallery by category or app.'], tries: [{ label: 'Control Centre settings', dev: ['ipad', 'iphone'], run: (c) => c.wm.open('settings', { pane: 'controlcentre' }) }] },
      { id: 'edit-mac', h: 'Choosing Mac controls', dev: ['mac'], p: 'Settings → Control Centre chooses which modules appear in the menu bar and in Control Centre.', tries: [{ label: 'Control Centre settings', dev: ['mac'], run: (c) => c.wm.open('settings', { pane: 'controlcenter' }) }] },
    ],
  },
  {
    id: 'notifications',
    group: 'system',
    icon: 'bell',
    intro: 'Notifications appear as banners and are kept in Notification Centre. They only appear after something really happens — a reminder is due, a timer ends, a message is handed to your app.',
    secs: [
      { id: 'banners', h: 'Banners', steps: ['Click or tap a banner to open what it is about; buttons on it run that action.', 'Hover a banner on the Mac to keep it on screen; swipe it up on iPhone/iPad to dismiss.', 'Options ▾ on reminders offers Mark as Completed and Remind Me later.'], tries: [{ label: 'Send a test notification', run: (c) => notify({ app: 'Portfolio Guide', icon: 'guidebook', title: 'Test notification', body: 'This came from the Guidebook. Click it to come back here.', onClick: () => c.wm.open('guidebook', { chapter: 'notifications' }) }) }] },
      { id: 'centre', h: 'Notification Centre', demo: 'pullLeft', steps: ['Mac: click the date and time in the menu bar (or the bottom-right hot corner).', 'iPhone/iPad: pull down from the top-left.', 'Clear one notification with ×, or a whole group with Clear.'], shot: { mac: 'mac-nc', iphone: 'iphone-nc' }, tries: [T_NC] },
      { id: 'settings', h: 'Focus and notification settings', p: 'Focus modes silence banners (critical alerts still appear). Per-app settings, previews and the Scheduled Summary are in Settings → Notifications.', tries: [{ label: 'Notification settings', run: (c) => settingsPane(c, 'notifications', 'notifications') }, { label: 'Focus settings', run: (c) => settingsPane(c, 'focus', 'focus') }] },
    ],
  },
  {
    id: 'gestures',
    group: 'system',
    icon: 'hand',
    intro: 'Everything works with a mouse, a trackpad, a keyboard or touch. These are all the gestures the portfolio understands.',
    secs: [
      { id: 'tap', h: 'Tap and click', demo: 'tap', p: 'Tap or click to open apps, press buttons and select items. Double-click a Mac title bar to fill the screen.' },
      { id: 'hold', h: 'Touch and hold (long-press)', demo: 'longPress', steps: ['On an app icon: quick actions (and Edit Home Screen).', 'On the Home Screen background: edit mode.', 'Inside apps: the same menu a right-click opens — copy, share, delete and so on.', 'On the Dynamic Island: expand the activity.'] },
      { id: 'right', h: 'Right-click (secondary click)', dev: ['mac'], demo: 'rightClick', p: 'Right-click the desktop, Dock icons, files, notes and messages for context menus. With a trackpad, click with two fingers.' },
      { id: 'swipeup', h: 'Swipe up from the bottom', dev: ['ipad', 'iphone'], demo: 'swipeUp', p: 'Go Home. Swipe up and hold for the App Switcher. On the Lock Screen it unlocks.' },
      { id: 'pull', h: 'Pull down from the top', dev: ['ipad', 'iphone'], demo: 'pullRight', p: 'Top-right: Control Centre. Top-left: Notification Centre. On the Home Screen, a short swipe down in the middle opens Search.' },
      { id: 'side', h: 'Swipe sideways', demo: 'swipeSide', steps: ['Home Screen: next or previous page, Today View and App Library.', 'Along the Home indicator: switch to the previous or next app.', 'From the left edge inside an app: go back.', 'Smart Stacks: swipe up/down to flip widgets.'] },
      { id: 'drag', h: 'Drag', demo: 'drag', p: 'Move windows, widgets, icons, stickies, Freeform items and files. In edit mode, drop an app on another to make a folder.' },
      { id: 'pinch', h: 'Pinch', demo: 'pinch', p: 'Pinch to zoom in Maps, Photos and Grapher. On iPhone and iPad, pinching in with three fingers goes Home.' },
      { id: 'three', h: 'Three-finger gestures', dev: ['ipad', 'iphone'], demo: 'three', steps: ['Swipe up with three fingers: App Switcher.', 'Swipe down with three fingers: Notification Centre.', 'Swipe left/right with three fingers: switch apps.', 'Pinch in with three fingers: Home.', 'Double-tap with three fingers: Undo (Recently Deleted & Undo).'], tries: [{ label: 'Gesture settings', dev: ['ipad', 'iphone'], run: (c) => c.wm.open('settings', { q: 'three finger' }) }] },
      { id: 'backtap', h: 'Back Tap and shake', dev: ['iphone'], p: 'Back Tap runs an action when you double- or triple-tap the back of a real phone (it uses the motion sensor; choose actions in Settings → Accessibility → Back Tap). Shaking a phone offers Undo where the browser allows motion access.', tries: [{ label: 'Accessibility settings', dev: ['iphone'], run: (c) => c.wm.open('settings', { pane: 'accessibility' }) }] },
      { id: 'trackpad', h: 'Mac trackpad and mouse', dev: ['mac'], demo: 'hover', steps: ['Hover the Dock to magnify; hover the green button for tiling.', 'Scroll with two fingers; Ctrl + scroll zooms in Maps and Grapher.', 'Move into a hot corner to run its action.'] },
    ],
  },
  {
    id: 'settings',
    group: 'system',
    icon: 'gear',
    intro: 'Settings change the whole portfolio on every device. Each setting does something real; the few that cannot work in a browser say so.',
    secs: [
      { id: 'appearance', h: 'Appearance, wallpaper and text', steps: ['Light, Dark or Auto (follows your device or sunset).', 'Wallpapers: live, dynamic and drawn wallpapers per device, plus your own photo.', 'Accent and highlight colours, text size and bold text.'], tries: [{ label: 'Appearance', run: (c) => settingsPane(c, 'appearance', 'display') }, { label: 'Wallpaper', run: (c) => settingsPane(c, 'wallpaper', 'wallpaper') }, { label: 'Switch Light / Dark now', run: (c) => c.update({ appearance: c.settings.appearance === 'dark' ? 'light' : 'dark' }) }] },
      { id: 'lang', h: 'Language and region', p: 'English, Sinhala or Tamil for the interface (portfolio content stays in English, the language of the CV). Region formats choose °C/°F, 12/24-hour time and the first day of the week.', tries: [{ label: 'Language & Region', run: (c) => settingsPane(c, 'general/language', { q: 'Language' }) }] },
      { id: 'sound', h: 'Sound', p: 'Alert sounds, volume feedback, keyboard clicks, game sounds and ringtones. Browsers only play sound after your first click or tap.', tries: [{ label: 'Sound settings', run: (c) => settingsPane(c, 'sound', 'sound') }] },
      { id: 'devices', h: 'Devices and reset', p: 'View as Mac, iPad or iPhone; reset the Home Screen layout or all settings (your notes, messages and files are kept).', tries: [{ label: 'Devices & View', run: (c) => settingsPane(c, 'devices', 'devices') }] },
      { id: 'more', h: 'Everything else', p: 'Screen Time and limits, Focus, Lock Screen, Desktop & Dock, Control Centre, Display (Night Shift), Battery, Assistant, Accessibility, Privacy, Storage and Recently Deleted. Search at the top of Settings jumps straight to a setting.', shot: { mac: 'mac-settings', iphone: 'iphone-settings' }, tries: [{ label: 'Open Settings', run: (c) => c.wm.open('settings') }] },
    ],
  },
  {
    id: 'modes',
    group: 'portfolio',
    icon: 'briefcase',
    intro: 'Portfolio Modes put the most useful things first in a small bar, depending on who you are. Pick one below — it takes effect immediately.',
    secs: [
      { id: 'pick', h: 'Choose a mode', extra: 'modes' },
      { id: 'recruiter', h: 'Recruiter', p: 'One tap to About, Skills, Projects, Experience, Education, CV and Contact.' },
      { id: 'client', h: 'Client', p: 'Services, case studies, business experience and the fastest ways to get in touch (Email and WhatsApp open your own apps).' },
      { id: 'developer', h: 'Developer', p: 'Skills, Projects in Xcode, Case Studies, the Terminal, GitHub (external) and the Learning Hub.' },
      { id: 'presentation', h: 'Presentation', p: 'A guided walk-through: Welcome → About → Skills → Projects → Experience → Education → Contact. Use Next/Previous or the ← → keys; ✕ exits.', tries: [{ label: 'Start the presentation', run: (c) => c.update({ portfolioMode: 'presentation', presentStep: 0 }) }] },
      { id: 'change', h: 'Changing modes later', steps: ['Mac: logo menu → Portfolio Mode.', 'iPhone/iPad: Settings → Portfolio Mode.', 'Or ✕ on the mode bar to go back to exploring freely.'] },
    ],
  },
  { id: 'apps', group: 'portfolio', icon: 'grid', intro: 'Every app in this portfolio, grouped like the launcher. Descriptions say what each app really contains; “Open” launches it.', secs: [] },
  {
    id: 'access',
    group: 'help',
    icon: 'access',
    intro: 'The portfolio follows your device’s accessibility preferences and adds its own.',
    secs: [
      { id: 'motion', h: 'Reduce Motion', p: 'Replaces zooms, the Genie effect, parallax and looping demos (including the ones in this guide) with simple fades. It also turns on automatically when your device asks for reduced motion.', tries: [{ label: 'Turn Reduce Motion on or off', run: (c) => c.update({ reduceMotion: !c.settings.reduceMotion }) }] },
      { id: 'vision', h: 'Seeing the screen', p: 'Larger and bold text, increased contrast, reduced transparency, Display Zoom and Dark Mode are in Settings → Accessibility and Display.', tries: [{ label: 'Accessibility settings', run: (c) => settingsPane(c, 'accessibility', 'accessibility') }] },
      { id: 'keyboard', h: 'Keyboard only', steps: ['Tab moves between controls; focus rings show where you are.', 'Enter or Space activates; Escape closes menus, sheets and overlays.', 'Arrow keys move in lists, games, the Presentation and the welcome guide.'] },
      { id: 'touch', h: 'Touch helpers', dev: ['ipad', 'iphone'], p: 'AssistiveTouch gives a one-tap menu for gestures; Back Tap and three-finger gestures can be turned off if they get in the way.' },
    ],
  },
  {
    id: 'privacy',
    group: 'help',
    icon: 'shield',
    intro: 'This is a static website. It has no accounts and no tracking by default, and what you do stays in your own browser.',
    secs: [
      { id: 'local', h: 'Stored only on this device', steps: ['Settings, layout, widgets and Control Centre arrangement.', 'Your notes, reminders, calendar events, journal entries, stickies, contacts, passes and messages you drafted.', 'Files you add (My Files) and songs you add — kept in the browser’s storage (IndexedDB).', 'Game scores, study progress and Time Machine snapshots.'], tries: [{ label: 'Open Time Machine', dev: ['mac'], run: (c) => c.wm.open('timemachine') }, { label: 'Storage', run: (c) => settingsPane(c, 'general/storage', 'storage') }] },
      { id: 'never', h: 'Never sent anywhere', p: 'Your camera and microphone (Camera, FaceTime, Voice Memos) are used only on screen; photos and recordings are not uploaded. Messages to M.R. Ahamed are handed to your own email, SMS or WhatsApp app — you press Send there.' },
      { id: 'network', h: 'When the internet is used', steps: ['Weather and the Kandy forecast (Open-Meteo).', 'Public GitHub repository details in Case Studies and Calendar.', 'Translate, Dictionary and Wikipedia look-ups you start.', 'The Guestbook, only if a shared guestbook is configured, and the Ask Me AI proxy, only if configured.', 'External links (marked External) open in a new tab.'] },
      { id: 'clear', h: 'Removing your data', p: 'Clear this site’s data in your browser settings to remove everything. Settings → Devices can reset settings or the layout while keeping your content.', tries: [{ label: 'Privacy settings', dev: ['mac'], run: (c) => c.wm.open('settings', { pane: 'privacy' }) }] },
    ],
  },
  {
    id: 'faq',
    group: 'help',
    icon: 'help',
    intro: 'Quick answers to common problems.',
    secs: [
      { id: 'layout', h: 'My Home Screen or widgets are messed up', p: 'Settings → Devices & View → Reset Home Screen layout. Pages, folders and widgets go back to the original arrangement.', tries: [{ label: 'Devices & View', run: (c) => settingsPane(c, 'devices', 'devices') }] },
      { id: 'reset', h: 'Something looks wrong after changing settings', p: 'Settings → Devices & View → Reset All Settings. Your notes, messages and files are kept. Accessibility has its own reset.', tries: [{ label: 'Devices & View', run: (c) => settingsPane(c, 'devices', 'devices') }] },
      { id: 'sound', h: 'I can’t hear anything', steps: ['Click or tap once anywhere — browsers block sound until you interact.', 'Check the volume and Silent mode in Control Centre.', 'Check Settings → Sound and your device’s own volume.'], tries: [T_CC] },
      { id: 'undo', h: 'I deleted something by mistake', p: 'Notes, messages, photos and apps go to Recently Deleted or the Trash first. Use Edit → Undo, ⌘ Z, a three-finger double-tap, or Settings → Recently Deleted & Undo.', tries: [{ label: 'Recently Deleted', run: (c) => settingsPane(c, 'trash', 'trash') }] },
      { id: 'offline', h: 'Does it work offline?', p: 'Once loaded, most of the portfolio keeps working offline (it is cached by a service worker). Weather, GitHub details, Translate, maps and external links need a connection and say so when it is missing.' },
      { id: 'device', h: 'I’m on the wrong device version', p: 'Switch with View as Mac / iPad / iPhone (see Welcome), or Settings → Devices & View.', tries: [{ label: 'View as Mac', run: (c) => chooseView(c.update, 'mac') }, { label: 'View as iPhone', run: (c) => chooseView(c.update, 'iphone') }] },
      { id: 'classic', h: 'I just want a simple page', p: 'Quick View shows the portfolio as a plain, scrolling page with all the key information.', tries: [{ label: 'Open Quick View', run: () => ev('mra-classic') }] },
      { id: 'contact', h: 'How do I contact M.R. Ahamed?', p: 'Hire Me collects every way: email, phone, WhatsApp, LinkedIn and a booking request. Mail and Messages open your own apps with the message filled in.', tries: [{ label: 'Open Hire Me', run: (c) => c.wm.open('hireme') }] },
    ],
  },
];

/* ───────────────────────── app descriptions (written from each app’s code) ───────────────────────── */
const DESC: Partial<Record<AppId, string>> = {
  about: 'A short profile: photo, title, key facts, a bio and buttons for the CV, GitHub and LinkedIn.',
  safari: 'A browser-style start page with favourites, his repositories, developer resources, tabs, Private Browsing and a Reading List. Websites open in a new tab.',
  notes: 'His skills as notes, each linked to the projects that use them, plus your own notes (saved in this browser) with Recently Deleted.',
  slides: 'The Achievements deck: cover, executive summary, education, projects, leadership and contact slides, with full-screen viewing.',
  xcode: 'The projects as an Xcode workspace: navigator, files, technology stack, key features, his role, architecture and links to the repositories.',
  mail: 'A full mail client. Writing to M.R. Ahamed hands the message to your own email app (mailto:), so nothing is sent by the website.',
  settings: 'System Settings for the whole portfolio — appearance, wallpaper, sound, Focus, Screen Time, Dock, Control Centre, accessibility, language and more.',
  terminal: 'A zsh-style terminal with real commands: help, whoami, skills, projects, experience, education, open, theme, wallpaper, lang, neofetch and more.',
  finder: 'Experience, education, leadership, projects and the timeline as folders; My Files (add your own files, with tags) and the Trash with Put Back.',
  preview: 'His CV, page by page, with buttons to open or download the original PDF.',
  photos: 'Portraits and screenshots with albums, favourites, a full-screen viewer, non-destructive edits, Live Photo playback and portfolio screen recordings.',
  messages: 'A Messages-style chat. Questions get answers built from the portfolio data; sending to him opens your own SMS or WhatsApp.',
  calendar: 'Month, week and day views with his real milestones (month precision from the CV), GitHub update dates and your own events.',
  music: 'A music player with the portfolio’s original instrumentals: library, playlists, favourites, search and Picture in Picture. Shares controls with Control Centre and the Dynamic Island.',
  reminders: 'Checklists with lists, due dates and times, priorities, flags and search. Due reminders notify you. Saved in this browser.',
  maps: 'Google Maps (embedded) centred on Kandy, with his CV locations, search and Directions in Google Maps.',
  google: 'A Google-style start page. Searches open google.com in a new tab.',
  calculator: 'A calculator with keyboard support (digits, + − × ÷, %, Enter, Esc, Backspace).',
  clock: 'World clock, alarms (they ring while the page is open), stopwatch and timer — the timer also shows in the Dynamic Island.',
  contacts: 'His contact card (download as vCard to save it on your phone) and contacts you add yourself.',
  camera: 'Photo Booth–style camera using your webcam with effects. Photos stay in memory; nothing is uploaded.',
  voicememos: 'Record with your microphone, see a real waveform, trim, rename and play back. Recordings stay on this device.',
  measure: 'An on-screen ruler and level: drag to measure in pixels, millimetres or inches; the level uses motion sensors where allowed.',
  findmy: 'Find My for this device: its real battery and screen details, his location in Kandy, directions in Google Maps and a Play Sound chirp.',
  home: 'A smart-home dashboard whose “accessories” are portfolio settings (Night Shift, brightness, music, Focus, appearance) with scenes like Good Morning.',
  weather: 'Live weather for Kandy (Open-Meteo): now, hourly, 10-day, sunrise/sunset, and your own cities. Units follow Settings.',
  pages: 'Documents generated from the portfolio data — résumé, cover letter template, project reports and a contact card — editable and printable to PDF.',
  numbers: 'Spreadsheets of his projects, skills and education with working formulas and a chart.',
  appstore: 'His projects as “apps”, grouped by category with details and source links. Get asks for a demo sign-in first.',
  tips: 'Tip collections — every “Show me” performs the tip for real — and a card that opens this Guidebook.',
  facetime: 'A FaceTime-style app with your real camera preview. There is no calling service, so calling him offers real contact options instead.',
  podcasts: 'Browse podcast categories (they open the public podcast directory in a new tab); Listen Now plays the portfolio’s own ambient loops.',
  tv: 'A TV-style player for the portfolio’s screen recordings.',
  books: 'A library with the CV, documentation generated from his projects and free public-domain classics.',
  stocks: 'A watchlist with charts. All prices are clearly labelled demo data, not real market prices.',
  journal: 'Write journal entries with mood, place and photos (saved in this browser), next to read-only portfolio milestones.',
  freeform: 'An endless board for sticky notes, shapes, text and drawings; starts with his projects as notes, which you can clear.',
  siri: 'The portfolio Assistant (not Apple’s Siri): ask about M.R. Ahamed by typing or speaking; answers come from the portfolio data only and can be read aloud.',
  passwords: 'A password generator, a strength checker and security tips, with a list of demo entries.',
  dictionary: 'An offline glossary of the technologies in the portfolio, plus online dictionary and Wikipedia look-ups.',
  gamecenter: 'Twenty built-in games — arcade (Snake, Block Drop, Brick Breaker…), puzzles (2048, Sudoku), classics (Minesweeper, Pong…), word and brain games — with scores, achievements and a daily challenge.',
  webapp: 'A launcher for online services (Gmail, Drive, Microsoft 365, AI assistants…). They cannot be embedded, so each opens in a new tab.',
  hireme: 'Everything a recruiter needs: availability, CV, contact options and Book a Call (a request by email or WhatsApp with a calendar invite).',
  casestudies: 'Project case studies — problem, approach, stack and outcome — with live public details from GitHub.',
  askai: 'Ask Me AI: answers about M.R. Ahamed from the portfolio data, on the device. If an AI proxy is configured it may use it, only with CV facts.',
  guestbook: 'Leave a message for M.R. Ahamed. Entries are saved in this browser, and shared with everyone only when a shared guestbook is configured.',
  wallet: 'Passes for his contact card, education, ventures and languages plus passes you create, behind a demo sign-in. No payment cards.',
  whatsapp: 'A WhatsApp-style chat; messages to him can be sent from your own WhatsApp.',
  telegram: 'A Telegram-style chat. He doesn’t list a Telegram account, so messages to him go by email instead.',
  xapp: 'An X-style feed of his real portfolio milestones; post, reply and like locally, or share a post to the real X.',
  yahoomail: 'A Yahoo Mail-style client; Send opens Yahoo Mail’s real compose page with your message filled in.',
  services: 'Expertise & Capabilities in technology and business, searchable, each linked to evidence elsewhere in the portfolio.',
  sysprefs: 'Classic System Preferences icon grid; each icon opens the matching pane in System Settings.',
  activity: 'Activity Monitor with real measurements from this tab: frame rate, main-thread load, memory, DOM nodes per window and network transfers.',
  stickies: 'Coloured sticky notes you can drag, resize, recolour and delete (saved in this browser).',
  timemachine: 'Browse hourly snapshots of your portfolio data and restore anything you changed.',
  mirroring: 'The iPhone version of the portfolio in a Mac window, sharing the same notes, messages and settings.',
  learning: 'Learning Hub: short study guides for IT, English, entrepreneurship, study skills, career and productivity, with quizzes and clearly marked external resources. General guidance, not his qualifications.',
  whatsnew: 'The portfolio’s own change history, version by version.',
  flashcards: 'Flashcards & Quiz: IT decks and your own decks, spaced-repetition review and quick quizzes; progress is saved in this browser.',
  focusplanner: 'Focus Planner: a Pomodoro timer that runs in the Dynamic Island, a weekly study timetable and study-time statistics.',
  goals: 'Goals & Tasks: a Kanban board for tasks plus goals with milestones and progress.',
  bizplanner: 'Business Planner: Business Model Canvas, SWOT, an idea checklist and a simple budget calculator, with export. General guidance only.',
  playground: 'Code Playground: write HTML, CSS and JavaScript and run it in a sandboxed preview, with examples; saved in this browser.',
  documents: 'Documents: the CV plus what you save or add — notes exports, plans and your files — in proper viewers.',
  guidebook: 'This Guidebook.',
  translate: 'Translate text between languages, including Sinhala and Tamil, with a free online service; it says so when offline.',
  fontbook: 'The fonts available on your device, with a live, editable preview.',
  grapher: 'Plot y = f(x) with a safe formula parser; drag to pan and scroll or pinch to zoom.',
  colormeter: 'Pick any colour on screen (in browsers with the EyeDropper) or type one; shows HEX, RGB, HSL and contrast.',
  phone: 'Keypad, recents and contacts. Calling his real number opens your own phone app; other numbers place a demo call.',
  shortcuts: 'Ready-made shortcuts (open CV, dark mode, focus timer, torch…) and your own multi-step shortcuts.',
  chess: 'Chess against the computer, or two players on one device, with full rules (castling, en passant, promotion).',
  textedit: 'A rich-text editor; documents are saved in this browser and export as .txt or .html.',
};

/* ───────────────────────── glyphs ───────────────────────── */
type Glyph = 'star' | 'lock' | 'laptop' | 'tablet' | 'phone' | 'widgets' | 'island' | 'switches' | 'bell' | 'hand' | 'gear' | 'briefcase' | 'grid' | 'access' | 'shield' | 'help' | 'search' | 'play' | 'chev';
function G({ n, size = 16 }: { n: Glyph; size?: number }) {
  const d: Record<Glyph, ReactNode> = {
    star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />,
    lock: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </>
    ),
    laptop: (
      <>
        <rect x="4.5" y="5" width="15" height="10.5" rx="1.6" />
        <path d="M2.5 19h19" />
      </>
    ),
    tablet: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2.4" />
        <path d="M10.5 18h3" />
      </>
    ),
    phone: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
        <rect x="10" y="4.5" width="4" height="1.6" rx=".8" />
      </>
    ),
    widgets: (
      <>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
        <rect x="3.5" y="13" width="17" height="7.5" rx="2" />
      </>
    ),
    island: (
      <>
        <rect x="4" y="8.5" width="16" height="7" rx="3.5" />
        <circle cx="16.5" cy="12" r="1.2" />
      </>
    ),
    switches: (
      <>
        <rect x="4" y="5" width="16" height="5.5" rx="2.75" />
        <circle cx="17.2" cy="7.75" r="1.5" />
        <rect x="4" y="13.5" width="16" height="5.5" rx="2.75" />
        <circle cx="6.8" cy="16.25" r="1.5" />
      </>
    ),
    bell: (
      <>
        <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" />
        <path d="M10 20.5h4" />
      </>
    ),
    hand: <path d="M8.5 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-6 6.5-2.8 0-4.4-1.5-5.6-3.6L4.6 13.6a1.4 1.4 0 0 1 2.3-1.5l1.6 1.9" />,
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3.5" y="7.5" width="17" height="12" rx="2.2" />
        <path d="M9 7.5V5.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v1.7M3.5 12.5h17" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.8" />
        <rect x="14" y="4" width="6" height="6" rx="1.8" />
        <rect x="4" y="14" width="6" height="6" rx="1.8" />
        <rect x="14" y="14" width="6" height="6" rx="1.8" />
      </>
    ),
    access: (
      <>
        <circle cx="12" cy="4.8" r="1.8" />
        <path d="M4.5 8.5 12 10l7.5-1.5M12 10v4.5m0 0L8.5 21M12 14.5l3.5 6.5" />
      </>
    ),
    shield: <path d="M12 3 5 5.8v5.4c0 4.5 3 8.2 7 9.8 4-1.6 7-5.3 7-9.8V5.8z" />,
    help: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7M12 16.8v.2" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m15 15 5 5" />
      </>
    ),
    play: <path d="M8 5.5v13l10.5-6.5z" />,
    chev: <path d="m9 5 7 7-7 7" />,
  };
  return (
    <svg className="gd-g" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {d[n]}
    </svg>
  );
}

/* ───────────────────────── gesture demo (looping SVG; still when motion is reduced) ───────────────────────── */
function DemoAnim({ kind, label }: { kind: Demo; label: string }) {
  const mac = kind === 'rightClick' || kind === 'hover';
  return (
    <figure className={`gd-demo gd-d-${kind}`} aria-label={label} role="img">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        {mac ? (
          <>
            <rect className="gd-dev" x="8" y="20" width="104" height="70" rx="6" />
            <rect className="gd-scr" x="13" y="25" width="94" height="60" rx="3" />
            <path className="gd-dev" d="M2 96h116" />
            {kind === 'hover' && (
              <g className="gd-dock">
                <rect className="gd-dockbg" x="26" y="71" width="68" height="11" rx="4" />
                {[33, 45, 57, 69, 81].map((x, i) => (
                  <rect key={x} className={`gd-di gd-di${i}`} x={x - 4} y="73" width="8" height="8" rx="2" />
                ))}
              </g>
            )}
            {kind === 'rightClick' && (
              <g className="gd-menu">
                <rect x="60" y="40" width="34" height="34" rx="3" />
                <path d="M64 48h24M64 56h20M64 64h22" />
              </g>
            )}
            <path className="gd-ptr" d="M0 0v15l4-4 3 7 3-1.4-3-6.6h6z" />
          </>
        ) : (
          <>
            <rect className="gd-dev" x="34" y="6" width="52" height="108" rx="10" />
            <rect className="gd-scr" x="38" y="10" width="44" height="100" rx="7" />
            <rect className="gd-isl" x="52" y="13" width="16" height="4.5" rx="2.25" />
            <rect className="gd-bar" x="50" y="104" width="20" height="2" rx="1" />
            {kind === 'pullRight' || kind === 'pullLeft' ? <rect className="gd-sheet" x="38" y="10" width="44" height="100" rx="7" /> : null}
            {kind === 'swipeSide' && (
              <g className="gd-pages">
                {[0, 1].map((p) =>
                  [0, 1, 2].map((r) =>
                    [0, 1, 2].map((c) => <rect key={`${p}${r}${c}`} x={43 + p * 44 + c * 12} y={26 + r * 14} width="8" height="8" rx="2" />),
                  ),
                )}
              </g>
            )}
            {kind === 'longPress' && <rect className="gd-icon" x="54" y="46" width="12" height="12" rx="3" />}
            {kind === 'drag' && <rect className="gd-icon gd-drag" x="44" y="40" width="12" height="12" rx="3" />}
            {kind === 'pinch' ? (
              <>
                <circle className="gd-f gd-f1" cx="60" cy="60" r="4.5" />
                <circle className="gd-f gd-f2" cx="60" cy="60" r="4.5" />
              </>
            ) : kind === 'three' ? (
              <g className="gd-three">
                <circle className="gd-f" cx="50" cy="80" r="4" />
                <circle className="gd-f" cx="60" cy="76" r="4" />
                <circle className="gd-f" cx="70" cy="80" r="4" />
              </g>
            ) : (
              <circle className="gd-f gd-f1" cx="60" cy="60" r="4.5" />
            )}
          </>
        )}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

const DEMO_LABEL: Record<Demo, string> = {
  swipeUp: 'Swipe up',
  swipeUpHold: 'Swipe up and hold',
  pullRight: 'Pull down from the top-right',
  pullLeft: 'Pull down from the top-left',
  swipeSide: 'Swipe sideways',
  longPress: 'Touch and hold',
  pinch: 'Pinch',
  drag: 'Drag',
  tap: 'Tap',
  three: 'Three fingers',
  rightClick: 'Right-click',
  hover: 'Hover',
  edge: 'Swipe from the edge',
};

/* ───────────────────────── apps index (generated from the registry) ───────────────────────── */
interface AppEntry {
  id: AppId;
  label: string;
  icon: IconName;
  group: LaunchItem['group'];
  desc: string;
  also: LaunchItem[];
}
function buildApps(): AppEntry[] {
  const out: AppEntry[] = [];
  (Object.keys(APPS) as AppId[]).forEach((id) => {
    const items = LAUNCH_ITEMS.filter((li) => 'app' in li.action && li.action.app === id);
    const main = items.find((li) => li.id === id) ?? items.find((li) => !('args' in li.action && li.action.args)) ?? items[0];
    const meta = APPS[id];
    out.push({
      id,
      label: id === 'webapp' ? 'Web Apps' : (main?.label ?? meta.menuName),
      icon: (main?.icon ?? meta.icon) as IconName,
      group: main?.group ?? 'System',
      desc: DESC[id] ?? meta.title,
      also: items.filter((li) => li !== main),
    });
  });
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

/* ───────────────────────── search ───────────────────────── */
interface Hit {
  ch: string;
  sec?: string;
  app?: AppId;
  title: string;
  sub: string;
}
const text = (s: Sec) => [s.h, s.p ?? '', ...(s.steps ?? []), ...(s.tips ?? []), ...(s.tries ?? []).map((t) => t.label)].join(' ');

/* ───────────────────────── the app ───────────────────────── */
export default function GuideApp({ win }: Partial<AppProps>) {
  const wm = useWM();
  const sys = useSystem();
  const ios = useContext(IOS);
  const music = useMusic();
  const { settings, update } = useSettings();
  const lang: Lang = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const t = (k: string, v: Record<string, string> = {}) => (L[k]?.[lang] ?? L[k]?.en ?? k).replace(/\{(\w+)\}/g, (_, x: string) => v[x] ?? '');
  const actual: Dev = ios ? (ios.mode === 'ipad' ? 'ipad' : 'iphone') : 'mac';
  const apps = useMemo(buildApps, []);
  const firstCh = win?.args?.chapter && CHAPTERS.some((c) => c.id === win.args?.chapter) ? win.args.chapter : actual === 'mac' ? 'welcome' : 'welcome';
  const [cur, setCur] = useState<string>(firstCh);
  const [detail, setDetail] = useState(!!win?.args?.chapter);
  const [view, setView] = useState<Dev>(actual);
  const [q, setQ] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const pendingSec = useRef<string | null>(win?.args?.section ?? null);

  // deep links: open('guidebook', { chapter, section })
  useEffect(() => {
    const c = win?.args?.chapter;
    if (c && CHAPTERS.some((x) => x.id === c)) {
      setCur(c);
      setDetail(true);
      setQ('');
      pendingSec.current = win?.args?.section ?? null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win?.launchKey]);
  useEffect(() => setView(actual), [actual]);

  // scroll to the top of a chapter, or to a requested section
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const s = pendingSec.current;
    pendingSec.current = null;
    if (s) {
      const target = el.querySelector<HTMLElement>(`[data-sec="${CSS.escape(s)}"]`);
      if (target) {
        window.setTimeout(() => target.scrollIntoView({ block: 'start', behavior: settings.reduceMotion ? 'auto' : 'smooth' }), 30);
        setFlash(s);
        window.setTimeout(() => setFlash(null), 1600);
        return;
      }
    }
    el.scrollTop = 0;
  }, [cur, detail, settings.reduceMotion]);

  const ctx: Ctx = { wm, sys, ios, dev: actual, settings, update, music };
  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const words = s.split(/\s+/);
    const match = (str: string) => {
      const l = str.toLowerCase();
      return words.every((w) => l.includes(w));
    };
    const out: Hit[] = [];
    CHAPTERS.forEach((c) => {
      const ct = t(`c.${c.id}`);
      if (match(`${ct} ${L[`c.${c.id}`]?.en ?? ''} ${c.intro}`)) out.push({ ch: c.id, title: ct, sub: c.intro });
      c.secs.forEach((x) => match(text(x)) && out.push({ ch: c.id, sec: x.id, title: x.h, sub: `${ct}${x.dev ? ` · ${x.dev.map((d) => DEV_NAME[d]).join(', ')}` : ''}` }));
    });
    apps.forEach((a) => match(`${a.label} ${a.desc} ${a.also.map((x) => x.label).join(' ')} ${a.group}`) && out.push({ ch: 'apps', sec: `app-${a.id}`, app: a.id, title: a.label, sub: a.desc }));
    return out.slice(0, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, apps, lang]);

  const go = (ch: string, sec?: string) => {
    pendingSec.current = sec ?? null;
    setCur(ch);
    setDetail(true);
    if (ch === cur && sec) {
      // same chapter: scroll directly
      const target = body.current?.querySelector<HTMLElement>(`[data-sec="${CSS.escape(sec)}"]`);
      target?.scrollIntoView({ block: 'start', behavior: settings.reduceMotion ? 'auto' : 'smooth' });
      setFlash(sec);
      window.setTimeout(() => setFlash(null), 1600);
    }
  };
  const chapter = CHAPTERS.find((c) => c.id === cur) ?? CHAPTERS[0];
  const idx = CHAPTERS.indexOf(chapter);
  const groups: Chapter['group'][] = ['start', 'devices', 'system', 'portfolio', 'help'];

  // the device you use comes first; sections for other devices are hidden unless you switch
  const secs = chapter.secs.filter((s) => !s.dev || s.dev.includes(view));
  const hiddenFor = chapter.secs.length - secs.length;

  const tryBtn = (tr: Try, key: string) => {
    const ok = !tr.dev || tr.dev.includes(actual);
    return (
      <button
        key={key}
        type="button"
        className="gd-try"
        disabled={!ok}
        title={ok ? undefined : t('onlyOn', { d: (tr.dev ?? []).map((d) => DEV_NAME[d]).join(' / ') })}
        onClick={() => {
          try {
            tr.run(ctx);
          } catch {
            /* a feature that is unavailable right now simply does nothing */
          }
        }}
      >
        <G n="play" size={11} />
        <span>{tr.label}</span>
        {!ok && <small>{t('onlyOn', { d: (tr.dev ?? []).map((d) => DEV_NAME[d]).join(' / ') })}</small>}
      </button>
    );
  };

  return (
    <div className={`gd ${detail ? 'gd-detail-on' : ''}`} lang={lang}>
      <DragBar className="gd-bar">
        <Lights />
        <b className="gd-title">{t('guide')}</b>
      </DragBar>
      <div className="gd-body">
        <nav className="gd-side" aria-label={t('back')}>
          <div className="gd-search">
            <G n="search" size={14} />
            <input data-nodrag value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} onKeyDown={(e) => e.key === 'Escape' && setQ('')} />
            {q && (
              <button type="button" aria-label={t('clear')} onClick={() => setQ('')}>
                ×
              </button>
            )}
          </div>
          {q.trim() ? (
            <div className="gd-hits" aria-live="polite">
              <p className="gd-count">{hits.length ? t('results', { n: String(hits.length) }) : t('none')}</p>
              {hits.map((h, i) => (
                <button key={`${h.ch}-${h.sec ?? ''}-${i}`} type="button" className="gd-hit" onClick={() => go(h.ch, h.sec)}>
                  {h.app ? (
                    <span className="gd-hit-ico">
                      <AppIcon name={apps.find((a) => a.id === h.app)!.icon} />
                    </span>
                  ) : (
                    <span className="gd-hit-ico gd-hit-g">
                      <G n={CHAPTERS.find((c) => c.id === h.ch)!.icon} />
                    </span>
                  )}
                  <span className="gd-hit-t">
                    <b>{h.title}</b>
                    <small>{h.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            groups.map((g) => (
              <div key={g} className="gd-grp">
                <h3>{t(`g.${g}`)}</h3>
                {CHAPTERS.filter((c) => c.group === g).map((c) => (
                  <button key={c.id} type="button" className={`gd-ch ${c.id === cur ? 'on' : ''}`} aria-current={c.id === cur ? 'page' : undefined} onClick={() => go(c.id)}>
                    <span className={`gd-ch-ico gd-ic-${c.group}`}>
                      <G n={c.icon} size={15} />
                    </span>
                    <span className="gd-ch-t">{t(`c.${c.id}`)}</span>
                    {c.id === actual && <i className="gd-here" aria-label={t('thisDev')} />}
                    <G n="chev" size={12} />
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>

        <main className="gd-main" ref={body}>
          <button type="button" className="gd-back" onClick={() => setDetail(false)}>
            <svg viewBox="0 0 12 20" width="10" height="16" aria-hidden="true">
              <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('back')}
          </button>
          <header className="gd-head">
            <span className={`gd-head-ico gd-ic-${chapter.group}`}>
              <G n={chapter.icon} size={26} />
            </span>
            <div>
              <small>{t(`g.${chapter.group}`)}</small>
              <h1>{t(`c.${chapter.id}`)}</h1>
            </div>
          </header>
          <p className="gd-intro">{chapter.intro}</p>

          {chapter.id !== 'apps' && chapter.secs.some((s) => s.dev) && (
            <div className="gd-devs" role="radiogroup" aria-label={t('for')}>
              <span>{t('for')}</span>
              {(['mac', 'ipad', 'iphone'] as Dev[]).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={view === d} className={view === d ? 'on' : ''} onClick={() => setView(d)}>
                  {DEV_NAME[d]}
                  {d === actual && <i className="gd-here" aria-label={t('thisDev')} />}
                </button>
              ))}
            </div>
          )}

          {chapter.id === 'apps' ? (
            <AppsIndex apps={apps} t={t} flash={flash} onOpen={(id, args) => wm.open(id, args)} />
          ) : (
            secs.map((s) => (
              <section key={s.id} className={`gd-sec ${flash === s.id ? 'flash' : ''}`} data-sec={s.id}>
                <h2>
                  {s.h}
                  {s.dev && (
                    <span className="gd-tags">
                      {s.dev.map((d) => (
                        <em key={d}>{DEV_NAME[d]}</em>
                      ))}
                    </span>
                  )}
                </h2>
                <div className={`gd-sec-body ${s.demo || s.shot?.[view] ? 'has-media' : ''}`}>
                  <div className="gd-sec-txt">
                    {s.p && <p>{s.p}</p>}
                    {s.steps && (
                      <ol className="gd-steps" aria-label={t('steps')}>
                        {s.steps.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ol>
                    )}
                    {s.extra === 'shortcuts' && (
                      <dl className="gd-keys">
                        {SHORTCUTS.map(([a, k]) => (
                          <div key={a}>
                            <dt>{a}</dt>
                            <dd>
                              {k.split('·').map((combo) => (
                                <kbd key={combo}>{combo.trim()}</kbd>
                              ))}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {s.extra === 'modes' && (
                      <div className="gd-modes">
                        <ModePicker />
                      </div>
                    )}
                    {s.tries && s.tries.length > 0 && <div className="gd-tries">{s.tries.map((tr, i) => tryBtn(tr, `${s.id}-${i}`))}</div>}
                  </div>
                  {(s.demo || s.shot?.[view]) && (
                    <div className="gd-media">
                      {s.shot?.[view] && <Shot file={s.shot[view]!} dev={view} alt={`${t('shot')}: ${s.h} (${DEV_NAME[view]})`} />}
                      {s.demo && <DemoAnim kind={s.demo} label={`${t('demo')}: ${DEMO_LABEL[s.demo]}`} />}
                    </div>
                  )}
                </div>
              </section>
            ))
          )}
          {hiddenFor > 0 && chapter.id !== 'apps' && secs.length === 0 && <p className="gd-empty">{t('onlyOn', { d: DEV_NAME[chapter.secs[0].dev?.[0] ?? 'mac'] })}</p>}

          <footer className="gd-foot">
            {idx > 0 ? (
              <button type="button" onClick={() => go(CHAPTERS[idx - 1].id)}>
                ‹ {t(`c.${CHAPTERS[idx - 1].id}`)}
              </button>
            ) : (
              <span />
            )}
            {idx < CHAPTERS.length - 1 && (
              <button type="button" className="primary" onClick={() => go(CHAPTERS[idx + 1].id)} aria-label={`${t('next')}: ${t(`c.${CHAPTERS[idx + 1].id}`)}`}>
                {t(`c.${CHAPTERS[idx + 1].id}`)} ›
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}

function Shot({ file, dev, alt }: { file: string; dev: Dev; alt: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return null;
  return (
    <figure className={`gd-shot gd-shot-${dev}`}>
      <img src={`./assets/guide/${file}.webp`} alt={alt} loading="lazy" decoding="async" onError={() => setBad(true)} />
    </figure>
  );
}

function AppsIndex({ apps, t, flash, onOpen }: { apps: AppEntry[]; t: (k: string, v?: Record<string, string>) => string; flash: string | null; onOpen: (id: AppId, args?: Record<string, string>) => void }) {
  return (
    <>
      {LAUNCH_GROUPS.map((g) => {
        const list = apps.filter((a) => a.group === g);
        if (!list.length) return null;
        return (
          <section key={g} className="gd-sec gd-apps">
            <h2>
              {t(`lg.${g}`)} <small>{t('appsN', { n: String(list.length) })}</small>
            </h2>
            <ul className="gd-applist">
              {list.map((a) => (
                <li key={a.id} data-sec={`app-${a.id}`} className={flash === `app-${a.id}` ? 'flash' : ''}>
                  <span className="gd-app-ico">
                    <AppIcon name={a.icon} />
                  </span>
                  <span className="gd-app-t">
                    <b>{a.label}</b>
                    <span>{a.desc}</span>
                    {a.also.length > 0 && (
                      <span className="gd-also">
                        {t('alsoAs')}:{' '}
                        {a.also.map((li, i) => (
                          <span key={li.id}>
                            {i > 0 && ', '}
                            <button type="button" onClick={() => 'app' in li.action && onOpen(li.action.app, li.action.args)}>
                              {li.label}
                            </button>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <button type="button" className="gd-open" onClick={() => onOpen(a.id)} aria-label={`${t('open')} ${a.label}`}>
                    {t('open')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent, type MouseEvent as RMouseEvent } from 'react';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { Window } from './Window';
import { Wallpaper } from './Wallpaper';
import { Widgets } from './Widgets';
import { DesktopIcons, quickLookFor } from './DesktopIcons';
import { BootScreen, PowerOff } from './Boot';
import { ControlCenter } from './ControlCenter';
import { NotificationCenter, Toasts } from './NotificationCenter';
import { Launchpad } from './Launchpad';
import { Spotlight } from './Spotlight';
import { QuickLook } from './QuickLook';
import { ContextMenu } from './ContextMenu';
import { MissionControl } from './MissionControl';
import { LockScreen } from './LockScreen';
import { ForceQuit } from './ForceQuit';
import { ShareSheet } from './ShareSheet';
import { SignInSheet } from './SignInSheet';
import { SystemExtras } from './SystemExtras';
import { useScheduledNotifications } from '../system/useScheduled';
import { sharePortfolio } from '../system/share';
import { recordOpen, tickScreenTime } from '../system/screenTime';
import { isCompact, useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { useSystem } from '../system/SystemContext';
import { personal, projects } from '../data/portfolio';
import { wallpapers } from '../data/media';
import { LAUNCH_ITEMS } from '../system/launch';
import { useDeskApps, useIconPositions, useWidgetPositions } from '../system/desk';
import { SystemV9 } from './SystemV9';
import type { AppId, WindowState } from '../system/types';

export interface AppProps {
  win: WindowState;
}

/* Applications are code-split and loaded on first launch. */
const APP_COMPONENTS: Record<AppId, LazyExoticComponent<ComponentType<AppProps>>> = {
  about: lazy(() => import('../apps/AboutApp')),
  safari: lazy(() => import('../apps/SafariApp')),
  notes: lazy(() => import('../apps/NotesApp')),
  slides: lazy(() => import('../apps/SlidesApp')),
  xcode: lazy(() => import('../apps/XcodeApp')),
  mail: lazy(() => import('../apps/MailApp')),
  settings: lazy(() => import('../apps/SettingsApp')),
  terminal: lazy(() => import('../apps/TerminalApp')),
  finder: lazy(() => import('../apps/FinderApp')),
  preview: lazy(() => import('../apps/PreviewApp')),
  photos: lazy(() => import('../apps/PhotosApp')),
  messages: lazy(() => import('../apps/MessagesApp')),
  calendar: lazy(() => import('../apps/CalendarApp')),
  music: lazy(() => import('../apps/MusicApp')),
  reminders: lazy(() => import('../apps/RemindersApp')),
  maps: lazy(() => import('../apps/MapsApp')),
  google: lazy(() => import('../apps/GoogleApp')),
  calculator: lazy(() => import('../apps/CalculatorApp')),
  clock: lazy(() => import('../apps/ClockApp')),
  contacts: lazy(() => import('../apps/ContactsApp')),
  facetime: lazy(() => import('../apps/FaceTimeApp')),
  podcasts: lazy(() => import('../apps/PodcastsApp')),
  tv: lazy(() => import('../apps/TVApp')),
  books: lazy(() => import('../apps/BooksApp')),
  stocks: lazy(() => import('../apps/StocksApp')),
  journal: lazy(() => import('../apps/JournalApp')),
  freeform: lazy(() => import('../apps/FreeformApp')),
  siri: lazy(() => import('../apps/SiriApp')),
  passwords: lazy(() => import('../apps/PasswordsApp')),
  dictionary: lazy(() => import('../apps/DictionaryApp')),
  gamecenter: lazy(() => import('../apps/GameCenterApp')),
  webapp: lazy(() => import('../apps/WebAppApp')),
  camera: lazy(() => import('../apps/CameraApp')),
  voicememos: lazy(() => import('../apps/VoiceMemosApp')),
  measure: lazy(() => import('../apps/MeasureApp')),
  findmy: lazy(() => import('../apps/FindMyApp')),
  home: lazy(() => import('../apps/HomeApp')),
  weather: lazy(() => import('../apps/WeatherApp')),
  pages: lazy(() => import('../apps/PagesApp')),
  numbers: lazy(() => import('../apps/NumbersApp')),
  appstore: lazy(() => import('../apps/AppStoreApp')),
  tips: lazy(() => import('../apps/TipsApp')),
  hireme: lazy(() => import('../apps/HireMeApp')),
  casestudies: lazy(() => import('../apps/CaseStudiesApp')),
  askai: lazy(() => import('../apps/AskAIApp')),
  guestbook: lazy(() => import('../apps/GuestbookApp')),
  wallet: lazy(() => import('../apps/WalletApp')),
  whatsapp: lazy(() => import('../apps/WhatsAppApp')),
  telegram: lazy(() => import('../apps/TelegramApp')),
  xapp: lazy(() => import('../apps/XApp')),
  yahoomail: lazy(() => import('../apps/YahooMailApp')),
  services: lazy(() => import('../apps/ServicesApp')),
  sysprefs: lazy(() => import('../apps/SysPrefsApp')),
  activity: lazy(() => import('../apps/ActivityApp')),
  stickies: lazy(() => import('../apps/StickiesApp')),
  translate: lazy(() => import('../apps/TranslateApp')),
  fontbook: lazy(() => import('../apps/FontBookApp')),
  grapher: lazy(() => import('../apps/GrapherApp')),
  colormeter: lazy(() => import('../apps/ColorMeterApp')),
};

function useViewport() {
  const [, setV] = useState(0);
  const [compact, setCompact] = useState(isCompact);
  useEffect(() => {
    let f = 0;
    const onResize = () => {
      cancelAnimationFrame(f);
      f = requestAnimationFrame(() => {
        setCompact(isCompact());
        setV((v) => v + 1);
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return compact;
}

export function Desktop() {
  const wm = useWM();
  const sys = useSystem();
  const { settings, update, toggleAppearance } = useSettings();
  const compact = useViewport();
  const [deskApps, setDeskApps] = useDeskApps();
  const [, setIconPos] = useIconPositions();
  const [, setWidgetPos] = useWidgetPositions();
  const [selected, setSelected] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [intro, setIntro] = useState(false);
  const prevPhase = useRef(sys.phase);

  // staged entrance after boot (and after the start-up lock screen is unlocked):
  // wallpaper → menu bar → widgets → icons → Dock
  const pendingIntro = useRef(false);
  useEffect(() => {
    if (prevPhase.current !== 'ready' && sys.phase === 'ready') pendingIntro.current = true;
    if (sys.phase === 'boot') wm.closeAll();
    prevPhase.current = sys.phase;
  }, [sys.phase, wm]);
  useEffect(() => {
    if (!pendingIntro.current || sys.phase !== 'ready' || sys.locked) return;
    pendingIntro.current = false;
    setIntro(true);
    setHint(true);
    window.setTimeout(() => setIntro(false), 1900);
  }, [sys.phase, sys.locked]);

  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(false), 7000);
    return () => window.clearTimeout(t);
  }, [hint]);

  useScheduledNotifications();
  useEffect(() => {
    const on = () => void sharePortfolio();
    window.addEventListener('mra-share-portfolio', on);
    return () => window.removeEventListener('mra-share-portfolio', on);
  }, []);

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        sys.toggleOverlay('spotlight');
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        sys.toggleOverlay('spotlight');
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        sys.toggleOverlay('launchpad');
        return;
      }
      if (e.key === 'Escape') {
        setSelected(null);
        if (sys.overlay !== 'none') sys.setOverlay('none');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sys]);

  const onDesktopContext = (e: RMouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('.win-pos, .dock-wrap, .menubar, .widget, .desk-icon, .control-center, .notif-center')) return;
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open Launchpad', action: () => sys.setOverlay('launchpad') },
        { label: 'Spotlight Search', action: () => sys.setOverlay('spotlight') },
        { label: '', sep: true },
        { label: 'New Folder', action: () => wm.open('finder', { folder: 'all' }) },
        { label: 'Add Widgets…', action: () => window.dispatchEvent(new Event('mra-edit-widgets')) },
        { label: 'Edit Widgets…', action: () => window.dispatchEvent(new Event('mra-edit-widgets')) },
        {
          label: 'Add App to Desktop',
          submenu: [...LAUNCH_ITEMS]
            .filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i && !deskApps.includes(l.id))
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((l) => ({ label: l.label, action: () => setDeskApps((d) => [...d, l.id]) })),
        },
        { label: 'Edit Launchpad Apps…', action: () => sys.setOverlay('launchpad') },
        { label: 'Change Wallpaper…', action: () => wm.open('settings', { pane: 'wallpaper' }) },
        { label: settings.appearance === 'dark' ? 'Use Light Mode' : 'Use Dark Mode', action: toggleAppearance },
        {
          label: 'Next Wallpaper',
          action: () => {
            const i = wallpapers.findIndex((w) => w.id === settings.wallpaper);
            update({ wallpaper: wallpapers[(i + 1) % wallpapers.length].id });
          },
        },
        { label: '', sep: true },
        { label: 'Clean Up', action: () => (setSelected(null), setIconPos({})) },
        { label: 'Arrange Widgets in Columns', action: () => setWidgetPos({}) },
        {
          label: 'Get Info',
          action: () =>
            sys.setQuickLook({
              kind: 'info',
              title: 'Portfolio Desktop',
              icon: 'finder',
              text: `${personal.name} — ${personal.headline}`,
              rows: [
                ['Projects', String(projects.length)],
                ['Theme', settings.appearance === 'dark' ? 'Dark' : 'Light'],
                ['Location', personal.location],
              ],
            }),
        },
      ],
    });
  };

  // Space on a selected desktop icon → Quick Look
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || !selected || sys.quickLook) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      e.preventDefault();
      sys.setQuickLook(quickLookFor(selected));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, sys]);

  // Screen Time: focused-app usage while the tab is visible, and app launches
  const focusedRef = useRef(wm.focusedId);
  focusedRef.current = wm.focusedId;
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible' && sys.phase === 'ready') tickScreenTime(focusedRef.current, 1000);
    }, 1000);
    return () => window.clearInterval(t);
  }, [sys.phase]);
  const seenRef = useRef<Set<AppId>>(new Set());
  useEffect(() => {
    const ids = new Set(wm.windows.map((w) => w.id));
    ids.forEach((id) => !seenRef.current.has(id) && recordOpen(id));
    seenRef.current = ids;
  }, [wm.windows]);

  const appActive = wm.windows.some((w) => w.phase !== 'minimized' && w.phase !== 'closing');
  const phaseClass = sys.phase === 'shutdown' ? 'outro' : sys.phase === 'boot' || sys.phase === 'off' ? 'hidden-desk' : intro ? 'intro' : '';

  return (
    <div
      className={`desktop ${compact ? 'compact' : ''} ${phaseClass} ${sys.overlay === 'launchpad' ? 'lp-open' : ''}`}
      data-app-active={appActive || undefined}
      onPointerDown={() => setSelected(null)}
      onContextMenu={onDesktopContext}
    >
      <Wallpaper id={settings.wallpaper} tint={settings.appearance === 'dark' && settings.darkWallpaperTint} custom={settings.customWallpaper} />
      <a className="skip-link" href="#dock" onClick={(e) => (e.preventDefault(), document.querySelector<HTMLElement>('.dock .dock-item')?.focus())}>
        Skip to Dock
      </a>
      <MenuBar onShowTips={() => setHint(true)} />
      <main className="desk-area" aria-label="Desktop">
        <Widgets />
        <DesktopIcons selected={selected} onSelect={setSelected} />
      </main>

      <div className="windows-layer">
        {wm.windows.map((w) => {
          const App = APP_COMPONENTS[w.id];
          return (
            <Window key={w.id} win={w} focused={wm.focusedId === w.id} compact={compact}>
              <Suspense
                fallback={
                  <div className="app-loading">
                    <span className="spinner" />
                  </div>
                }
              >
                <App win={w} />
              </Suspense>
            </Window>
          );
        })}
      </div>

      <div className={`hint ${hint ? 'show' : ''}`} role="status" aria-live="polite">
        {compact ? 'Tap icons to open · use the Dock below' : 'Double-click icons to open · ⌘/Ctrl+Space to search · right-click for more'}
      </div>

      <Dock />
      <Launchpad />
      <ControlCenter />
      <NotificationCenter />
      <Toasts />
      <Spotlight />
      <QuickLook />
      <ContextMenu />
      <MissionControl />
      <ForceQuit />
      <SystemExtras />
      <SystemV9 />
      <ShareSheet />
      <SignInSheet />
      <LockScreen />
      <div className="nightshift-layer" aria-hidden="true" />
      <div className="brightness-layer" aria-hidden="true" />
      <BootScreen />
      <PowerOff />
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Settings } from './types';
import { readStore, writeStore } from './storage';
import { notify } from './notify';
import { wallpaperById , setCustomWallpaper } from '../data/media';
import { isNight } from './sun';
import { setLang } from './i18n';

/** Cross-fade theme changes with the View Transitions API where available. */
function withTransition(fn: () => void) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduced = document.documentElement.dataset.motion === 'reduced';
  if (d.startViewTransition && !reduced) d.startViewTransition(fn);
  else fn();
}

const KEY = 'mra-portfolio-settings-v1';

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export const defaultSettings: Settings = {
  appearance: 'light',
  wallpaper: 'sonoma',
  magnification: true,
  magnificationAmount: 0.6,
  dockSize: 48,
  reduceMotion: false,
  darkWallpaperTint: true,
  accent: 'multicolor',
  startupSound: true,
  uiSounds: true,
  alertSound: 'Boop',
  alertVolume: 0.6,
  showShield: true,
  showBatteryPct: false,
  lockAfter: 0,
  lockMessage: 'Thanks for visiting — M.R. Ahamed',
  autoAppearance: 'off',
  minimizeEffect: 'genie',
  notificationSounds: true,
  systemNotifications: false,
  hotCorners: ['none', 'none', 'none', 'nc'],
  windowTiling: true,
  stageManager: false,
  language: 'en',
  textScale: 1,
  boldText: false,
  increaseContrast: false,
  reduceTransparency: false,
  startupChime: 'classic',
  seasonal: true,
  dockPosition: 'bottom',
  dockAutohide: false,
  dockIndicators: true,
  dockAnimateOpen: true,
  minimizeToAppIcon: false,
  dockRecents: true,
  menubarAutohide: 'never',
  menubarBg: true,
  naturalScroll: true,
  pinchZoom: true,
  titleBarDoubleClick: 'zoom',
  iconStyle: 'default',
  folderColor: 'auto',
  liquidGlass: 'clear',
  displayScale: 1,
  extScale: 1,
  displayRotation: 0,
  refreshRate: 'auto',
  lowPowerMode: 'never',
  spotlight: {},
  spotlightExclude: [],
  menuExtras: { cv: true, nowPlaying: true, language: true },
  customWallpaper: '',
  customTone: 'dark',
};

/** Accent colours offered in System Settings → Appearance. */
export const ACCENTS: { id: string; label: string; color: string; strong: string }[] = [
  { id: 'multicolor', label: 'Multicolor', color: '#0a84ff', strong: '#0a64d8' },
  { id: 'blue', label: 'Blue', color: '#0a84ff', strong: '#0a64d8' },
  { id: 'purple', label: 'Purple', color: '#8e44ad', strong: '#6f2f8f' },
  { id: 'pink', label: 'Pink', color: '#e84393', strong: '#c42c78' },
  { id: 'red', label: 'Red', color: '#e5383b', strong: '#c1272d' },
  { id: 'orange', label: 'Orange', color: '#f0801a', strong: '#cc6400' },
  { id: 'yellow', label: 'Yellow', color: '#e8b400', strong: '#b88c00' },
  { id: 'green', label: 'Green', color: '#34a853', strong: '#23843d' },
  { id: 'graphite', label: 'Graphite', color: '#8e8e93', strong: '#6c6c70' },
];

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  toggleAppearance: () => void;
  /** true when either the OS or the user setting asks for reduced motion */
  motionReduced: boolean;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const s = readStore(KEY, defaultSettings); // readStore merges new defaults into older saved settings
    // migrate unknown wallpaper ids (older versions) to the default
    return { ...s, wallpaper: wallpaperById(s.wallpaper).id };
  });
  const [osReduced, setOsReduced] = useState(prefersReducedMotion);
  setLang(settings.language ?? 'en');
  setCustomWallpaper(settings.customWallpaper ?? '', settings.customTone ?? 'dark');

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = () => setOsReduced(mq?.matches ?? false);
    mq.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    writeStore(KEY, settings);
    const root = document.documentElement;
    root.dataset.theme = settings.appearance;
    root.style.setProperty('--dock-size', `${settings.dockSize}px`);
    const ac = ACCENTS.find((a) => a.id === settings.accent) ?? ACCENTS[0];
    root.style.setProperty('--accent', ac.color);
    root.style.setProperty('--accent-strong', ac.strong);
    root.style.colorScheme = settings.appearance;
    root.dataset.wallTone = settings.appearance === 'dark' && settings.darkWallpaperTint ? 'dark' : wallpaperById(settings.wallpaper).tone;
    // v8 accessibility
    root.style.setProperty('--text-scale', String(settings.textScale || 1));
    root.style.fontSize = settings.textScale && settings.textScale !== 1 ? `${Math.round(16 * settings.textScale)}px` : '';
    root.dataset.bold = settings.boldText ? 'on' : 'off';
    root.dataset.contrast = settings.increaseContrast ? 'more' : 'normal';
    root.dataset.transparency = settings.reduceTransparency ? 'reduced' : 'full';
    root.dataset.accent = settings.accent;
    // v9
    root.dataset.dock = settings.dockPosition ?? 'bottom';
    root.dataset.dockHide = settings.dockAutohide ? 'on' : 'off';
    root.dataset.dockDots = settings.dockIndicators === false ? 'off' : 'on';
    root.dataset.iconStyle = settings.iconStyle ?? 'default';
    root.dataset.glass = settings.liquidGlass ?? 'clear';
    const fc = settings.folderColor && settings.folderColor !== 'auto' ? settings.folderColor : '';
    root.style.setProperty('--folder-tint', fc);
    if (fc) {
      root.style.setProperty('--folder-hi', `color-mix(in srgb, ${fc} 55%, white)`);
      root.style.setProperty('--folder-lo', fc);
      root.style.setProperty('--folder-tab', `color-mix(in srgb, ${fc} 85%, black)`);
    } else ['--folder-hi', '--folder-lo', '--folder-tab'].forEach((k) => root.style.removeProperty(k));
    root.dataset.folder = settings.folderColor && settings.folderColor !== 'auto' ? 'custom' : 'auto';
    // a portfolio window opened on another display (Displays → Extended Displays) uses its own scaling
    const onExtended = !!window.opener && window.name !== 'main';
    const uiScale = (onExtended ? settings.extScale : settings.displayScale) || 1;
    root.style.setProperty('--ui-scale', String(uiScale));
    root.dataset.scaled = uiScale !== 1 ? 'on' : 'off';
    root.dataset.refresh = settings.refreshRate ?? 'auto';
    root.dataset.mbHide = settings.menubarAutohide ?? 'never';
    root.dataset.mbBg = settings.menubarBg === false ? 'off' : 'on';
    root.dataset.lowpower = settings.lowPowerMode ?? 'never';
    root.lang = settings.language === 'si' ? 'si' : settings.language === 'ta' ? 'ta' : 'en';
  }, [settings]);

  // v8 — Auto appearance (device preference, or sunset → sunrise)
  useEffect(() => {
    const mode = settings.autoAppearance;
    if (!mode || mode === 'off') return;
    let mq: MediaQueryList | null = null;
    const want = (): 'light' | 'dark' => {
      if (mode === 'sunset') return isNight() ? 'dark' : 'light';
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    };
    const apply = () => {
      const a = want();
      if (a !== settingsRef.current.appearance) withTransition(() => setSettings((s) => ({ ...s, appearance: a })));
    };
    apply();
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
    } catch {
      /* ignore */
    }
    const t = window.setInterval(apply, 60000);
    return () => {
      window.clearInterval(t);
      mq?.removeEventListener('change', apply);
    };
  }, [settings.autoAppearance]);

  const motionReduced = osReduced || settings.reduceMotion;

  useEffect(() => {
    document.documentElement.dataset.motion = motionReduced ? 'reduced' : 'full';
  }, [motionReduced]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const update = useCallback((patch: Partial<Settings>) => {
    const cur = settingsRef.current;
    const apply = () => setSettings((s) => ({ ...s, ...patch }));
    if (patch.appearance && patch.appearance !== cur.appearance) {
      withTransition(apply);
      notify({ app: 'Appearance', icon: 'settings', title: patch.appearance === 'dark' ? 'Dark Mode Enabled' : 'Light Mode Enabled' });
    } else apply();
    if (patch.wallpaper && patch.wallpaper !== cur.wallpaper) {
      notify({ app: 'Wallpaper', icon: 'settings', title: 'Wallpaper Updated', body: wallpaperById(patch.wallpaper).name });
    }
  }, []);
  // A manual toggle (menu bar, Control Center) switches Auto appearance off.
  const toggleAppearance = useCallback(() => update({ appearance: settingsRef.current.appearance === 'dark' ? 'light' : 'dark', autoAppearance: 'off' }), [update]);

  const value = useMemo(
    () => ({ settings, update, toggleAppearance, motionReduced }),
    [settings, update, toggleAppearance, motionReduced],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

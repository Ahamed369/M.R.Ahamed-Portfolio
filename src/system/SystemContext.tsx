import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onNotify, type NotifyInput } from './notify';
import { readStore, writeStore } from './storage';
import { useSettings } from './SettingsContext';
import { playNotification } from './sounds';
import { showSystemNotification } from './webNotify';

/* ─────────────────────────────── Types ─────────────────────────────── */

export type Phase = 'boot' | 'ready' | 'shutdown' | 'off';
export type Overlay = 'none' | 'control' | 'notifications' | 'launchpad' | 'spotlight' | 'missioncontrol' | 'forcequit';
export type AirDrop = 'off' | 'contacts' | 'everyone';
/** Why the lock screen is showing. */
export type LockReason = 'lock' | 'sleep' | 'idle' | 'logout' | 'login';

/** Length of the shutdown / restart sequence (windows fade → black → emblem in/out). */
export const SHUTDOWN_MS = 2600;

export interface NotificationItem extends NotifyInput {
  id: number;
  time: number;
  /** false once the banner has been dismissed / shown */
  banner: boolean;
  /** v8 — read / unread state (Notification Center) */
  read: boolean;
}

export interface QuickLookImage {
  src: string;
  title: string;
  caption?: string;
}
export type QuickLookState =
  | { kind: 'images'; items: QuickLookImage[]; index: number; origin?: DOMRect | null }
  | { kind: 'info'; title: string; icon?: string; rows: [string, string][]; text?: string; origin?: DOMRect | null }
  | null;

export interface MenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  sep?: boolean;
  /** v9 — nested menu (e.g. Dock → Options ▸) */
  submenu?: MenuItem[];
  /** v9 — show a check mark */
  checked?: boolean;
}
export interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

interface Persisted {
  brightness: number;
  keyboardBrightness: number;
  focus: boolean;
  wifi: boolean;
  bluetooth: boolean;
  airdrop: AirDrop;
  /** Warm colour filter (Displays → Night Shift) */
  nightShift: boolean;
}

const KEY = 'mra-portfolio-system-v1';
const DEFAULTS: Persisted = { brightness: 1, keyboardBrightness: 0.6, focus: false, wifi: true, bluetooth: true, airdrop: 'contacts', nightShift: false };

interface SystemCtx extends Persisted {
  set: (patch: Partial<Persisted>) => void;
  phase: Phase;
  restart: () => void;
  shutdown: () => void;
  powerOn: () => void;
  finishBoot: () => void;
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  toggleOverlay: (o: Overlay) => void;
  notifications: NotificationItem[];
  toasts: NotificationItem[];
  dismissToast: (id: number) => void;
  clearNotifications: () => void;
  /** v8 */
  removeNotification: (id: number) => void;
  markRead: (id: number, read?: boolean) => void;
  markAllRead: () => void;
  unreadCount: number;
  quickLook: QuickLookState;
  setQuickLook: (q: QuickLookState) => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (m: ContextMenuState | null) => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  /** Lock screen is showing */
  locked: boolean;
  lockReason: LockReason;
  /** Display is asleep (black) — any input wakes it to the lock screen */
  asleep: boolean;
  lock: (reason?: LockReason) => void;
  unlock: () => void;
  sleep: () => void;
  wake: () => void;
  /** Shows the lock screen as "Logged out" (the caller closes the windows first). */
  logout: () => void;
}

const Ctx = createContext<SystemCtx | null>(null);

function firstPhase(): Phase {
  try {
    return window.sessionStorage.getItem('mra-booted') ? 'ready' : 'boot';
  } catch {
    return 'boot';
  }
}

export function SystemProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(() => readStore(KEY, DEFAULTS));
  const [phase, setPhase] = useState<Phase>(firstPhase);
  const [overlay, setOverlayState] = useState<Overlay>('none');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [quickLook, setQuickLook] = useState<QuickLookState>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason>('lock');
  const [asleep, setAsleep] = useState(false);
  const { settings, motionReduced } = useSettings();
  const soundRef = useRef(settings);
  soundRef.current = settings;
  const seq = useRef(1);
  const focusRef = useRef(p.focus);
  focusRef.current = p.focus;

  useEffect(() => writeStore(KEY, p), [p]);

  // Real display dimming: a CSS variable read by the brightness layer.
  useEffect(() => {
    document.documentElement.style.setProperty('--dim', String(Math.min(0.72, (1 - p.brightness) * 0.8)));
  }, [p.brightness]);

  useEffect(() => {
    document.documentElement.dataset.nightShift = p.nightShift ? 'on' : 'off';
  }, [p.nightShift]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Notification bus → history + banner (banners suppressed while Focus is on).
  // Banners time themselves out in <Toasts/> (hover pauses the timer).
  useEffect(
    () =>
      onNotify((n) => {
        const item: NotificationItem = { ...n, id: seq.current++, time: Date.now(), banner: !focusRef.current || !!n.critical, read: false };
        setNotifications((list) => [item, ...(n.key ? list.filter((x) => x.key !== n.key) : list)].slice(0, 60));
        const st = soundRef.current;
        if (item.banner && !n.silent && st.notificationSounds) playNotification(st.alertVolume);
        if (st.systemNotifications) showSystemNotification(n);
      }),
    [],
  );

  const set = useCallback((patch: Partial<Persisted>) => setP((s) => ({ ...s, ...patch })), []);
  const setOverlay = useCallback((o: Overlay) => setOverlayState(o), []);
  const toggleOverlay = useCallback((o: Overlay) => setOverlayState((cur) => (cur === o ? 'none' : o)), []);
  const dismissToast = useCallback((id: number) => setNotifications((l) => l.map((x) => (x.id === id ? { ...x, banner: false } : x))), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);
  const removeNotification = useCallback((id: number) => setNotifications((l) => l.filter((x) => x.id !== id)), []);
  const markRead = useCallback((id: number, read = true) => setNotifications((l) => l.map((x) => (x.id === id ? { ...x, read } : x))), []);
  const markAllRead = useCallback(() => setNotifications((l) => (l.some((x) => !x.read) ? l.map((x) => ({ ...x, read: true })) : l)), []);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const finishBoot = useCallback(() => {
    try {
      window.sessionStorage.setItem('mra-booted', '1');
    } catch {
      /* ignore */
    }
    // start-up → lock screen (swipe up / click / Enter) → desktop
    setLockReason('login');
    setLocked(true);
    setPhase('ready');
  }, []);
  // Shutdown / restart: windows fade, desktop goes black, the emblem fades
  // in and out (see Boot.tsx → ShutdownEmblem), then power-off or boot.
  const seqMs = motionReduced ? 700 : SHUTDOWN_MS;
  const restart = useCallback(() => {
    setOverlayState('none');
    setContextMenu(null);
    setLocked(false);
    setAsleep(false);
    setPhase('shutdown');
    window.setTimeout(() => setPhase('boot'), seqMs);
  }, [seqMs]);
  const shutdown = useCallback(() => {
    setOverlayState('none');
    setContextMenu(null);
    setLocked(false);
    setAsleep(false);
    setPhase('shutdown');
    window.setTimeout(() => setPhase('off'), seqMs);
  }, [seqMs]);

  /* ── Lock screen / sleep ── */
  const lock = useCallback((reason: LockReason = 'lock') => {
    setOverlayState('none');
    setContextMenu(null);
    setQuickLook(null);
    setLockReason(reason);
    setLocked(true);
  }, []);
  const unlock = useCallback(() => setLocked(false), []);
  const sleep = useCallback(() => {
    setOverlayState('none');
    setContextMenu(null);
    setAsleep(true);
  }, []);
  const wake = useCallback(() => {
    setAsleep(false);
    setLockReason((r) => (locked ? r : 'sleep'));
    setLocked(true);
  }, [locked]);
  const logout = useCallback(() => lock('logout'), [lock]);

  // window event 'mra-lock' (used by other components / the console)
  useEffect(() => {
    const on = () => lock('lock');
    window.addEventListener('mra-lock', on);
    return () => window.removeEventListener('mra-lock', on);
  }, [lock]);

  // Auto-lock after `settings.lockAfter` minutes without pointer / keyboard input
  const lockAfter = settings.lockAfter;
  const idleRef = useRef({ last: Date.now(), phase, locked, asleep });
  idleRef.current.phase = phase;
  idleRef.current.locked = locked;
  idleRef.current.asleep = asleep;
  useEffect(() => {
    if (!lockAfter || lockAfter <= 0) return;
    const ref = idleRef.current;
    ref.last = Date.now();
    const bump = () => {
      ref.last = Date.now();
    };
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = window.setInterval(() => {
      if (ref.phase !== 'ready' || ref.locked || ref.asleep) {
        ref.last = Date.now();
        return;
      }
      if (Date.now() - ref.last >= lockAfter * 60000) lock('idle');
    }, 5000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(t);
    };
  }, [lockAfter, lock]);
  const powerOn = useCallback(() => {
    setLocked(false);
    setAsleep(false);
    setPhase('boot');
  }, []);

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* not permitted in this context */
    }
  }, []);

  const toasts = useMemo(() => notifications.filter((n) => n.banner).slice(0, 3), [notifications]);

  const value = useMemo<SystemCtx>(
    () => ({
      ...p,
      set,
      phase,
      restart,
      shutdown,
      powerOn,
      finishBoot,
      overlay,
      setOverlay,
      toggleOverlay,
      notifications,
      toasts,
      dismissToast,
      clearNotifications,
      removeNotification,
      markRead,
      markAllRead,
      unreadCount,
      quickLook,
      setQuickLook,
      contextMenu,
      setContextMenu,
      fullscreen,
      toggleFullscreen,
      locked,
      lockReason,
      asleep,
      lock,
      unlock,
      sleep,
      wake,
      logout,
    }),
    [p, set, phase, restart, shutdown, powerOn, finishBoot, overlay, setOverlay, toggleOverlay, notifications, toasts, dismissToast, clearNotifications, removeNotification, markRead, markAllRead, unreadCount, quickLook, contextMenu, fullscreen, toggleFullscreen, locked, lockReason, asleep, lock, unlock, sleep, wake, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSystem(): SystemCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSystem must be used inside SystemProvider');
  return c;
}

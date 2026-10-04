import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent as RPointerEvent } from 'react';
import { useWM } from '../../system/WindowManager';
import { useSystem } from '../../system/SystemContext';
import { playTick } from '../../system/sounds';
import { useSettings } from '../../system/SettingsContext';
import { useMusic } from '../../system/MusicContext';
import { APPS } from '../../system/apps';
import { APP_COMPONENTS } from '../appRegistry';
import { ChromeProvider } from '../Window';
import { AppBoundary } from '../AppBoundary';
import { deviceWall } from '../../system/wallpaperCycle';
import { LimitGate } from '../LimitGate';
import { Wallpaper } from '../Wallpaper';
import { Toasts } from '../NotificationCenter';
import { QuickLook } from '../QuickLook';
import { ContextMenu } from '../ContextMenu';
import { ShareSheet } from '../ShareSheet';
import { SignInSheet } from '../SignInSheet';
import { SystemV9 } from '../SystemV9';
import { BootScreen, PowerOff } from '../Boot';
import { DynamicIsland } from '../DynamicIsland';
import { useToneSync, usePerf } from '../SystemV10';
import { wallpaperById } from '../../data/media';
import { framedSize, type DeviceMode } from '../../system/ios';
import { useLaunch } from '../../system/useLaunch';
import { useRestoreEpoch, doUndo } from '../../system/history';
import { useScheduledNotifications } from '../../system/useScheduled';
import { recordOpen, tickScreenTime } from '../../system/screenTime';
import { parseDeepLink } from '../../system/share';
import { CLEAR_ON_OPEN, clearBadge } from '../../system/badges';
import { snapshot } from '../../system/snapshot';
import { getBatteryManager } from '../../system/batteryLog';
import { IOS, launchIcon, launchRects, useIOS, type IOSCtx, type Panel } from './ctx';
import { IOSHome } from './IOSHome';
import { IOSPanels } from './IOSPanels';
import { IOSLock } from './IOSLock';
import IOSSettings from './IOSSettings';
import type { AppId, WindowState } from '../../system/types';
import type { AppProps } from '../Desktop';
import type { LaunchItem } from '../../system/launch';
import { SysIcon } from '../SysIcons';

const EASE = 'cubic-bezier(.2,.9,.22,1)';
const EASE_IN = 'cubic-bezier(.4,0,.2,1)';
/** one-shot hint for the next open animation: slide in from a side (app switching) */
let slideNext: { id: AppId; dir: 1 | -1 } | null = null;

/* ───────────────────────────── status bar ───────────────────────────── */

function useBattery() {
  const [b, setB] = useState<{ level: number; charging: boolean } | null>(null);
  useEffect(() => {
    let m: Awaited<ReturnType<typeof getBatteryManager>> = null;
    const up = () => m && setB({ level: m.level, charging: m.charging });
    void getBatteryManager().then((x) => {
      m = x;
      up();
      x?.addEventListener('levelchange', up);
      x?.addEventListener('chargingchange', up);
    });
    return () => {
      m?.removeEventListener('levelchange', up);
      m?.removeEventListener('chargingchange', up);
    };
  }, []);
  return b;
}

export function StatusIcons({ wifi = true }: { wifi?: boolean }) {
  const bat = useBattery();
  const { settings } = useSettings();
  const low = settings.lowPowerMode === 'always';
  const lvl = bat ? bat.level : 1;
  return (
    <span className="sb-icons">
      <svg className="sb-signal" viewBox="0 0 18 12" aria-label="Signal: full">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="1" />
        ))}
      </svg>
      {wifi && (
        <svg className="sb-wifi" viewBox="0 0 16 12" aria-label="Wi-Fi">
          <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.5 6.9a6.4 6.4 0 0 1 9 0l-1.5 1.5a4.3 4.3 0 0 0-6 0zM1.2 4.6a9.6 9.6 0 0 1 13.6 0l-1.5 1.5a7.5 7.5 0 0 0-10.6 0z" />
        </svg>
      )}
      <span className={`sb-bat ${bat?.charging ? 'chg' : ''} ${low ? 'low' : ''} ${lvl <= 0.2 ? 'red' : ''}`} aria-label={bat ? `Battery ${Math.round(lvl * 100)}%` : 'Battery'}>
        <i style={{ width: `${Math.max(6, lvl * 100)}%` }} />
        {settings.showBatteryPct && bat && <b>{Math.round(lvl * 100)}</b>}
      </span>
    </span>
  );
}

function StatusBar({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  const sys = useSystem();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 10000);
    return () => window.clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: settings.clock24 === undefined ? undefined : !settings.clock24 }).replace(/\s?[AP]M$/i, '');
  return (
    <div className="ios-sb">
      <button type="button" className="sb-left" onClick={onLeft} aria-label="Notification Centre">
        <b>{time}</b>
        {sys.focus && (
            <span className="sb-focus">
              <SysIcon n="moon" size={13} />
            </span>
          )}
      </button>
      <span className="sb-mid" />
      <button type="button" className="sb-right" onClick={onRight} aria-label="Control Centre">
        <StatusIcons wifi={sys.wifi} />
      </button>
    </div>
  );
}

/* ───────────────────────────── app window ───────────────────────────── */

const noop = () => undefined;

function IOSAppWin({ win, top, pane, stage }: { win: WindowState; top: boolean; pane: 'full' | 'a' | 'b' | 'slide'; stage: boolean }) {
  const wm = useWM();
  const { motionReduced } = useSettings();
  const epoch = useRestoreEpoch();
  const el = useRef<HTMLDivElement>(null);
  const meta = APPS[win.id];
  const App = (win.id === 'settings' ? IOSSettings : APP_COMPONENTS[win.id]) as ComponentType<AppProps>;
  const chrome = useMemo(() => ({ onDragStart: noop, onToggleMax: noop, onContextMenu: undefined, lights: null, active: top }), [top]);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const host = node.parentElement?.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    const fromRect = () => {
      const lr = launchRects.get(win.id);
      const lid = launchIcon.get(win.id);
      const sh = node.closest('.ios-shell')?.getBoundingClientRect();
      const pick = (sel: string) => {
        const rr = document.querySelector<HTMLElement>(sel)?.getBoundingClientRect();
        return rr && rr.width && sh && rr.left >= sh.left - 2 && rr.right <= sh.right + 2 ? rr : null;
      };
      const t = (lid && pick(`.ios-home [data-ios-app="${lid}"] .ios-icon-img`)) || pick(`.ios-home [data-ios-app-for="${win.id}"] .ios-icon-img`) || lr;
      if (!t || !host) return null;
      return t;
    };
    const geo = (t: DOMRect) => {
      const s = t.width / r.width;
      const dx = t.left + t.width / 2 - (r.left + r.width / 2);
      const dy = t.top + t.height / 2 - (r.top + r.height / 2);
      // a square window that becomes the icon
      const inset = Math.max(0, (r.height - r.width) / 2);
      return { tr: `translate(${dx}px, ${dy}px) scale(${s})`, clip: `inset(${inset}px 0 ${inset}px 0 round ${r.width * 0.225}px)` };
    };
    const D = (ms: number) => (motionReduced ? 1 : ms);
    let anim: Animation | null = null;
    switch (win.phase) {
      case 'opening':
      case 'restoring': {
        node.getAnimations().forEach((a) => a.cancel());
        if (slideNext && slideNext.id === win.id) {
          const dir = slideNext.dir;
          slideNext = null;
          anim = node.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'none' }], { duration: D(380), easing: EASE });
        } else {
          const t = fromRect();
          if (t && pane === 'full' && !stage) {
            const g = geo(t);
            anim = node.animate(
              [
                { transform: g.tr, clipPath: g.clip, opacity: 0.4, offset: 0 },
                { opacity: 1, offset: 0.25 },
                { transform: 'none', clipPath: `inset(0 0 0 0 round ${r.width * 0.12}px)`, opacity: 1, offset: 1 },
              ],
              { duration: D(470), easing: EASE },
            );
          } else anim = node.animate([{ transform: 'scale(.88)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: D(340), easing: EASE });
        }
        anim.onfinish = () => wm.setPhase(win.id, 'open');
        break;
      }
      case 'minimizing': {
        const t = fromRect();
        const cur = getComputedStyle(node).transform;
        if (t && pane === 'full' && !stage) {
          const g = geo(t);
          anim = node.animate(
            [
              { transform: cur === 'none' ? 'none' : cur, clipPath: `inset(0 0 0 0 round ${r.width * 0.12}px)`, opacity: 1, offset: 0 },
              { opacity: 1, offset: 0.75 },
              { transform: g.tr, clipPath: g.clip, opacity: 0, offset: 1 },
            ],
            { duration: D(420), easing: EASE_IN, fill: 'forwards' },
          );
        } else anim = node.animate([{ transform: cur === 'none' ? 'none' : cur, opacity: 1 }, { transform: 'scale(.7) translateY(20%)', opacity: 0 }], { duration: D(320), easing: EASE_IN, fill: 'forwards' });
        anim.onfinish = () => {
          wm.setPhase(win.id, 'minimized');
          node.style.transform = '';
        };
        break;
      }
      case 'closing':
        anim = node.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.94)' }], { duration: D(160), fill: 'forwards' });
        anim.onfinish = () => wm.remove(win.id);
        break;
      case 'minimized':
        node.getAnimations().forEach((a) => a.cancel());
        node.style.transform = '';
        break;
      default:
        break;
    }
    return () => {
      if (anim) anim.onfinish = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.phase]);

  const hidden = win.phase === 'minimized';
  return (
    <div
      ref={el}
      data-win-id={win.id}
      className={`win-pos is-compact ios-win pane-${pane} ${top ? 'is-top' : ''} ${stage ? 'stage' : ''}`}
      style={{ zIndex: win.z, visibility: hidden ? 'hidden' : undefined, pointerEvents: hidden || win.phase === 'closing' || win.phase === 'minimizing' ? 'none' : undefined }}
      aria-hidden={hidden || undefined}
      onPointerDownCapture={() => !top && wm.focus(win.id)}
    >
      <section className={`window is-active ios-window app-${win.id} ${meta.darkChrome ? 'dark-chrome' : ''} ${meta.seamless ? 'seamless' : ''}`} role="dialog" aria-label={meta.title}>
        <ChromeProvider value={chrome}>
          {!meta.seamless && win.id !== 'settings' && (
            <header className="ios-navbar">
              <b>{win.args?.title ?? meta.title}</b>
            </header>
          )}
          <div className="window-body">
            <Suspense
              fallback={
                <div className="app-loading">
                  <span className="spinner" />
                </div>
              }
            >
              <AppBoundary name={meta.title} onClose={() => wm.close(win.id)}>
                <App key={epoch} win={win} />
                <LimitGate id={win.id} />
              </AppBoundary>
            </Suspense>
          </div>
        </ChromeProvider>
      </section>
    </div>
  );
}

/* ───────────────────────────── shell ───────────────────────────── */

export function IOSShell({ mode }: { mode: Exclude<DeviceMode, 'mac'> }) {
  const wm = useWM();
  const sys = useSystem();
  const { settings } = useSettings();
  const music = useMusic();
  const launchAction = useLaunch();
  useToneSync();
  usePerf();
  useScheduledNotifications();

  const [panel, setPanelState] = useState<Panel>('none');
  const [edit, setEdit] = useState(false);
  const [recents, setRecents] = useState<AppId[]>([]);
  const [snapshots, setSnaps] = useState<Record<string, HTMLCanvasElement>>({});
  const [split, setSplit] = useState<IOSCtx['split']>(null);
  const [slide, setSlide] = useState<AppId | null>(null);
  const [pendingSplit, setPendingSplit] = useState<AppId | null>(null);
  const [vp, setVp] = useState(() => framedSize(mode));
  const shellRef = useRef<HTMLDivElement>(null);
  const wmRef = useRef(wm);
  wmRef.current = wm;
  const stage = mode === 'ipad' && !!settings.ipadStage;
  // installed on a real iPhone / iPad (Add to Home Screen): the device's own status bar and Dynamic Island are visible,
  // so the portfolio hides its copies and keeps clear of the notch and the home indicator
  const realChrome = useMemo(() => {
    try {
      const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      return standalone && window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const on = () => setVp(framedSize(mode));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [mode]);

  const visible = wm.windows.filter((w) => w.phase !== 'minimized' && w.phase !== 'minimizing' && w.phase !== 'closing');
  const top = visible.length ? visible.reduce((a, b) => (b.z > a.z ? b : a)) : null;
  const current = top?.id ?? null;

  const setPanel = useCallback((p: Panel) => setPanelState(p), []);
  // the App Switcher shows a fresh picture of the app you just left
  const capRef = useRef<(id: AppId | null) => void>(() => undefined);
  useEffect(() => {
    if (panel === 'switcher') capRef.current(curRef.current);
  }, [panel]);

  /* only the front app is on screen (plus Split View / Slide Over on iPad) */
  useEffect(() => {
    if (!top) return;
    const keep = new Set<AppId>([top.id]);
    if (split) {
      keep.add(split.a);
      keep.add(split.b);
    }
    if (slide) keep.add(slide);
    if (stage) return;
    wm.windows.forEach((w) => {
      if (!keep.has(w.id) && (w.phase === 'open' || w.phase === 'opening' || w.phase === 'restoring')) wm.setPhase(w.id, 'minimized');
    });
    // iOS frees memory: keep at most 8 apps alive
    const alive = [...wm.windows].filter((w) => w.phase !== 'closing').sort((a, b) => b.z - a.z);
    alive.slice(8).forEach((w) => w.phase === 'minimized' && wm.remove(w.id));
  }, [top?.id, top?.z, split, slide, stage, wm]);

  // a split pair breaks up when one side closes
  useEffect(() => {
    if (split && (!wm.windows.some((w) => w.id === split.a) || !wm.windows.some((w) => w.id === split.b))) setSplit(null);
    if (slide && !wm.windows.some((w) => w.id === slide)) setSlide(null);
  }, [wm.windows, split, slide]);

  /* recents + Screen Time + badges */
  useEffect(() => {
    if (!current) return;
    setRecents((r) => [current, ...r.filter((x) => x !== current)].slice(0, 30));
    recordOpen(current);
    if (CLEAR_ON_OPEN.has(current)) window.setTimeout(() => clearBadge(current), 900);
  }, [current]);
  useEffect(() => {
    setRecents((r) => r.filter((id) => wm.windows.some((w) => w.id === id)));
  }, [wm.windows]);
  const curRef = useRef(current);
  curRef.current = current;
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible' && sys.phase === 'ready') tickScreenTime(curRef.current, 1000);
    }, 1000);
    return () => window.clearInterval(t);
  }, [sys.phase]);

  /* snapshots for the App Switcher */
  const capture = useCallback((id: AppId | null) => {
    if (!id) return;
    const node = document.querySelector<HTMLElement>(`.ios-win[data-win-id="${id}"] .ios-window`);
    if (!node) return;
    const r = node.getBoundingClientRect();
    void snapshot(node, Math.round(r.width), Math.round(r.height)).then((s) => {
      if (!s) return;
      // (an SVG-rendered canvas can't be read back as an image URL, but it can be drawn — keep the canvas)
      setSnaps((m) => ({ ...m, [id]: s.canvas }));
    });
  }, []);

  capRef.current = capture;
  const goHome = useCallback(() => {
    setPanelState('none');
    setEdit(false);
    const w = wmRef.current;
    const vis = w.windows.filter((x) => x.phase !== 'minimized' && x.phase !== 'minimizing' && x.phase !== 'closing');
    vis.forEach((x) => {
      capture(x.id);
      w.minimize(x.id);
    });
    setSplit(null);
  }, [capture]);

  const openApp = useCallback(
    (id: AppId, args?: Record<string, string>, from?: DOMRect | null) => {
      if (from) launchRects.set(id, from);
      setPanelState('none');
      if (pendingSplit && mode === 'ipad' && id !== pendingSplit) {
        setSplit({ a: pendingSplit, b: id, ratio: 0.5 });
        setPendingSplit(null);
        wmRef.current.open(pendingSplit);
      }
      wmRef.current.open(id, args);
    },
    [pendingSplit, mode],
  );

  const launch = useCallback(
    (item: LaunchItem, from?: DOMRect | null) => {
      const a = item.action;
      if ('app' in a) return openApp(a.app, a.args, from);
      if ('overlay' in a) return setPanelState('switcher');
      launchAction(a, item.label);
    },
    [openApp, launchAction],
  );

  const switchTo = useCallback(
    (id: AppId) => {
      const cur = curRef.current;
      if (cur && cur !== id) {
        capture(cur);
        const order = recents;
        const dir = order.indexOf(id) > order.indexOf(cur) ? -1 : 1;
        slideNext = { id, dir: dir as 1 | -1 };
      }
      setPanelState('none');
      wmRef.current.open(id);
    },
    [capture, recents],
  );

  const closeApp = useCallback((id: AppId) => {
    wmRef.current.close(id);
    setSnaps((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
  }, []);

  /* Mac overlays requested by apps → their iOS equivalents */
  useEffect(() => {
    const o = sys.overlay;
    if (o === 'none') return;
    const map: Partial<Record<typeof o, Panel>> = { spotlight: 'search', control: 'cc', notifications: 'nc', missioncontrol: 'switcher' };
    if (o === 'launchpad') goHome();
    else if (map[o]) setPanelState(map[o]!);
    sys.setOverlay('none');
  }, [sys.overlay, sys, goHome]);

  /* events from AssistiveTouch, Shortcuts, Siri… */
  useEffect(() => {
    const sw = () => setPanelState('switcher');
    const home = () => goHome();
    const panel = (e: Event) => setPanelState((e as CustomEvent<Panel>).detail);
    window.addEventListener('mra-app-switcher', sw);
    window.addEventListener('mra-ios-home', home);
    window.addEventListener('mra-ios-panel', panel);
    return () => {
      window.removeEventListener('mra-ios-panel', panel);
      window.removeEventListener('mra-app-switcher', sw);
      window.removeEventListener('mra-ios-home', home);
    };
  }, [goHome]);

  /* share links: #/app/<id>?… */
  const handled = useRef(false);
  useEffect(() => {
    if (sys.phase !== 'ready' || sys.locked) return;
    const go = () => {
      const d = parseDeepLink(window.location.hash);
      if (!d || !(d.app in APPS)) return;
      openApp(d.app as AppId, Object.keys(d.args).length ? d.args : undefined);
    };
    if (!handled.current) {
      handled.current = true;
      window.setTimeout(go, 600);
    }
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, [sys.phase, sys.locked, openApp]);

  /* v10 — keyboard clicks (Settings → Sounds & Haptics) */
  const clicksOn = settings.keyClicks !== false;
  useEffect(() => {
    if (!clicksOn) return;
    const on = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('.ios-shell') && t.matches('input:not([type=range]):not([type=checkbox]), textarea, [contenteditable="true"]')) playTick(0.12);
    };
    document.addEventListener('beforeinput', on, true);
    return () => document.removeEventListener('beforeinput', on, true);
  }, [clicksOn]);

  /* keyboard (iPad with a keyboard, or a computer showing the iPhone) */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (sys.locked || sys.phase !== 'ready') return;
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable="true"]');
      if ((e.metaKey || e.ctrlKey) && (e.code === 'Space' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setPanelState((p) => (p === 'search' ? 'none' : 'search'));
      } else if (e.key === 'Home' && !typing) {
        e.preventDefault();
        goHome();
      } else if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setPanelState('switcher');
      } else if (e.key === 'Escape') {
        if (edit) setEdit(false);
        else setPanelState((p) => (p !== 'none' ? 'none' : p));
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [sys.locked, sys.phase, goHome, edit]);

  /* ───── three-finger gestures (touch) ───── */
  const threeFinger = settings.threeFinger !== false;
  useEffect(() => {
    const node = shellRef.current;
    if (!node || !threeFinger) return;
    let start: { x: number; y: number; d: number; t: number } | null = null;
    let lastTap = 0;
    const centroid = (ts: TouchList) => {
      let x = 0;
      let y = 0;
      for (let i = 0; i < 3; i++) {
        x += ts[i].clientX;
        y += ts[i].clientY;
      }
      x /= 3;
      y /= 3;
      let d = 0;
      for (let i = 0; i < 3; i++) d += Math.hypot(ts[i].clientX - x, ts[i].clientY - y);
      return { x, y, d: d / 3 };
    };
    const ts0 = (e: TouchEvent) => {
      if (e.touches.length === 3) {
        start = { ...centroid(e.touches), t: Date.now() };
        e.preventDefault();
      }
    };
    const end = (e: TouchEvent) => {
      if (!start) return;
      const c = e.changedTouches;
      const all = [...Array.from(e.touches), ...Array.from(c)].slice(0, 3);
      if (all.length < 3) {
        start = null;
        return;
      }
      const x = all.reduce((a, t) => a + t.clientX, 0) / 3;
      const y = all.reduce((a, t) => a + t.clientY, 0) / 3;
      const d = all.reduce((a, t) => a + Math.hypot(t.clientX - x, t.clientY - y), 0) / 3;
      const dx = x - start.x;
      const dy = y - start.y;
      const dt = Date.now() - start.t;
      const s = start;
      start = null;
      if (d < s.d * 0.65) return goHome();
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && dt < 260) {
        if (Date.now() - lastTap < 400) {
          doUndo();
          lastTap = 0;
        } else lastTap = Date.now();
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy < -60) setPanelState('switcher');
        else if (dy > 60) setPanelState('nc');
      } else if (Math.abs(dx) > 60) {
        const list = recentsRef.current;
        const cur = curRef.current;
        const i = cur ? list.indexOf(cur) : -1;
        const next = list[i + (dx < 0 ? 1 : -1)];
        if (next) switchTo(next);
      }
    };
    node.addEventListener('touchstart', ts0, { passive: false });
    node.addEventListener('touchend', end);
    return () => {
      node.removeEventListener('touchstart', ts0);
      node.removeEventListener('touchend', end);
    };
  }, [threeFinger, goHome, switchTo]);
  const recentsRef = useRef(recents);
  recentsRef.current = recents;

  /* touch and hold inside apps → the same menu a right-click opens; swipe in from the left edge → Back */
  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;
    let t: { x: number; y: number; timer: number; target: HTMLElement; edge: boolean; native: boolean } | null = null;
    let swallow = 0;
    const inApp = (el: HTMLElement) => !!el.closest('.ios-apps');
    const editable = (el: HTMLElement) => !!el.closest('input, textarea, select, [contenteditable="true"]');
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return (t = null), undefined;
      const el = e.target as HTMLElement;
      if (!inApp(el)) return;
      const tc = e.touches[0];
      const left = node.getBoundingClientRect().left;
      const cur = { x: tc.clientX, y: tc.clientY, timer: 0, target: el, edge: tc.clientX - left < 20, native: false };
      t = cur;
      if (!editable(el))
        cur.timer = window.setTimeout(() => {
          if (t !== cur || cur.native) return;
          swallow = Date.now();
          if (navigator.vibrate) navigator.vibrate(8);
          cur.target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: cur.x, clientY: cur.y, button: 2 }));
        }, 520);
    };
    const move = (e: TouchEvent) => {
      if (!t) return;
      const tc = e.touches[0];
      if (Math.hypot(tc.clientX - t.x, tc.clientY - t.y) > 10) window.clearTimeout(t.timer);
    };
    const end = (e: TouchEvent) => {
      const cur = t;
      t = null;
      if (!cur) return;
      window.clearTimeout(cur.timer);
      const tc = e.changedTouches[0];
      const dx = tc.clientX - cur.x;
      const dy = Math.abs(tc.clientY - cur.y);
      if (cur.edge && dx > 80 && dy < 70) {
        const win = cur.target.closest('.ios-win');
        const sel = ['.is-back', '.ios-back', '.ms7-back', '.chat-back', '.mc-back', '.pc-back', '[aria-label="Back"]', 'button[aria-label^="Back"]', '.ph-v-bar .ph-btn'];
        const btn = win && (sel.map((q) => [...win.querySelectorAll<HTMLElement>(q)].find((b) => b.offsetParent !== null)).find(Boolean) as HTMLElement | undefined);
        btn?.click();
      }
    };
    const onNativeMenu = () => {
      if (t) {
        t.native = true;
        window.clearTimeout(t.timer);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (Date.now() - swallow < 700) {
        e.preventDefault();
        e.stopPropagation();
        swallow = 0;
      }
    };
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchmove', move, { passive: true });
    node.addEventListener('touchend', end, { passive: true });
    node.addEventListener('touchcancel', () => (t = null), { passive: true });
    node.addEventListener('contextmenu', onNativeMenu, true);
    node.addEventListener('click', onClick, true);
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchend', end);
      node.removeEventListener('contextmenu', onNativeMenu, true);
      node.removeEventListener('click', onClick, true);
    };
  }, []);

  /* shake to undo (Android browsers; iOS needs a permission the page can't ask for silently) */
  useEffect(() => {
    let last = 0;
    const on = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const m = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (m > 28 && Date.now() - last > 1500) {
        last = Date.now();
        window.dispatchEvent(new Event('mra-shake'));
      }
    };
    window.addEventListener('devicemotion', on);
    return () => window.removeEventListener('devicemotion', on);
  }, []);

  /* ───── Home indicator: swipe up = Home, up & hold = App Switcher, sideways = switch apps ───── */
  const bar = useRef<{ x: number; y: number; t: number; id: number; moved: boolean; held: number; mouse: boolean } | null>(null);
  const onBarDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (sys.locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    bar.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, moved: false, held: 0, mouse: e.pointerType === 'mouse' };
  };
  const curEl = () => (current ? document.querySelector<HTMLElement>(`.ios-win[data-win-id="${current}"]`) : null);
  const onBarMove = (e: RPointerEvent<HTMLDivElement>) => {
    const b = bar.current;
    if (!b) return;
    const dy = Math.max(0, b.y - e.clientY);
    const dx = e.clientX - b.x;
    if (Math.abs(dx) > 6 || dy > 6) b.moved = true;
    const node = curEl();
    if (node && !split && !stage) {
      const H = node.getBoundingClientRect().height || 800;
      if (Math.abs(dx) > dy && dy < 40) node.style.transform = `translateX(${dx * 0.9}px)`;
      else {
        const s = Math.max(0.42, 1 - (dy / H) * 0.9);
        node.style.transform = `translate(${dx * 0.4}px, ${-dy * 0.32}px) scale(${s})`;
        node.style.borderRadius = '38px';
        node.style.overflow = 'hidden';
      }
    }
    // hold → App Switcher
    window.clearTimeout(b.held);
    if (dy > 60) b.held = window.setTimeout(() => bar.current && (bar.current.held = -1), 260);
  };
  const onBarUp = (e: RPointerEvent<HTMLDivElement>) => {
    const b = bar.current;
    bar.current = null;
    if (!b) return;
    window.clearTimeout(b.held);
    const dy = b.y - e.clientY;
    const dx = e.clientX - b.x;
    const dt = Math.max(1, Date.now() - b.t);
    const node = curEl();
    const reset = () => {
      if (!node) return;
      node.animate([{ transform: node.style.transform || 'none' }, { transform: 'none' }], { duration: 260, easing: EASE });
      node.style.transform = '';
      node.style.borderRadius = '';
      node.style.overflow = '';
    };
    if (!b.moved) {
      reset();
      if (b.mouse) (current ? goHome() : undefined);
      return;
    }
    if (b.held === -1 && dy > 40) {
      reset();
      capture(current);
      setPanelState('switcher');
      return;
    }
    if (Math.abs(dx) > 70 && Math.abs(dx) > dy) {
      const i = current ? recents.indexOf(current) : -1;
      const next = recents[i + (dx < 0 ? 1 : -1)] ?? (dx < 0 ? recents[1] : undefined);
      if (node) {
        node.style.transform = '';
      }
      if (next && next !== current) switchTo(next);
      else reset();
      return;
    }
    if (dy > 90 || dy / dt > 0.6) {
      if (node) {
        node.style.borderRadius = '';
        node.style.overflow = '';
      }
      if (current) goHome();
      else setPanelState('switcher');
      return;
    }
    reset();
  };

  /* ───── top edge: pull down = Notification Centre (left) / Control Centre (right) ───── */
  const topDrag = useRef<{ x: number; y: number; right: boolean } | null>(null);
  const onTopDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (sys.locked) return;
    const r = e.currentTarget.getBoundingClientRect();
    topDrag.current = { x: e.clientX, y: e.clientY, right: e.clientX - r.left > r.width * 0.6 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTopUp = (e: RPointerEvent<HTMLDivElement>) => {
    const t = topDrag.current;
    topDrag.current = null;
    if (!t) return;
    const dy = e.clientY - t.y;
    if (dy > 28 || (Math.abs(dy) < 6 && Math.abs(e.clientX - t.x) < 6)) setPanelState(t.right ? 'cc' : 'nc');
  };

  const wallId = deviceWall(settings, mode === 'ipad' ? 'ipad' : 'iphone');
  const wp = wallpaperById(wallId);
  const onHomeLight = !current && wp.tone === 'light';
  const appDark = current ? APPS[current].darkChrome || settings.appearance === 'dark' : false;
  const sbDark = current ? !appDark : onHomeLight;

  const ctx: IOSCtx = {
    mode,
    current,
    recents,
    panel,
    setPanel,
    edit,
    setEdit,
    launch,
    openApp,
    goHome,
    switchTo,
    closeApp,
    snapshots,
    split,
    setSplit,
    slide,
    setSlide,
    pendingSplit,
    setPendingSplit,
  };

  const paneOf = (id: AppId): 'full' | 'a' | 'b' | 'slide' => (slide === id ? 'slide' : split?.a === id ? 'a' : split?.b === id ? 'b' : 'full');

  return (
    <IOS.Provider value={ctx}>
      <div className={`ios-stage ${vp ? 'has-frame' : ''}`}>
        <div
          ref={shellRef}
          className={`ios-shell ios-${mode} ${vp ? 'framed' : ''} ${current ? 'app-open' : 'at-home'} ${sbDark ? 'sb-dark' : 'sb-light'} ${edit ? 'editing' : ''} ${panel !== 'none' ? `panel-${panel}` : ''} ${stage ? 'stage-on' : ''} ${music.playing ? 'playing' : ''} ${realChrome ? 'real-chrome' : ''} ${sys.locked ? 'is-locked' : ''}`}
          style={{ ...(vp ? { width: vp.w, height: vp.h } : {}), ['--tint' as string]: settings.iosTintAuto ? (wp.palette?.[0] ?? settings.iosTint ?? '#5b8cff') : (settings.iosTint ?? '#5b8cff') }}
          data-icons={settings.iosIconLook ?? 'default'}
          data-icon-mode={settings.iosIconMode ?? 'auto'}
          data-labels={settings.iosLabels === false ? 'off' : 'on'}
          data-large={settings.iosLargeIcons ? 'on' : 'off'}
          data-zoom={settings.displayZoom === 'larger' ? 'larger' : 'standard'}
          data-split={split ? 'on' : 'off'}
        >
          <div className={`ios-wall ${current && !stage ? 'dim' : ''}`}>
            <div className="ios-wall-in" style={settings.wallBlur ? { filter: `blur(${settings.wallBlur}px)`, transform: 'scale(1.06)' } : undefined}>
              <Wallpaper id={wallId} tint={settings.appearance === 'dark' && settings.darkWallpaperTint} custom={settings.customWallpaper} />
            </div>
          </div>
          <IOSHome />
          <div className="ios-apps" style={split ? { ['--split' as string]: String(split.ratio) } : undefined}>
            {wm.windows.map((w) => (
              <IOSAppWin key={w.id} win={w} top={w.id === current} pane={paneOf(w.id)} stage={stage} />
            ))}
            {split && (
              <div
                className="ios-split-div"
                role="separator"
                aria-label="Resize Split View"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const host = e.currentTarget.parentElement!.getBoundingClientRect();
                  const mv = (ev: PointerEvent) => setSplit((s) => (s ? { ...s, ratio: Math.min(0.75, Math.max(0.25, (ev.clientX - host.left) / host.width)) } : s));
                  const up = () => {
                    window.removeEventListener('pointermove', mv);
                    window.removeEventListener('pointerup', up);
                    setSplit((s) => (s ? { ...s, ratio: s.ratio < 0.4 ? 1 / 3 : s.ratio > 0.6 ? 2 / 3 : 0.5 } : s));
                  };
                  window.addEventListener('pointermove', mv);
                  window.addEventListener('pointerup', up);
                }}
              >
                <i />
              </div>
            )}
          </div>

          <StatusBar onLeft={() => setPanelState('nc')} onRight={() => setPanelState('cc')} />
          <div className="ios-top-pull" onPointerDown={onTopDown} onPointerUp={onTopUp} aria-hidden="true" />
          {mode === 'iphone' && (
            <div className="ios-di-wrap">
              <DynamicIsland variant="iphone" />
            </div>
          )}
          {mode === 'ipad' && current && <IPadMulti />}
          {pendingSplit && <div className="ios-split-hint">Choose an app to open next to {APPS[pendingSplit].title}</div>}

          <div className="ios-homebar" onPointerDown={onBarDown} onPointerMove={onBarMove} onPointerUp={onBarUp} onPointerCancel={onBarUp} role="button" aria-label="Home — swipe up, or click to go Home" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && goHome()}>
            <i />
          </div>

          <div className="ios-sys">
            <Toasts />
            <QuickLook />
            <ContextMenu />
            <ShareSheet />
            <SignInSheet />
            <SystemV9 />
          </div>
          <IOSPanels />
          <IOSLock />
          <div className="nightshift-layer" aria-hidden="true" />
          <div className="brightness-layer" aria-hidden="true" />
          <BootScreen />
          <PowerOff />
        </div>
      </div>
    </IOS.Provider>
  );
}

/** iPad multitasking menu (the ••• at the top of an app): Full Screen · Split View · Slide Over */
function IPadMulti() {
  const ios = useIOS();
  const [open, setOpen] = useState(false);
  if (!ios.current) return null;
  const cur = ios.current;
  return (
    <div className="ipad-multi">
      <button type="button" className="ipad-dots" aria-label="Multitasking" onClick={() => setOpen((o) => !o)}>
        <i />
        <i />
        <i />
      </button>
      {open && (
        <div className="ipad-multi-menu" role="menu">
          <button
            type="button"
            className={!ios.split && ios.slide !== cur ? 'on' : ''}
            onClick={() => {
              ios.setSplit(null);
              if (ios.slide === cur) ios.setSlide(null);
              setOpen(false);
            }}
          >
            ▢ Full Screen
          </button>
          <button
            type="button"
            className={ios.split ? 'on' : ''}
            onClick={() => {
              setOpen(false);
              ios.setPendingSplit(cur);
              ios.goHome();
            }}
          >
            ◫ Split View
          </button>
          <button
            type="button"
            className={ios.slide === cur ? 'on' : ''}
            onClick={() => {
              setOpen(false);
              ios.setSlide(cur);
            }}
          >
            ▯ Slide Over
          </button>
        </div>
      )}
    </div>
  );
}

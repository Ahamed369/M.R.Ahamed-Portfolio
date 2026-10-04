import { useEffect, useRef, useState } from 'react';
import { ModeBar } from './ModeBar';
import { Onboarding } from './Onboarding';
import { setAchievementsEnabled, startAchievementKeys, unlock } from '../system/achievements';
import { startAutoBackup } from '../system/timeMachine';
import { MusicPiP } from './MusicPiP';
import { Dictation } from './Dictation';
import { useSettings } from '../system/SettingsContext';
import { useSystem } from '../system/SystemContext';
import { useWM } from '../system/WindowManager';
import { getSpaces, switchSpace, useSpaces } from '../system/spaces';
import { setCustomSound, setSoundMuted, setToneChoice } from '../system/sounds';
import { useMusic } from '../system/MusicContext';
import { idbGet } from '../system/idb';
import { DynamicIsland } from './DynamicIsland';
import { EmojiPicker } from './EmojiPicker';
import { VolumeHUD } from './VolumeHUD';
import { installUndoKeys, purgeDeleted, setUndoLimit } from '../system/history';
import type { AppId } from '../system/types';

const editable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** v10 — sound choices shared by Mac and iPhone (the uploaded sound lives only in this browser). */
export function useToneSync() {
  const { settings } = useSettings();
  const music = useMusic();
  useEffect(() => setSoundMuted(music.muted), [music.muted]);
  useEffect(() => (startAutoBackup(), startAchievementKeys()), []);
  useEffect(() => setAchievementsEnabled(settings.achievements !== false), [settings.achievements]);
  useEffect(() => {
    if (settings.appearance === 'dark') unlock('dark');
  }, [settings.appearance]);
  useEffect(() => setToneChoice(settings.notifTone ?? 'Portfolio Ding', settings.ringtone ?? 'Daybreak'), [settings.notifTone, settings.ringtone]);
  useEffect(() => installUndoKeys(), []);
  useEffect(() => setUndoLimit(settings.undoLimit ?? 50), [settings.undoLimit]);
  useEffect(() => purgeDeleted(settings.trashAutoEmpty ?? 30), [settings.trashAutoEmpty]);
  useEffect(() => {
    const load = () =>
      void idbGet<{ data: string; name: string }>('custom-sound').then((v) => {
        if (v?.data) setCustomSound(v.data, v.name);
        else setCustomSound(null);
      });
    load();
    window.addEventListener('mra-custom-sound', load);
    return () => window.removeEventListener('mra-custom-sound', load);
  }, []);
}

/** v10 — performance: pause hidden work; lower effects automatically when frames drop. */
export function usePerf() {
  const { settings } = useSettings();
  const mode = settings.perfMode ?? 'auto';
  useEffect(() => {
    const root = document.documentElement;
    const vis = () => (root.dataset.hidden = document.visibilityState === 'hidden' ? 'on' : 'off');
    vis();
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (mode !== 'auto') {
      root.dataset.perf = mode === 'speed' ? 'low' : 'high';
      return;
    }
    root.dataset.perf = 'high';
    let raf = 0;
    let frames = 0;
    let start = performance.now();
    let slow = 0;
    let fast = 0;
    // only measure while something is animating (a window opening, an overlay…) would be ideal; measuring
    // a short window after load and then sampling every 6 s keeps the cost negligible
    const loop = (t: number) => {
      frames++;
      if (t - start >= 1000) {
        const fps = (frames * 1000) / (t - start);
        frames = 0;
        start = t;
        if (document.visibilityState === 'visible') {
          if (fps < 32) slow++;
          else slow = Math.max(0, slow - 1);
          if (fps > 52) fast++;
          else fast = 0;
          if (slow >= 3 && root.dataset.perf !== 'low') {
            root.dataset.perf = 'low';
            fast = 0;
          } else if (fast >= 8 && root.dataset.perf === 'low') {
            root.dataset.perf = 'high';
            slow = 0;
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode]);
}

/**
 * v10 — Mac system agents:
 *  • trackpad pinch / Ctrl+scroll never zooms the page: pinch in → Mission Control
 *    (over a window → App Exposé; again → Launchpad), pinch out → back
 *  • Desktops (Spaces): two-finger swipe on the desktop, Ctrl+←/→, Ctrl+1…6, with a HUD
 *  • wallpaper parallax, Liquid Glass edge, performance monitor, Mac notch + Dynamic Island
 */
export function SystemV10() {
  const { settings } = useSettings();
  const sys = useSystem();
  const wm = useWM();
  const spaces = useSpaces();
  const [hud, setHud] = useState<{ n: number; key: number } | null>(null);
  const sysRef = useRef(sys);
  sysRef.current = sys;
  const wmRef = useRef(wm);
  wmRef.current = wm;
  useToneSync();
  usePerf();

  /* ───── pinch → Mission Control / App Exposé / Launchpad (never page zoom) ───── */
  const pinchAction = settings.pinchAction ?? 'missioncontrol';
  useEffect(() => {
    let acc = 0;
    let lock = 0;
    let reset = 0;
    const act = (dir: 'in' | 'out', x: number, y: number) => {
      const s = sysRef.current;
      if (pinchAction === 'off') return;
      lock = performance.now() + 650;
      if (dir === 'out') {
        if (s.overlay === 'launchpad' || s.overlay === 'missioncontrol') s.setOverlay('none');
        return;
      }
      if (pinchAction === 'launchpad') {
        s.setOverlay('launchpad');
        return;
      }
      if (s.overlay === 'missioncontrol') {
        s.setOverlay('launchpad');
        return;
      }
      if (s.overlay !== 'none') return;
      const winEl = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.win-pos');
      const id = winEl?.dataset.winId as AppId | undefined;
      window.dispatchEvent(new CustomEvent('mra-mc-filter', { detail: id ?? null }));
      s.setOverlay('missioncontrol');
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      // a trackpad pinch arrives as ctrlKey + wheel: always stop the browser zoom
      e.preventDefault();
      if (performance.now() < lock) return;
      acc += e.deltaY;
      window.clearTimeout(reset);
      reset = window.setTimeout(() => (acc = 0), 450);
      if (acc > 38) {
        acc = 0;
        act('in', e.clientX, e.clientY);
      } else if (acc < -38) {
        acc = 0;
        act('out', e.clientX, e.clientY);
      }
    };
    // Safari's own gesture events
    let gx = 0;
    let gy = 0;
    const gStart = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { clientX?: number; clientY?: number };
      gx = ge.clientX ?? innerWidth / 2;
      gy = ge.clientY ?? innerHeight / 2;
    };
    const gChange = (e: Event) => {
      e.preventDefault();
      const scale = (e as Event & { scale?: number }).scale ?? 1;
      if (performance.now() < lock) return;
      if (scale < 0.78) act('in', gx, gy);
      else if (scale > 1.25) act('out', gx, gy);
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    document.addEventListener('gesturestart', gStart, { passive: false } as AddEventListenerOptions);
    document.addEventListener('gesturechange', gChange, { passive: false } as AddEventListenerOptions);
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('gesturestart', gStart);
      document.removeEventListener('gesturechange', gChange);
      window.clearTimeout(reset);
    };
  }, [pinchAction]);

  /* ───── Spaces: two-finger swipe over the desktop, Ctrl+arrows, Ctrl+number ───── */
  const swipe = settings.swipeSpaces !== false;
  useEffect(() => {
    let acc = 0;
    let lock = 0;
    let reset = 0;
    const onWheel = (e: WheelEvent) => {
      if (!swipe || e.ctrlKey || window.innerWidth < 700) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.4) return;
      const t = e.target as HTMLElement;
      if (t.closest('.win-pos, .dock-wrap, .menubar, .widget, .launchpad, .spotlight, .control-center, .notif-center, .mc-layer, [data-noswipe]')) return;
      if (sysRef.current.overlay !== 'none' && sysRef.current.overlay !== 'missioncontrol') return;
      if (performance.now() < lock) return;
      acc += e.deltaX;
      window.clearTimeout(reset);
      reset = window.setTimeout(() => (acc = 0), 260);
      if (Math.abs(acc) > 140) {
        const dir = acc > 0 ? 1 : -1;
        acc = 0;
        lock = performance.now() + 700;
        switchSpace(getSpaces().current + dir);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || e.altKey || editable(e.target) || window.innerWidth < 700) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        switchSpace(getSpaces().current + (e.key === 'ArrowRight' ? 1 : -1));
      } else if (/^[1-6]$/.test(e.key) && Number(e.key) <= getSpaces().count) {
        e.preventDefault();
        switchSpace(Number(e.key) - 1);
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [swipe]);

  // HUD + slide
  useEffect(() => {
    let t = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ from: number; to: number; dir: number }>).detail;
      setHud({ n: d.to, key: Date.now() });
      const root = document.documentElement;
      root.style.setProperty('--space-dir', String(d.dir));
      root.classList.remove('space-slide');
      void root.offsetWidth;
      root.classList.add('space-slide');
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        root.classList.remove('space-slide');
        setHud(null);
      }, 900);
    };
    const bump = (e: Event) => {
      const dir = (e as CustomEvent<number>).detail;
      const root = document.documentElement;
      root.style.setProperty('--space-dir', String(dir));
      root.classList.remove('space-bump');
      void root.offsetWidth;
      root.classList.add('space-bump');
      window.setTimeout(() => root.classList.remove('space-bump'), 420);
    };
    window.addEventListener('mra-space-switch', on);
    window.addEventListener('mra-space-bump', bump);
    return () => {
      window.removeEventListener('mra-space-switch', on);
      window.removeEventListener('mra-space-bump', bump);
      window.clearTimeout(t);
    };
  }, []);

  /* ───── parallax wallpaper ───── */
  const parallax = settings.parallax !== false && !settings.reduceMotion;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.parallax = parallax ? 'on' : 'off';
    if (!parallax) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const mv = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = (e.clientX / window.innerWidth - 0.5) * -2;
      y = (e.clientY / window.innerHeight - 0.5) * -2;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          root.style.setProperty('--par-x', x.toFixed(3));
          root.style.setProperty('--par-y', y.toFixed(3));
        });
    };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => {
      window.removeEventListener('pointermove', mv);
      cancelAnimationFrame(raf);
    };
  }, [parallax]);

  /* ───── login as "Recruiter": open the CV and Hire Me side by side ───── */
  useEffect(() => {
    const on = () => {
      wmRef.current.open('preview');
      window.setTimeout(() => wmRef.current.open('hireme'), 500);
    };
    window.addEventListener('mra-recruiter-start', on);
    return () => window.removeEventListener('mra-recruiter-start', on);
  }, []);

  /* ───── Liquid Glass edge + notch flags ───── */
  useEffect(() => {
    document.documentElement.dataset.glassEdge = settings.glassEdge === false ? 'off' : 'on';
  }, [settings.glassEdge]);
  const notch = !!settings.macNotch;
  useEffect(() => {
    document.documentElement.dataset.notch = notch ? 'on' : 'off';
  }, [notch]);

  return (
    <>
      <EmojiPicker />
      <VolumeHUD variant="mac" />
      <Dictation />
      <MusicPiP />
      <ModeBar variant="mac" />
      <Onboarding device="mac" />
      {notch && (
        <div className="mac-notch" aria-hidden={false}>
          <DynamicIsland variant="mac" />
        </div>
      )}
      {hud && (
        <div className="space-hud" key={hud.key} role="status" aria-live="polite">
          <div className="space-hud-dots">
            {Array.from({ length: spaces.count }, (_, i) => (
              <i key={i} className={i === hud.n ? 'on' : ''} />
            ))}
          </div>
          <b>Desktop {hud.n + 1}</b>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { islandTimer } from './island';
import { ring } from './sounds';
import { notify, openAppLink } from './notify';

/**
 * v10.2 — the Clock timer lives here (not inside the Clock window), so it keeps
 * running when Clock is closed, the Dynamic Island can pause / resume / cancel
 * it, and it always finishes with a sound and a notification.
 */
export interface TimerState {
  /** total length of the current timer (ms) */
  total: number;
  /** end time while running */
  end: number | null;
  /** remaining ms while paused */
  paused: number | null;
  /** v10.3 — optional label ("Focus", "Break") shown in the Dynamic Island and the finish alert */
  label?: string;
  /** v10.3 — which app started it, so it can open that app and react when it ends */
  owner?: string;
}
const EVT = 'mra-timer';
let st: TimerState = { total: 0, end: null, paused: null };
let tick = 0;
const emit = () => window.dispatchEvent(new Event(EVT));

export const getTimer = () => st;
export const timerLeft = (s: TimerState = st) => (s.end ? Math.max(0, s.end - Date.now()) : (s.paused ?? 0));
export const timerActive = (s: TimerState = st) => s.end !== null || s.paused !== null;

function watch() {
  window.clearInterval(tick);
  if (!st.end) return;
  tick = window.setInterval(() => {
    if (st.end && Date.now() >= st.end) {
      const total = st.total;
      const { label, owner } = st;
      st = { total, end: null, paused: null };
      window.clearInterval(tick);
      islandTimer(null);
      emit();
      ring(undefined, 0.7, 8000);
      const m = Math.floor(total / 60000);
      const sec = Math.round((total % 60000) / 1000);
      const len = `${m ? `${m} min ` : ''}${sec ? `${sec} s ` : ''}`.trim();
      window.dispatchEvent(new CustomEvent('mra-timer-done', { detail: { label, owner, total } }));
      notify(
        owner === 'focusplanner'
          ? { app: 'Focus Planner', icon: 'focusplanner', title: `${label ?? 'Focus'} finished`, body: `${len} session complete`, critical: true, island: true, onClick: () => openAppLink('focusplanner', { tab: 'timer' }) }
          : { app: 'Clock', icon: 'clock', title: 'Timer done', body: `${len} timer finished`, critical: true, island: true, onClick: () => openAppLink('clock', { tab: 'timer' }) },
      );
    }
  }, 200);
}

export function startTimer(ms: number, opts: { label?: string; owner?: string } = {}) {
  if (ms <= 0) return;
  st = { total: ms, end: Date.now() + ms, paused: null, label: opts.label, owner: opts.owner };
  islandTimer(st.end);
  watch();
  emit();
}
export function pauseTimer() {
  if (!st.end) return;
  st = { ...st, paused: Math.max(0, st.end - Date.now()), end: null };
  window.clearInterval(tick);
  islandTimer(null);
  window.dispatchEvent(new CustomEvent('mra-island-timer-paused', { detail: st.paused }));
  emit();
}
export function resumeTimer() {
  if (st.paused === null) return;
  st = { ...st, end: Date.now() + st.paused, paused: null };
  islandTimer(st.end);
  watch();
  emit();
}
export function cancelTimer() {
  st = { total: st.total, end: null, paused: null };
  window.clearInterval(tick);
  window.dispatchEvent(new CustomEvent('mra-timer-cancel'));
  islandTimer(null);
  window.dispatchEvent(new CustomEvent('mra-island-timer-paused', { detail: null }));
  emit();
}

export function useTimer(): TimerState & { left: number } {
  const [s, setS] = useState(st);
  const [, force] = useState(0);
  useEffect(() => {
    const on = () => setS({ ...st });
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  useEffect(() => {
    if (!s.end) return;
    const t = window.setInterval(() => force((x) => x + 1), 250);
    return () => window.clearInterval(t);
  }, [s.end]);
  return { ...s, left: timerLeft(s) };
}

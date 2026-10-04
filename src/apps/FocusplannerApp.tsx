import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DragBar, Lights } from '../components/Window';
import { startTimer, pauseTimer, resumeTimer, cancelTimer, useTimer, getTimer, timerActive } from '../system/timer';
import { readStore, writeStore } from '../system/storage';
import { usePersisted, uid } from '../system/useStore';
import { useSettings } from '../system/SettingsContext';
import type { AppProps } from '../components/Desktop';

/**
 * v10.3 — Focus Planner: a Pomodoro timer that runs on the shared system timer
 * (so it shows in the Dynamic Island and keeps going when the app is closed),
 * a weekly study timetable and focus statistics. Everything is stored in this
 * browser only.
 */

/* ───────────────────────────── types & storage ───────────────────────────── */

type Phase = 'focus' | 'short' | 'long';
type Tab = 'timer' | 'timetable' | 'stats' | 'plan';
type Lang = 'en' | 'si' | 'ta';

interface Prefs {
  focus: number;
  short: number;
  long: number;
  every: number;
  autoBreaks: boolean;
  autoFocus: boolean;
}
interface Session {
  id: string;
  /** end time (ms) */
  at: number;
  min: number;
  task: string;
}
interface Run {
  phase: Phase;
  task: string;
  /** full planned length (ms) — what gets logged */
  total: number;
  end: number | null;
  paused: number | null;
  /** the page was reloaded while this session was running */
  interrupted?: boolean;
}
interface Cycle {
  phase: Phase;
  /** focus sessions completed (drives the long-break rhythm) */
  done: number;
  last?: { phase: Phase; min: number; at: number; task: string } | null;
}
interface Block {
  id: string;
  /** 0 = Monday … 6 = Sunday */
  day: number;
  subject: string;
  start: string;
  end: string;
  color: string;
}

const OWNER = 'focusplanner';
const K = {
  prefs: 'mra-focusplanner-v1',
  log: 'mra-focusplanner-log-v1',
  run: 'mra-focusplanner-run-v1',
  cycle: 'mra-focusplanner-cycle-v1',
  blocks: 'mra-focusplanner-tt-v1',
  task: 'mra-focusplanner-task-v1',
  tab: 'mra-focusplanner-tab-v1',
};
const DEF_PREFS: Prefs = { focus: 25, short: 5, long: 15, every: 4, autoBreaks: true, autoFocus: false };
const DEF_CYCLE: Cycle = { phase: 'focus', done: 0, last: null };
const COLORS = ['#ff6b5e', '#ff9f0a', '#ffcc00', '#34c759', '#30b0c7', '#0a84ff', '#5e5ce6', '#bf5af2'];

/* Same format as usePersisted, so open components stay in sync with module-level writes */
function getP<T>(key: string, d: T): T {
  return readStore<{ v: T | null }>(key, { v: null }).v ?? d;
}
function setP<T>(key: string, v: T) {
  writeStore(key, { v });
  window.dispatchEvent(new CustomEvent('mra-store-change', { detail: { key, v } }));
}

const prefsNow = (): Prefs => ({ ...DEF_PREFS, ...getP<Partial<Prefs>>(K.prefs, DEF_PREFS) });
const phaseMin = (p: Phase, pr: Prefs) => (p === 'focus' ? pr.focus : p === 'short' ? pr.short : pr.long);
const labelOf = (p: Phase) => (p === 'focus' ? 'Focus' : 'Break');

/* ─────────────────── engine (module level, survives app close) ─────────────────── */

function beginPhase(phase: Phase, task: string, ms?: number, total?: number) {
  const len = ms ?? phaseMin(phase, prefsNow()) * 60000;
  startTimer(len, { label: labelOf(phase), owner: OWNER });
  const t = getTimer();
  setP<Run | null>(K.run, { phase, task, total: total ?? len, end: t.end, paused: null });
  const c = getP<Cycle>(K.cycle, DEF_CYCLE);
  setP<Cycle>(K.cycle, { ...c, phase, last: null });
}

function nextAfter(phase: Phase, done: number, pr: Prefs): Phase {
  if (phase !== 'focus') return 'focus';
  return done > 0 && done % Math.max(1, pr.every) === 0 ? 'long' : 'short';
}

function completeRun(run: Run, endedAt: number, allowAuto: boolean) {
  const pr = prefsNow();
  const c = getP<Cycle>(K.cycle, DEF_CYCLE);
  const min = Math.round((run.total / 60000) * 10) / 10;
  let done = c.done;
  if (run.phase === 'focus') {
    done += 1;
    const log = getP<Session[]>(K.log, []);
    setP<Session[]>(K.log, [{ id: uid('s'), at: endedAt, min, task: run.task.trim() }, ...log].slice(0, 1000));
  } else if (run.phase === 'long') {
    done = 0;
  }
  const next = nextAfter(run.phase, done, pr);
  setP<Run | null>(K.run, null);
  setP<Cycle>(K.cycle, { phase: next, done, last: { phase: run.phase, min, at: endedAt, task: run.task } });
  const auto = allowAuto && !timerActive() && (next === 'focus' ? pr.autoFocus : pr.autoBreaks);
  if (auto) beginPhase(next, next === 'focus' ? run.task : run.task);
}

/** Compare the persisted running session with the live timer so nothing is lost. */
function reconcile() {
  const run = getP<Run | null>(K.run, null);
  if (!run || run.interrupted) return;
  const t = getTimer();
  if (t.owner === OWNER && timerActive(t)) return;
  if (run.end && Date.now() >= run.end - 400) {
    completeRun(run, run.end, false);
  } else {
    const left = run.paused ?? (run.end ? run.end - Date.now() : 0);
    if (left > 1000) setP<Run | null>(K.run, { ...run, end: null, paused: left, interrupted: true });
    else setP<Run | null>(K.run, null);
  }
}

let engineOn = false;
function installEngine() {
  if (engineOn || typeof window === 'undefined') return;
  engineOn = true;
  window.addEventListener('mra-timer-done', (e) => {
    const d = (e as CustomEvent<{ owner?: string }>).detail;
    if (d?.owner !== OWNER) return;
    const run = getP<Run | null>(K.run, null);
    if (run) completeRun(run, Date.now(), true);
  });
  window.addEventListener('mra-timer-cancel', () => {
    const run = getP<Run | null>(K.run, null);
    if (run && !run.interrupted) setP<Run | null>(K.run, null);
  });
  window.addEventListener('mra-timer', () => {
    const t = getTimer();
    const run = getP<Run | null>(K.run, null);
    if (!run || run.interrupted || !timerActive(t)) return;
    if (t.owner !== OWNER) setP<Run | null>(K.run, null);
    else if (run.end !== t.end || run.paused !== t.paused) setP<Run | null>(K.run, { ...run, end: t.end, paused: t.paused });
  });
  reconcile();
}
installEngine();

/* ───────────────────────────────── i18n ───────────────────────────────── */

const L = {
  en: {
    app: 'Focus Planner', focus: 'Focus', short: 'Short Break', long: 'Long Break', start: 'Start', pause: 'Pause', resume: 'Resume', reset: 'Reset', skip: 'Skip',
    timer: 'Timer', timetable: 'Timetable', stats: 'Stats', plan: 'Plan', task: 'What are you working on?', workingOn: 'Working on', settings: 'Timer settings',
    min: 'min', every: 'Long break after', sessions: 'sessions', autoBreaks: 'Auto-start breaks', autoFocus: 'Auto-start focus', session: 'Session', of: 'of',
    paused: 'Paused', running: 'Running', ready: 'Ready', other: 'Another timer is running', replaceQ: 'Replace it with this session?', ownQ: 'A session is already running. Replace it?',
    replace: 'Replace', cancel: 'Cancel', interrupted: 'Session interrupted by a page reload', left: 'left', discard: 'Discard', complete: 'complete', logged: 'logged',
    addBlock: 'Add block', editBlock: 'Edit block', newBlock: 'New block', subject: 'Subject', day: 'Day', from: 'From', to: 'To', colour: 'Colour', save: 'Save', del: 'Delete',
    startFocus: 'Start focus', emptyTT: 'No study blocks yet. Add your first one to plan the week.', emptyDay: 'Nothing planned for this day.', today: 'Today', week: 'This week',
    streak: 'Streak', days: 'days', day1: 'day', sessionsL: 'Sessions', total: 'all time', recent: 'Recent sessions', noSessions: 'No focus sessions yet. Finish one in the Timer to see it here.',
    clear: 'Clear history', confirm: 'Tap again to confirm', topTasks: 'Top tasks this week', untitled: 'Untitled focus', endErr: 'End time must be after the start time.',
    subjErr: 'Enter a subject.', chart: 'Focus minutes per day this week', upNext: 'Up next', open: 'Open', close: 'Close', noTasks: 'No tasks logged this week.',
  },
  si: {
    app: 'Focus Planner', focus: 'අවධානය', short: 'කෙටි විවේකය', long: 'දිගු විවේකය', start: 'අරඹන්න', pause: 'විරාම කරන්න', resume: 'නැවත අරඹන්න', reset: 'යළි සකසන්න', skip: 'මඟහරින්න',
    timer: 'ටයිමරය', timetable: 'කාලසටහන', stats: 'සංඛ්‍යාලේඛන', plan: 'සැලසුම', task: 'ඔබ කරන්නේ කුමක්ද?', workingOn: 'කරමින් සිටින්නේ', settings: 'ටයිමර සැකසුම්',
    min: 'මිනි.', every: 'දිගු විවේකය සැසි', sessions: 'කට පසු', autoBreaks: 'විවේක ස්වයංක්‍රීයව අරඹන්න', autoFocus: 'අවධානය ස්වයංක්‍රීයව අරඹන්න', session: 'සැසිය', of: '/',
    paused: 'විරාමයි', running: 'ක්‍රියාත්මකයි', ready: 'සූදානම්', other: 'වෙනත් ටයිමරයක් ක්‍රියාත්මකයි', replaceQ: 'එය මෙම සැසියෙන් ප්‍රතිස්ථාපනය කරන්නද?', ownQ: 'සැසියක් දැනටමත් ක්‍රියාත්මකයි. ප්‍රතිස්ථාපනය කරන්නද?',
    replace: 'ප්‍රතිස්ථාපනය', cancel: 'අවලංගු කරන්න', interrupted: 'පිටුව නැවත පූරණය වීමෙන් සැසිය බාධා විය', left: 'ඉතිරි', discard: 'ඉවතලන්න', complete: 'සම්පූර්ණයි', logged: 'සටහන් විය',
    addBlock: 'කොටසක් එක් කරන්න', editBlock: 'කොටස සංස්කරණය', newBlock: 'නව කොටස', subject: 'විෂය', day: 'දිනය', from: 'සිට', to: 'දක්වා', colour: 'වර්ණය', save: 'සුරකින්න', del: 'මකන්න',
    startFocus: 'අවධානය අරඹන්න', emptyTT: 'තවම අධ්‍යයන කොටස් නැත. සතිය සැලසුම් කිරීමට පළමු එක එක් කරන්න.', emptyDay: 'මෙදිනට කිසිවක් සැලසුම් කර නැත.', today: 'අද', week: 'මෙම සතිය',
    streak: 'අඛණ්ඩ දින', days: 'දින', day1: 'දින', sessionsL: 'සැසි', total: 'මුළු', recent: 'මෑත සැසි', noSessions: 'තවම අවධාන සැසි නැත. ටයිමරයෙන් එකක් අවසන් කරන්න.',
    clear: 'ඉතිහාසය මකන්න', confirm: 'තහවුරු කිරීමට නැවත තට්ටු කරන්න', topTasks: 'මෙම සතියේ ප්‍රධාන කාර්යයන්', untitled: 'නම් නොකළ අවධානය', endErr: 'අවසන් වේලාව ආරම්භයට පසු විය යුතුය.',
    subjErr: 'විෂයක් ඇතුළත් කරන්න.', chart: 'මෙම සතියේ දිනකට අවධාන මිනිත්තු', upNext: 'ඊළඟට', open: 'විවෘත කරන්න', close: 'වසන්න', noTasks: 'මෙම සතියේ කාර්යයන් සටහන් කර නැත.',
  },
  ta: {
    app: 'Focus Planner', focus: 'கவனம்', short: 'சிறு இடைவேளை', long: 'நீண்ட இடைவேளை', start: 'தொடங்கு', pause: 'இடைநிறுத்து', resume: 'தொடர்', reset: 'மீட்டமை', skip: 'தவிர்',
    timer: 'நேரங்காட்டி', timetable: 'கால அட்டவணை', stats: 'புள்ளிவிவரம்', plan: 'திட்டம்', task: 'நீங்கள் என்ன செய்கிறீர்கள்?', workingOn: 'செய்துகொண்டிருப்பது', settings: 'நேரங்காட்டி அமைப்புகள்',
    min: 'நிமி.', every: 'நீண்ட இடைவேளை', sessions: 'அமர்வுகளுக்குப் பின்', autoBreaks: 'இடைவேளைகளைத் தானாகத் தொடங்கு', autoFocus: 'கவனத்தைத் தானாகத் தொடங்கு', session: 'அமர்வு', of: '/',
    paused: 'இடைநிறுத்தப்பட்டது', running: 'இயங்குகிறது', ready: 'தயார்', other: 'மற்றொரு நேரங்காட்டி இயங்குகிறது', replaceQ: 'இந்த அமர்வால் அதை மாற்றவா?', ownQ: 'ஒரு அமர்வு ஏற்கனவே இயங்குகிறது. மாற்றவா?',
    replace: 'மாற்று', cancel: 'ரத்து', interrupted: 'பக்கம் மீண்டும் ஏற்றப்பட்டதால் அமர்வு தடைபட்டது', left: 'மீதம்', discard: 'நிராகரி', complete: 'முடிந்தது', logged: 'பதிவானது',
    addBlock: 'தொகுதி சேர்', editBlock: 'தொகுதியைத் திருத்து', newBlock: 'புதிய தொகுதி', subject: 'பாடம்', day: 'நாள்', from: 'முதல்', to: 'வரை', colour: 'நிறம்', save: 'சேமி', del: 'நீக்கு',
    startFocus: 'கவனத்தைத் தொடங்கு', emptyTT: 'இன்னும் படிப்புத் தொகுதிகள் இல்லை. வாரத்தைத் திட்டமிட முதலாவதைச் சேர்க்கவும்.', emptyDay: 'இந்த நாளுக்கு எதுவும் திட்டமிடப்படவில்லை.', today: 'இன்று', week: 'இந்த வாரம்',
    streak: 'தொடர்', days: 'நாட்கள்', day1: 'நாள்', sessionsL: 'அமர்வுகள்', total: 'மொத்தம்', recent: 'சமீபத்திய அமர்வுகள்', noSessions: 'இன்னும் கவன அமர்வுகள் இல்லை. நேரங்காட்டியில் ஒன்றை முடிக்கவும்.',
    clear: 'வரலாற்றை அழி', confirm: 'உறுதிப்படுத்த மீண்டும் தட்டவும்', topTasks: 'இந்த வாரத்தின் முக்கிய பணிகள்', untitled: 'பெயரிடப்படாத கவனம்', endErr: 'முடிவு நேரம் தொடக்க நேரத்திற்குப் பின் இருக்க வேண்டும்.',
    subjErr: 'ஒரு பாடத்தை உள்ளிடவும்.', chart: 'இந்த வாரம் நாள்தோறும் கவன நிமிடங்கள்', upNext: 'அடுத்து', open: 'திற', close: 'மூடு', noTasks: 'இந்த வாரம் பணிகள் பதிவாகவில்லை.',
  },
} as const;
type Dict = { [k in keyof (typeof L)['en']]: string };

/* ──────────────────────────────── helpers ──────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');
function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const dayKey = (t: number | Date) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
/** Monday 00:00 of the current week */
function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
const todayIdx = () => (new Date().getDay() + 6) % 7;
const fmtMin = (m: number) => {
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)}h ${r % 60 ? `${r % 60}m` : ''}`.trim() : `${r}m`;
};
const locale = (lang: Lang) => (lang === 'si' ? 'si-LK' : lang === 'ta' ? 'ta-LK' : undefined);
function dayNames(lang: Lang, style: 'short' | 'long') {
  const base = weekStart();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    try {
      return d.toLocaleDateString(locale(lang), { weekday: style });
    } catch {
      return d.toLocaleDateString(undefined, { weekday: style });
    }
  });
}
const fmtTime = (hm: string) => hm;

/* ─────────────────────────────────── icons ─────────────────────────────────── */

const Ico = {
  play: <path d="M8 5.6v12.8c0 .8.9 1.3 1.6.8l9.9-6.4a1 1 0 0 0 0-1.6L9.6 4.8C8.9 4.3 8 4.8 8 5.6Z" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1.4" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.4" />
    </>
  ),
  reset: <path d="M12 4.5a7.5 7.5 0 1 1-7.1 5.1.9.9 0 1 1 1.7.6A5.7 5.7 0 1 0 12 6.3h-1.2l1.4 1.4a.9.9 0 0 1-1.3 1.3L8 6.1a.9.9 0 0 1 0-1.3L10.9 2a.9.9 0 0 1 1.3 1.3l-1.2 1.2H12Z" />,
  skip: (
    <>
      <path d="M5 6.2v11.6c0 .8.9 1.2 1.5.7l7.6-5.8a.9.9 0 0 0 0-1.4L6.5 5.5C5.9 5 5 5.4 5 6.2Z" />
      <rect x="15.6" y="5" width="3.2" height="14" rx="1.3" />
    </>
  ),
  timer: (
    <>
      <path d="M12 6a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm.9 7.6a.9.9 0 0 1-1.8 0V9.5a.9.9 0 0 1 1.8 0v4.1Z" />
      <rect x="9.5" y="2.2" width="5" height="2.2" rx="1.1" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="3.5" opacity=".35" />
      <path d="M6.5 3a1 1 0 0 1 1 1v1h9V4a1 1 0 1 1 2 0v1A3.5 3.5 0 0 1 21 8.5V9H3v-.5A3.5 3.5 0 0 1 5.5 5V4a1 1 0 0 1 1-1Z" />
      <rect x="6" y="12" width="5" height="3.2" rx="1" />
      <rect x="13" y="15.5" width="5" height="3.2" rx="1" />
    </>
  ),
  chart: (
    <>
      <rect x="3.5" y="12" width="4.2" height="8.5" rx="1.5" />
      <rect x="9.9" y="4" width="4.2" height="16.5" rx="1.5" />
      <rect x="16.3" y="8.5" width="4.2" height="12" rx="1.5" />
    </>
  ),
  plus: <path d="M12 4.5a1.2 1.2 0 0 1 1.2 1.2v5.1h5.1a1.2 1.2 0 0 1 0 2.4h-5.1v5.1a1.2 1.2 0 0 1-2.4 0v-5.1H5.7a1.2 1.2 0 0 1 0-2.4h5.1V5.7A1.2 1.2 0 0 1 12 4.5Z" />,
  gear: (
    <path d="M10.6 2.6a1.4 1.4 0 0 1 2.8 0l.2 1.3a8 8 0 0 1 2 .9l1.1-.8a1.4 1.4 0 0 1 2 2l-.8 1.1c.4.6.7 1.3.9 2l1.3.2a1.4 1.4 0 0 1 0 2.8l-1.3.2a8 8 0 0 1-.9 2l.8 1.1a1.4 1.4 0 0 1-2 2l-1.1-.8a8 8 0 0 1-2 .9l-.2 1.3a1.4 1.4 0 0 1-2.8 0l-.2-1.3a8 8 0 0 1-2-.9l-1.1.8a1.4 1.4 0 0 1-2-2l.8-1.1a8 8 0 0 1-.9-2l-1.3-.2a1.4 1.4 0 0 1 0-2.8l1.3-.2c.2-.7.5-1.4.9-2l-.8-1.1a1.4 1.4 0 0 1 2-2l1.1.8c.6-.4 1.3-.7 2-.9l.2-1.3ZM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z" />
  ),
  flame: <path d="M12.6 2.5c.3 2.6 1.6 4 3 5.5 1.5 1.6 3.1 3.3 3.1 6.4A6.6 6.6 0 0 1 12 21a6.6 6.6 0 0 1-6.7-6.6c0-2.3 1-4 2.3-5.3.4-.4 1.1-.1 1.1.5 0 1.2.5 2.2 1.4 2.8.2-3.5 1.4-6.9 2.5-9.4Z" />,
  check: <path d="M9.6 16.6 5.4 12.4a1.2 1.2 0 0 1 1.7-1.7l2.5 2.5 7.3-7.3a1.2 1.2 0 0 1 1.7 1.7l-9 9Z" />,
};
function I({ d, size = 18 }: { d: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor" className="fp-ico">
      {d}
    </svg>
  );
}

/* ─────────────────────────────── layout hook ─────────────────────────────── */

function useLayout(ref: React.RefObject<HTMLDivElement | null>) {
  const read = () => {
    const dev = document.documentElement.dataset.device ?? 'mac';
    const w = ref.current?.clientWidth ?? window.innerWidth;
    const h = ref.current?.clientHeight ?? window.innerHeight;
    const phone = dev === 'iphone' || w < 520;
    const split = dev === 'ipad' && window.innerWidth > window.innerHeight && w >= 900;
    return { phone, split, dev, w, h };
  };
  const [lay, setLay] = useState(read);
  useEffect(() => {
    const upd = () => setLay((p) => {
      const n = read();
      return n.phone === p.phone && n.split === p.split && n.dev === p.dev ? p : n;
    });
    upd();
    const ro = new ResizeObserver(upd);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('resize', upd);
    const mo = new MutationObserver(upd);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-device'] });
    return () => (ro.disconnect(), window.removeEventListener('resize', upd), mo.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return lay;
}

/* ──────────────────────────────────── app ──────────────────────────────────── */

interface Ask {
  phase: Phase;
  task: string;
  ms?: number;
  total?: number;
  own: boolean;
}

export default function FocusplannerApp({ win }: Partial<AppProps>) {
  const { settings, motionReduced } = useSettings();
  const lang: Lang = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const t: Dict = L[lang];
  const rootRef = useRef<HTMLDivElement>(null);
  const lay = useLayout(rootRef);

  const [prefs, setPrefs] = usePersisted<Prefs>(K.prefs, DEF_PREFS);
  const pr: Prefs = { ...DEF_PREFS, ...prefs };
  const [log, setLog] = usePersisted<Session[]>(K.log, []);
  const [run, setRun] = usePersisted<Run | null>(K.run, null);
  const [cycle, setCycle] = usePersisted<Cycle>(K.cycle, DEF_CYCLE);
  const [blocks, setBlocks] = usePersisted<Block[]>(K.blocks, []);
  const [task, setTask] = usePersisted<string>(K.task, '');
  const [tabP, setTab] = usePersisted<Tab>(K.tab, (win?.args?.tab as Tab) ?? 'timer');
  const [ask, setAsk] = useState<Ask | null>(null);
  const [edit, setEdit] = useState<Block | null>(null);
  const tm = useTimer();

  useEffect(() => {
    installEngine();
    reconcile();
  }, []);

  const tabs: Tab[] = lay.split ? ['plan', 'stats'] : ['timer', 'timetable', 'stats'];
  let tab: Tab = tabP;
  if (lay.split && (tab === 'timer' || tab === 'timetable')) tab = 'plan';
  if (!lay.split && tab === 'plan') tab = 'timer';

  const ours = tm.owner === OWNER && timerActive(tm);
  const other = !ours && timerActive(tm);

  /** Start a phase, asking first if another timer (or our own session) would be replaced. */
  const request = (phase: Phase, tk: string, ms?: number, total?: number) => {
    const live = getTimer();
    if (timerActive(live)) {
      setAsk({ phase, task: tk, ms, total, own: live.owner === OWNER });
      return;
    }
    beginPhase(phase, tk, ms, total);
  };
  const confirmAsk = () => {
    if (!ask) return;
    setRun(null);
    cancelTimer();
    beginPhase(ask.phase, ask.task, ask.ms, ask.total);
    setAsk(null);
  };

  const startFromBlock = (b: Block) => {
    setTask(b.subject);
    setEdit(null);
    if (!lay.split) setTab('timer');
    request('focus', b.subject);
  };

  const timerPane = (
    <TimerPane
      t={t}
      pr={pr}
      setPrefs={(p) => setPrefs({ ...pr, ...p })}
      tm={tm}
      ours={ours}
      other={other}
      run={run}
      setRun={setRun}
      cycle={cycle}
      setCycle={setCycle}
      task={task}
      setTask={setTask}
      request={request}
      motionReduced={motionReduced}
      blocks={blocks}
      lang={lang}
    />
  );
  const ttPane = (
    <TimetablePane t={t} lang={lang} blocks={blocks} onEdit={setEdit} onAdd={(day, start) => setEdit(newBlock(day, start, blocks.length))} onStart={startFromBlock} compact={lay.split} />
  );
  const statsPane = <StatsPane t={t} lang={lang} log={log} setLog={setLog} />;

  const tabLabel = (x: Tab) => (x === 'timer' ? t.timer : x === 'timetable' ? t.timetable : x === 'stats' ? t.stats : t.plan);
  const tabIcon = (x: Tab) => (x === 'timer' ? Ico.timer : x === 'timetable' ? Ico.grid : x === 'stats' ? Ico.chart : Ico.timer);

  return (
    <div ref={rootRef} className={`fp ${lay.phone ? 'fp-phone' : ''} ${lay.split ? 'fp-split' : ''} ${motionReduced ? 'fp-still' : ''}`}>
      <DragBar className="fp-bar">
        <Lights />
        <b className="fp-title">{t.app}</b>
        {!lay.phone && (
          <div className="fp-seg" role="tablist" aria-label={t.app} data-nodrag onPointerDown={(e) => e.stopPropagation()}>
            {tabs.map((x) => (
              <button key={x} type="button" role="tab" aria-selected={tab === x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>
                {tabLabel(x)}
              </button>
            ))}
          </div>
        )}
        {ours && tab !== 'timer' && tab !== 'plan' && (
          <button type="button" className="fp-live" data-nodrag onPointerDown={(e) => e.stopPropagation()} onClick={() => setTab(lay.split ? 'plan' : 'timer')}>
            <i className={`fp-dot ${run?.phase ?? 'focus'}`} />
            {clock(tm.left)}
          </button>
        )}
      </DragBar>

      <main className="fp-main" role="tabpanel" aria-label={tabLabel(tab)}>
        {tab === 'plan' ? (
          <div className="fp-plan">
            <section className="fp-plan-a">{timerPane}</section>
            <section className="fp-plan-b">{ttPane}</section>
          </div>
        ) : tab === 'timer' ? (
          timerPane
        ) : tab === 'timetable' ? (
          ttPane
        ) : (
          statsPane
        )}
      </main>

      {lay.phone && (
        <nav className="fp-tabbar" role="tablist" aria-label={t.app}>
          {tabs.map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>
              <I d={tabIcon(x)} size={24} />
              <span>{tabLabel(x)}</span>
            </button>
          ))}
        </nav>
      )}

      {ask && (
        <Sheet onClose={() => setAsk(null)} label={ask.own ? t.ownQ : t.other}>
          <h3>{ask.own ? t.ownQ : t.other}</h3>
          {!ask.own && (
            <p className="fp-muted">
              {tm.label ?? 'Timer'} · {clock(tm.left)} {t.left}
              {tm.paused !== null ? ` · ${t.paused}` : ''}
            </p>
          )}
          {!ask.own && <p>{t.replaceQ}</p>}
          <div className="fp-sheet-actions">
            <button type="button" className="fp-btn" onClick={() => setAsk(null)}>
              {t.cancel}
            </button>
            <button type="button" className="fp-btn primary danger" onClick={confirmAsk}>
              {t.replace}
            </button>
          </div>
        </Sheet>
      )}

      {edit && (
        <BlockEditor
          t={t}
          lang={lang}
          block={edit}
          isNew={!blocks.some((b) => b.id === edit.id)}
          onClose={() => setEdit(null)}
          onSave={(b) => {
            setBlocks((list) => (list.some((x) => x.id === b.id) ? list.map((x) => (x.id === b.id ? b : x)) : [...list, b]));
            setEdit(null);
          }}
          onDelete={(id) => {
            setBlocks((list) => list.filter((x) => x.id !== id));
            setEdit(null);
          }}
          onStart={startFromBlock}
        />
      )}
    </div>
  );
}

function newBlock(day: number, start: string, n: number): Block {
  const s = toMin(start);
  const e = Math.min(23 * 60 + 59, s + 60);
  return { id: uid('b'), day, subject: '', start, end: `${pad(Math.floor(e / 60))}:${pad(e % 60)}`, color: COLORS[(n + 5) % COLORS.length] };
}

/* ─────────────────────────────────── sheet ─────────────────────────────────── */

function Sheet({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, button.primary, button');
    first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fp-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="fp-sheet" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── timer ─────────────────────────────────── */

interface TimerProps {
  t: Dict;
  lang: Lang;
  pr: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  tm: ReturnType<typeof useTimer>;
  ours: boolean;
  other: boolean;
  run: Run | null;
  setRun: (r: Run | null) => void;
  cycle: Cycle;
  setCycle: (c: Cycle | ((p: Cycle) => Cycle)) => void;
  task: string;
  setTask: (s: string) => void;
  request: (phase: Phase, task: string, ms?: number, total?: number) => void;
  motionReduced: boolean;
  blocks: Block[];
}

function TimerPane({ t, pr, setPrefs, tm, ours, other, run, setRun, cycle, setCycle, task, setTask, request, blocks }: TimerProps) {
  const [showSet, setShowSet] = useState(false);
  const phase: Phase = ours && run ? run.phase : run?.interrupted ? run.phase : cycle.phase;
  const full = phaseMin(phase, pr) * 60000;
  const total = ours ? run?.total ?? tm.total : run?.interrupted ? run.total : full;
  const left = ours ? tm.left : run?.interrupted ? run.paused ?? 0 : full;
  const frac = total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : 0;
  const paused = ours && tm.paused !== null;
  const name = (p: Phase) => (p === 'focus' ? t.focus : p === 'short' ? t.short : t.long);
  const every = Math.max(1, pr.every);
  const inCycle = cycle.done % every;
  const slot = phase === 'focus' ? inCycle + 1 : inCycle === 0 && cycle.done > 0 ? every : inCycle;

  const pick = (p: Phase) => {
    if (ours) return;
    if (run?.interrupted) setRun(null);
    setCycle((c) => ({ ...c, phase: p, last: null }));
  };
  const start = () => {
    if (run?.interrupted) {
      request(run.phase, run.task, run.paused ?? undefined, run.total);
      return;
    }
    request(phase, phase === 'focus' ? task : run?.task ?? task);
  };
  const reset = () => {
    setRun(null);
    if (ours) cancelTimer();
  };
  const skip = () => {
    const wasFocus = phase === 'focus';
    setRun(null);
    if (ours) cancelTimer();
    setCycle((c) => ({ ...c, phase: wasFocus ? nextAfter('focus', c.done + 1, pr) === 'long' ? 'long' : 'short' : 'focus', last: null }));
  };
  const last = cycle.last && !ours && Date.now() - cycle.last.at < 30 * 60000 ? cycle.last : null;

  /* today's next block, as a gentle hint */
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextBlock = blocks.filter((b) => b.day === todayIdx() && toMin(b.end) > nowMin).sort((a, b) => toMin(a.start) - toMin(b.start))[0];

  const R = 120;
  const C = 2 * Math.PI * R;
  const stateText = ours ? (paused ? t.paused : t.running) : run?.interrupted ? t.paused : t.ready;

  return (
    <div className={`fp-timer ph-${phase}`}>
      <div className="fp-phases" role="radiogroup" aria-label={t.timer}>
        {(['focus', 'short', 'long'] as Phase[]).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={phase === p} className={phase === p ? 'on' : ''} disabled={ours && phase !== p} onClick={() => pick(p)}>
            {name(p)}
          </button>
        ))}
      </div>

      {other && (
        <div className="fp-note warn" role="status">
          <I d={Ico.timer} />
          <span>
            <b>{t.other}</b> · {tm.label ?? 'Timer'} {clock(tm.left)} {t.left}
            {tm.paused !== null ? ` (${t.paused})` : ''}
          </span>
        </div>
      )}
      {run?.interrupted && !ours && (
        <div className="fp-note" role="status">
          <span>
            <b>{t.interrupted}</b> · {name(run.phase)} · {clock(run.paused ?? 0)} {t.left}
          </span>
          <button type="button" className="fp-link" onClick={() => setRun(null)}>
            {t.discard}
          </button>
        </div>
      )}
      {last && !run?.interrupted && (
        <div className="fp-note ok" role="status">
          <I d={Ico.check} />
          <span>
            <b>
              {name(last.phase)} {t.complete}
            </b>
            {last.phase === 'focus' ? ` · ${last.min} ${t.min} ${t.logged}` : ''}
            {last.task && last.phase === 'focus' ? ` · ${last.task}` : ''}
          </span>
          <button type="button" className="fp-link" onClick={() => setCycle((c) => ({ ...c, last: null }))} aria-label={t.close}>
            ×
          </button>
        </div>
      )}

      <div className="fp-ring" role="timer" aria-live="off" aria-label={`${name(phase)} ${clock(left)}`}>
        <svg viewBox="0 0 280 280" aria-hidden="true">
          <circle className="fp-ring-track" cx="140" cy="140" r={R} />
          <circle className="fp-ring-bar" cx="140" cy="140" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 140 140)" />
        </svg>
        <div className="fp-ring-in">
          <span className="fp-ring-phase">{name(phase)}</span>
          <span className="fp-ring-time">{clock(left)}</span>
          <span className={`fp-ring-state ${paused ? 'blink' : ''}`}>{stateText}</span>
          <span className="fp-dots" aria-label={`${t.session} ${Math.min(slot || 1, every)} ${t.of} ${every}`}>
            {Array.from({ length: every }, (_, i) => (
              <i key={i} className={i < inCycle || (phase !== 'focus' && inCycle === 0 && cycle.done > 0) ? 'done' : i === inCycle && phase === 'focus' ? 'cur' : ''} />
            ))}
          </span>
        </div>
      </div>

      <div className="fp-controls">
        <button type="button" className="fp-round" onClick={reset} disabled={!ours && !run?.interrupted} aria-label={t.reset} title={t.reset}>
          <I d={Ico.reset} size={22} />
        </button>
        {!ours ? (
          <button type="button" className="fp-main-btn" onClick={start}>
            <I d={Ico.play} size={22} />
            {run?.interrupted ? t.resume : t.start}
          </button>
        ) : paused ? (
          <button type="button" className="fp-main-btn" onClick={resumeTimer}>
            <I d={Ico.play} size={22} />
            {t.resume}
          </button>
        ) : (
          <button type="button" className="fp-main-btn pause" onClick={pauseTimer}>
            <I d={Ico.pause} size={22} />
            {t.pause}
          </button>
        )}
        <button type="button" className="fp-round" onClick={skip} aria-label={t.skip} title={t.skip}>
          <I d={Ico.skip} size={22} />
        </button>
      </div>

      <label className="fp-task">
        <span className="fp-sr">{t.task}</span>
        {ours && run ? (
          <div className="fp-task-live">
            <small>{t.workingOn}</small>
            <b>{run.task || t.untitled}</b>
          </div>
        ) : (
          <input type="text" value={task} maxLength={80} placeholder={t.task} onChange={(e) => setTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !ours && start()} />
        )}
      </label>

      {nextBlock && !ours && (
        <button type="button" className="fp-next" onClick={() => (setTask(nextBlock.subject), request('focus', nextBlock.subject))}>
          <i style={{ background: nextBlock.color }} />
          <span>
            <small>{t.upNext}</small>
            <b>{nextBlock.subject}</b>
          </span>
          <em>
            {nextBlock.start}–{nextBlock.end}
          </em>
          <span className="fp-next-go">
            <I d={Ico.play} size={14} />
            {t.startFocus}
          </span>
        </button>
      )}

      <div className={`fp-settings ${showSet ? 'open' : ''}`}>
        <button type="button" className="fp-settings-h" aria-expanded={showSet} onClick={() => setShowSet((s) => !s)}>
          <I d={Ico.gear} size={16} />
          {t.settings}
          <span className="fp-chev" aria-hidden="true">
            ›
          </span>
        </button>
        {showSet && (
          <div className="fp-settings-b">
            <Stepper label={t.focus} unit={t.min} value={pr.focus} min={1} max={120} onChange={(v) => setPrefs({ focus: v })} />
            <Stepper label={t.short} unit={t.min} value={pr.short} min={1} max={60} onChange={(v) => setPrefs({ short: v })} />
            <Stepper label={t.long} unit={t.min} value={pr.long} min={1} max={90} onChange={(v) => setPrefs({ long: v })} />
            <Stepper label={t.every} unit={t.sessions} value={pr.every} min={1} max={12} onChange={(v) => setPrefs({ every: v })} />
            <Toggle label={t.autoBreaks} on={pr.autoBreaks} onChange={(v) => setPrefs({ autoBreaks: v })} />
            <Toggle label={t.autoFocus} on={pr.autoFocus} onChange={(v) => setPrefs({ autoFocus: v })} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ label, unit, value, min, max, onChange }: { label: string; unit: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  const commit = () => {
    const n = Number(txt);
    if (Number.isFinite(n) && txt.trim() !== '') onChange(clamp(n));
    else setTxt(String(value));
  };
  return (
    <div className="fp-step">
      <span className="fp-step-l">{label}</span>
      <div className="fp-step-c">
        <button type="button" aria-label={`${label} −1`} onClick={() => onChange(clamp(value - 1))} disabled={value <= min}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={txt}
          aria-label={`${label} (${unit})`}
          onChange={(e) => setTxt(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        <button type="button" aria-label={`${label} +1`} onClick={() => onChange(clamp(value + 1))} disabled={value >= max}>
          +
        </button>
        <small>{unit}</small>
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="fp-step">
      <span className="fp-step-l">{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`fp-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
        <i />
      </button>
    </div>
  );
}

/* ───────────────────────────────── timetable ───────────────────────────────── */

const HOUR_PX = 46;

function TimetablePane({ t, lang, blocks, onEdit, onAdd, onStart, compact }: { t: Dict; lang: Lang; blocks: Block[]; onEdit: (b: Block) => void; onAdd: (day: number, start: string) => void; onStart: (b: Block) => void; compact: boolean }) {
  const short = useMemo(() => dayNames(lang, 'short'), [lang]);
  const long = useMemo(() => dayNames(lang, 'long'), [lang]);
  const today = todayIdx();
  const [day, setDay] = useState(today);
  const ws = weekStart();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    return d.getDate();
  });
  const first = Math.min(8, ...blocks.map((b) => Math.floor(toMin(b.start) / 60)));
  const lastH = Math.max(20, ...blocks.map((b) => Math.ceil(toMin(b.end) / 60)));
  const hours = Array.from({ length: lastH - first }, (_, i) => first + i);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = Math.max(0, ((Math.max(nowMin, first * 60 + 60) / 60 - first) - 1.5) * HOUR_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dayBlocks = blocks.filter((b) => b.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));
  const nextHour = `${pad(Math.min(22, now.getHours() + 1))}:00`;

  return (
    <div className={`fp-tt ${compact ? 'compact' : ''}`}>
      <div className="fp-tt-head">
        <h2>{t.timetable}</h2>
        <button type="button" className="fp-btn primary sm" onClick={() => onAdd(blocks.length ? day : today, nextHour)}>
          <I d={Ico.plus} size={16} />
          {t.addBlock}
        </button>
      </div>

      {/* wide: 7-day grid */}
      <div className="fp-grid-wrap">
        <div className="fp-grid-days" aria-hidden="true">
          <span />
          {short.map((d, i) => (
            <span key={i} className={i === today ? 'today' : ''}>
              {d}
              <b>{dates[i]}</b>
            </span>
          ))}
        </div>
        <div className="fp-grid-scroll" ref={scroller}>
          <div className="fp-grid" style={{ height: hours.length * HOUR_PX }}>
            <div className="fp-grid-hours" aria-hidden="true">
              {hours.map((h) => (
                <span key={h} style={{ top: (h - first) * HOUR_PX }}>
                  {pad(h)}:00
                </span>
              ))}
            </div>
            {short.map((dn, i) => (
              <div key={i} className={`fp-col ${i === today ? 'today' : ''}`} role="group" aria-label={long[i]}>
                <button
                  type="button"
                  className="fp-col-add"
                  aria-label={`${t.addBlock} · ${long[i]}`}
                  tabIndex={-1}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const h = first + Math.floor((e.clientY - r.top) / HOUR_PX);
                    onAdd(i, `${pad(Math.min(22, Math.max(0, h)))}:00`);
                  }}
                />
                {hours.map((h) => (
                  <i key={h} className="fp-line" style={{ top: (h - first) * HOUR_PX }} />
                ))}
                {i === today && nowMin >= first * 60 && nowMin <= lastH * 60 && <i className="fp-now" style={{ top: ((nowMin - first * 60) / 60) * HOUR_PX }} />}
                {blocks
                  .filter((b) => b.day === i)
                  .map((b) => {
                    const top = ((toMin(b.start) - first * 60) / 60) * HOUR_PX;
                    const h = Math.max(20, ((toMin(b.end) - toMin(b.start)) / 60) * HOUR_PX - 2);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className={`fp-blk ${h < 34 ? 'tiny' : ''}`}
                        style={{ top, height: h, ['--c' as string]: b.color }}
                        onClick={() => onEdit(b)}
                        aria-label={`${b.subject}, ${dn} ${b.start}–${b.end}`}
                      >
                        <b>{b.subject}</b>
                        <small>
                          {fmtTime(b.start)}–{fmtTime(b.end)}
                        </small>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
        {!blocks.length && <p className="fp-empty fp-grid-empty">{t.emptyTT}</p>}
      </div>

      {/* narrow: day picker + list */}
      <div className="fp-daylist">
        <div className="fp-daychips" role="tablist" aria-label={t.day}>
          {short.map((d, i) => (
            <button key={i} type="button" role="tab" aria-selected={day === i} className={`${day === i ? 'on' : ''} ${i === today ? 'today' : ''}`} onClick={() => setDay(i)}>
              <small>{d}</small>
              <b>{dates[i]}</b>
              {blocks.some((b) => b.day === i) && <i aria-hidden="true" />}
            </button>
          ))}
        </div>
        <h3 className="fp-day-h">
          {long[day]}
          {day === today && <span className="fp-pill">{t.today}</span>}
        </h3>
        {dayBlocks.length ? (
          <ul className="fp-blist">
            {dayBlocks.map((b) => (
              <li key={b.id} style={{ ['--c' as string]: b.color }}>
                <button type="button" className="fp-blist-main" onClick={() => onEdit(b)}>
                  <b>{b.subject}</b>
                  <small>
                    {b.start}–{b.end} · {fmtMin(toMin(b.end) - toMin(b.start))}
                  </small>
                </button>
                <button
                  type="button"
                  className="fp-blist-go"
                  aria-label={`${t.startFocus}: ${b.subject}`}
                  onClick={() => onStart(b)}
                >
                  <I d={Ico.play} size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fp-empty">{blocks.length ? t.emptyDay : t.emptyTT}</p>
        )}
      </div>
    </div>
  );
}

function BlockEditor({
  t,
  lang,
  block,
  isNew,
  onClose,
  onSave,
  onDelete,
  onStart,
}: {
  t: Dict;
  lang: Lang;
  block: Block;
  isNew: boolean;
  onClose: () => void;
  onSave: (b: Block) => void;
  onDelete: (id: string) => void;
  onStart: (b: Block) => void;
}) {
  const [b, setB] = useState(block);
  const [err, setErr] = useState('');
  const long = useMemo(() => dayNames(lang, 'long'), [lang]);
  const save = () => {
    if (!b.subject.trim()) return setErr(t.subjErr);
    if (toMin(b.end) <= toMin(b.start)) return setErr(t.endErr);
    onSave({ ...b, subject: b.subject.trim() });
  };
  return (
    <Sheet onClose={onClose} label={isNew ? t.newBlock : t.editBlock}>
      <h3>{isNew ? t.newBlock : t.editBlock}</h3>
      <form
        className="fp-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label>
          <span>{t.subject}</span>
          <input type="text" value={b.subject} maxLength={40} onChange={(e) => (setB({ ...b, subject: e.target.value }), setErr(''))} placeholder="e.g. Mathematics" />
        </label>
        <label>
          <span>{t.day}</span>
          <select value={b.day} onChange={(e) => setB({ ...b, day: Number(e.target.value) })}>
            {long.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <div className="fp-form-row">
          <label>
            <span>{t.from}</span>
            <input type="time" value={b.start} step={300} onChange={(e) => (setB({ ...b, start: e.target.value || b.start }), setErr(''))} />
          </label>
          <label>
            <span>{t.to}</span>
            <input type="time" value={b.end} step={300} onChange={(e) => (setB({ ...b, end: e.target.value || b.end }), setErr(''))} />
          </label>
        </div>
        <fieldset className="fp-colors">
          <legend>{t.colour}</legend>
          {COLORS.map((c) => (
            <button key={c} type="button" className={b.color === c ? 'on' : ''} style={{ background: c }} aria-label={c} aria-pressed={b.color === c} onClick={() => setB({ ...b, color: c })} />
          ))}
        </fieldset>
        {err && (
          <p className="fp-err" role="alert">
            {err}
          </p>
        )}
        <div className="fp-sheet-actions">
          {!isNew && (
            <button type="button" className="fp-btn danger-text" onClick={() => onDelete(b.id)}>
              {t.del}
            </button>
          )}
          <span className="fp-flex" />
          <button type="button" className="fp-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="fp-btn primary">
            {t.save}
          </button>
        </div>
        {!isNew && (
          <button type="button" className="fp-btn fp-go-wide" onClick={() => onStart(block)}>
            <I d={Ico.play} size={16} />
            {t.startFocus} · {block.subject}
          </button>
        )}
      </form>
    </Sheet>
  );
}

/* ─────────────────────────────────── stats ─────────────────────────────────── */

function StatsPane({ t, lang, log, setLog }: { t: Dict; lang: Lang; log: Session[]; setLog: (l: Session[]) => void }) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const x = window.setTimeout(() => setArm(false), 4000);
    return () => window.clearTimeout(x);
  }, [arm]);
  const short = useMemo(() => dayNames(lang, 'short'), [lang]);
  const ws = weekStart().getTime();
  const tk = dayKey(Date.now());
  const today = log.filter((s) => dayKey(s.at) === tk);
  const todayMin = today.reduce((a, s) => a + s.min, 0);
  const week = Array.from({ length: 7 }, () => 0);
  log.forEach((s) => {
    if (s.at >= ws && s.at < ws + 7 * 86400000 + 3600000) {
      const i = (new Date(s.at).getDay() + 6) % 7;
      week[i] += s.min;
    }
  });
  const weekMin = week.reduce((a, b) => a + b, 0);
  const days = new Set(log.map((s) => dayKey(s.at)));
  let streak = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  const top = Object.entries(
    log
      .filter((s) => s.at >= ws)
      .reduce<Record<string, number>>((a, s) => {
        const k = s.task || t.untitled;
        a[k] = (a[k] ?? 0) + s.min;
        return a;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = Math.max(30, ...week);
  const ti = todayIdx();
  const W = 420;
  const H = 180;
  const bw = 34;
  const gap = (W - 7 * bw) / 7;
  const chartLabel = `${t.chart}: ${short.map((n, i) => `${n} ${Math.round(week[i])} ${t.min}`).join(', ')}`;

  return (
    <div className="fp-stats">
      <div className="fp-tiles">
        <div className="fp-tile">
          <small>{t.today}</small>
          <b>{fmtMin(todayMin)}</b>
          <span>
            {today.length} {t.sessions === 'sessions' ? (today.length === 1 ? 'session' : 'sessions') : t.sessionsL}
          </span>
        </div>
        <div className="fp-tile">
          <small>{t.week}</small>
          <b>{fmtMin(weekMin)}</b>
          <span>{Math.round(weekMin)} {t.min}</span>
        </div>
        <div className="fp-tile">
          <small>{t.sessionsL}</small>
          <b>{log.length}</b>
          <span>{t.total}</span>
        </div>
        <div className="fp-tile streak">
          <small>{t.streak}</small>
          <b>
            <I d={Ico.flame} size={20} />
            {streak}
          </b>
          <span>{streak === 1 ? t.day1 : t.days}</span>
        </div>
      </div>

      <section className="fp-card">
        <h3>{t.week}</h3>
        <svg className="fp-chart" viewBox={`0 0 ${W} ${H + 40}`} role="img" aria-label={chartLabel}>
          {[0.5, 1].map((f) => (
            <line key={f} x1="0" x2={W} y1={H - (H - 24) * f} y2={H - (H - 24) * f} className="fp-chart-grid" />
          ))}
          <line x1="0" x2={W} y1={H} y2={H} className="fp-chart-base" />
          {week.map((m, i) => {
            const h = m > 0 ? Math.max(4, ((H - 24) * m) / max) : 0;
            const x = gap / 2 + i * (bw + gap);
            return (
              <g key={i}>
                {m > 0 && <rect x={x} y={H - h} width={bw} height={h} rx="7" className={`fp-bar-r ${i === ti ? 'today' : ''}`} />}
                {m === 0 && <rect x={x} y={H - 3} width={bw} height="3" rx="1.5" className="fp-bar-zero" />}
                {m > 0 && (
                  <text x={x + bw / 2} y={H - h - 7} textAnchor="middle" className="fp-chart-v">
                    {Math.round(m)}
                  </text>
                )}
                <text x={x + bw / 2} y={H + 24} textAnchor="middle" className={`fp-chart-d ${i === ti ? 'today' : ''}`}>
                  {short[i]}
                </text>
              </g>
            );
          })}
        </svg>
        <table className="fp-sr">
          <caption>{t.chart}</caption>
          <tbody>
            {short.map((n, i) => (
              <tr key={i}>
                <th scope="row">{n}</th>
                <td>
                  {Math.round(week[i])} {t.min}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="fp-two">
        <section className="fp-card">
          <h3>{t.topTasks}</h3>
          {top.length ? (
            <ul className="fp-top">
              {top.map(([k, m]) => (
                <li key={k}>
                  <span>{k}</span>
                  <i style={{ width: `${Math.max(6, (m / top[0][1]) * 100)}%` }} aria-hidden="true" />
                  <b>{fmtMin(m)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fp-empty">{t.noTasks}</p>
          )}
        </section>
        <section className="fp-card">
          <h3>{t.recent}</h3>
          {log.length ? (
            <>
              <ul className="fp-log">
                {log.slice(0, 12).map((s) => (
                  <li key={s.id}>
                    <span>
                      <b>{s.task || t.untitled}</b>
                      <small>{new Date(s.at).toLocaleString(locale(lang), { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small>
                    </span>
                    <em>
                      {s.min} {t.min}
                    </em>
                  </li>
                ))}
              </ul>
              <button type="button" className={`fp-btn sm ${arm ? 'danger' : 'danger-text'}`} onClick={() => (arm ? (setLog([]), setArm(false)) : setArm(true))}>
                {arm ? t.confirm : t.clear}
              </button>
            </>
          ) : (
            <p className="fp-empty">{t.noSessions}</p>
          )}
        </section>
      </div>
    </div>
  );
}

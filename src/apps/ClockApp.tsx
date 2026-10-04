import { ring } from '../system/sounds';
import { cancelTimer, pauseTimer, resumeTimer, startTimer, timerActive, useTimer } from '../system/timer';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { personal } from '../data/portfolio';
import { notify } from '../system/notify';
import { useSettings } from '../system/SettingsContext';
import { readStore, writeStore } from '../system/storage';
import { DragBar, Lights } from '../components/Window';
import type { AppProps } from '../components/Desktop';

type Tab = 'world' | 'alarm' | 'stopwatch' | 'timer';
const TABS: Tab[] = ['world', 'alarm', 'stopwatch', 'timer'];

interface City {
  name: string;
  tz: string;
}
export interface Alarm {
  id: string;
  /** HH:MM (24h) */
  time: string;
  label: string;
  on: boolean;
  /** weekdays 0 (Sun) … 6 (Sat); empty = once */
  days: number[];
}
interface ClockStore {
  cities: City[];
  analog: boolean;
  alarms: Alarm[];
}

const CITIES: City[] = [
  { name: personal.city, tz: personal.timezone },
  { name: 'Colombo', tz: 'Asia/Colombo' },
  { name: 'Dubai', tz: 'Asia/Dubai' },
  { name: 'London', tz: 'Europe/London' },
  { name: 'New York', tz: 'America/New_York' },
  { name: 'Tokyo', tz: 'Asia/Tokyo' },
];

/** Generic, well-known cities for the "+" picker (plus every IANA zone the browser knows). */
const PICK: City[] = [
  { name: 'Cupertino', tz: 'America/Los_Angeles' },
  { name: 'San Francisco', tz: 'America/Los_Angeles' },
  { name: 'Toronto', tz: 'America/Toronto' },
  { name: 'Chicago', tz: 'America/Chicago' },
  { name: 'São Paulo', tz: 'America/Sao_Paulo' },
  { name: 'Paris', tz: 'Europe/Paris' },
  { name: 'Berlin', tz: 'Europe/Berlin' },
  { name: 'Istanbul', tz: 'Europe/Istanbul' },
  { name: 'Riyadh', tz: 'Asia/Riyadh' },
  { name: 'Doha', tz: 'Asia/Qatar' },
  { name: 'Mumbai', tz: 'Asia/Kolkata' },
  { name: 'Chennai', tz: 'Asia/Kolkata' },
  { name: 'Maldives', tz: 'Indian/Maldives' },
  { name: 'Singapore', tz: 'Asia/Singapore' },
  { name: 'Kuala Lumpur', tz: 'Asia/Kuala_Lumpur' },
  { name: 'Hong Kong', tz: 'Asia/Hong_Kong' },
  { name: 'Seoul', tz: 'Asia/Seoul' },
  { name: 'Sydney', tz: 'Australia/Sydney' },
  { name: 'Melbourne', tz: 'Australia/Melbourne' },
  { name: 'Auckland', tz: 'Pacific/Auckland' },
];
const ALL_ZONES: City[] = (() => {
  try {
    const f = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    const zones = f ? f('timeZone') : [];
    return zones.filter((z) => z.includes('/')).map((tz) => ({ name: tz.split('/').pop()!.replace(/_/g, ' '), tz }));
  } catch {
    return [];
  }
})();

const KEY = 'mra-clock-v7';
const DEFAULT: ClockStore = { cities: [], analog: false, alarms: [{ id: 'a1', time: '07:00', label: 'Alarm', on: false, days: [1, 2, 3, 4, 5] }] };
const EVT = 'mra-clock-change';
const RING = 'mra-alarm-ring';
const loadStore = () => readStore<ClockStore>(KEY, DEFAULT);

function parts(tz: string, d: Date) {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(d);
    const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
    return { h: g('hour') % 24, m: g('minute'), s: g('second'), day: g('year') * 10000 + g('month') * 100 + g('day') };
  } catch {
    return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), day: d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() };
  }
}

function offsetLabel(tz: string, d: Date, localTz: string) {
  const a = parts(tz, d);
  const b = parts(localTz, d);
  let diff = (a.h * 60 + a.m - (b.h * 60 + b.m)) / 60;
  const dayWord = a.day > b.day ? 'Tomorrow' : a.day < b.day ? 'Yesterday' : 'Today';
  if (a.day > b.day) diff += diff < 0 ? 24 : 0;
  if (a.day < b.day) diff -= diff > 0 ? 24 : 0;
  const abs = Math.abs(diff);
  return `${dayWord}, ${diff < 0 ? '−' : '+'}${Number.isInteger(abs) ? abs : abs.toFixed(1)}HRS`;
}

const to12 = (h: number, m: number) => ({ t: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, ap: h < 12 ? 'AM' : 'PM' });

function Analog({ h, m, s, dark }: { h: number; m: number; s: number; dark: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={`ck-face ck7-face ${dark ? 'night' : ''}`} aria-hidden="true">
      <circle cx="50" cy="50" r="47" className="f" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * Math.PI) / 6;
        return (
          <text key={i} x={50 + 36 * Math.sin(a)} y={50 - 36 * Math.cos(a)} textAnchor="middle" dominantBaseline="central" fontSize="9" className="n">
            {i + 1}
          </text>
        );
      })}
      <line x1="50" y1="50" x2="50" y2="28" className="hh" transform={`rotate(${(h % 12) * 30 + m / 2} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="16" className="mh" transform={`rotate(${m * 6 + s / 10} 50 50)`} />
      <line x1="50" y1="58" x2="50" y2="12" className="sh" transform={`rotate(${s * 6} 50 50)`} />
      <circle cx="50" cy="50" r="2.5" className="c" />
    </svg>
  );
}

function fmt(ms: number, centis = true) {
  const t = Math.max(0, ms);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const c = Math.floor((t % 1000) / 10);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${h ? `${h}:` : ''}${mm}:${ss}${centis ? `.${String(c).padStart(2, '0')}` : ''}`;
}

/** Plays a short chime with the Web Audio API (no audio file needed). */
/** v10 — alarms and timers ring with the ringtone chosen in Settings → Sounds & Haptics. */
function chime(times = 1) {
  ring(undefined, 0.7, times > 1 ? 30000 : 8000);
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function repeatLabel(days: number[]) {
  if (!days.length) return 'Once';
  if (days.length === 7) return 'Every day';
  const s = [...days].sort().join(',');
  if (s === '1,2,3,4,5') return 'Weekdays';
  if (s === '0,6') return 'Weekends';
  return [...days].sort().map((d) => DAY_NAMES[d]).join(' ');
}

/* ── Alarm scheduler: module-level so alarms keep ringing after the Clock window closes (while the page is open). ── */
let snoozes: { at: number; label: string }[] = [];
let lastFired = '';
let schedulerStarted = false;
function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  window.setInterval(() => {
    const d = new Date();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const stamp = `${d.toDateString()} ${hm}`;
    const ring = (label: string, id?: string) => {
      chime(3);
      notify({ app: 'Clock', icon: 'clock', title: label || 'Alarm', body: `Alarm · ${to12(d.getHours(), d.getMinutes()).t} ${to12(d.getHours(), d.getMinutes()).ap}`, critical: true });
      window.dispatchEvent(new CustomEvent(RING, { detail: { label: label || 'Alarm', id } }));
    };
    const due = snoozes.filter((s) => s.at <= Date.now());
    if (due.length) {
      snoozes = snoozes.filter((s) => s.at > Date.now());
      due.forEach((s) => ring(s.label));
    }
    if (stamp === lastFired) return;
    const st = loadStore();
    let changed = false;
    st.alarms.forEach((a) => {
      if (!a.on || a.time !== hm) return;
      if (a.days.length && !a.days.includes(d.getDay())) return;
      lastFired = stamp;
      ring(a.label, a.id);
      if (!a.days.length) {
        a.on = false;
        changed = true;
      }
    });
    if (changed) {
      writeStore(KEY, st);
      window.dispatchEvent(new Event(EVT));
    }
  }, 1000);
}

/* ── glyphs ── */
const I: Record<Tab, ReactNode> = {
  world: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c2.2 2.3 3 4.8 3 7.5s-.8 5.2-3 7.5M10 2.5c-2.2 2.3-3 4.8-3 7.5s.8 5.2 3 7.5" />
    </svg>
  ),
  alarm: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="11" r="6.3" />
      <path d="M10 7.6V11l2.2 1.6M3 4.6 5.4 2.6M17 4.6l-2.4-2M5.6 16.4 4.4 18M14.4 16.4l1.2 1.6" />
    </svg>
  ),
  stopwatch: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="11.3" r="6.3" />
      <path d="M8 2.2h4M10 2.2V5M10 11.3 12.6 8.7M15.2 5.6l1.2-1.2" />
    </svg>
  ),
  timer: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3.2a6.8 6.8 0 1 1-6.1 3.8" />
      <path d="M10 3.2V6M10 10.6 6.4 7" />
    </svg>
  ),
};
const LABEL: Record<Tab, string> = { world: 'World Clock', alarm: 'Alarm', stopwatch: 'Stopwatch', timer: 'Timer' };

export default function ClockApp({ win }: Partial<AppProps>) {
  const { settings } = useSettings();
  const initial = (): Tab => (TABS.includes((win?.args?.tab ?? '') as Tab) ? (win?.args?.tab as Tab) : 'world');
  const [hist, setHist] = useState<{ list: Tab[]; i: number }>(() => ({ list: [initial()], i: 0 }));
  const tab = hist.list[hist.i];
  const setTab = (t: Tab) =>
    setHist((h) => (h.list[h.i] === t ? h : { list: [...h.list.slice(0, h.i + 1), t], i: h.i + 1 }));
  // re-launching with { tab } (e.g. from Control Center) switches tabs
  useEffect(() => {
    const t = win?.args?.tab as Tab | undefined;
    if (t && TABS.includes(t)) setHist((h) => (h.list[h.i] === t ? h : { list: [...h.list.slice(0, h.i + 1), t], i: h.i + 1 }));
  }, [win?.launchKey, win?.args?.tab]);

  const [now, setNow] = useState(() => new Date());
  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* ── persisted store ── */
  const [store, setStoreState] = useState<ClockStore>(loadStore);
  const setStore = (fn: (s: ClockStore) => ClockStore) => {
    const next = fn(loadStore());
    writeStore(KEY, next);
    setStoreState(next);
    window.dispatchEvent(new Event(EVT));
  };
  useEffect(() => {
    startScheduler();
    const sync = () => setStoreState(loadStore());
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);

  /* ── ringing banner ── */
  const [ringing, setRinging] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setRinging((e as CustomEvent<{ label: string }>).detail.label);
    window.addEventListener(RING, on);
    return () => window.removeEventListener(RING, on);
  }, []);

  /* ── world clock ── */
  const [picker, setPicker] = useState(false);
  const [pq, setPq] = useState('');
  const baseCities = [...(CITIES.some((c) => c.tz === localTz) ? [] : [{ name: 'Your Time', tz: localTz }]), ...CITIES.filter((c, i) => i === 0 || c.tz !== personal.timezone)];
  const cities = [...baseCities.map((c) => ({ ...c, user: false })), ...store.cities.map((c) => ({ ...c, user: true }))];
  const pickResults = useMemo(() => {
    const q = pq.trim().toLowerCase();
    const pool = [...PICK, ...ALL_ZONES];
    const seen = new Set<string>();
    return pool
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.tz.toLowerCase().includes(q))
      .filter((c) => (seen.has(c.name + c.tz) ? false : (seen.add(c.name + c.tz), true)))
      .slice(0, 40);
  }, [pq]);
  const addCity = (c: City) => {
    setStore((s) => ({ ...s, cities: s.cities.some((x) => x.name === c.name && x.tz === c.tz) ? s.cities : [...s.cities, c] }));
    setPicker(false);
    setPq('');
    notify({ app: 'Clock', icon: 'clock', title: `${c.name} added to World Clock` });
  };

  /* ── alarms ── */
  const [edit, setEdit] = useState<Alarm | null>(null);
  const newAlarm = () => {
    const d = new Date(Date.now() + 60000);
    setEdit({ id: `a${Date.now()}`, time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, label: 'Alarm', on: true, days: [] });
  };
  const saveAlarm = (a: Alarm) => {
    setStore((s) => ({ ...s, alarms: s.alarms.some((x) => x.id === a.id) ? s.alarms.map((x) => (x.id === a.id ? a : x)) : [...s.alarms, a].sort((x, y) => x.time.localeCompare(y.time)) }));
    setEdit(null);
  };

  /* ── stopwatch ── */
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsed, setSwElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const swStart = useRef(0);
  const swBase = useRef(0);
  useEffect(() => {
    if (!swRunning) return;
    let raf = 0;
    const loop = () => {
      setSwElapsed(swBase.current + performance.now() - swStart.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [swRunning]);
  const swToggle = () => {
    if (swRunning) {
      swBase.current = swBase.current + performance.now() - swStart.current;
      setSwRunning(false);
    } else {
      swStart.current = performance.now();
      setSwRunning(true);
    }
  };
  const swLapReset = () => {
    if (swRunning) setLaps((l) => [swElapsed, ...l]);
    else {
      swBase.current = 0;
      setSwElapsed(0);
      setLaps([]);
    }
  };
  const lapSplits = laps.map((t, i) => t - (laps[i + 1] ?? 0));
  const best = lapSplits.length > 1 ? Math.min(...lapSplits) : -1;
  const worst = lapSplits.length > 1 ? Math.max(...lapSplits) : -1;

  /* ── timer ── */
  const [tMin, setTMin] = useState(5);
  const [tSec, setTSec] = useState(0);
  const total = (tMin * 60 + tSec) * 1000;
  // v10.2 — the timer itself runs in system/timer.ts (survives closing Clock; Dynamic Island controls it)
  const timer = useTimer();
  const tRunning = timer.end !== null;
  const tLeft: number | null = timerActive(timer) ? timer.left : null;
  const tStart = () => (timer.paused !== null ? resumeTimer() : startTimer(total));
  const tPause = () => pauseTimer();
  const tCancel = () => cancelTimer();
  const progress = tLeft !== null && timer.total ? tLeft / timer.total : 1;

  const plus = tab === 'world' ? () => setPicker(true) : tab === 'alarm' ? newAlarm : null;

  return (
    <div className="clock-app ck7">
      <aside className="ck7-side">
        <DragBar className="ck7-drag">
          <Lights />
        </DragBar>
        <nav className="ck7-nav" role="tablist" aria-label="Clock sections">
          {TABS.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ck7-item ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
              <span className="ck7-ico">{I[id]}</span>
              {LABEL[id]}
            </button>
          ))}
        </nav>
      </aside>

      <section className="ck7-main">
        <DragBar className="ck7-bar">
          <span className="ck7-lights-alt">
            <Lights />
          </span>
          <button type="button" className="ck7-tb" aria-label="Back" disabled={hist.i === 0} onClick={() => setHist((h) => ({ ...h, i: Math.max(0, h.i - 1) }))}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <button type="button" className="ck7-tb" aria-label="Forward" disabled={hist.i >= hist.list.length - 1} onClick={() => setHist((h) => ({ ...h, i: Math.min(h.list.length - 1, h.i + 1) }))}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
          <b className="ck7-bar-title">Clock</b>
          <span className="ck7-sp" />
          {tab === 'world' && (
            <button type="button" className="ck7-tb wide" aria-pressed={store.analog} onClick={() => setStore((s) => ({ ...s, analog: !s.analog }))}>
              {store.analog ? 'List' : 'Analog'}
            </button>
          )}
          {plus && (
            <button type="button" className="ck7-tb" aria-label={tab === 'world' ? 'Add a city' : 'Add an alarm'} onClick={plus}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 2.5v11M2.5 8h11" />
              </svg>
            </button>
          )}
        </DragBar>

        {ringing && (
          <div className="ck7-ring-banner fade-swap" role="alert">
            <span className="ck7-ico">{I.alarm}</span>
            <b>{ringing}</b>
            <span className="ck7-sp" />
            <button
              type="button"
              onClick={() => {
                snoozes.push({ at: Date.now() + 9 * 60000, label: ringing });
                setRinging(null);
              }}
            >
              Snooze 9 min
            </button>
            <button type="button" className="stop" onClick={() => setRinging(null)}>
              Stop
            </button>
          </div>
        )}

        <div className="ck7-scroll scroll-smooth" key={tab}>
          <h1 className="ck7-h1 fade-swap">{LABEL[tab]}</h1>

          {tab === 'world' &&
            (store.analog ? (
              <div className="ck-world ck7-analog fade-swap">
                {cities.map((c) => {
                  const p = parts(c.tz, now);
                  return (
                    <div key={c.name + c.tz} className="ck-city ck7-acity">
                      <Analog {...p} dark={p.h < 6 || p.h >= 18} />
                      <b>{c.name}</b>
                      <span>{offsetLabel(c.tz, now, localTz)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="ck7-rows fade-swap">
                {cities.map((c) => {
                  const p = parts(c.tz, now);
                  const t = to12(p.h, p.m);
                  return (
                    <li key={c.name + c.tz} className="ck7-row">
                      <div className="ck7-row-l">
                        <small>{offsetLabel(c.tz, now, localTz)}</small>
                        <span className="ck7-city">{c.name}</span>
                      </div>
                      <span className="ck7-time">
                        {t.t}
                        <small>{t.ap}</small>
                      </span>
                      {c.user && (
                        <button type="button" className="ck7-del" aria-label={`Remove ${c.name}`} onClick={() => setStore((s) => ({ ...s, cities: s.cities.filter((x) => !(x.name === c.name && x.tz === c.tz)) }))}>
                          −
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ))}

          {tab === 'alarm' && (
            <>
              <ul className="ck7-rows fade-swap">
                {store.alarms.map((a) => {
                  const [h, m] = a.time.split(':').map(Number);
                  const t = to12(h, m);
                  return (
                    <li key={a.id} className={`ck7-row alarm ${a.on ? '' : 'off'}`}>
                      <button type="button" className="ck7-row-l ck7-row-btn" onClick={() => setEdit({ ...a })} aria-label={`Edit alarm ${t.t} ${t.ap}`}>
                        <span className="ck7-time left">
                          {t.t}
                          <small>{t.ap}</small>
                        </span>
                        <small>
                          {a.label}
                          {a.days.length ? `, ${repeatLabel(a.days)}` : ''}
                        </small>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={a.on}
                        aria-label={`${a.label} ${t.t} ${t.ap}`}
                        className={`toggle ck7-toggle ${a.on ? 'on' : ''}`}
                        onClick={() => setStore((s) => ({ ...s, alarms: s.alarms.map((x) => (x.id === a.id ? { ...x, on: !x.on } : x)) }))}
                      >
                        <span />
                      </button>
                    </li>
                  );
                })}
                {!store.alarms.length && <li className="ck7-empty">No Alarms — press + to add one.</li>}
              </ul>
              <p className="ck7-note">Alarms ring with a chime and a notification while this portfolio stays open in your browser.</p>
            </>
          )}

          {tab === 'stopwatch' && (
            <div className="ck-sw ck7-sw fade-swap">
              <div className="ck7-big">{fmt(swElapsed)}</div>
              <div className="ck7-btns">
                <button type="button" className="ck7-round grey" onClick={swLapReset} disabled={!swRunning && swElapsed === 0}>
                  {swRunning || swElapsed === 0 ? 'Lap' : 'Reset'}
                </button>
                <button type="button" className={`ck7-round ${swRunning ? 'red' : 'green'}`} onClick={swToggle}>
                  {swRunning ? 'Stop' : 'Start'}
                </button>
              </div>
              <ol className="ck7-laps">
                {swRunning && (
                  <li>
                    <span>Lap {laps.length + 1}</span>
                    <span>{fmt(swElapsed - (laps[0] ?? 0))}</span>
                  </li>
                )}
                {lapSplits.map((t, i) => (
                  <li key={laps.length - i} className={t === best ? 'best' : t === worst ? 'worst' : ''}>
                    <span>Lap {laps.length - i}</span>
                    <span>{fmt(t)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tab === 'timer' && (
            <div className="ck-timer ck7-timer fade-swap">
              {tLeft === null ? (
                <div className="ck7-pickers">
                  <label>
                    <input type="number" min={0} max={180} value={tMin} onChange={(e) => setTMin(Math.max(0, Math.min(180, Number(e.target.value) || 0)))} aria-label="Minutes" />
                    <span>min</span>
                  </label>
                  <label>
                    <input type="number" min={0} max={59} value={tSec} onChange={(e) => setTSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))} aria-label="Seconds" />
                    <span>sec</span>
                  </label>
                  <div className="ck7-presets">
                    {[1, 5, 10, 25].map((m) => (
                      <button key={m} type="button" onClick={() => (setTMin(m), setTSec(0))}>
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="ck7-ringwrap">
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="54" className="track" />
                    <circle cx="60" cy="60" r="54" className="bar" style={{ strokeDashoffset: `${(1 - progress) * 339.3}`, transition: settings.reduceMotion ? 'none' : undefined }} />
                  </svg>
                  <div className="ck7-ring-time">{fmt(tLeft, false)}</div>
                </div>
              )}
              <div className="ck7-btns">
                <button type="button" className="ck7-round grey" onClick={tCancel} disabled={tLeft === null}>
                  Cancel
                </button>
                {tRunning ? (
                  <button type="button" className="ck7-round orange" onClick={tPause}>
                    Pause
                  </button>
                ) : (
                  <button type="button" className="ck7-round green" onClick={tStart} disabled={total === 0 && !tLeft}>
                    {tLeft ? 'Resume' : 'Start'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {picker && (
        <div className="ck7-sheet-bg fade-swap" onClick={() => setPicker(false)}>
          <div className="ck7-sheet" role="dialog" aria-label="Choose a city" onClick={(e) => e.stopPropagation()}>
            <b>Choose a City</b>
            <input autoFocus value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search" aria-label="Search cities" />
            <ul className="ck7-pick scroll-smooth">
              {pickResults.map((c) => (
                <li key={c.name + c.tz}>
                  <button type="button" onClick={() => addCity(c)}>
                    <span>{c.name}</span>
                    <small>{c.tz.replace(/_/g, ' ')}</small>
                  </button>
                </li>
              ))}
              {!pickResults.length && <li className="ck7-empty">No matching city.</li>}
            </ul>
            <button type="button" className="btn" onClick={() => setPicker(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {edit && (
        <div className="ck7-sheet-bg fade-swap" onClick={() => setEdit(null)}>
          <form
            className="ck7-sheet"
            role="dialog"
            aria-label="Edit alarm"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              saveAlarm({ ...edit, on: true });
            }}
          >
            <b>{store.alarms.some((a) => a.id === edit.id) ? 'Edit Alarm' : 'Add Alarm'}</b>
            <input type="time" className="ck7-timein" value={edit.time} required onChange={(e) => setEdit({ ...edit, time: e.target.value })} aria-label="Alarm time" />
            <label className="ck7-field">
              <span>Label</span>
              <input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} maxLength={40} />
            </label>
            <div className="ck7-field">
              <span>Repeat</span>
              <div className="ck7-days">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={DAY_NAMES[i]}
                    aria-pressed={edit.days.includes(i)}
                    className={edit.days.includes(i) ? 'on' : ''}
                    onClick={() => setEdit({ ...edit, days: edit.days.includes(i) ? edit.days.filter((x) => x !== i) : [...edit.days, i] })}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="ck7-sheet-btns">
              {store.alarms.some((a) => a.id === edit.id) && (
                <button
                  type="button"
                  className="btn ck7-danger"
                  onClick={() => {
                    setStore((s) => ({ ...s, alarms: s.alarms.filter((a) => a.id !== edit.id) }));
                    setEdit(null);
                  }}
                >
                  Delete
                </button>
              )}
              <span className="ck7-sp" />
              <button type="button" className="btn" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSystem } from '../system/SystemContext';
import { NEW_WIDGETS, useCustomize, WIDGETS, type WidgetId } from '../system/customize';
import { ConfirmDialog } from './ConfirmDialog';
import { personal, projects, socials } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { openExternal } from '../system/notify';
import { readStore, writeStore } from '../system/storage';
import { LISTS, useReminders } from '../system/reminders';
import { fmtTime, useMusic } from '../system/MusicContext';
import { fmtDuration, useScreenTime } from '../system/screenTime';
import { APPS } from '../system/apps';
import { AppIcon } from './AppIcons';
import type { AppId } from '../system/types';
import { useFreeDrag, useWidgetPositions, type Pos } from '../system/desk';
import { renderExtraWidget } from './WidgetsExtra';

function useTick(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

function timeIn(tz: string, d: Date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return { h: get('hour') % 24, m: get('minute'), s: get('second') };
  } catch {
    return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
  }
}

function Clock({ tz, label, now, editable, onEdit }: { tz: string; label: string; now: Date; editable?: boolean; onEdit?: () => void }) {
  const { h, m, s } = timeIn(tz, now);
  const hourA = (h % 12) * 30 + m * 0.5;
  const minA = m * 6 + s * 0.1;
  const secA = s * 6;
  const digital = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return (
    <div className="clock">
      <svg viewBox="0 0 100 100" className="clock-face" role="img" aria-label={`${label}: ${digital}`}>
        <circle cx="50" cy="50" r="48" className="face" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="50" y1="8" x2="50" y2={i % 3 === 0 ? 15 : 12} className="tick" transform={`rotate(${i * 30} 50 50)`} />
        ))}
        <line x1="50" y1="50" x2="50" y2="27" className="hand hour" transform={`rotate(${hourA} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="15" className="hand min" transform={`rotate(${minA} 50 50)`} />
        <line x1="50" y1="58" x2="50" y2="12" className="hand sec" transform={`rotate(${secA} 50 50)`} />
        <circle cx="50" cy="50" r="2.6" className="pin" />
      </svg>
      {editable ? (
        <button type="button" className="clock-label edit" onClick={onEdit} aria-label="Change your time zone">
          {label} ✎
        </button>
      ) : (
        <div className="clock-label">{label}</div>
      )}
      <div className="clock-digital">{digital}</div>
    </div>
  );
}

const ZONES = [
  'Asia/Colombo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
];

export function Widgets() {
  const now = useTick(1000);
  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);
  const [yourTz, setYourTz] = useState<string>(() => readStore('mra-your-tz', { tz: localTz }).tz);
  const [tzEditing, setTzEditing] = useState(false);
  const cz = useCustomize();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState<WidgetId | null>(null);
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [pos, setPos] = useWidgetPositions();
  const freeOn = vp.w >= 700; // free placement on desktops/tablets; phones keep the column layout
  const freeIds = freeOn ? cz.widgets.filter((w) => pos[w]) : [];

  const zoneList = ZONES.includes(localTz) ? ZONES : [localTz, ...ZONES];

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const onEdit = () => setEdit(true);
    window.addEventListener('resize', onResize);
    window.addEventListener('mra-edit-widgets', onEdit);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mra-edit-widgets', onEdit);
    };
  }, []);
  useEffect(() => {
    if (!edit) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !confirm && setEdit(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [edit, confirm]);

  const render = (id: WidgetId) => {
    switch (id) {
      case 'calendar':
        return <Calendar now={now} />;
      case 'clocks':
        return (
          <div className="widget clocks">
            <Clock tz={personal.timezone} label={personal.city} now={now} />
            <Clock tz={yourTz} label="Your Time" now={now} editable onEdit={() => setTzEditing((e) => !e)} />
            {tzEditing && (
              <select
                className="tz-select"
                aria-label="Your time zone"
                value={yourTz}
                autoFocus
                onChange={(e) => {
                  setYourTz(e.target.value);
                  writeStore('mra-your-tz', { tz: e.target.value });
                  setTzEditing(false);
                }}
                onBlur={() => setTzEditing(false)}
              >
                {zoneList.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      case 'screentime':
        return <ScreenTimeWidget />;
      case 'weather':
        return <WeatherWidget />;
      case 'github':
        return <GitHubWidget />;
      case 'current':
        return <CurrentProjectWidget />;
      case 'music':
        return <MusicWidget />;
      case 'reminders':
        return <RemindersWidget />;
      default:
        return renderExtraWidget(id);
    }
  };

  // Lay the widgets out in up to 3 aligned columns that never run under the Dock.
  const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-size')) || 48;
  const avail = vp.h - 26 - dock - 60;
  const maxCols = vp.w < 700 ? 1 : vp.w < 1000 ? 2 : 3;
  const cols: WidgetId[][] = [[]];
  let colH = 0;
  for (const id of cz.widgets.filter((w) => !freeOn || !pos[w])) {
    const h = (WIDGETS.find((w) => w.id === id)?.h ?? 120) + 12;
    if (colH + h > avail && cols[cols.length - 1].length) {
      if (cols.length >= maxCols) break;
      cols.push([]);
      colH = 0;
    }
    cols[cols.length - 1].push(id);
    colH += h;
  }

  const move = (from: WidgetId, to: WidgetId) => {
    if (from === to) return;
    const list = cz.widgets.filter((x) => x !== from);
    list.splice(list.indexOf(to), 0, from);
    cz.setWidgets(list);
  };

  const slotProps = (id: WidgetId) => ({
    id,
    edit,
    dragging: dragId === id,
    freeEnabled: freeOn && !edit,
    setDragId,
    move,
    setEdit,
    setConfirm,
    placed: !!pos[id],
    onPlace: (p: Pos) => setPos((m) => ({ ...m, [id]: p })),
    onUnplace: () =>
      setPos((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      }),
    onResetAll: () => setPos({}),
    children: render(id),
  });

  const confirmMeta = confirm ? WIDGETS.find((w) => w.id === confirm) : undefined;

  return (
    <>
      <aside className={`widgets ${edit ? 'wg-editing' : ''}`} aria-label="Widgets">
        {cols.map((col, ci) => (
          <div key={ci} className="widget-col">
            {col.map((id) => (
              <WidgetSlot key={id} {...slotProps(id)} />
            ))}
          </div>
        ))}
      </aside>
      {freeIds.length > 0 && (
        <div className="widgets-free" aria-label="Placed widgets">
          {freeIds.map((id) => (
            <WidgetSlot key={id} {...slotProps(id)} pos={pos[id]} />
          ))}
        </div>
      )}
      {edit &&
        createPortal(
          <div className="wg-gallery" role="dialog" aria-label="Widget gallery">
            <div className="wg-g-head">
              <b>Add Widgets</b>
              <span>Click + to add a widget · − to remove · drag widgets anywhere on the desktop</span>
              <button type="button" className="btn btn-primary" onClick={() => setEdit(false)}>
                Done
              </button>
            </div>
            <div className="wg-g-list">
              {WIDGETS.map((w) => {
                const on = cz.widgets.includes(w.id);
                return (
                  <button key={w.id} type="button" className={`wg-g-item ${on ? 'on' : ''}`} onClick={() => (on ? setConfirm(w.id) : cz.addWidget(w.id))}>
                    <span className="wg-g-ico">
                      <AppIcon name={w.icon} />
                    </span>
                    <span className="wg-g-label">
                      {w.label}
                      {NEW_WIDGETS.has(w.id) && !on && <em className="wg-g-new"> NEW</em>}
                    </span>
                    <span className="wg-g-state" aria-hidden="true">
                      {on ? '−' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
      {confirm && confirmMeta && (
        <ConfirmDialog
          icon={confirmMeta.icon}
          message={`Are you sure you want to remove the “${confirmMeta.label}” widget?`}
          detail="It will be moved to the Trash — you can put it back from there or from the widget gallery."
          confirmLabel="Remove"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            cz.removeWidget(confirm);
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}

interface SlotProps {
  id: WidgetId;
  edit: boolean;
  dragging: boolean;
  freeEnabled: boolean;
  placed: boolean;
  pos?: Pos;
  setDragId: (id: WidgetId | null) => void;
  move: (from: WidgetId, to: WidgetId) => void;
  setEdit: (v: boolean) => void;
  setConfirm: (id: WidgetId) => void;
  onPlace: (p: Pos) => void;
  onUnplace: () => void;
  onResetAll: () => void;
  children: ReactNode;
}

/** One widget on the desktop: free-drag to place it anywhere (v9), reorder in edit mode, right-click menu. */
function WidgetSlot({ id, edit, dragging, freeEnabled, placed, pos, setDragId, move, setEdit, setConfirm, onPlace, onUnplace, onResetAll, children }: SlotProps) {
  const sys = useSystem();
  const drag = useFreeDrag({ enabled: freeEnabled, onDrop: (p) => onPlace(p), ignore: 'input, select, textarea, .wg-remove, .tz-select' });
  return (
    <div
      className={`wg-slot ${dragging ? 'dragging' : ''} ${pos ? 'wg-placed' : ''}`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      draggable={edit && !pos}
      onPointerDown={drag.onPointerDown}
      onDragStart={(e) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
      }}
      onDragOver={(e) => edit && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = (e.dataTransfer.getData('text/plain') || null) as WidgetId | null;
        if (from) move(from, id);
        setDragId(null);
      }}
      onDragEnd={() => setDragId(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        sys.setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: 'Edit Widgets…', action: () => setEdit(true) },
            { label: 'Add Widgets…', action: () => setEdit(true) },
            { label: '', sep: true },
            ...(placed ? [{ label: 'Return to Widget Column', action: onUnplace }] : []),
            { label: 'Arrange All Widgets in Columns', action: onResetAll },
            { label: '', sep: true },
            { label: 'Remove Widget', action: () => setConfirm(id) },
          ],
        });
      }}
      onClickCapture={(e) => {
        // while editing (or right after a drag) widgets don't open their apps
        if ((edit && !(e.target as HTMLElement).closest('.wg-remove')) || drag.wasDragged()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {edit && (
        <button type="button" className="wg-remove" aria-label={`Remove ${WIDGETS.find((w) => w.id === id)?.label} widget`} onClick={() => setConfirm(id)}>
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2.5 5h5" />
          </svg>
        </button>
      )}
      {children}
    </div>
  );
}

function Calendar({ now }: { now: Date }) {
  const y = now.getFullYear();
  const mo = now.getMonth();
  const today = now.getDate();
  const cells = useMemo(() => {
    const first = new Date(y, mo, 1).getDay();
    const days = new Date(y, mo + 1, 0).getDate();
    const prevDays = new Date(y, mo, 0).getDate();
    const out: { d: number; cur: boolean }[] = [];
    for (let i = first - 1; i >= 0; i--) out.push({ d: prevDays - i, cur: false });
    for (let d = 1; d <= days; d++) out.push({ d, cur: true });
    let n = 1;
    while (out.length % 7 !== 0) out.push({ d: n++, cur: false });
    return out;
  }, [y, mo]);
  const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  return (
    <div className="widget calendar" aria-label={`Calendar, ${month} ${y}`}>
      <div className="cal-month">{month}</div>
      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="cal-dow">
            {d}
          </span>
        ))}
        {cells.map((c, i) => (
          <span key={i} className={`cal-day ${c.cur ? '' : 'muted'} ${c.cur && c.d === today ? 'today' : ''}`}>
            {c.d}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────── New widgets ─────────────────────────────── */

const WMO: Record<number, [string, string]> = {
  0: ['☀️', 'Clear'],
  1: ['🌤', 'Mainly clear'],
  2: ['⛅️', 'Partly cloudy'],
  3: ['☁️', 'Overcast'],
  45: ['🌫', 'Fog'],
  48: ['🌫', 'Fog'],
  51: ['🌦', 'Drizzle'],
  53: ['🌦', 'Drizzle'],
  55: ['🌦', 'Drizzle'],
  61: ['🌧', 'Rain'],
  63: ['🌧', 'Rain'],
  65: ['🌧', 'Heavy rain'],
  80: ['🌦', 'Showers'],
  81: ['🌧', 'Showers'],
  82: ['⛈', 'Heavy showers'],
  95: ['⛈', 'Thunderstorm'],
  96: ['⛈', 'Thunderstorm'],
  99: ['⛈', 'Thunderstorm'],
};

/** Live Kandy weather from the free Open-Meteo API (no key); hides gracefully offline. */
function WeatherWidget() {
  const [w, setW] = useState<{ t: number; code: number; hi: number; lo: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('https://api.open-meteo.com/v1/forecast?latitude=7.2906&longitude=80.6337&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FColombo&forecast_days=1', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setW({ t: d.current.temperature_2m, code: d.current.weather_code, hi: d.daily.temperature_2m_max[0], lo: d.daily.temperature_2m_min[0] }))
      .catch(() => setFailed(true));
    return () => ctrl.abort();
  }, []);
  const [emoji, label] = w ? (WMO[w.code] ?? ['🌡', 'Weather']) : ['🌤', failed ? 'Weather unavailable' : 'Loading…'];
  return (
    <div className="widget weather" aria-label={`Weather in ${personal.city}`}>
      <div className="wx-city">{personal.city}</div>
      <div className="wx-temp">{w ? `${Math.round(w.t)}°` : '—'}</div>
      <div className="wx-cond">
        <span aria-hidden="true">{emoji}</span> {label}
      </div>
      {w && (
        <div className="wx-hl">
          H:{Math.round(w.hi)}° L:{Math.round(w.lo)}°
        </div>
      )}
    </div>
  );
}

/** GitHub activity summary from verified portfolio data. */
function GitHubWidget() {
  const repos = projects.filter((p) => p.repo);
  const langs = Array.from(new Set(repos.map((p) => ({ php: 'PHP', js: 'JavaScript', jsx: 'JavaScript', java: 'Java', py: 'Python', html: 'HTML' })[p.lang])));
  const latest = [...repos].sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''))[0];
  return (
    <button type="button" className="widget gh-widget" onClick={() => openExternal(socials.github, { title: 'Opening GitHub — Ahamed369', app: 'GitHub', icon: 'github' })}>
      <div className="gh-head">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
        </svg>
        <b>{socials.githubHandle}</b>
      </div>
      <div className="gh-num">
        {repos.length}
        <span>public repos</span>
      </div>
      <div className="gh-langs">{langs.join(' · ')}</div>
      {latest && <div className="gh-latest">Latest: {latest.name}</div>}
    </button>
  );
}

/** Projects currently in progress (period ends in "Present"). */
function CurrentProjectWidget() {
  const wm = useWM();
  const current = projects.filter((p) => p.period?.includes('Present'));
  const p = current[0] ?? projects[0];
  return (
    <button type="button" className="widget current-widget" onClick={() => wm.open('xcode', { project: p.id })} style={{ ['--pa' as string]: p.preview.accent }}>
      <div className="cw-label">CURRENT PROJECT{current.length > 1 ? `S · ${current.length}` : ''}</div>
      <b>{p.name}</b>
      <span>{p.category}</span>
      {current.length > 1 && <span className="cw-more">+ {current.slice(1).map((x) => x.name).join(', ')}</span>}
    </button>
  );
}

/** Now Playing — controls the same player as the Music app. */
function MusicWidget() {
  const wm = useWM();
  const m = useMusic();
  const pct = m.duration ? (m.currentTime / m.duration) * 100 : 0;
  return (
    <div className={`widget music-widget ${m.playing ? 'playing' : ''}`} style={{ ['--a1' as string]: m.track.art[0], ['--a2' as string]: m.track.art[1] }}>
      <button type="button" className="mw-top" onClick={() => wm.open('music')} aria-label={`Open Music — ${m.track.title}`}>
        <span className="mw-art" aria-hidden="true">
          <span className="mw-eq">
            <i />
            <i />
            <i />
          </span>
        </span>
        <span className="mw-meta">
          <small>{m.playing ? 'NOW PLAYING' : 'MUSIC'}</small>
          <b>{m.track.title}</b>
          <span>{m.track.artist}</span>
        </span>
      </button>
      <div className="mw-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="mw-times" aria-hidden="true">
        <span>{fmtTime(m.currentTime)}</span>
        <span>{m.duration ? `-${fmtTime(Math.max(0, m.duration - m.currentTime))}` : '--:--'}</span>
      </div>
      <div className="mw-ctrl">
        <button type="button" onClick={m.prev} aria-label="Previous track">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 12 20 5v14zM3 12l8-7v14z" />
          </svg>
        </button>
        <button type="button" className="mw-play" onClick={m.toggle} aria-label={m.playing ? 'Pause' : 'Play'}>
          {m.playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4v16l13-8z" />
            </svg>
          )}
        </button>
        <button type="button" onClick={m.next} aria-label="Next track">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 12 4 5v14zM21 12l-8-7v14z" />
          </svg>
        </button>
      </div>
      {m.error && <div className="mw-err">{m.error}</div>}
    </div>
  );
}

/** Reminders — tick items off right on the desktop; synced with the Reminders app. */
function RemindersWidget() {
  const wm = useWM();
  const [items, setItems] = useReminders();
  const open = items.filter((i) => !i.done);
  const shown = open.slice(0, 4);
  const [leaving, setLeaving] = useState<string | null>(null);

  const complete = (id: string) => {
    setLeaving(id);
    window.setTimeout(() => {
      setItems((l) => l.map((i) => (i.id === id ? { ...i, done: true } : i)));
      setLeaving(null);
    }, 380);
  };

  return (
    <div className="widget rem-widget">
      <button type="button" className="rw-head" onClick={() => wm.open('reminders')} aria-label={`Open Reminders — ${open.length} left`}>
        <span className="rw-ico" aria-hidden="true">
          ☰
        </span>
        <b>{open.length}</b>
        <span>Reminders</span>
      </button>
      {shown.length ? (
        <ul>
          {shown.map((i) => (
            <li key={i.id} className={leaving === i.id ? 'leaving' : ''}>
              <button type="button" className="rw-check" style={{ ['--c' as string]: LISTS.find((l) => l.id === i.list)?.color }} onClick={() => complete(i.id)} aria-label={`Complete “${i.text}”`}>
                <span />
              </button>
              <button type="button" className="rw-text" onClick={() => wm.open(i.app ?? 'reminders')}>
                {i.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rw-done">All done 🎉</div>
      )}
      {open.length > shown.length && <div className="rw-more">+{open.length - shown.length} more</div>}
    </div>
  );
}

/** Screen Time — real usage of this portfolio today (stored on this device only). */
function ScreenTimeWidget() {
  const wm = useWM();
  const st = useScreenTime();
  const top = (Object.entries(st.perApp) as [AppId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const max = Math.max(60000, ...st.hours);
  const hour = new Date().getHours();
  return (
    <button type="button" className="widget st-widget" onClick={() => wm.open('settings', { pane: 'screentime' })} aria-label={`Screen Time today: ${fmtDuration(st.total)}. Open Screen Time settings`}>
      <div className="stw-head">
        <span className="stw-ico" aria-hidden="true">
          <AppIcon name="screentime" />
        </span>
        <span>Screen Time</span>
      </div>
      <div className="stw-total">{fmtDuration(st.total)}</div>
      <div className="stw-bars" aria-hidden="true">
        {st.hours.map((ms, h) => (
          <i key={h} className={h === hour ? 'now' : ''} style={{ height: `${Math.max(4, (ms / max) * 100)}%` }} />
        ))}
      </div>
      {top.length ? (
        <ul className="stw-apps">
          {top.map(([id, ms]) => (
            <li key={id}>
              <AppIcon name={APPS[id].icon} className="stw-app-ico" />
              <span>{APPS[id].menuName}</span>
              <b>{fmtDuration(ms)}</b>
            </li>
          ))}
        </ul>
      ) : (
        <div className="stw-empty">Open an app to see usage</div>
      )}
    </button>
  );
}

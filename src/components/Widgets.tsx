import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSystem } from '../system/SystemContext';
import { useCustomize, WIDGET_GROUPS, WIDGETS, type WidgetId } from '../system/customize';
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
import { findWidgetSlot, useFreeDrag, useWidgetPositions, type Pos, type Rect } from '../system/desk';
import { renderExtraWidget } from './WidgetsExtra';
import { SysIcon, WxIcon, wxKind } from './SysIcons';

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
          {label} <SysIcon n="pencil" size={9} />
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

/** v10.3 — one desktop widget's content, usable on the desktop, in Notification Center and in the gallery */
export function WidgetBody({ id, preview }: { id: WidgetId; preview?: boolean }) {
  const now = useTick(preview ? 30000 : 1000);
  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);
  const [yourTz, setYourTz] = useState<string>(() => readStore('mra-your-tz', { tz: localTz }).tz);
  const [tzEditing, setTzEditing] = useState(false);
  const zoneList = ZONES.includes(localTz) ? ZONES : [localTz, ...ZONES];
  switch (id) {
    case 'calendar':
      return <Calendar now={now} />;
    case 'clocks':
      return (
        <div className="widget clocks">
          <Clock tz={personal.timezone} label={personal.city} now={now} />
          <Clock tz={yourTz} label="Your Time" now={now} editable={!preview} onEdit={() => setTzEditing((e) => !e)} />
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
      return <>{renderExtraWidget(id)}</>;
  }
}

/** v10.3 — what clicking each Mac widget opens (widgets with their own buttons keep those) */
const WIDGET_TARGET: Partial<Record<WidgetId, [AppId, Record<string, string>?]>> = {
  calendar: ['calendar'],
  clocks: ['clock', { tab: 'world' }],
  digital: ['clock', { tab: 'world' }],
  weather: ['weather'],
  battery: ['settings', { pane: 'battery' }],
  sysinfo: ['activity'],
  pomodoro: ['focusplanner', { tab: 'timer' }],
  quicknote: ['stickies'],
  contact: ['contacts'],
};

/** rectangles of every widget on the desktop except `skip` (for snapping / collisions) */
const widgetRects = (skip?: Element | null): Rect[] =>
  [...document.querySelectorAll('.desktop .wg-slot')]
    .filter((el) => el !== skip && !el.classList.contains('wg-in-nc'))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    })
    .filter((r) => r.w > 0 && r.h > 0);

export function Widgets() {
  const cz = useCustomize();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState<WidgetId | null>(null);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [pos, setPos] = useWidgetPositions();
  const [snapPrev, setSnapPrev] = useState<{ p: Pos; w: number; h: number } | null>(null);
  const others = useRef<Rect[]>([]);
  const freeOn = vp.w >= 700; // free placement on desktops/tablets; phones keep the column layout
  const freeIds = freeOn ? cz.widgets.filter((w) => pos[w]) : [];

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
  useEffect(() => {
    document.documentElement.toggleAttribute('data-widget-edit', edit);
    return () => document.documentElement.removeAttribute('data-widget-edit');
  }, [edit]);

  // v10.3 — when editing starts, pin every column widget where it is, so each one can be moved on its own
  useLayoutEffect(() => {
    if (!edit || !freeOn) return;
    const missing = cz.widgets.filter((w) => !pos[w]);
    if (!missing.length) return;
    const add: Record<string, Pos> = {};
    missing.forEach((w) => {
      const el = document.querySelector(`.desktop .wg-slot[data-wid="${w}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width) add[w] = { x: Math.round(r.left), y: Math.round(r.top) };
    });
    if (Object.keys(add).length) setPos((m) => ({ ...m, ...add }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

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

  /** first free slot for a newly added widget (top-left first, like macOS) */
  const placeNew = (id: WidgetId, at?: Pos) => {
    const meta = WIDGETS.find((w) => w.id === id);
    const h = meta?.h ?? 140;
    const w = 170;
    const slot = findWidgetSlot(at?.x ?? 14, at?.y ?? 40, w, h, widgetRects());
    if (!cz.widgets.includes(id)) cz.addWidget(id);
    if (freeOn && slot) setPos((m) => ({ ...m, [id]: slot }));
  };

  const slotProps = (id: WidgetId) => ({
    id,
    edit,
    freeEnabled: freeOn && edit,
    setEdit,
    setConfirm,
    placed: !!pos[id],
    onStart: (el: HTMLElement) => {
      others.current = widgetRects(el);
    },
    resolve: (x: number, y: number, w: number, h: number) => findWidgetSlot(x, y, w, h, others.current),
    onPreview: (p: Pos | null, w: number, h: number) => setSnapPrev(p ? { p, w, h } : null),
    onPlace: (p: Pos) => setPos((m) => ({ ...m, [id]: p })),
    onToNc: () => {
      cz.addNcWidget(id);
      cz.setWidgets(cz.widgets.filter((x) => x !== id));
    },
    onUnplace: () =>
      setPos((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      }),
    onResetAll: () => setPos({}),
    children: <WidgetBody id={id} />,
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
        <div className={`widgets-free ${edit ? 'wg-editing' : ''}`} aria-label="Placed widgets">
          {freeIds.map((id) => (
            <WidgetSlot key={id} {...slotProps(id)} pos={pos[id]} />
          ))}
        </div>
      )}
      {snapPrev && <div className="wg-snap" style={{ left: snapPrev.p.x, top: snapPrev.p.y, width: snapPrev.w, height: snapPrev.h }} aria-hidden="true" />}
      {edit && (
        <WidgetGallery
          onClose={() => setEdit(false)}
          onAdd={(id, at) => placeNew(id, at)}
          onAddNc={(id) => cz.addNcWidget(id)}
          placed={cz.widgets}
          inNc={cz.ncWidgets}
        />
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
  freeEnabled: boolean;
  placed: boolean;
  pos?: Pos;
  setEdit: (v: boolean) => void;
  setConfirm: (id: WidgetId) => void;
  onStart: (el: HTMLElement) => void;
  resolve: (x: number, y: number, w: number, h: number) => Pos | null;
  onPreview: (p: Pos | null, w: number, h: number) => void;
  onPlace: (p: Pos) => void;
  onToNc: () => void;
  onUnplace: () => void;
  onResetAll: () => void;
  children: ReactNode;
}

/**
 * One widget on the desktop. v10.3: widgets only move in edit mode (Edit Widgets…),
 * snap to the widget grid, never overlap and stay clear of the menu bar and Dock.
 * Dropping one on the right edge of the screen moves it into Notification Center.
 */
function WidgetSlot({ id, edit, freeEnabled, placed, pos, setEdit, setConfirm, onStart, resolve, onPreview, onPlace, onToNc, onUnplace, onResetAll, children }: SlotProps) {
  const sys = useSystem();
  const wm = useWM();
  const [ncHot, setNcHot] = useState(false);
  const ncRef = useRef(false);
  const drag = useFreeDrag({
    enabled: freeEnabled,
    onDrop: (p) => onPlace(p),
    ignore: 'input, select, textarea, .wg-remove, .tz-select',
    onStart,
    resolve: (x, y, w, h) => {
      const hot = x + w > window.innerWidth - 40;
      if (hot !== ncRef.current) setNcHot(hot);
      ncRef.current = hot;
      return hot ? null : resolve(x, y, w, h);
    },
    onPreview,
    onEnd: () => {
      if (ncRef.current) onToNc();
      ncRef.current = false;
      setNcHot(false);
    },
  });
  return (
    <div
      className={`wg-slot ${pos ? 'wg-placed' : ''} ${edit ? 'wg-edit' : ''} ${WIDGET_TARGET[id] ? 'wg-link' : ''}`}
      data-wid={id}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      onPointerDown={drag.onPointerDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        sys.setContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: 'Edit Widgets…', action: () => setEdit(true) },
            { label: '', sep: true },
            ...(placed ? [{ label: 'Return to Widget Column', action: onUnplace }] : []),
            { label: 'Arrange All Widgets in Columns', action: onResetAll },
            { label: 'Move to Notification Center', action: onToNc },
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
      onClick={(e) => {
        // a click anywhere that isn't one of the widget's own controls opens its app
        if (edit || (e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"], .tz-select')) return;
        const t = WIDGET_TARGET[id];
        if (t) wm.open(t[0], t[1]);
      }}
    >
      {edit && (
        <button type="button" className="wg-remove" aria-label={`Remove ${WIDGETS.find((w) => w.id === id)?.label} widget`} onClick={() => setConfirm(id)}>
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2.5 5h5" />
          </svg>
        </button>
      )}
      {ncHot && <span className="wg-nc-hint">Notification Center</span>}
      {children}
    </div>
  );
}

/* ───────────── v10.3 — Widget gallery (like macOS Sonoma) ───────────── */

function WidgetGallery({ onClose, onAdd, onAddNc, placed, inNc }: { onClose: () => void; onAdd: (id: WidgetId, at?: Pos) => void; onAddNc: (id: WidgetId) => void; placed: WidgetId[]; inNc: WidgetId[] }) {
  const [sel, setSel] = useState<string>('all');
  const [q, setQ] = useState('');
  const [drag, setDrag] = useState<{ id: WidgetId; x: number; y: number; w: number; h: number; nc: boolean; over: boolean } | null>(null);
  const ql = q.trim().toLowerCase();
  const groups = WIDGET_GROUPS.filter((g) => !ql || `${g.app} ${g.ids.map((i) => WIDGETS.find((w) => w.id === i)?.label).join(' ')}`.toLowerCase().includes(ql));
  const suggestions: WidgetId[] = ['clocks', 'calendar', 'photoframe', 'battery', 'quicknote', 'weather', 'reminders', 'contact'];
  const label = (id: WidgetId) => WIDGETS.find((w) => w.id === id)?.label ?? id;
  const shown = sel === 'all' ? null : WIDGET_GROUPS.find((g) => g.app === sel);

  /** drag a preview out of the gallery onto the desktop / into Notification Center (click adds it too) */
  const startDrag = (e: RPointerEvent<HTMLButtonElement>, id: WidgetId) => {
    if (e.button !== 0) return;
    const card = e.currentTarget.querySelector('.wgg-prev') as HTMLElement | null;
    const r = (card ?? e.currentTarget).getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = sx - r.left;
    const oy = sy - r.top;
    let on = false;
    const gallery = document.querySelector('.wgg')?.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      if (!on && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      on = true;
      const nc = ev.clientX > window.innerWidth - 120;
      const over = !!gallery && ev.clientX > gallery.left && ev.clientX < gallery.right && ev.clientY > gallery.top && ev.clientY < gallery.bottom;
      setDrag({ id, x: ev.clientX - ox, y: ev.clientY - oy, w: r.width, h: r.height, nc, over });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      if (!on) return;
      if (ev.clientX > window.innerWidth - 120) onAddNc(id);
      else if (!(gallery && ev.clientX > gallery.left && ev.clientX < gallery.right && ev.clientY > gallery.top && ev.clientY < gallery.bottom)) onAdd(id, { x: ev.clientX - ox, y: ev.clientY - oy });
      suppress.current = performance.now();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const suppress = useRef(0);

  const card = (id: WidgetId, big = false) => {
    const on = placed.includes(id);
    return (
      <button
        key={id}
        type="button"
        className={`wgg-card ${big ? 'big' : ''} ${on ? 'on' : ''}`}
        onPointerDown={(e) => startDrag(e, id)}
        onClick={() => performance.now() - suppress.current > 300 && !on && onAdd(id)}
        title={on ? `${label(id)} is on the desktop` : `Add ${label(id)} — or drag it to the desktop or Notification Center`}
        aria-label={on ? `${label(id)} (on the desktop)` : `Add ${label(id)} widget`}
      >
        <span className="wgg-prev" aria-hidden="true" inert>
          <WidgetBody id={id} preview />
        </span>
        <span className="wgg-name">
          {label(id)}
          {inNc.includes(id) && <small> · in Notification Center</small>}
        </span>
        {!on && <i className="wgg-plus">+</i>}
      </button>
    );
  };

  return createPortal(
    <>
      <div className="wgg" role="dialog" aria-label="Widget gallery">
        <aside className="wgg-side">
          <label className="wgg-search">
            <SysIcon n="search" size={13} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Widgets" aria-label="Search Widgets" autoFocus />
          </label>
          <nav aria-label="Widget apps">
            <button type="button" className={sel === 'all' ? 'on' : ''} onClick={() => setSel('all')}>
              <span className="wgg-all" aria-hidden="true">
                <SysIcon n="widget" size={14} />
              </span>
              All Widgets
            </button>
            {groups.map((g) => (
              <button key={g.app} type="button" className={sel === g.app ? 'on' : ''} onClick={() => setSel(g.app)}>
                <AppIcon name={g.icon} className="wgg-appico" />
                {g.app}
              </button>
            ))}
          </nav>
        </aside>
        <div className="wgg-main">
          {shown ? (
            <section>
              <h3>{shown.app}</h3>
              <div className="wgg-grid">{shown.ids.map((id) => card(id, true))}</div>
            </section>
          ) : (
            <>
              {!ql && (
                <section>
                  <h3>Suggestions</h3>
                  <div className="wgg-grid">{suggestions.map((id) => card(id))}</div>
                </section>
              )}
              {groups.map((g) => (
                <section key={g.app}>
                  <h3>{g.app}</h3>
                  <div className="wgg-grid">{g.ids.map((id) => card(id))}</div>
                </section>
              ))}
              {!groups.length && <p className="wgg-empty">No widgets match “{q}”.</p>}
            </>
          )}
        </div>
        <footer className="wgg-foot">
          <span>Drag a widget to place it on the desktop or Notification Center…</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
      {drag && (
        <>
          <div className={`wgg-ncdrop ${drag.nc ? 'hot' : ''}`} aria-hidden="true">
            <span>Notification Center</span>
          </div>
          <div className={`wgg-drag ${drag.over ? 'over' : ''}`} style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }} aria-hidden="true">
            <WidgetBody id={drag.id} preview />
          </div>
        </>
      )}
    </>,
    document.body,
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
  const label = w ? (WMO[w.code] ?? ['', 'Weather'])[1] : failed ? 'Weather unavailable' : 'Loading…';
  const hr = new Date().getHours();
  return (
    <div className="widget weather" aria-label={`Weather in ${personal.city}`}>
      <div className="wx-city">{personal.city}</div>
      <div className="wx-temp">{w ? `${Math.round(w.t)}°` : '—'}</div>
      <div className="wx-cond">
        <span aria-hidden="true" className="wx-glyph">
          <WxIcon kind={w ? wxKind(w.code, hr >= 6 && hr < 18) : 'pcDay'} size={16} mono={!w} />
        </span>{' '}
        {label}
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
          <SysIcon n="list" size={14} />
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
        <div className="rw-done">All done</div>
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

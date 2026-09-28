import { useEffect, useMemo, useRef, useState } from 'react';
import { projects, timeline } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { DragBar, Lights } from '../components/Window';
import { readStore, writeStore } from '../system/storage';

type Mode = 'day' | 'week' | 'month' | 'year';
type CalId = 'github' | 'Project' | 'Education' | 'Leadership' | 'Business' | 'mine';
interface MyEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
}
interface DayEvent {
  title: string;
  cal: CalId;
  project?: string;
}

const CALS: { id: CalId; label: string; color: string }[] = [
  { id: 'github', label: 'GitHub Updates', color: '#8e8e93' },
  { id: 'Project', label: 'Projects', color: '#0a84ff' },
  { id: 'Education', label: 'Education', color: '#34c759' },
  { id: 'Leadership', label: 'Leadership', color: '#af52de' },
  { id: 'Business', label: 'Business', color: '#ff9f0a' },
  { id: 'mine', label: 'My Events', color: '#ff375f' },
];
const color = (c: CalId) => CALS.find((x) => x.id === c)!.color;
const pad = (n: number) => String(n).padStart(2, '0');
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7);
const EV_KEY = 'mra-calendar-events';

/** Does a YYYY / YYYY-MM range overlap the given month? */
function coversMonth(start: string, end: string | undefined, y: number, m: number): boolean {
  const toNum = (v: string, isEnd: boolean) => {
    if (v === 'present') return 999999;
    const [yy, mm] = v.split('-').map(Number);
    return yy * 100 + (mm ? mm : isEnd ? 12 : 1);
  };
  const s = toNum(start, false);
  const e = end ? toNum(end, true) : /^\d{4}$/.test(start) ? Number(start) * 100 + 12 : s;
  const cur = y * 100 + m + 1;
  return cur >= s && cur <= e;
}
const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * macOS-style Calendar. Real milestones only (CV month/year precision and
 * GitHub repository update dates), plus the visitor's own events — saved on
 * this device.
 */
export default function CalendarApp() {
  const wm = useWM();
  const today = new Date();
  const [mode, setMode] = useState<Mode>('week');
  const [cursor, setCursor] = useState(today);
  const [shown, setShown] = useState<Record<CalId, boolean>>(() => readStore('mra-calendar-cals', { github: true, Project: true, Education: true, Leadership: true, Business: true, mine: true }));
  const [mine, setMine] = useState<MyEvent[]>(() => readStore(EV_KEY, { list: [] as MyEvent[] }).list);
  const [edit, setEdit] = useState<MyEvent | null>(null);
  const [now, setNow] = useState(today);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => writeStore(EV_KEY, { list: mine }), [mine]);
  useEffect(() => writeStore('mra-calendar-cals', shown), [shown]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if ((mode === 'week' || mode === 'day') && gridRef.current) gridRef.current.scrollTop = Math.max(0, (now.getHours() - 8) * 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const dayEvents = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};
    if (shown.github)
      projects.forEach((p) => {
        if (p.updated) (map[p.updated] ??= []).push({ title: `${p.name} updated`, cal: 'github', project: p.id });
      });
    return map;
  }, [shown.github]);
  const milestones = (y: number, m: number) => timeline.filter((t) => shown[t.kind as CalId] && coversMonth(t.start, t.end, y, m));
  const myOn = (k: string) => (shown.mine ? mine.filter((e) => e.date === k).sort((a, b) => mins(a.start) - mins(b.start)) : []);

  const weekStart = addDays(cursor, -cursor.getDay());
  const days = mode === 'day' ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const move = (d: number) =>
    setCursor((c) => (mode === 'day' ? addDays(c, d) : mode === 'week' ? addDays(c, 7 * d) : mode === 'month' ? new Date(c.getFullYear(), c.getMonth() + d, 1) : new Date(c.getFullYear() + d, 0, 1)));

  const title =
    mode === 'year'
      ? String(cursor.getFullYear())
      : mode === 'day'
        ? cursor.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const newEvent = (date: string, hour = 9) => setEdit({ id: `e${Date.now()}`, date, start: `${pad(hour)}:00`, end: `${pad(Math.min(23, hour + 1))}:00`, title: '' });
  const saveEvent = (e: MyEvent) => {
    const ev = { ...e, title: e.title.trim() || 'New Event' };
    setMine((l) => (l.some((x) => x.id === ev.id) ? l.map((x) => (x.id === ev.id ? ev : x)) : [...l, ev]));
    setEdit(null);
  };

  const mini = (y: number, m: number, big = false) => {
    const first = new Date(y, m, 1).getDay();
    const n = new Date(y, m + 1, 0).getDate();
    const cells = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
    return (
      <div className={`cal7-mini ${big ? 'big' : ''}`}>
        {big && (
          <button type="button" className="cal7-mini-h" onClick={() => (setCursor(new Date(y, m, 1)), setMode('month'))}>
            {new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long' })}
          </button>
        )}
        <div className="cal7-mini-grid">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="dow">
              {d}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const k = key(new Date(y, m, d));
            const has = !!dayEvents[k]?.length || myOn(k).length > 0;
            return (
              <button key={i} type="button" className={`${k === key(today) ? 'today' : ''} ${k === key(cursor) ? 'sel' : ''} ${has ? 'has' : ''}`} onClick={() => (setCursor(new Date(y, m, d)), big && setMode('day'))}>
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const nowTop = ((now.getHours() * 60 + now.getMinutes() - 7 * 60) / 60) * 48;

  return (
    <div className="cal7">
      <aside className="cal7-side">
        <DragBar className="cal7-drag">
          <Lights />
        </DragBar>
        <div className="cal7-sec">Portfolio</div>
        {CALS.map((c) => (
          <label key={c.id} className="cal7-cal">
            <input type="checkbox" checked={shown[c.id]} onChange={(e) => setShown((s) => ({ ...s, [c.id]: e.target.checked }))} style={{ accentColor: c.color }} />
            <span>{c.label}</span>
          </label>
        ))}
        <div className="cal7-side-mini">
          <div className="cal7-mini-nav">
            <button type="button" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} aria-label="Previous month">
              ‹
            </button>
            <b>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
            <button type="button" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} aria-label="Next month">
              ›
            </button>
          </div>
          {mini(cursor.getFullYear(), cursor.getMonth())}
        </div>
      </aside>

      <section className="cal7-main">
        <DragBar className="cal7-top">
          <span className="cal7-lights-alt">
            <Lights />
          </span>
          <button type="button" className="cal7-add" onClick={() => newEvent(key(cursor))} aria-label="New event" title="New event">
            +
          </button>
          <div className="cal7-seg" role="tablist">
            {(['day', 'week', 'month', 'year'] as Mode[]).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </DragBar>
        <div className="cal7-head">
          <h1 key={title} className="fade-swap">
            {title}
          </h1>
          <div className="cal7-nav">
            <button type="button" onClick={() => move(-1)} aria-label="Previous">
              ‹
            </button>
            <button type="button" onClick={() => setCursor(new Date())}>
              Today
            </button>
            <button type="button" onClick={() => move(1)} aria-label="Next">
              ›
            </button>
            <button type="button" className="cal8-book" onClick={() => wm.open('hireme', { tab: 'book' })} title="Book a call with M.R. Ahamed">
              📅 Book a Call
            </button>
          </div>
        </div>

        {(mode === 'week' || mode === 'day') && (
          <div className={`cal7-week ${mode}`} key={`${mode}${key(days[0])}`}>
            <div className="cal7-wh">
              <span />
              {days.map((d) => (
                <button key={key(d)} type="button" className={key(d) === key(today) ? 'today' : ''} onClick={() => (setCursor(d), setMode('day'))}>
                  {d.toLocaleDateString(undefined, { weekday: 'short' })} <b>{d.getDate()}</b>
                </button>
              ))}
            </div>
            <div className="cal7-allday">
              <span>all-day</span>
              {days.map((d) => (
                <div key={key(d)}>
                  {milestones(d.getFullYear(), d.getMonth())
                    .slice(0, 2)
                    .map((t) => (
                      <span key={t.title} className="cal7-chip" style={{ ['--c' as string]: color(t.kind as CalId) }} title={`${t.title} — ${t.detail}`}>
                        {t.title}
                      </span>
                    ))}
                  {(dayEvents[key(d)] ?? []).map((e) => (
                    <button key={e.title} type="button" className="cal7-chip" style={{ ['--c' as string]: color(e.cal) }} onClick={() => e.project && wm.open('xcode', { project: e.project })}>
                      {e.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="cal7-grid scroll-smooth" ref={gridRef}>
              <div className="cal7-hours">
                {HOURS.map((h) => (
                  <span key={h}>{h === 12 ? 'Noon' : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`}</span>
                ))}
              </div>
              {days.map((d) => (
                <div key={key(d)} className="cal7-col">
                  {HOURS.map((h) => (
                    <button key={h} type="button" className="cal7-slot" onClick={() => newEvent(key(d), h)} aria-label={`New event ${d.toDateString()} ${h}:00`} />
                  ))}
                  {myOn(key(d)).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="cal7-ev"
                      style={{ top: ((mins(e.start) - 420) / 60) * 48, height: Math.max(22, ((mins(e.end) - mins(e.start)) / 60) * 48 - 2) }}
                      onClick={() => setEdit(e)}
                    >
                      <b>{e.title}</b>
                      <small>
                        {e.start} – {e.end}
                      </small>
                    </button>
                  ))}
                  {key(d) === key(now) && nowTop >= 0 && (
                    <div className="cal7-now" style={{ top: nowTop }}>
                      <i />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'month' &&
          (() => {
            const y = cursor.getFullYear();
            const m = cursor.getMonth();
            const first = new Date(y, m, 1);
            const start = addDays(first, -first.getDay());
            const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
            const ms = milestones(y, m);
            return (
              <div className="cal7-month fade-swap" key={`${y}-${m}`}>
                {ms.length > 0 && (
                  <div className="cal7-banner">
                    {ms.map((t) => (
                      <span key={t.title} className="cal7-chip" style={{ ['--c' as string]: color(t.kind as CalId) }} title={t.detail}>
                        {t.title}
                      </span>
                    ))}
                  </div>
                )}
                <div className="cal7-mgrid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <span key={d} className="dow">
                      {d}
                    </span>
                  ))}
                  {cells.map((d) => {
                    const k = key(d);
                    const ev = [...(dayEvents[k] ?? []).map((e) => ({ t: e.title, c: color(e.cal), go: () => e.project && wm.open('xcode', { project: e.project }) })), ...myOn(k).map((e) => ({ t: `${e.start} ${e.title}`, c: color('mine'), go: () => setEdit(e) }))];
                    return (
                      <div key={k} className={`cal7-day ${d.getMonth() !== m ? 'out' : ''} ${k === key(today) ? 'today' : ''}`} onDoubleClick={() => newEvent(k)}>
                        <button type="button" className="cal7-dnum" onClick={() => (setCursor(d), setMode('day'))}>
                          {d.getDate()}
                        </button>
                        {ev.slice(0, 3).map((e) => (
                          <button key={e.t} type="button" className="cal7-mev" style={{ ['--c' as string]: e.c }} onClick={e.go}>
                            {e.t}
                          </button>
                        ))}
                        {ev.length > 3 && <small>+{ev.length - 3} more</small>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {mode === 'year' && <div className="cal7-year fade-swap">{Array.from({ length: 12 }, (_, m) => <div key={m}>{mini(cursor.getFullYear(), m, true)}</div>)}</div>}

        <p className="cal7-note">Milestones use the month/year precision from the CV and GitHub update dates — no invented events. Your own events are saved on this device.</p>

        {edit && (
          <div className="cal7-pop-scrim" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
            <form
              className="cal7-pop"
              onSubmit={(e) => {
                e.preventDefault();
                saveEvent(edit);
              }}
            >
              <input autoFocus className="cal7-pop-title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="New Event" aria-label="Event title" />
              <label>
                Date <input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
              </label>
              <label>
                Starts <input type="time" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} />
              </label>
              <label>
                Ends <input type="time" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} />
              </label>
              <div className="cal7-pop-actions">
                {mine.some((x) => x.id === edit.id) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setMine((l) => l.filter((x) => x.id !== edit.id));
                      setEdit(null);
                    }}
                  >
                    Delete
                  </button>
                )}
                <span style={{ flex: 1 }} />
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
      </section>
    </div>
  );
}



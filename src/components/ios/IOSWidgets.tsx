import { useEffect, useRef, useState } from 'react';
import { personal, projects, socials, cvSkills, cvProjects } from '../../data/portfolio';
import { photos } from '../../data/media';
import { useMusic } from '../../system/MusicContext';
import { useReminders } from '../../system/reminders';
import { useScreenTime, fmtDuration } from '../../system/screenTime';
import { getBatteryManager } from '../../system/batteryLog';
import { useWM } from '../../system/WindowManager';
import { openExternal } from '../../system/notify';
import { usePersisted } from '../../system/useStore';
import type { WidgetSize } from '../../system/ios';
import { SysIcon, WxIcon, wxKind } from '../SysIcons';

/** v10.3 — day/night for weather glyphs (Kandy hours) */
const isDayNow = () => {
  const h = new Date().getHours();
  return h >= 6 && h < 18;
};
const isDayHour = (label: string | number) => {
  const n = typeof label === 'number' ? label : parseInt(String(label), 10);
  if (Number.isNaN(n)) return true;
  const pm = /pm/i.test(String(label));
  const h24 = /am|pm/i.test(String(label)) ? (n % 12) + (pm ? 12 : 0) : n;
  return h24 >= 6 && h24 < 18;
};
const WMO: Record<number, [string, string]> = {
  0: ['☀️', 'Clear'],
  1: ['🌤', 'Mostly Clear'],
  2: ['⛅️', 'Partly Cloudy'],
  3: ['☁️', 'Cloudy'],
  45: ['🌫', 'Fog'],
  48: ['🌫', 'Fog'],
  51: ['🌦', 'Drizzle'],
  53: ['🌦', 'Drizzle'],
  55: ['🌦', 'Drizzle'],
  61: ['🌧', 'Rain'],
  63: ['🌧', 'Rain'],
  65: ['🌧', 'Heavy Rain'],
  80: ['🌦', 'Showers'],
  81: ['🌧', 'Showers'],
  82: ['⛈', 'Heavy Showers'],
  95: ['⛈', 'Thunderstorms'],
  96: ['⛈', 'Thunderstorms'],
  99: ['⛈', 'Thunderstorms'],
};

interface Wx {
  t: number;
  code: number;
  hi: number;
  lo: number;
  hours: { h: string; t: number; code: number }[];
}
let wxCache: Wx | null = null;
let wxReq: Promise<Wx | null> | null = null;
/** live Kandy weather (Open-Meteo, no key) — shared by every weather widget */
export function useKandyWeather(): Wx | null | 'error' {
  const [w, setW] = useState<Wx | null | 'error'>(wxCache);
  useEffect(() => {
    if (wxCache) return;
    wxReq ??= fetch('https://api.open-meteo.com/v1/forecast?latitude=7.2906&longitude=80.6337&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FColombo&forecast_days=2')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const nowH = new Date().getHours();
        const hours = (d.hourly.time as string[]).map((t: string, i: number) => ({ h: t.slice(11, 13), t: d.hourly.temperature_2m[i] as number, code: d.hourly.weather_code[i] as number })).slice(nowH + 1, nowH + 6);
        wxCache = { t: d.current.temperature_2m, code: d.current.weather_code, hi: d.daily.temperature_2m_max[0], lo: d.daily.temperature_2m_min[0], hours };
        return wxCache;
      })
      .catch(() => null);
    let alive = true;
    void wxReq.then((x) => alive && setW(x ?? 'error'));
    return () => {
      alive = false;
    };
  }, []);
  return w;
}

function useNow(ms = 1000) {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setD(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return d;
}

function Weather({ size }: { size: WidgetSize }) {
  const w = useKandyWeather();
  const ok = w && w !== 'error';
  const label = ok ? (WMO[w.code] ?? ['', 'Weather'])[1] : w === 'error' ? 'Offline' : 'Loading…';
  return (
    <div className="iw iw-weather">
      <div className="iw-wx-top">
        <b>
          {personal.city} <SysIcon n="location" size={11} />
        </b>
        <span className="iw-big">{ok ? `${Math.round(w.t)}°` : '—'}</span>
      </div>
      <div className="iw-wx-bot">
        <span className="iw-wxi">
          <WxIcon kind={ok ? wxKind(w.code, isDayNow()) : 'pcDay'} size={22} mono={!ok} />
        </span>
        <small>{label}</small>
        {ok && (
          <small>
            H:{Math.round(w.hi)}° L:{Math.round(w.lo)}°
          </small>
        )}
      </div>
      {size !== 's' && ok && (
        <div className="iw-wx-hours">
          {w.hours.map((h) => (
            <span key={h.h}>
              <small>{h.h}</small>
              <i>
                <WxIcon kind={wxKind(h.code, isDayHour(h.h))} size={18} />
              </i>
              <b>{Math.round(h.t)}°</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarW({ size }: { size: WidgetSize }) {
  const d = useNow(60000);
  const days = Array.from({ length: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
  const lead = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  return (
    <div className="iw iw-cal">
      <div className="iw-cal-l">
        <small className="red">{d.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase()}</small>
        <span className="iw-big">{d.getDate()}</span>
        <small>No events today</small>
      </div>
      {size !== 's' && (
        <div className="iw-cal-m">
          <b className="red">{d.toLocaleDateString(undefined, { month: 'long' }).toUpperCase()}</b>
          <div className="iw-cal-g">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => (
              <i key={`h${i}`}>{x}</i>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((n) => (
              <span key={n} className={n === d.getDate() ? 'on' : ''}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClockW({ size }: { size: WidgetSize }) {
  const d = useNow(1000);
  const face = (tz: string | undefined, label: string) => {
    const t = tz ? new Date(d.toLocaleString('en-US', { timeZone: tz })) : d;
    const h = (t.getHours() % 12) * 30 + t.getMinutes() * 0.5;
    const m = t.getMinutes() * 6;
    const s = t.getSeconds() * 6;
    return (
      <div className="iw-face" key={label}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" className="f" />
          {Array.from({ length: 12 }, (_, i) => (
            <text key={i} x={50 + 37 * Math.sin((i + 1) * (Math.PI / 6))} y={54 + -37 * Math.cos((i + 1) * (Math.PI / 6))} textAnchor="middle">
              {i + 1}
            </text>
          ))}
          <line x1="50" y1="50" x2={50 + 22 * Math.sin((h * Math.PI) / 180)} y2={50 - 22 * Math.cos((h * Math.PI) / 180)} className="h" />
          <line x1="50" y1="50" x2={50 + 32 * Math.sin((m * Math.PI) / 180)} y2={50 - 32 * Math.cos((m * Math.PI) / 180)} className="m" />
          <line x1="50" y1="50" x2={50 + 36 * Math.sin((s * Math.PI) / 180)} y2={50 - 36 * Math.cos((s * Math.PI) / 180)} className="s" />
          <circle cx="50" cy="50" r="2.5" className="c" />
        </svg>
        <small>{label}</small>
      </div>
    );
  };
  return (
    <div className={`iw iw-clock ${size}`}>
      {face(personal.timezone, personal.city)}
      {size !== 's' && face('Europe/London', 'London')}
      {size !== 's' && face('America/New_York', 'New York')}
      {size !== 's' && face(undefined, 'You')}
    </div>
  );
}

function MusicW({ size }: { size: WidgetSize }) {
  const m = useMusic();
  return (
    <div className="iw iw-music" style={{ ['--a' as string]: m.track.art[0], ['--b' as string]: m.track.art[1] }}>
      <span className="iw-art">
        <SysIcon n="music" size={20} />
      </span>
      <div className="iw-music-meta">
        <small>{m.playing ? 'NOW PLAYING' : 'RECENTLY PLAYED'}</small>
        <b>{m.track.title}</b>
        <small>{m.track.artist}</small>
      </div>
      {size !== 's' && (
        <div className="iw-music-ctl" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Previous" onClick={m.prev}>
            <SysIcon n="prev" size={20} />
          </button>
          <button type="button" aria-label={m.playing ? 'Pause' : 'Play'} onClick={m.toggle}>
            <SysIcon n={m.playing ? 'pause' : 'play'} size={22} />
          </button>
          <button type="button" aria-label="Next" onClick={m.next}>
            <SysIcon n="next" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function RemindersW({ size }: { size: WidgetSize }) {
  const [items, setItems] = useReminders();
  const open = items.filter((r) => !r.done);
  return (
    <div className="iw iw-rem">
      <div className="iw-rem-h">
        <b>Reminders</b>
        <span className="iw-big">{open.length}</span>
      </div>
      <ul>
        {open.slice(0, size === 'l' ? 9 : size === 'm' ? 3 : 2).map((r) => (
          <li key={r.id} onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={`Complete ${r.text}`} onClick={() => setItems((l) => l.map((x) => (x.id === r.id ? { ...x, done: true } : x)))} />
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotosW({ size }: { size: WidgetSize }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * photos.length));
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % photos.length), 9000);
    return () => window.clearInterval(t);
  }, []);
  const p = photos[i];
  return (
    <div className={`iw iw-photo ${size}`}>
      <img key={p.id} src={p.src} alt={p.title} draggable={false} />
      <span className="iw-photo-cap">
        <b>For You</b>
        <small>{p.title}</small>
      </span>
    </div>
  );
}

function BatteryW({ size }: { size: WidgetSize }) {
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
  const pct = b ? Math.round(b.level * 100) : null;
  const ring = (label: string, v: number | null, glyph: 'bolt' | 'device') => (
    <div className="iw-bat" key={label}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" className="bg" />
        <circle cx="20" cy="20" r="16" className="fg" style={{ strokeDasharray: `${((v ?? 0) / 100) * 100.5} 100.5`, stroke: (v ?? 100) <= 20 ? '#ff453a' : '#30d158' }} />
        <g transform="translate(12 12)" className="iw-bat-g">
          <SysIcon n={glyph} size={16} />
        </g>
      </svg>
      {size !== 's' && <b>{v === null ? '—' : `${v}%`}</b>}
    </div>
  );
  return (
    <div className={`iw iw-batt ${size}`}>
      {ring('This device', pct, b?.charging ? 'bolt' : 'device')}
      {size === 's' && <b className="iw-bat-pct">{pct === null ? 'Battery info unavailable' : `${pct}%`}</b>}
    </div>
  );
}

function GitHubW({ size }: { size: WidgetSize }) {
  const repos = projects.filter((p) => p.repo);
  const latest = [...repos].sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''))[0];
  return (
    <div className="iw iw-gh">
      <b>{socials.githubHandle}</b>
      <span className="iw-big">{repos.length}</span>
      <small>public repositories</small>
      {size !== 's' && latest && <small className="iw-gh-l">Latest: {latest.name}</small>}
    </div>
  );
}

function ProjectsW({ size }: { size: WidgetSize }) {
  const wm = useWM();
  const list = cvProjects().slice(0, size === 'l' ? 5 : 2);
  return (
    <div className="iw iw-proj">
      <b>Projects on my CV</b>
      {list.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            wm.open('casestudies', { project: p.id });
          }}
        >
          <i style={{ background: p.preview.accent }} />
          <span>
            <b>{p.name}</b>
            <small>{p.period ?? p.category}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function SkillsW({ size }: { size: WidgetSize }) {
  const top = cvSkills.slice(0, size === 's' ? 1 : 2);
  return (
    <div className="iw iw-skills">
      {top.map((s) => (
        <div key={s.label}>
          <b>{s.label}</b>
          <p>{s.items.slice(0, size === 's' ? 4 : 6).join(' · ')}</p>
        </div>
      ))}
    </div>
  );
}

function ContactW({ size }: { size: WidgetSize }) {
  return (
    <div className="iw iw-contact">
      <img src={personal.avatar} alt="" />
      <b>{personal.name}</b>
      {size !== 's' && <small>{personal.status}</small>}
      <div className="iw-contact-b" onClick={(e) => e.stopPropagation()}>
        <a href={personal.phoneHref} aria-label="Call">
          <SysIcon n="phone" size={18} />
        </a>
        <a href={`mailto:${personal.email}`} aria-label="Email">
          <SysIcon n="mail" size={18} />
        </a>
        <button type="button" aria-label="WhatsApp" onClick={() => openExternal(socials.whatsapp, { title: 'Opening WhatsApp chat with M.R. Ahamed', app: 'WhatsApp', icon: 'whatsapp' })}>
          <SysIcon n="message" size={18} />
        </button>
      </div>
    </div>
  );
}

function ProfileW({ size }: { size: WidgetSize }) {
  return (
    <div className={`iw iw-profile ${size}`}>
      <img src={personal.photo} alt="" draggable={false} />
      <div>
        <b>{personal.name}</b>
        <small>{personal.shortTitle}</small>
        {size !== 's' && (
          <span className="iw-pill">
            <i />
            {personal.status}
          </span>
        )}
      </div>
    </div>
  );
}

function ScreenTimeW({ size }: { size: WidgetSize }) {
  const st = useScreenTime();
  const max = Math.max(1, ...st.hours);
  return (
    <div className="iw iw-st">
      <small>Screen Time · today</small>
      <span className="iw-big sm">{fmtDuration(st.total)}</span>
      {size !== 's' && (
        <div className="iw-st-bars">
          {st.hours.map((h, i) => (
            <i key={i} style={{ height: `${(h / max) * 100}%` }} />
          ))}
        </div>
      )}
      <small>{st.opens} app opens</small>
    </div>
  );
}

function ShortcutsW({ size }: { size: WidgetSize }) {
  const wm = useWM();
  const [list] = usePersisted<{ id: string; name: string; color: string; icon: string }[]>('mra-shortcuts-v10', []);
  const items = (list.length ? list : [{ id: 'x', name: 'Shortcuts', color: '#7c5cff', icon: '⚡️' }]).slice(0, size === 's' ? 2 : 4);
  return (
    <div className={`iw iw-sc ${size}`}>
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          style={{ background: s.color }}
          onClick={(e) => {
            e.stopPropagation();
            wm.open('shortcuts');
          }}
        >
          <span>{s.icon}</span>
          <b>{s.name}</b>
        </button>
      ))}
    </div>
  );
}

/** v10.3 — the widgets a Smart Stack holds by default, and the ones it may hold */
export const STACK_DEFAULT = ['weather', 'calendar', 'music', 'photos', 'reminders'];
export const STACK_CHOICES = ['weather', 'calendar', 'clock', 'music', 'photos', 'reminders', 'projects', 'skills', 'battery', 'github', 'screentime', 'contact'];

/**
 * Smart Stack: several widgets in one place. Swipe up/down (touch, mouse wheel or
 * trackpad) to flip; it can rotate on its own (Smart Rotate). The widget on top is
 * exposed as data-stack-cur so a tap opens that widget's app.
 */
function SmartStack({ size, items, rotate = true }: { size: WidgetSize; items?: string[]; rotate?: boolean }) {
  const stack = items && items.length ? items : STACK_DEFAULT;
  const [i, setI] = useState(0);
  const n = stack.length;
  const k = ((i % n) + n) % n;
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!rotate || n < 2) return;
    const t = window.setInterval(() => setI((x) => x + 1), 12000);
    return () => window.clearInterval(t);
  }, [n, rotate]);
  const flip = (dir: number) => setI((x) => x + dir);
  return (
    <div
      className="iw-stack"
      data-stack-cur={stack[k]}
      onWheel={(e) => {
        if (Math.abs(e.deltaY) > 20) flip(e.deltaY > 0 ? 1 : -1);
      }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        const up = (ev: PointerEvent) => {
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          const s0 = start.current;
          start.current = null;
          if (!s0) return;
          const dy = ev.clientY - s0.y;
          const dx = ev.clientX - s0.x;
          if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx) * 1.3 && !document.querySelector('.ios-home.editing')) flip(dy < 0 ? 1 : -1);
        };
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      }}
    >
      <div className="iw-stack-in" key={i}>
        <IOSWidget w={stack[k]} size={size} />
      </div>
      <span className="iw-stack-dots">
        {stack.map((s, x) => (
          <i key={s} className={x === k ? 'on' : ''} />
        ))}
      </span>
    </div>
  );
}

export function IOSWidget({ w, size, stack, rotate }: { w: string; size: WidgetSize; stack?: string[]; rotate?: boolean }) {
  switch (w) {
    case 'weather':
      return <Weather size={size} />;
    case 'calendar':
      return <CalendarW size={size} />;
    case 'clock':
      return <ClockW size={size} />;
    case 'music':
      return <MusicW size={size} />;
    case 'reminders':
      return <RemindersW size={size} />;
    case 'photos':
      return <PhotosW size={size} />;
    case 'battery':
      return <BatteryW size={size} />;
    case 'github':
      return <GitHubW size={size} />;
    case 'projects':
      return <ProjectsW size={size} />;
    case 'skills':
      return <SkillsW size={size} />;
    case 'contact':
      return <ContactW size={size} />;
    case 'profile':
      return <ProfileW size={size} />;
    case 'screentime':
      return <ScreenTimeW size={size} />;
    case 'shortcuts':
      return <ShortcutsW size={size} />;
    case 'smart':
      return <SmartStack size={size} items={stack} rotate={rotate} />;
    default:
      return <div className="iw" />;
  }
}

/** which app a widget opens */
export const WIDGET_APP: Record<string, string> = {
  weather: 'weather',
  calendar: 'calendar',
  clock: 'clock',
  music: 'music',
  reminders: 'reminders',
  photos: 'photos',
  battery: 'settings',
  github: 'github',
  projects: 'casestudies',
  skills: 'skills',
  contact: 'contacts',
  profile: 'about',
  screentime: 'settings',
  shortcuts: 'shortcuts',
  smart: '',
};
/** v10.3 — the section a widget opens inside its app */
export const WIDGET_ARGS: Record<string, Record<string, string>> = {
  clock: { tab: 'world' },
  battery: { pane: 'battery' },
  screentime: { pane: 'screentime' },
  photos: { album: 'Portraits' },
};

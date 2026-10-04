import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { WidgetId } from '../system/customize';
import { useWM } from '../system/WindowManager';
import { notify, openExternal } from '../system/notify';
import { allSkills, personal, projects, socials } from '../data/portfolio';
import { photos } from '../data/media';
import { SERVICE_AREAS, SERVICE_GROUPS } from '../data/services';
import { usePersisted } from '../system/useStore';
import { playUi } from '../system/sounds';
import { SysIcon } from './SysIcons';

/**
 * v9 — extra widgets for the gallery (Right-click the desktop → Add Widgets…).
 * None of them are placed by default; visitors choose which ones they want.
 */
export function renderExtraWidget(id: WidgetId): ReactNode {
  switch (id) {
    case 'battery':
      return <BatteryWidget />;
    case 'photoframe':
      return <PhotoWidget />;
    case 'digital':
      return <DigitalClockWidget />;
    case 'contact':
      return <ContactWidget />;
    case 'skills':
      return <SkillsWidget />;
    case 'sysinfo':
      return <SysInfoWidget />;
    case 'services':
      return <ServicesWidget />;
    case 'pomodoro':
      return <PomodoroWidget />;
    case 'quicknote':
      return <QuickNoteWidget />;
    default:
      return null;
  }
}

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
}

function useBatteryInfo() {
  const [b, setB] = useState<{ level: number; charging: boolean } | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;
    let mgr: BatteryManagerLike | null = null;
    const up = () => mgr && setB({ level: mgr.level, charging: mgr.charging });
    nav
      .getBattery()
      .then((m) => {
        mgr = m;
        up();
        m.addEventListener('levelchange', up);
        m.addEventListener('chargingchange', up);
      })
      .catch(() => undefined);
    return () => {
      mgr?.removeEventListener('levelchange', up);
      mgr?.removeEventListener('chargingchange', up);
    };
  }, []);
  return b;
}

function BatteryWidget() {
  const b = useBatteryInfo();
  const pct = b ? Math.round(b.level * 100) : null;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="widget w9 w9-battery" aria-label={pct === null ? 'Battery status unavailable' : `Battery ${pct}%`}>
      <svg viewBox="0 0 64 64" className="w9-ring" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="bg" />
        <circle cx="32" cy="32" r={r} className="fg" strokeDasharray={`${((pct ?? 0) / 100) * c} ${c}`} style={{ stroke: pct !== null && pct <= 20 ? '#ff453a' : '#30d158' }} />
      </svg>
      <div className="w9-battery-txt">
        <b>{pct === null ? '—' : `${pct}%`}</b>
        <span>{pct === null ? 'Not reported by this browser' : b?.charging ? 'Charging' : 'On battery'}</span>
        <small>This device</small>
      </div>
    </div>
  );
}

function PhotoWidget() {
  const wm = useWM();
  const list = useMemo(() => photos.filter((p) => p.album === 'Portraits'), []);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % list.length), 6000);
    return () => window.clearInterval(t);
  }, [list.length]);
  const p = list[i];
  return (
    <button type="button" className="widget w9 w9-photo" onClick={() => wm.open('photos', { album: 'Portraits' })} aria-label={`Photos: ${p?.title}`}>
      {list.map((x, k) => (
        <img key={x.id} src={x.src} alt="" className={k === i ? 'on' : ''} loading="lazy" draggable={false} />
      ))}
      <span className="w9-photo-cap">{p?.title}</span>
    </button>
  );
}

function DigitalClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const hh = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <div className="widget w9 w9-digital">
      <span className="w9-day">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
      <b>
        {String(hh).padStart(2, '0')}
        <i className="w9-colon">:</i>
        {mm}
      </b>
      <span className="w9-sec">{String(now.getSeconds()).padStart(2, '0')}s</span>
    </div>
  );
}

function ContactWidget() {
  const wm = useWM();
  return (
    <div className="widget w9 w9-contact">
      <div className="w9-contact-head">
        <img src={personal.avatar} alt="" draggable={false} />
        <div>
          <b>{personal.name}</b>
          <span>{personal.status}</span>
        </div>
      </div>
      <div className="w9-contact-actions">
        <button type="button" title="WhatsApp chat" onClick={() => openExternal(socials.whatsapp, { title: 'Opening WhatsApp chat with M.R. Ahamed', app: 'WhatsApp', icon: 'whatsapp' })}>
          <span className="wa"><SysIcon n="message" size={15} /></span>WhatsApp
        </button>
        <a href={personal.phoneHref} title={`Call ${personal.phone}`}>
          <span className="call"><SysIcon n="phone" size={15} /></span>Call
        </a>
        <button type="button" title="Email" onClick={() => wm.open('mail', { compose: '1' })}>
          <span className="mail"><SysIcon n="mail" size={15} /></span>Mail
        </button>
        <button type="button" title="LinkedIn" onClick={() => openExternal(socials.linkedin, { title: 'Opening LinkedIn — M.R. Ahamed', app: 'Safari', icon: 'linkedin' })}>
          <span className="li">in</span>LinkedIn
        </button>
      </div>
    </div>
  );
}

function SkillsWidget() {
  const wm = useWM();
  // most-used technologies across the projects (counted from the portfolio data)
  const top = useMemo(() => {
    const count = new Map<string, number>();
    projects.forEach((p) => Object.values(p.stack ?? {}).flat().forEach((t) => count.set(String(t), (count.get(String(t)) ?? 0) + 1)));
    const ranked = [...count.entries()].filter(([t]) => allSkills.includes(t)).sort((a, b) => b[1] - a[1]);
    return (ranked.length >= 4 ? ranked.map(([t]) => t) : allSkills).slice(0, 8);
  }, []);
  return (
    <button type="button" className="widget w9 w9-skills" onClick={() => wm.open('notes')}>
      <span className="w9-label">TOP SKILLS</span>
      <div className="w9-chips">
        {top.map((t, i) => (
          <span key={t} style={{ animationDelay: `${i * 60}ms` }}>
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}

function SysInfoWidget() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; downlink?: number } };
  const [online, setOnline] = useState(nav.onLine);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  const rows: [string, string][] = [
    ['CPU cores', nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : '—'],
    ['Memory', nav.deviceMemory ? `≥ ${nav.deviceMemory} GB` : '—'],
    ['Display', `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`],
    ['Network', online ? (nav.connection?.effectiveType?.toUpperCase() ?? 'Online') : 'Offline'],
  ];
  return (
    <div className="widget w9 w9-sys">
      <span className="w9-label">THIS DEVICE</span>
      {rows.map(([k, v]) => (
        <div key={k} className="w9-row">
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

function ServicesWidget() {
  const wm = useWM();
  return (
    <button type="button" className="widget w9 w9-services" onClick={() => wm.open('services')}>
      <span className="w9-label">EXPERTISE & CAPABILITIES</span>
      {SERVICE_GROUPS.map((g) => {
        const areas = SERVICE_AREAS.filter((a) => a.group === g.id);
        const n = areas.reduce((s, a) => s + a.services.length, 0);
        return (
          <div key={g.id} className="w9-svc">
            <em>{g.num}</em>
            <div>
              <b>{g.title}</b>
              <span>
                {n} services · {areas.map((a) => a.icon).join(' ')}
              </span>
            </div>
          </div>
        );
      })}
    </button>
  );
}

function PomodoroWidget() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const total = mode === 'focus' ? 25 * 60 : 5 * 60;
  const [left, setLeft] = useState(total);
  const [run, setRun] = useState(false);
  const endAt = useRef(0);
  useEffect(() => {
    if (!run) return;
    endAt.current = Date.now() + left * 1000;
    const t = window.setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        window.clearInterval(t);
        setRun(false);
        playUi();
        notify({ app: 'Focus Timer', icon: 'screentime', title: mode === 'focus' ? 'Focus session complete' : 'Break is over', body: mode === 'focus' ? 'Time for a 5-minute break.' : 'Ready for another 25 minutes?' });
        const next = mode === 'focus' ? 'break' : 'focus';
        setMode(next);
        setLeft(next === 'focus' ? 25 * 60 : 5 * 60);
      }
    }, 250);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div className={`widget w9 w9-pomo ${mode}`}>
      <svg viewBox="0 0 60 60" className="w9-ring" aria-hidden="true">
        <circle cx="30" cy="30" r={r} className="bg" />
        <circle cx="30" cy="30" r={r} className="fg" strokeDasharray={`${(left / total) * c} ${c}`} />
      </svg>
      <div className="w9-pomo-txt">
        <span className="w9-label">{mode === 'focus' ? 'FOCUS' : 'BREAK'}</span>
        <b>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </b>
        <div className="w9-pomo-btns">
          <button type="button" onClick={() => setRun((v) => !v)} aria-label={run ? 'Pause' : 'Start'}>
            <SysIcon n={run ? 'pause' : 'play'} size={16} />
          </button>
          <button
            type="button"
            aria-label="Reset"
            onClick={() => {
              setRun(false);
              setLeft(total);
            }}
          >
            <SysIcon n="undo" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickNoteWidget() {
  const [text, setText] = usePersisted<string>('mra-quicknote-v9', '');
  return (
    <div className="widget w9 w9-note">
      <span className="w9-label">QUICK NOTE</span>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a note… it stays in this browser." aria-label="Quick note" />
    </div>
  );
}

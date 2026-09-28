import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { useMusic } from '../system/MusicContext';
import { notify } from '../system/notify';
import { DragBar, Lights } from '../components/Window';
import { readStore, writeStore } from '../system/storage';

type Temp = { kind: 'loading' } | { kind: 'ok'; c: number } | { kind: 'error' };

const TEMP_URL = 'https://api.open-meteo.com/v1/forecast?latitude=7.2906&longitude=80.6337&current=temperature_2m';

/* ── small glyphs (no brand logos) ── */
const G = {
  lamp: (
    <svg viewBox="0 0 24 24">
      <path d="M8 3h8l3 7H5z" />
      <path d="M12 10v8M8 21h8" />
    </svg>
  ),
  bulb: (
    <svg viewBox="0 0 24 24">
      <path d="M9 17h6M10 20.5h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </svg>
  ),
  speaker: (
    <svg viewBox="0 0 24 24">
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <circle cx="12" cy="14.5" r="3.2" />
      <circle cx="12" cy="7" r="1.2" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24">
      <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
    </svg>
  ),
  contrast: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" className="fill" />
    </svg>
  ),
  wifi: (
    <svg viewBox="0 0 24 24">
      <path d="M2.5 9a14 14 0 0 1 19 0M5.8 12.4a9.3 9.3 0 0 1 12.4 0M9 15.8a4.6 4.6 0 0 1 6 0" />
      <circle cx="12" cy="19" r="1.2" className="fill" />
    </svg>
  ),
  thermo: (
    <svg viewBox="0 0 24 24">
      <path d="M10 4a2 2 0 0 1 4 0v9.3a4 4 0 1 1-4 0z" />
      <path d="M12 9v7" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" className="fill" />
    </svg>
  ),
  bed: (
    <svg viewBox="0 0 24 24">
      <path d="M3 18V6M3 14h18v4M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5" />
      <circle cx="7" cy="11" r="1.8" />
    </svg>
  ),
};

interface TileProps {
  name: string;
  status: string;
  on: boolean;
  icon: ReactNode;
  tone: 'yellow' | 'blue' | 'purple' | 'orange' | 'green' | 'teal';
  onTap?: () => void;
  onLong?: () => void;
  wide?: boolean;
  children?: ReactNode;
}

function Tile({ name, status, on, icon, tone, onTap, onLong, wide, children }: TileProps) {
  const timer = useRef(0);
  const longFired = useRef(false);
  const down = () => {
    if (!onLong) return;
    longFired.current = false;
    timer.current = window.setTimeout(() => {
      longFired.current = true;
      onLong();
    }, 500);
  };
  const cancel = () => window.clearTimeout(timer.current);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div className={`hm-tile ${on ? 'on' : ''} t-${tone} ${wide ? 'wide' : ''}`}>
      <button
        type="button"
        className="hm-tile-btn"
        aria-pressed={onTap ? on : undefined}
        onPointerDown={down}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => {
          if (onLong) {
            e.preventDefault();
            cancel();
            longFired.current = true;
            onLong();
          }
        }}
        onClick={() => {
          if (longFired.current) {
            longFired.current = false;
            return;
          }
          onTap?.();
        }}
      >
        <span className="hm-ico" aria-hidden="true">
          {icon}
        </span>
        <span className="hm-tile-t">
          <b>{name}</b>
          <small>{status}</small>
        </span>
      </button>
      {children}
    </div>
  );
}

/**
 * Smart-home style dashboard. The "accessories" are this portfolio's own
 * settings (Night Shift, brightness, music, Focus, appearance, Wi-Fi).
 */
export default function HomeApp() {
  const sys = useSystem();
  const { settings, update } = useSettings();
  const music = useMusic();
  const [temp, setTemp] = useState<Temp>({ kind: 'loading' });
  const [sheet, setSheet] = useState(false);
  const [page, setPage] = useState<'home' | 'automation' | 'discover' | 'workspace' | 'living'>('home');
  const [autos, setAutos] = useState<Record<string, boolean>>(() => readStore('mra-home-autos', { sunset: true, leave: false, focus: true }));
  useEffect(() => writeStore('mra-home-autos', autos), [autos]);

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    const t = window.setTimeout(() => ac.abort(), 8000);
    fetch(TEMP_URL, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { current?: { temperature_2m?: number } }) => {
        const c = d.current?.temperature_2m;
        if (alive) setTemp(typeof c === 'number' ? { kind: 'ok', c } : { kind: 'error' });
      })
      .catch(() => alive && setTemp((s) => (s.kind === 'loading' ? { kind: 'error' } : s)))
      .finally(() => window.clearTimeout(t));
    return () => {
      alive = false;
      window.clearTimeout(t);
      ac.abort();
    };
  }, []);

  const dark = settings.appearance === 'dark';
  const ceilingOn = sys.brightness >= 0.5;
  const lightsOn = (sys.nightShift ? 1 : 0) + (ceilingOn ? 1 : 0);
  const tempText = temp.kind === 'ok' ? `${Math.round(temp.c)}°` : '—';

  const summary = [
    lightsOn ? `${lightsOn} light${lightsOn > 1 ? 's' : ''} on` : 'Lights off',
    music.playing ? 'Speaker playing' : null,
    temp.kind === 'ok' ? `${tempText} in Kandy` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const scene = (name: string, fn: () => void) => {
    fn();
    notify({ app: 'Home', icon: 'home', title: `Scene “${name}” is on` });
  };

  const scenes = [
    {
      id: 'morning',
      name: 'Good Morning',
      icon: G.sun,
      active: !dark && sys.brightness === 1 && !sys.nightShift && !sys.focus,
      run: () =>
        scene('Good Morning', () => {
          update({ appearance: 'light' });
          sys.set({ brightness: 1, nightShift: false, focus: false });
        }),
    },
    {
      id: 'focus',
      name: 'Focus Mode',
      icon: G.target,
      active: sys.focus && music.playing,
      run: () =>
        scene('Focus Mode', () => {
          sys.set({ focus: true });
          if (!music.playing) music.play();
        }),
    },
    {
      id: 'night',
      name: 'Good Night',
      icon: G.bed,
      active: dark && sys.nightShift && Math.abs(sys.brightness - 0.55) < 0.01,
      run: () =>
        scene('Good Night', () => {
          update({ appearance: 'dark' });
          sys.set({ nightShift: true, brightness: 0.55 });
        }),
    },
  ];

  const showWork = page === 'home' || page === 'workspace';
  const showLiving = page === 'home' || page === 'living';
  const NAV: { id: typeof page; label: string; glyph: string }[] = [
    { id: 'home', label: 'Home', glyph: '⌂' },
    { id: 'automation', label: 'Automation', glyph: '◷' },
    { id: 'discover', label: 'Discover', glyph: '★' },
  ];

  return (
    <div className="hm-root hm7">
      <aside className="hm7-side">
        <DragBar className="hm7-drag">
          <Lights />
        </DragBar>
        {NAV.map((n) => (
          <button key={n.id} type="button" className={`hm7-nav ${page === n.id ? 'on' : ''}`} onClick={() => setPage(n.id)}>
            <span aria-hidden="true">{n.glyph}</span>
            {n.label}
          </button>
        ))}
        <div className="hm7-sec">Rooms</div>
        {(
          [
            ['workspace', 'Workspace'],
            ['living', 'Living Room'],
          ] as [typeof page, string][]
        ).map(([id, l]) => (
          <button key={id} type="button" className={`hm7-nav room ${page === id ? 'on' : ''}`} onClick={() => setPage(id)}>
            <span aria-hidden="true">▢</span>
            {l}
          </button>
        ))}
      </aside>
      <div className="hm-scroll">
        <DragBar className="hm7-top">
          <span className="hm7-lights-alt">
            <Lights />
          </span>
          <b>{page === 'home' ? 'Home' : page === 'automation' ? 'Automation' : page === 'discover' ? 'Discover' : page === 'workspace' ? 'Workspace' : 'Living Room'}</b>
          <span className="hm-demo">Demo home — controls this portfolio</span>
        </DragBar>
        <p className="hm-sum">{summary}</p>
        <div className="hm7-status">
          {[
            { v: tempText, l: temp.kind === 'ok' ? 'Kandy now' : 'Temperature', on: temp.kind === 'ok' },
            { v: sys.focus ? 'ON' : 'OFF', l: 'Do Not Disturb', on: sys.focus },
            { v: String(lightsOn), l: `Light${lightsOn === 1 ? '' : 's'} On`, on: lightsOn > 0 },
            { v: music.playing ? '♪' : '❚❚', l: music.playing ? 'Speaker Playing' : 'Speaker Paused', on: music.playing },
            { v: sys.wifi ? '●' : '○', l: sys.wifi ? 'Wi-Fi On' : 'Wi-Fi Off', on: sys.wifi },
            { v: dark ? '☾' : '☀', l: dark ? 'Dark Mode' : 'Light Mode', on: true },
          ].map((c) => (
            <div key={c.l} className={`hm7-circle ${c.on ? 'on' : ''}`}>
              <span>{c.v}</span>
              <small>{c.l}</small>
            </div>
          ))}
        </div>

        {page === 'automation' && (
          <section aria-label="Automations">
            <h2 className="hm-h">Automations</h2>
            <div className="hm7-autos">
              {[
                ['sunset', 'When the sun sets in Kandy', 'Turn on Night Shift'],
                ['focus', 'When Focus Mode starts', 'Play music in the Workspace'],
                ['leave', 'When the last person leaves', 'Turn off all lights'],
              ].map(([id, when, then]) => (
                <div key={id} className="hm7-auto">
                  <span>
                    <b>{when}</b>
                    <small>{then}</small>
                  </span>
                  <button type="button" role="switch" aria-checked={!!autos[id]} aria-label={when} className={`toggle ${autos[id] ? 'on' : ''}`} onClick={() => setAutos((a) => ({ ...a, [id]: !a[id] }))}>
                    <span />
                  </button>
                </div>
              ))}
            </div>
            <p className="hm-foot">Demo automations — they’re saved on this device but don’t run on a schedule.</p>
          </section>
        )}
        {page === 'discover' && (
          <section aria-label="Discover">
            <h2 className="hm-h">Discover</h2>
            <div className="hm7-autos">
              {[
                ['Scenes', 'Try “Good Night” — it switches to Dark Mode, dims the display and turns on Night Shift.'],
                ['Long-press a light', 'Hold the Ceiling Lights tile (or click …) to adjust brightness.'],
                ['Speaker', 'The Speaker tile controls the same player as the Music app and widget.'],
              ].map(([t, d]) => (
                <div key={t} className="hm7-auto">
                  <span>
                    <b>{t}</b>
                    <small>{d}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
        {page === 'home' && (
        <section aria-label="Scenes">
          <h2 className="hm-h">Scenes</h2>
          <div className="hm-scenes">
            {scenes.map((s) => (
              <button key={s.id} type="button" className={`hm-scene ${s.active ? 'on' : ''} s-${s.id}`} onClick={s.run}>
                <span className="hm-ico" aria-hidden="true">
                  {s.icon}
                </span>
                <b>{s.name}</b>
              </button>
            ))}
          </div>
        </section>
        )}

        {showWork && (
        <section aria-label="Workspace">
          <h2 className="hm-h">Workspace</h2>
          <div className="hm-grid">
            <Tile
              name="Desk Lamp"
              status={sys.nightShift ? 'On · Night Shift' : 'Off'}
              on={sys.nightShift}
              icon={G.lamp}
              tone="orange"
              onTap={() => sys.set({ nightShift: !sys.nightShift })}
            />
            <Tile
              name="Speaker"
              status={music.playing ? `Playing · ${music.track.title}` : `Paused · ${music.track.title}`}
              on={music.playing}
              icon={G.speaker}
              tone="purple"
              onTap={() => music.toggle()}
            />
            <Tile name="Do Not Disturb" status={sys.focus ? 'On' : 'Off'} on={sys.focus} icon={G.moon} tone="purple" onTap={() => sys.set({ focus: !sys.focus })} />
            <Tile name="Wi-Fi" status={sys.wifi ? 'Connected · Simulated' : 'Off · Simulated'} on={sys.wifi} icon={G.wifi} tone="blue" onTap={() => sys.set({ wifi: !sys.wifi })} />
          </div>
        </section>
        )}

        {showLiving && (
        <section aria-label="Living Room">
          <h2 className="hm-h">Living Room</h2>
          <div className="hm-grid">
            <Tile
              name="Ceiling Lights"
              status={ceilingOn ? `On · ${Math.round(sys.brightness * 100)}%` : `Dimmed · ${Math.round(sys.brightness * 100)}%`}
              on={ceilingOn}
              icon={G.bulb}
              tone="yellow"
              onTap={() => sys.set({ brightness: ceilingOn ? 0.45 : 1 })}
              onLong={() => setSheet(true)}
            >
              <button type="button" className="hm-more" aria-label="Adjust Ceiling Lights brightness" onClick={() => setSheet(true)}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="5" cy="10" r="1.4" />
                  <circle cx="10" cy="10" r="1.4" />
                  <circle cx="15" cy="10" r="1.4" />
                </svg>
              </button>
            </Tile>
            <Tile name="Dark Mode" status={dark ? 'On' : 'Off'} on={dark} icon={G.contrast} tone="teal" onTap={() => update({ appearance: dark ? 'light' : 'dark' })}>
              <span className={`toggle hm-sw ${dark ? 'on' : ''}`} aria-hidden="true">
                <span />
              </span>
            </Tile>
            <Tile
              name="Thermostat"
              status={temp.kind === 'ok' ? 'Kandy · live outdoor' : temp.kind === 'loading' ? 'Updating…' : 'Offline'}
              on={temp.kind === 'ok'}
              icon={G.thermo}
              tone="green"
            >
              <span className="hm-temp" aria-label={temp.kind === 'ok' ? `${tempText} Celsius` : 'Temperature unavailable'}>
                {temp.kind === 'loading' ? '…' : tempText}
              </span>
            </Tile>
          </div>
        </section>
        )}
        <p className="hm-foot">Accessories are simulated: they switch this portfolio’s own settings. The temperature is real, from Open-Meteo.</p>
      </div>

      {sheet && (
        <div className="hm-sheet-bg fade-swap" onClick={() => setSheet(false)}>
          <div className="hm-sheet" role="dialog" aria-label="Ceiling Lights" onClick={(e) => e.stopPropagation()}>
            <div className="hm-sheet-h">
              <span className="hm-ico on" aria-hidden="true">
                {G.bulb}
              </span>
              <div>
                <b>Ceiling Lights</b>
                <small>{Math.round(sys.brightness * 100)}% · display brightness</small>
              </div>
            </div>
            <div className="hm-vslider">
              <input
                type="range"
                min={0.25}
                max={1}
                step={0.01}
                value={sys.brightness}
                aria-label="Brightness"
                onChange={(e) => sys.set({ brightness: Number(e.target.value) })}
                style={{ ['--p' as string]: `${((sys.brightness - 0.25) / 0.75) * 100}%` }}
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setSheet(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

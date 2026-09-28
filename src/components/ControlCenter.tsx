import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSystem, type AirDrop } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { useMusic } from '../system/MusicContext';
import { useWM } from '../system/WindowManager';
import { notify } from '../system/notify';
import { readStore, writeStore } from '../system/storage';
import { takeScreenshot, toggleScreenRecording, useScreenRecording } from '../system/screenCapture';
import { sharePortfolio } from '../system/share';
import { AppIcon } from './AppIcons';
import type { AppId } from '../system/types';

type Panel = 'wifi' | 'bt' | 'airdrop' | 'display' | 'sound' | null;

interface BatteryInfo {
  level: number;
  charging: boolean;
}

/** Real battery info where the browser exposes it (Chromium), otherwise null. */
function useBattery(): BatteryInfo | null {
  const [b, setB] = useState<BatteryInfo | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void }> };
    if (!nav.getBattery) return;
    let bat: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | null = null;
    const upd = () => bat && setB({ level: bat.level, charging: bat.charging });
    nav
      .getBattery()
      .then((x) => {
        bat = x;
        upd();
        x.addEventListener('levelchange', upd);
        x.addEventListener('chargingchange', upd);
      })
      .catch(() => undefined);
    return () => {
      bat?.removeEventListener('levelchange', upd);
      bat?.removeEventListener('chargingchange', upd);
    };
  }, []);
  return b;
}

interface NetInfo {
  online: boolean;
  type?: string;
  downlink?: number;
  rtt?: number;
}
type NetConnection = { effectiveType?: string; downlink?: number; rtt?: number; addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void };

/** Real connection status from the browser (online/offline + Network Information API where available). */
function useNetworkInfo(): NetInfo {
  const read = (): NetInfo => {
    const c = (navigator as Navigator & { connection?: NetConnection }).connection;
    return { online: navigator.onLine, type: c?.effectiveType, downlink: c?.downlink, rtt: c?.rtt };
  };
  const [n, setN] = useState<NetInfo>(read);
  useEffect(() => {
    const upd = () => setN(read());
    const c = (navigator as Navigator & { connection?: NetConnection }).connection;
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    c?.addEventListener?.('change', upd);
    return () => {
      window.removeEventListener('online', upd);
      window.removeEventListener('offline', upd);
      c?.removeEventListener?.('change', upd);
    };
  }, []);
  return n;
}

const WX: Record<number, [string, string]> = {
  0: ['☀️', 'Clear'], 1: ['🌤', 'Mainly Clear'], 2: ['⛅️', 'Partly Cloudy'], 3: ['☁️', 'Cloudy'], 45: ['🌫', 'Fog'], 48: ['🌫', 'Fog'],
  51: ['🌦', 'Drizzle'], 53: ['🌦', 'Drizzle'], 55: ['🌦', 'Drizzle'], 61: ['🌧', 'Rain'], 63: ['🌧', 'Rain'], 65: ['🌧', 'Heavy Rain'],
  80: ['🌦', 'Showers'], 81: ['🌧', 'Showers'], 82: ['⛈', 'Heavy Showers'], 95: ['⛈', 'Thunderstorm'], 96: ['⛈', 'Thunderstorm'], 99: ['⛈', 'Thunderstorm'],
};

/** Live Kandy weather for the Control Center tile (Open-Meteo, no key). Fetched when Control Center opens. */
function useKandyWeather(active: boolean) {
  const [w, setW] = useState<{ t: number; code: number; hi: number; lo: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active || w) return;
    const ctrl = new AbortController();
    fetch('https://api.open-meteo.com/v1/forecast?latitude=7.2906&longitude=80.6337&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FColombo&forecast_days=1', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        setW({ t: d.current.temperature_2m, code: d.current.weather_code, hi: d.daily.temperature_2m_max[0], lo: d.daily.temperature_2m_min[0] });
        setFailed(false);
      })
      .catch((e) => (e as Error).name !== 'AbortError' && setFailed(true));
    return () => ctrl.abort();
  }, [active, w]);
  return { w, failed };
}

interface Extras {
  airplane: boolean;
  cellular: boolean;
  hotspot: boolean;
  mirroring: boolean;
}
const EXTRA_KEY = 'mra-cc-extras';

export function Slider({ value, onChange, label, icon, max = 1 }: { value: number; onChange: (v: number) => void; label: string; icon: ReactNode; max?: number }) {
  return (
    <div className="cc-slider" style={{ ['--p' as string]: `${(value / max) * 100}%` }}>
      <span className="cc-slider-ico" aria-hidden="true">
        {icon}
      </span>
      <input type="range" min={0} max={max} step={0.01} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

const I = {
  wifi: (
    <svg viewBox="0 0 24 24">
      <path d="M12 19.5 14.6 16.7a3.7 3.7 0 0 0-5.2 0Z" />
      <path d="M12 12a7.6 7.6 0 0 1 5.4 2.2l1.6-1.7a9.9 9.9 0 0 0-14 0l1.6 1.7A7.6 7.6 0 0 1 12 12Z" />
      <path d="M12 7a12.6 12.6 0 0 1 9 3.7L22.6 9a15 15 0 0 0-21.2 0L3 10.7A12.6 12.6 0 0 1 12 7Z" />
    </svg>
  ),
  bt: (
    <svg viewBox="0 0 24 24">
      <path d="m7 7 10 10-5 4V3l5 4L7 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  airdrop: (
    <svg viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 16.5a5.5 5.5 0 1 1 8 0" />
        <path d="M5.2 19.3a9.5 9.5 0 1 1 13.6 0" />
      </g>
      <circle cx="12" cy="12.5" r="2" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="11.2" y="1.5" width="1.6" height="3.4" rx=".8" transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24">
      <path d="M9.5 2.5a9.5 9.5 0 1 0 12 12A8 8 0 0 1 9.5 2.5Z" />
    </svg>
  ),
  kbd: (
    <svg viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M4 18h16M7 14a5 5 0 0 1 10 0M12 4v2M5 7l1.4 1.4M19 7l-1.4 1.4" />
      </g>
    </svg>
  ),
  full: (
    <svg viewBox="0 0 24 24">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  focus: (
    <svg viewBox="0 0 24 24">
      <path d="M14.5 3a8 8 0 1 0 6.5 12.4A7 7 0 0 1 14.5 3Z" />
    </svg>
  ),
  speaker: (
    <svg viewBox="0 0 24 24">
      <path d="M4 9h4l5-4v14l-5-4H4Z" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24">
      <path d="M4 9h4l5-4v14l-5-4H4Z" />
      <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  chev: (
    <svg viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24">
      <path d="M7 4.5v15l12.5-7.5Z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24">
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 24 24">
      <path d="M4 5.5v13L12 12Zm8 0v13L20 12Z" />
    </svg>
  ),
};

export { I as ccIcons };

const NETWORKS = ['Home', 'Portfolio-5G', 'Kandy-Cafe'];
const DEVICES = ['AirPods Pro', 'Magic Keyboard', 'Magic Mouse'];

export function ControlCenter() {
  const sys = useSystem();
  const { settings, update, toggleAppearance } = useSettings();
  const music = useMusic();
  const wm = useWM();
  const battery = useBattery();
  const [panel, setPanel] = useState<Panel>(null);
  const [network, setNetwork] = useState('Home');
  const ref = useRef<HTMLDivElement>(null);
  const open = sys.overlay === 'control';
  const net = useNetworkInfo();
  const { w: weather, failed: weatherFailed } = useKandyWeather(open);
  const recSince = useScreenRecording();
  const [recNow, setRecNow] = useState(() => Date.now());
  const [ex, setEx] = useState<Extras>(() => readStore<Extras>(EXTRA_KEY, { airplane: false, cellular: false, hotspot: false, mirroring: false }));
  const setExtras = (patch: Partial<Extras>) =>
    setEx((cur) => {
      const next = { ...cur, ...patch };
      writeStore(EXTRA_KEY, next);
      return next;
    });
  useEffect(() => {
    if (recSince === null) return;
    const t = window.setInterval(() => setRecNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [recSince]);

  useEffect(() => {
    if (!open) {
      setPanel(null);
      return;
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('[data-cc-toggle]')) sys.setOverlay('none');
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && sys.setOverlay('none');
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, sys]);

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const dark = settings.appearance === 'dark';
  const airdropLabel: Record<AirDrop, string> = { off: 'Off', contacts: 'Contacts Only', everyone: 'Everyone' };

  const sub = (id: Panel, children: ReactNode) => (
    <div className={`cc-sub ${panel === id ? 'open' : ''}`} aria-hidden={panel !== id}>
      <div className="cc-sub-inner">{children}</div>
    </div>
  );

  return (
    <>
    <div ref={ref} className={`control-center cc8 ${open ? 'open' : ''}`} role="dialog" aria-label="Control Center" aria-hidden={!open}>
      <div className="cc-grid">
        {/* connectivity */}
        <div className="cc-tile cc-conn">
          <div className="cc-row">
            <button type="button" className={`cc-circle ${sys.wifi ? 'on' : ''}`} aria-pressed={sys.wifi} aria-label="Wi-Fi" onClick={() => sys.set({ wifi: !sys.wifi })}>
              {I.wifi}
            </button>
            <button type="button" className="cc-row-text" onClick={() => togglePanel('wifi')} aria-expanded={panel === 'wifi'}>
              <b>Wi-Fi</b>
              <span>{!sys.wifi ? 'Off' : net.online ? `${network}${net.type ? ` · ${net.type.toUpperCase()}` : ''}` : 'Not Connected'}</span>
            </button>
          </div>
          <div className="cc-row">
            <button type="button" className={`cc-circle ${sys.bluetooth ? 'on' : ''}`} aria-pressed={sys.bluetooth} aria-label="Bluetooth" onClick={() => sys.set({ bluetooth: !sys.bluetooth })}>
              {I.bt}
            </button>
            <button type="button" className="cc-row-text" onClick={() => togglePanel('bt')} aria-expanded={panel === 'bt'}>
              <b>Bluetooth</b>
              <span>{sys.bluetooth ? 'On' : 'Off'}</span>
            </button>
          </div>
          <div className="cc-row">
            <button
              type="button"
              className={`cc-circle ${sys.airdrop !== 'off' ? 'on' : ''}`}
              aria-pressed={sys.airdrop !== 'off'}
              aria-label="AirDrop"
              onClick={() => sys.set({ airdrop: sys.airdrop === 'off' ? 'contacts' : 'off' })}
            >
              {I.airdrop}
            </button>
            <button type="button" className="cc-row-text" onClick={() => togglePanel('airdrop')} aria-expanded={panel === 'airdrop'}>
              <b>AirDrop</b>
              <span>{airdropLabel[sys.airdrop]}</span>
            </button>
          </div>
        </div>

        <div className="cc-col">
          <button type="button" className="cc-tile cc-mode" onClick={toggleAppearance} aria-pressed={dark}>
            <span className={`cc-circle small ${dark ? 'on' : ''}`}>{dark ? I.moon : I.sun}</span>
            <b>{dark ? 'Dark Mode' : 'Light Mode'}</b>
          </button>
          <div className="cc-pair">
            <button
              type="button"
              className={`cc-tile cc-mini ${sys.keyboardBrightness > 0 ? 'active' : ''}`}
              onClick={() => sys.set({ keyboardBrightness: sys.keyboardBrightness > 0 ? 0 : 0.6 })}
              title="Simulated — browsers cannot control keyboard backlights"
            >
              {I.kbd}
              <span>Keyboard Brightness</span>
            </button>
            <button type="button" className={`cc-tile cc-mini ${sys.fullscreen ? 'active' : ''}`} onClick={sys.toggleFullscreen}>
              {I.full}
              <span>{sys.fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
            </button>
          </div>
        </div>

        {sub(
          'wifi',
          <>
            <div className="cc-sub-head">
              <b>Wi-Fi</b>
              <button type="button" className={`toggle ${sys.wifi ? 'on' : ''}`} role="switch" aria-checked={sys.wifi} aria-label="Wi-Fi" onClick={() => sys.set({ wifi: !sys.wifi })}>
                <span />
              </button>
            </div>
            <div className="cc-net-real">
              <span className={`cc-net-dot ${net.online ? 'on' : ''}`} />
              <span>
                <b>{net.online ? 'Connected to the internet' : 'Offline'}</b>
                <small>
                  {net.online
                    ? [net.type && `Type ${net.type.toUpperCase()}`, net.downlink !== undefined && `≈ ${net.downlink} Mbps`, net.rtt !== undefined && `${net.rtt} ms`].filter(Boolean).join(' · ') || 'Live status from your browser'
                    : 'Check your connection'}
                </small>
              </span>
            </div>
            <div className="cc-sub-label">Other Networks (simulated)</div>
            {sys.wifi &&
              NETWORKS.map((n) => (
                <button key={n} type="button" className={`cc-list-item ${n === network ? 'on' : ''}`} onClick={() => setNetwork(n)}>
                  <span className="cc-li-ico">{I.wifi}</span>
                  {n}
                  {n === network && <span className="cc-check">✓</span>}
                </button>
              ))}
            <p className="cc-note">The connection status above is real. Switching networks is simulated — a website can’t change your real Wi-Fi.</p>
          </>,
        )}
        {sub(
          'bt',
          <>
            <div className="cc-sub-head">
              <b>Bluetooth</b>
              <button type="button" className={`toggle ${sys.bluetooth ? 'on' : ''}`} role="switch" aria-checked={sys.bluetooth} aria-label="Bluetooth" onClick={() => sys.set({ bluetooth: !sys.bluetooth })}>
                <span />
              </button>
            </div>
            {sys.bluetooth &&
              DEVICES.map((d, i) => (
                <div key={d} className="cc-list-item static">
                  <span className="cc-li-ico">{I.bt}</span>
                  {d}
                  <span className="cc-li-status">{i === 0 ? 'Connected' : 'Not connected'}</span>
                </div>
              ))}
            <p className="cc-note">Simulated devices — for the macOS experience only.</p>
          </>,
        )}
        {sub(
          'airdrop',
          <>
            <div className="cc-sub-head">
              <b>AirDrop</b>
            </div>
            {(['off', 'contacts', 'everyone'] as AirDrop[]).map((a) => (
              <button key={a} type="button" className={`cc-list-item ${sys.airdrop === a ? 'on' : ''}`} onClick={() => sys.set({ airdrop: a })}>
                {airdropLabel[a]}
                {sys.airdrop === a && <span className="cc-check">✓</span>}
              </button>
            ))}
          </>,
        )}

        {/* focus + battery */}
        <button
          type="button"
          className={`cc-tile cc-focus ${sys.focus ? 'active' : ''}`}
          aria-pressed={sys.focus}
          onClick={() => {
            const next = !sys.focus;
            sys.set({ focus: next });
            notify({ app: 'Focus', icon: 'settings', title: next ? 'Focus is on' : 'Focus is off', body: next ? 'Portfolio notifications are silenced.' : 'Notifications will show again.', critical: true });
          }}
        >
          <span className={`cc-circle small ${sys.focus ? 'on focus' : ''}`}>{I.focus}</span>
          <span className="cc-focus-text">
            <b>Focus</b>
            <span>{sys.focus ? 'Do Not Disturb' : 'Off'}</span>
          </span>
        </button>
        <div className="cc-tile cc-battery" aria-label="Battery">
          <svg viewBox="0 0 30 14" aria-hidden="true">
            <rect x=".75" y=".75" width="25" height="12.5" rx="3.5" fill="none" stroke="currentColor" opacity=".5" />
            <rect x="2.5" y="2.5" width={battery ? Math.max(1.5, 21.5 * battery.level) : 21.5} height="9" rx="2" fill={battery && battery.level < 0.2 ? '#ff453a' : 'currentColor'} />
            <rect x="27" y="4.5" width="2" height="5" rx="1" opacity=".5" />
          </svg>
          <span>{battery ? `${Math.round(battery.level * 100)}%${battery.charging ? ' · Charging' : ''}` : 'Battery info unavailable'}</span>
        </div>

        {/* display */}
        <div className="cc-tile cc-wide">
          <div className="cc-tile-head">
            <b>Display</b>
            <button type="button" className={`cc-chev ${panel === 'display' ? 'open' : ''}`} aria-label="Display options" aria-expanded={panel === 'display'} onClick={() => togglePanel('display')}>
              {I.chev}
            </button>
          </div>
          <Slider value={sys.brightness} onChange={(v) => sys.set({ brightness: Math.max(0.25, v) })} label="Display brightness" icon={I.sun} />
        </div>
        {sub(
          'display',
          <>
            <div className="cc-sub-head">
              <b>Display</b>
            </div>
            <div className="cc-seg">
              <button type="button" className={!dark ? 'on' : ''} onClick={() => update({ appearance: 'light' })}>
                Light
              </button>
              <button type="button" className={dark ? 'on' : ''} onClick={() => update({ appearance: 'dark' })}>
                Dark
              </button>
            </div>
            <button
              type="button"
              className="cc-list-item"
              onClick={() => {
                sys.setOverlay('none');
                wm.open('settings', { pane: 'wallpaper' });
              }}
            >
              Wallpaper…
            </button>
            <button
              type="button"
              className="cc-list-item"
              onClick={() => {
                sys.setOverlay('none');
                wm.open('settings', { pane: 'display' });
              }}
            >
              Display Settings…
            </button>
          </>,
        )}

        {/* sound */}
        <div className="cc-tile cc-wide">
          <div className="cc-tile-head">
            <b>Sound</b>
            <button type="button" className={`cc-chev ${panel === 'sound' ? 'open' : ''}`} aria-label="Sound options" aria-expanded={panel === 'sound'} onClick={() => togglePanel('sound')}>
              {I.chev}
            </button>
          </div>
          <Slider value={music.muted ? 0 : music.volume} onChange={music.setVolume} label="Volume" icon={music.muted || music.volume === 0 ? I.mute : I.speaker} />
        </div>
        {sub(
          'sound',
          <>
            <div className="cc-sub-head">
              <b>Sound</b>
              <button type="button" className={`toggle ${!music.muted ? 'on' : ''}`} role="switch" aria-checked={!music.muted} aria-label="Sound on" onClick={music.toggleMute}>
                <span />
              </button>
            </div>
            <div className="cc-list-item static">
              <span className="cc-li-ico">{I.speaker}</span>
              This device’s speakers
              <span className="cc-check">✓</span>
            </div>
            <p className="cc-note">Controls the portfolio’s music player volume.</p>
          </>,
        )}

        {/* now playing */}
        <div className="cc-tile cc-wide cc-now">
          <button
            type="button"
            className="cc-art"
            style={{ background: `linear-gradient(135deg, ${music.track.art[0]}, ${music.track.art[1]})` }}
            onClick={() => {
              sys.setOverlay('none');
              wm.open('music');
            }}
            aria-label="Open Music"
          >
            ♪
          </button>
          <div className="cc-now-text">
            <b>{music.track.title}</b>
            <span>{music.track.artist}</span>
            <div className="cc-progress">
              <span style={{ width: `${music.duration ? (music.currentTime / music.duration) * 100 : 0}%` }} />
            </div>
          </div>
          <button type="button" className="cc-play" onClick={music.toggle} aria-label={music.playing ? 'Pause' : 'Play'}>
            {music.playing ? I.pause : I.play}
          </button>
          <button type="button" className="cc-play" onClick={music.next} aria-label="Next track">
            {I.next}
          </button>
        </div>

        {/* weather */}
        <button
          type="button"
          className="cc-tile cc-wide cc-weather"
          onClick={() => {
            sys.setOverlay('none');
            wm.open('weather');
          }}
          aria-label="Open Weather"
        >
          <span className="cc-wx-emoji" aria-hidden="true">
            {weather ? (WX[weather.code] ?? ['🌡'])[0] : '🌤'}
          </span>
          <span className="cc-wx-text">
            <b>Kandy</b>
            <span>{weather ? `${(WX[weather.code] ?? ['', 'Weather'])[1]} · H:${Math.round(weather.hi)}° L:${Math.round(weather.lo)}°` : weatherFailed ? 'Weather unavailable offline' : 'Loading…'}</span>
          </span>
          <span className="cc-wx-temp">{weather ? `${Math.round(weather.t)}°` : '—'}</span>
        </button>

        {/* connectivity + tools */}
        <div className="cc-wide cc-tools">
          {(
            [
              {
                id: 'airplane',
                label: 'Airplane Mode',
                on: ex.airplane,
                icon: ccExtra.plane,
                act: () => {
                  const next = !ex.airplane;
                  setExtras({ airplane: next, ...(next ? { cellular: false, hotspot: false } : {}) });
                  if (next) sys.set({ wifi: false, bluetooth: false });
                  notify({ app: 'Control Center', icon: 'settings', title: next ? 'Airplane Mode On' : 'Airplane Mode Off', body: 'Simulated inside the portfolio.' });
                },
              },
              { id: 'cellular', label: 'Cellular Data', on: ex.cellular, icon: ccExtra.cell, act: () => !ex.airplane && setExtras({ cellular: !ex.cellular }) },
              { id: 'hotspot', label: 'Hotspot', on: ex.hotspot, icon: ccExtra.hotspot, act: () => !ex.airplane && setExtras({ hotspot: !ex.hotspot }) },
              {
                id: 'mirror',
                label: 'Screen Mirroring',
                on: ex.mirroring,
                icon: ccExtra.mirror,
                act: () => {
                  setExtras({ mirroring: !ex.mirroring });
                  notify({ app: 'Screen Mirroring', icon: 'settings', title: ex.mirroring ? 'Mirroring stopped' : 'Looking for displays…', body: 'Simulated — use your browser’s Cast option to mirror for real.' });
                },
              },
              { id: 'record', label: recSince !== null ? `Stop ${fmtRec(recNow - recSince)}` : 'Screen Recording', on: recSince !== null, rec: true, icon: ccExtra.record, act: () => void toggleScreenRecording() },
              {
                id: 'shot',
                label: 'Screenshot',
                on: false,
                icon: ccExtra.shot,
                act: () => {
                  sys.setOverlay('none');
                  window.setTimeout(() => void takeScreenshot(), 250);
                },
              },
              { id: 'timer', label: 'Timer', on: false, app: 'clock' as AppId, args: { tab: 'timer' }, icon: ccExtra.timer },
              { id: 'stopwatch', label: 'Stopwatch', on: false, app: 'clock' as AppId, args: { tab: 'stopwatch' }, icon: ccExtra.stopwatch },
              { id: 'calc', label: 'Calculator', on: false, app: 'calculator' as AppId, icon: <AppIcon name="calculator" /> },
              { id: 'memo', label: 'Voice Memo', on: false, app: 'voicememos' as AppId, icon: ccExtra.memo },
              { id: 'camera', label: 'Camera', on: false, app: 'camera' as AppId, icon: <AppIcon name="camera" /> },
              { id: 'night', label: 'Night Shift', on: sys.nightShift, icon: I.sun, act: () => sys.set({ nightShift: !sys.nightShift }) },
              {
                id: 'stage',
                label: 'Stage Manager',
                on: settings.stageManager,
                icon: (
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <rect x="7" y="4" width="11" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                    <rect x="2" y="5" width="3" height="3" rx=".8" />
                    <rect x="2" y="9" width="3" height="3" rx=".8" />
                    <rect x="2" y="13" width="3" height="3" rx=".8" />
                  </svg>
                ),
                act: () => update({ stageManager: !settings.stageManager }),
              },
              /* v9 */
              { id: 'shazam', label: 'Recognize Music', on: false, app: 'webapp' as AppId, args: { service: 'shazam' }, icon: <AppIcon name="shazam" /> },
              {
                id: 'lowpower',
                label: 'Low Power Mode',
                on: settings.lowPowerMode === 'always',
                icon: (
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <rect x="2" y="6" width="14" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <rect x="4" y="8" width="5" height="4" rx=".8" />
                    <path d="M17.5 8.6v2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ),
                act: () => update({ lowPowerMode: settings.lowPowerMode === 'always' ? 'never' : 'always' }),
              },
              {
                id: 'textsize',
                label: `Text Size ${Math.round((settings.textScale || 1) * 100)}%`,
                on: (settings.textScale || 1) !== 1,
                icon: <span className="cc-aa">Aa</span>,
                act: () => {
                  const steps = [1, 1.1, 1.2, 0.9];
                  const i = steps.findIndex((x) => Math.abs(x - (settings.textScale || 1)) < 0.01);
                  update({ textScale: steps[(i + 1) % steps.length] });
                },
              },
              {
                id: 'a11y',
                label: 'Accessibility Shortcuts',
                on: settings.reduceMotion || settings.increaseContrast,
                icon: (
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="10" cy="6" r="1.3" />
                    <path d="M6 8.4l4 1 4-1M10 9.4v3M10 12.4l-2 3.2M10 12.4l2 3.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                ),
                act: () => {
                  const next = !(settings.reduceMotion || settings.increaseContrast);
                  update({ reduceMotion: next, increaseContrast: next });
                  notify({ app: 'Accessibility', icon: 'settings', title: next ? 'Reduce Motion & Increase Contrast on' : 'Accessibility shortcuts off' });
                },
              },
              { id: 'quicknote', label: 'Quick Note', on: false, app: 'stickies' as AppId, icon: <AppIcon name="stickies" /> },
              { id: 'call', label: 'FaceTime', on: false, app: 'facetime' as AppId, icon: <AppIcon name="facetime" /> },
              { id: 'edit', label: 'Edit Controls…', on: false, app: 'settings' as AppId, args: { pane: 'controlcenter' }, icon: <span className="cc-aa">✎</span> },
              {
                id: 'share',
                label: 'Share Portfolio',
                on: false,
                icon: <AppIcon name="share" />,
                act: () => {
                  sys.setOverlay('none');
                  void sharePortfolio();
                },
              },
              { id: 'hire', label: 'Hire Me', on: false, app: 'hireme' as AppId, icon: <AppIcon name="hireme" /> },
            ] as { id: string; label: string; on: boolean; icon: ReactNode; rec?: boolean; app?: AppId; args?: Record<string, string>; act?: () => void }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`cc-tool ${t.on ? 'on' : ''} ${t.rec ? 'rec' : ''} ${t.app ? 'app' : ''}`}
              aria-pressed={t.app ? undefined : t.on}
              onClick={() => {
                if (t.app) {
                  sys.setOverlay('none');
                  wm.open(t.app, t.args);
                } else t.act?.();
              }}
            >
              <span className="cc-tool-ico">{t.icon}</span>
              <span className="cc-tool-label">{t.label}</span>
            </button>
          ))}
          <p className="cc-note cc-tools-note">Airplane Mode, Cellular, Hotspot and Mirroring are simulated. Screenshot and Screen Recording are real — your browser asks which screen to capture and the file is saved to your device.</p>
        </div>
      </div>
    </div>
    {recSince !== null && (
      <button type="button" className="cc-rec-pill" onClick={() => void toggleScreenRecording()} aria-label="Stop screen recording">
        <span className="cc-rec-dot" /> Recording {fmtRec(recNow - recSince)} — Stop
      </button>
    )}
    </>
  );
}

function fmtRec(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const ccExtra = {
  plane: (
    <svg viewBox="0 0 24 24">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5Z" />
    </svg>
  ),
  cell: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="15" width="3.2" height="6" rx="1" />
      <rect x="8" y="11" width="3.2" height="10" rx="1" />
      <rect x="13" y="7" width="3.2" height="14" rx="1" />
      <rect x="18" y="3" width="3.2" height="18" rx="1" />
    </svg>
  ),
  hotspot: (
    <svg viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M8.5 15.5a5 5 0 0 1 7 0M5.5 12.5a9 9 0 0 1 13 0" />
        <path d="M9 21l3-6 3 6" />
      </g>
      <circle cx="12" cy="15" r="1.6" />
    </svg>
  ),
  mirror: (
    <svg viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <rect x="7" y="3" width="14" height="10" rx="2" />
        <rect x="3" y="9" width="12" height="10" rx="2" />
      </g>
    </svg>
  ),
  record: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5" />
    </svg>
  ),
  shot: (
    <svg viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      </g>
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  ),
  timer: (
    <svg viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13V8.5M10 2.5h4" />
      </g>
    </svg>
  ),
  stopwatch: (
    <svg viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13l3-3M12 2.5v2.5M18.5 5.5 20 4" />
      </g>
    </svg>
  ),
  memo: (
    <svg viewBox="0 0 24 24">
      {[4, 8, 14, 10, 18, 12, 6].map((h, i) => (
        <rect key={i} x={3 + i * 2.7} y={12 - h / 2} width="1.7" height={h} rx=".85" />
      ))}
    </svg>
  ),
};

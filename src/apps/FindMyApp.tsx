import { useEffect, useRef, useState } from 'react';
import { personal } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { openExternal } from '../system/notify';
import { AppIcon } from '../components/AppIcons';

type Tab = 'people' | 'devices' | 'items';

interface BatteryInfo {
  level: number;
  charging: boolean;
}
interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

type GeoState = { kind: 'idle' } | { kind: 'asking' } | { kind: 'ok'; lat: number; lng: number; acc: number } | { kind: 'error'; msg: string };

function platformName(): string {
  const n = navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
  const p = n.userAgentData?.platform;
  if (p) return p;
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown platform';
}

function browserName(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Browser';
}

function deviceKind(): 'phone' | 'tablet' | 'laptop' {
  const ua = navigator.userAgent;
  if (/iPhone|Android.+Mobile/.test(ua)) return 'phone';
  if (/iPad|Android/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  return 'laptop';
}

/** Plays a repeating two-tone chirp for ~2 s with Web Audio. */
function playFindSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < 6; i++) {
      [1320, 1760].forEach((f, j) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const t = ctx.currentTime + i * 0.34 + j * 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.12);
      });
    }
    window.setTimeout(() => void ctx.close(), 2600);
  } catch {
    /* audio unavailable */
  }
}

const KANDY_Q = personal.location;

export default function FindMyApp() {
  const wm = useWM();
  const [tab, setTab] = useState<Tab>('people');
  const [q, setQ] = useState<string>(KANDY_Q);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [battery, setBattery] = useState<BatteryInfo | null | 'na'>(null);
  const [screen, setScreen] = useState(() => ({ w: window.screen.width, h: window.screen.height, dpr: window.devicePixelRatio || 1 }));
  const [geo, setGeo] = useState<GeoState>({ kind: 'idle' });
  const [ringing, setRinging] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const ringT = useRef(0);

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=12&ie=UTF8&iwloc=&output=embed`;
  const go = (query: string) => {
    if (query !== q) {
      setLoading(true);
      setQ(query);
    }
    setShowDetail(true);
  };

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const rs = () => setScreen({ w: window.screen.width, h: window.screen.height, dpr: window.devicePixelRatio || 1 });
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('resize', rs);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('resize', rs);
    };
  }, []);

  useEffect(() => {
    const n = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!n.getBattery) {
      setBattery('na');
      return;
    }
    let bm: BatteryManagerLike | null = null;
    let alive = true;
    const upd = () => {
      if (alive && bm) setBattery({ level: bm.level, charging: bm.charging });
    };
    n.getBattery()
      .then((b) => {
        bm = b;
        upd();
        b.addEventListener('levelchange', upd);
        b.addEventListener('chargingchange', upd);
      })
      .catch(() => alive && setBattery('na'));
    return () => {
      alive = false;
      bm?.removeEventListener('levelchange', upd);
      bm?.removeEventListener('chargingchange', upd);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(ringT.current), []);

  const ring = () => {
    playFindSound();
    setRinging(true);
    window.clearTimeout(ringT.current);
    ringT.current = window.setTimeout(() => setRinging(false), 2100);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ kind: 'error', msg: 'Location isn’t supported in this browser.' });
      return;
    }
    if (!window.isSecureContext) {
      setGeo({ kind: 'error', msg: 'Location needs a secure connection (https:// or localhost).' });
      return;
    }
    setGeo({ kind: 'asking' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = Number(p.coords.latitude.toFixed(5));
        const lng = Number(p.coords.longitude.toFixed(5));
        setGeo({ kind: 'ok', lat, lng, acc: p.coords.accuracy });
        setLoading(true);
        setQ(`${lat},${lng}`);
      },
      (err) => {
        setGeo({
          kind: 'error',
          msg:
            err.code === err.PERMISSION_DENIED
              ? 'Location access was denied. Allow Location for this site in your browser settings to try again.'
              : err.code === err.TIMEOUT
                ? 'Finding your location took too long. Try again.'
                : 'Your location is unavailable right now.',
        });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  const plat = platformName();
  const kind = deviceKind();
  const deviceLabel = `${plat} · ${browserName()}`;
  const batteryText = battery === null ? 'Checking…' : battery === 'na' ? 'Not available' : `${Math.round(battery.level * 100)}%${battery.charging ? ' · Charging' : ''}`;
  const deviceSub = geo.kind === 'ok' ? 'Located · Now' : online ? 'Online · Location not shared' : 'Offline';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'people', label: 'People' },
    { id: 'devices', label: 'Devices' },
    { id: 'items', label: 'Items' },
  ];

  return (
    <div className="fm-wrap">
      <div className={`fm-root ${showDetail ? 'detail' : ''}`}>
      <aside className="fm-side">
        <div className="fm-tabs" role="tablist" aria-label="Find My">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'on' : ''}
              onClick={() => {
                setTab(t.id);
                setShowDetail(false);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="fm-list fade-swap" key={tab}>
          {tab === 'people' && (
            <>
              <button type="button" className={`fm-row ${q === KANDY_Q ? 'on' : ''}`} onClick={() => go(KANDY_Q)}>
                <img src={personal.avatar} alt="" className="fm-ava" />
                <span className="fm-row-t">
                  <b>{personal.name}</b>
                  <small>{personal.location}</small>
                </span>
              </button>
              <div className="fm-card">
                <div className="fm-card-h">
                  <img src={personal.avatar} alt="" className="fm-ava lg" />
                  <div>
                    <b>{personal.name}</b>
                    <small>{personal.location}</small>
                  </div>
                </div>
                <div className="fm-acts">
                  <button type="button" className="fm-act" onClick={() => wm.open('contacts')}>
                    <AppIcon name="contacts" />
                    <span>Contact</span>
                  </button>
                  <button
                    type="button"
                    className="fm-act"
                    onClick={() =>
                      openExternal('https://www.google.com/maps/dir/?api=1&destination=Kandy%2C+Sri+Lanka', {
                        title: 'Directions in Google Maps',
                        body: personal.location,
                        app: 'Find My',
                        icon: 'findmy',
                      })
                    }
                  >
                    <AppIcon name="maps" />
                    <span>Directions</span>
                  </button>
                  <button type="button" className="fm-act" onClick={() => wm.open('messages')}>
                    <AppIcon name="messages" />
                    <span>Message</span>
                  </button>
                </div>
                <p className="fm-note">Shows the city from the CV — not a live location.</p>
              </div>
            </>
          )}

          {tab === 'devices' && (
            <>
              <button type="button" className={`fm-row ${geo.kind === 'ok' && q === `${geo.lat},${geo.lng}` ? 'on' : ''}`} onClick={() => (geo.kind === 'ok' ? go(`${geo.lat},${geo.lng}`) : setShowDetail(true))}>
                <span className={`fm-dev-ico ${kind}`} aria-hidden="true">
                  <DeviceGlyph kind={kind} />
                </span>
                <span className="fm-row-t">
                  <b>This device</b>
                  <small>{deviceSub}</small>
                </span>
                <span className={`fm-dot ${online ? 'on' : ''}`} aria-label={online ? 'Online' : 'Offline'} />
              </button>
              <div className="fm-card">
                <dl className="fm-info">
                  <div>
                    <dt>Device</dt>
                    <dd>{deviceLabel}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`fm-dot ${online ? 'on' : ''}`} aria-hidden="true" /> {online ? 'Online' : 'Offline'}
                    </dd>
                  </div>
                  <div>
                    <dt>Battery</dt>
                    <dd>
                      {battery && battery !== 'na' && (
                        <span className={`fm-batt ${battery.charging ? 'chg' : ''} ${battery.level < 0.2 ? 'low' : ''}`} aria-hidden="true">
                          <i style={{ width: `${Math.round(battery.level * 100)}%` }} />
                        </span>
                      )}
                      {batteryText}
                    </dd>
                  </div>
                  <div>
                    <dt>Screen</dt>
                    <dd>
                      {screen.w} × {screen.h}
                      {screen.dpr !== 1 ? ` @${Number(screen.dpr.toFixed(2))}x` : ''}
                    </dd>
                  </div>
                  {geo.kind === 'ok' && (
                    <div>
                      <dt>Location</dt>
                      <dd className="fm-mono">
                        {geo.lat}, {geo.lng} (±{Math.round(geo.acc)} m)
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="fm-btns">
                  <button type="button" className={`btn ${ringing ? 'btn-primary' : ''}`} onClick={ring}>
                    {ringing ? 'Playing…' : 'Play Sound'}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={locate} disabled={geo.kind === 'asking'}>
                    {geo.kind === 'asking' ? 'Locating…' : geo.kind === 'ok' ? 'Locate Again' : 'Locate'}
                  </button>
                </div>
                {geo.kind === 'error' && (
                  <p className="fm-err" role="alert">
                    {geo.msg}
                  </p>
                )}
                <p className="fm-note">Details are read from your browser. Your location is only requested when you press Locate, and it stays in this browser, used only to centre the map.</p>
              </div>
            </>
          )}

          {tab === 'items' && (
            <div className="fm-empty">
              <div className="fm-empty-ico" aria-hidden="true">
                <svg viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="17" />
                  <circle cx="24" cy="24" r="10" />
                  <circle cx="24" cy="24" r="3" />
                </svg>
              </div>
              <b>No items</b>
              <p>Items like tags, keys or bags would appear here. Nothing is being tracked.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="fm-map">
        <button type="button" className="fm-back" onClick={() => setShowDetail(false)}>
          ‹ {tab === 'people' ? 'People' : tab === 'devices' ? 'Devices' : 'Items'}
        </button>
        {loading && (
          <div className="fm-map-loading" aria-hidden="true">
            <span className="spinner" />
          </div>
        )}
        <iframe key={src} title={`Map of ${q}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" onLoad={() => setLoading(false)} />
        <div className="fm-map-chip">
          {geo.kind === 'ok' && q === `${geo.lat},${geo.lng}` ? (
            <>
              <span className={`fm-dev-ico sm ${kind}`} aria-hidden="true">
                <DeviceGlyph kind={kind} />
              </span>
              This device
            </>
          ) : (
            <>
              <img src={personal.avatar} alt="" className="fm-ava xs" />
              {personal.name} · {personal.location}
            </>
          )}
        </div>
      </section>
    </div>
    </div>
  );
}

function DeviceGlyph({ kind }: { kind: 'phone' | 'tablet' | 'laptop' }) {
  if (kind === 'phone')
    return (
      <svg viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="19" rx="2.4" />
        <path d="M10.5 5h3" />
      </svg>
    );
  if (kind === 'tablet')
    return (
      <svg viewBox="0 0 24 24">
        <rect x="4" y="3" width="16" height="18" rx="2.4" />
        <circle cx="12" cy="18.2" r="0.6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24">
      <rect x="4.5" y="5" width="15" height="10.5" rx="1.4" />
      <path d="M2.5 18.5h19" />
    </svg>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SysIcon, WxIcon, wxKind } from '../components/SysIcons';
import { personal } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';

/* ───────────────────────────── Types & storage ───────────────────────────── */

interface City {
  id: string;
  name: string;
  region?: string;
  lat: number;
  lon: number;
}

interface Forecast {
  fetchedAt: number;
  utcOffset: number;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
    precipitation: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[] };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: (number | null)[];
    precipitation_probability_max: (number | null)[];
  };
}

type Entry = { status: 'loading' } | { status: 'ok'; data: Forecast; stale?: boolean } | { status: 'error'; message: string };

const KANDY: City = { id: 'kandy', name: personal.city, region: 'Central Province, Sri Lanka', lat: 7.2906, lon: 80.6337 };
const STORE = 'mra-weather-v1';
const CACHE = 'mra-weather-cache-v1';

interface Stored {
  cities: City[];
  unit: 'C' | 'F';
  selected: string;
  /** show the map panel next to the forecast */
  map: boolean;
  /** sidebar visible on wide windows */
  side: boolean;
}

/* ───────────────────────────── Weather codes ───────────────────────────── */

/** v10.3 — original weather glyphs (no emoji); size follows the surrounding font size */
const wx = (code: number, day: boolean) => <WxIcon kind={wxKind(code, day)} size={24} className="wa-wx" />;

function describe(code: number, day = true): { icon: ReactNode; text: string; kind: Sky } {
  if (code === 0) return { icon: wx(code, day), text: 'Clear', kind: 'clear' };
  if (code === 1) return { icon: wx(code, day), text: 'Mostly Clear', kind: 'clear' };
  if (code === 2) return { icon: wx(code, day), text: 'Partly Cloudy', kind: 'cloud' };
  if (code === 3) return { icon: wx(code, day), text: 'Cloudy', kind: 'cloud' };
  if (code === 45 || code === 48) return { icon: wx(code, day), text: 'Fog', kind: 'fog' };
  if (code >= 51 && code <= 57) return { icon: wx(code, day), text: 'Drizzle', kind: 'rain' };
  if (code >= 61 && code <= 67) return { icon: wx(code, day), text: code >= 65 ? 'Heavy Rain' : 'Rain', kind: 'rain' };
  if (code >= 71 && code <= 77) return { icon: wx(code, day), text: 'Snow', kind: 'snow' };
  if (code >= 80 && code <= 82) return { icon: wx(code, day), text: code === 82 ? 'Heavy Showers' : 'Showers', kind: 'rain' };
  if (code === 85 || code === 86) return { icon: wx(code, day), text: 'Snow Showers', kind: 'snow' };
  if (code >= 95) return { icon: wx(code, day), text: 'Thunderstorms', kind: 'storm' };
  return { icon: wx(code, day), text: 'Weather', kind: 'cloud' };
}

type Sky = 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';

/* ───────────────────────────── Helpers ───────────────────────────── */

const API = (c: City) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto&forecast_days=10`;

const toUnit = (c: number, u: 'C' | 'F') => (u === 'F' ? c * 1.8 + 32 : c);
const deg = (c: number, u: 'C' | 'F') => `${Math.round(toUnit(c, u))}°`;

/** "2026-09-26T06:04" → "6:04 AM" (already in the city's local time). */
function clock(iso: string | undefined, withMin = true): string {
  if (!iso) return '—';
  const [h, m] = iso.slice(11, 16).split(':').map(Number);
  const hh = h % 12 || 12;
  return withMin ? `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` : `${hh} ${h < 12 ? 'AM' : 'PM'}`;
}

function weekday(iso: string, i: number): string {
  if (i === 0) return 'Today';
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
}

function cityTime(f: Forecast): string {
  const d = new Date(Date.now() + f.utcOffset * 1000);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function uvLabel(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

/** Colour of a temperature (°C) on the 10-day bars. */
function tempColor(c: number): string {
  if (c <= 0) return '#7dd3fc';
  if (c <= 10) return '#5eead4';
  if (c <= 18) return '#a3e635';
  if (c <= 24) return '#facc15';
  if (c <= 30) return '#fb923c';
  return '#f87171';
}

function skyClass(kind: Sky, day: boolean): string {
  return `wa-sky-${kind}${day ? '' : '-night'}`;
}

function readCache(): Record<string, Forecast> {
  return readStore<Record<string, Forecast>>(CACHE, {});
}

/* ───────────────────────────── App ───────────────────────────── */

export default function WeatherApp() {
  const [store, setStore] = useState<Stored>(() => {
    const s = readStore<Stored>(STORE, { cities: [], unit: 'C', selected: KANDY.id, map: true, side: true });
    return { ...s, cities: (s.cities ?? []).filter((c) => c.id !== KANDY.id) };
  });
  const cities = useMemo(() => [KANDY, ...store.cities], [store.cities]);
  const selected = cities.find((c) => c.id === store.selected) ?? KANDY;
  const u = store.unit;

  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => writeStore(STORE, store), [store]);

  const load = useCallback((c: City) => {
    setEntries((e) => ({ ...e, [c.id]: { status: 'loading' } }));
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12000);
    fetch(API(c), { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Omit<Forecast, 'fetchedAt' | 'utcOffset'> & { utc_offset_seconds: number }) => {
        const f: Forecast = { fetchedAt: Date.now(), utcOffset: d.utc_offset_seconds ?? 0, current: d.current, hourly: d.hourly, daily: d.daily };
        setEntries((e) => ({ ...e, [c.id]: { status: 'ok', data: f } }));
        const cache = readCache();
        cache[c.id] = f;
        writeStore(CACHE, cache);
      })
      .catch((err: unknown) => {
        const cached = readCache()[c.id];
        if (cached) setEntries((e) => ({ ...e, [c.id]: { status: 'ok', data: cached, stale: true } }));
        else setEntries((e) => ({ ...e, [c.id]: { status: 'error', message: err instanceof Error && err.name !== 'AbortError' ? err.message : 'Request timed out' } }));
      })
      .finally(() => window.clearTimeout(timer));
  }, []);

  // fetch every saved city once (sidebar shows their summaries)
  const requested = useRef(new Set<string>());
  useEffect(() => {
    cities.forEach((c) => {
      if (requested.current.has(c.id)) return;
      requested.current.add(c.id);
      load(c);
    });
  }, [cities, load]);

  const entry: Entry = entries[selected.id] ?? { status: 'loading' };

  const addCity = (c: City) => {
    setStore((s) => (s.cities.some((x) => x.id === c.id) || c.id === KANDY.id ? { ...s, selected: c.id } : { ...s, cities: [...s.cities, c], selected: c.id }));
    setListOpen(false);
  };
  const removeCity = (id: string) => {
    setStore((s) => ({ ...s, cities: s.cities.filter((c) => c.id !== id), selected: s.selected === id ? KANDY.id : s.selected }));
    requested.current.delete(id);
  };

  const data = entry.status === 'ok' ? entry.data : null;
  const cur = data ? describe(data.current.weather_code, data.current.is_day === 1) : null;
  const bg = data && cur ? skyClass(cur.kind, data.current.is_day === 1) : entry.status === 'error' ? 'wa-sky-offline' : 'wa-sky-clear';

  return (
    <div className="wa-root">
    <div className={`wa ${bg} ${listOpen ? 'wa-list-open' : ''} ${store.side ? '' : 'wx7-noside'}`}>
      <aside className="wa-side" aria-label="Saved locations">
        <Search onPick={addCity} />
        <div className="wa-cities scroll-smooth">
          {cities.map((c) => (
            <CityCard
              key={c.id}
              city={c}
              entry={entries[c.id]}
              unit={u}
              active={c.id === selected.id}
              fixed={c.id === KANDY.id}
              onPick={() => {
                setStore((s) => ({ ...s, selected: c.id }));
                setListOpen(false);
              }}
              onRemove={() => removeCity(c.id)}
            />
          ))}
        </div>
        <div className="wa-side-foot">
          <div className="wa-unit" role="group" aria-label="Temperature unit">
            {(['C', 'F'] as const).map((x) => (
              <button key={x} type="button" className={u === x ? 'on' : ''} aria-pressed={u === x} onClick={() => setStore((s) => ({ ...s, unit: x }))}>
                °{x}
              </button>
            ))}
          </div>
          <span>Data: Open-Meteo</span>
        </div>
      </aside>
      <button type="button" className="wa-scrim" aria-label="Close locations" tabIndex={listOpen ? 0 : -1} onClick={() => setListOpen(false)} />

      <main className={`wa-main scroll-smooth ${store.map && data ? 'wx7-hasmap' : ''}`}>
        <div className="wa-topbar">
          <button type="button" className="wa-listbtn" aria-label="Show saved locations" onClick={() => setListOpen((o) => !o)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className="wx7-tbtn wx7-sidebtn"
            aria-label={store.side ? 'Hide sidebar' : 'Show sidebar'}
            aria-pressed={store.side}
            title={store.side ? 'Hide sidebar' : 'Show sidebar'}
            onClick={() => setStore((s) => ({ ...s, side: !s.side }))}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="2.5" y="4" width="15" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7.5 4v12" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          {entry.status === 'ok' && entry.stale && (
            <span className="wa-stale">
              Offline — showing forecast saved {new Date(entry.data.fetchedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            className={`wx7-tbtn wx7-mapbtn ${store.map ? 'on' : ''}`}
            aria-label={store.map ? 'Hide map' : 'Show map'}
            aria-pressed={store.map}
            title={store.map ? 'Hide map' : 'Show map'}
            onClick={() => setStore((s) => ({ ...s, map: !s.map }))}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2.8 5.2 7.4 3.4l5.2 2 4.6-1.8v11.2l-4.6 1.8-5.2-2-4.6 1.8z M7.4 3.4v11.2 M12.6 5.4v11.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="wa-refresh" aria-label="Refresh" onClick={() => load(selected)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.2h-3.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {entry.status === 'loading' && <Skeleton name={selected.name} />}
        {entry.status === 'error' && <Offline city={selected} message={entry.message} onRetry={() => load(selected)} />}
        {data && cur && <Report key={selected.id} city={selected} f={data} unit={u} map={store.map} onHideMap={() => setStore((s) => ({ ...s, map: false }))} />}
      </main>
    </div>
    </div>
  );
}

/* ───────────────────────────── Sidebar ───────────────────────────── */

function CityCard({ city, entry, unit, active, fixed, onPick, onRemove }: { city: City; entry?: Entry; unit: 'C' | 'F'; active: boolean; fixed: boolean; onPick: () => void; onRemove: () => void }) {
  const f = entry?.status === 'ok' ? entry.data : null;
  const d = f ? describe(f.current.weather_code, f.current.is_day === 1) : null;
  return (
    <div className={`wa-city ${f && d ? skyClass(d.kind, f.current.is_day === 1) : 'wa-sky-offline'} ${active ? 'on' : ''}`}>
      <button type="button" className="wa-city-btn" onClick={onPick} aria-current={active}>
        <span className="wa-city-l">
          <b>
            {fixed && (
              <svg viewBox="0 0 12 12" aria-label="Home location" role="img">
                <path d="M6 1.2 11 10H1z" fill="currentColor" transform="rotate(45 6 6)" />
              </svg>
            )}
            {city.name}
          </b>
          <small>{f ? cityTime(f) : fixed ? 'My Location' : city.region ?? ''}</small>
          <small className="wa-city-cond">{d ? d.text : entry?.status === 'error' ? 'Unavailable' : 'Loading…'}</small>
        </span>
        <span className="wa-city-r">
          <span className="wa-city-t">{f ? deg(f.current.temperature_2m, unit) : '--°'}</span>
          <small>{f ? `H:${deg(f.daily.temperature_2m_max[0], unit)}  L:${deg(f.daily.temperature_2m_min[0], unit)}` : ''}</small>
        </span>
      </button>
      {!fixed && (
        <button type="button" className="wa-city-x" aria-label={`Remove ${city.name}`} onClick={onRemove}>
          ✕
        </button>
      )}
    </div>
  );
}

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

function Search({ onPick }: { onPick: (c: City) => void }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'error' | 'ok'; results: GeoResult[] }>({ status: 'idle', results: [] });

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setState({ status: 'idle', results: [] });
      return;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=5`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: { results?: GeoResult[] }) => setState({ status: 'ok', results: d.results ?? [] }))
        .catch((e: unknown) => {
          if (!(e instanceof Error && e.name === 'AbortError')) setState({ status: 'error', results: [] });
        });
    }, 320);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="wa-search">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="m10.5 10.5 3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a city" aria-label="Search for a city" onKeyDown={(e) => e.key === 'Escape' && setQ('')} />
      {q.trim().length >= 2 && (
        <div className="wa-results" role="listbox" aria-label="Search results">
          {state.status === 'loading' && <div className="wa-res-note">Searching…</div>}
          {state.status === 'error' && <div className="wa-res-note">Can’t search right now — you appear to be offline.</div>}
          {state.status === 'ok' && state.results.length === 0 && <div className="wa-res-note">No results for “{q.trim()}”</div>}
          {state.results.map((r) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => {
                onPick({ id: `geo-${r.id}`, name: r.name, region: [r.admin1, r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude });
                setQ('');
              }}
            >
              <b>{r.name}</b>
              <small>{[r.admin1, r.country].filter(Boolean).join(', ')}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── States ───────────────────────────── */

function Skeleton({ name }: { name: string }) {
  return (
    <div className="wa-report wa-skel" aria-busy="true" aria-label={`Loading weather for ${name}`}>
      <header className="wa-hero">
        <h1>{name}</h1>
        <div className="wa-sk wa-sk-temp" />
        <div className="wa-sk wa-sk-line" />
        <div className="wa-sk wa-sk-line short" />
      </header>
      <div className="wa-panel">
        <div className="wa-sk-row">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="wa-sk wa-sk-hour" />
          ))}
        </div>
      </div>
      <div className="wa-grid">
        <div className="wa-panel wa-days">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="wa-sk wa-sk-day" />
          ))}
        </div>
        <div className="wa-cards">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="wa-panel wa-sk-card">
              <div className="wa-sk wa-sk-line short" />
              <div className="wa-sk wa-sk-big" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Offline({ city, message, onRetry }: { city: City; message: string; onRetry: () => void }) {
  return (
    <div className="wa-offline fade-swap" role="alert">
      <h1>{city.name}</h1>
      <div className="wa-off-card">
        <svg viewBox="0 0 64 48" className="wa-off-ico" aria-hidden="true">
          <path d="M18 40h30a11 11 0 0 0 1.5-21.9A15 15 0 0 0 21 15.5 12.5 12.5 0 0 0 18 40Z" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.85)" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M10 6 54 46" stroke="rgba(255,255,255,.9)" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        <h2>Weather Isn’t Available</h2>
        <p>The forecast for {city.name} couldn’t be loaded from Open-Meteo. Check your internet connection, then try again.</p>
        <button type="button" className="wa-retry" onClick={onRetry}>
          Try Again
        </button>
        <small>{message}</small>
      </div>
    </div>
  );
}

/* ───────────────────────────── Report ───────────────────────────── */

/** One-sentence summary like the Weather app's hourly card ("Cloudy conditions will continue…"). */
function summary(f: Forecast, hours: { t: string; code: number }[], unit: 'C' | 'F'): string {
  const now = describe(f.current.weather_code, f.current.is_day === 1);
  const change = hours.slice(1, 13).find((h) => describe(h.code).kind !== now.kind);
  const first = change
    ? `${now.text} now, with ${describe(change.code).text.toLowerCase()} expected around ${clock(change.t, false)}.`
    : `${now.text} conditions will continue for the next few hours.`;
  const wind = unit === 'F' ? `${Math.round(f.current.wind_speed_10m * 0.621)} mph` : `${Math.round(f.current.wind_speed_10m)} km/h`;
  const rain = f.daily.precipitation_probability_max[0];
  return `${first} Wind speeds are around ${wind}${rain != null && rain >= 30 ? `, and there is a ${rain}% chance of rain today` : ''}.`;
}

function MapPanel({ city, f, unit, onHide }: { city: City; f: Forecast; unit: 'C' | 'F'; onHide: () => void }) {
  const d = describe(f.current.weather_code, f.current.is_day === 1);
  const [zoom, setZoom] = useState(8);
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="wx7-map" aria-label={`Map of ${city.name}`}>
      <div className="wx7-map-fallback" aria-hidden={loaded}>
        <span>Map</span>
        <small>
          {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}° — map tiles need an internet connection
        </small>
      </div>
      <iframe
        key={`${city.id}-${zoom}`}
        title={`Map of ${city.name}`}
        src={`https://maps.google.com/maps?q=${city.lat},${city.lon}&z=${zoom}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoaded(true)}
      />
      <div className="wx7-bubble" aria-hidden="true">
        <span className="wx7-bubble-in">
          <b>{deg(f.current.temperature_2m, unit)}</b>
          <i>{d.icon}</i>
        </span>
        <span className="wx7-bubble-dot" />
        <small>{city.id === KANDY.id ? 'My Location' : city.name}</small>
      </div>
      <button type="button" className="wx7-map-x" aria-label="Close map" onClick={onHide}>
        ✕
      </button>
      <div className="wx7-map-zoom" role="group" aria-label="Map zoom">
        <button type="button" aria-label="Zoom in" disabled={zoom >= 14} onClick={() => setZoom((z) => Math.min(14, z + 2))}>
          +
        </button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 4} onClick={() => setZoom((z) => Math.max(4, z - 2))}>
          −
        </button>
      </div>
      <div className="wx7-map-legend">
        <b>{city.name}</b>
        <span>
          {d.text} · H:{deg(f.daily.temperature_2m_max[0], unit)} L:{deg(f.daily.temperature_2m_min[0], unit)}
        </span>
      </div>
    </section>
  );
}

function Report({ city, f, unit, map, onHideMap }: { city: City; f: Forecast; unit: 'C' | 'F'; map: boolean; onHideMap: () => void }) {
  const c = f.current;
  const d = describe(c.weather_code, c.is_day === 1);

  // next 24 hours starting at the current local hour
  const hours = useMemo(() => {
    const key = c.time.slice(0, 13);
    let start = f.hourly.time.findIndex((t) => t.slice(0, 13) === key);
    if (start < 0) start = 0;
    return f.hourly.time.slice(start, start + 24).map((t, i) => ({
      t,
      label: i === 0 ? 'Now' : clock(t, false),
      temp: i === 0 ? c.temperature_2m : f.hourly.temperature_2m[start + i],
      icon: describe(f.hourly.weather_code[start + i], f.hourly.is_day[start + i] === 1).icon,
      code: f.hourly.weather_code[start + i],
    }));
  }, [f, c.time, c.temperature_2m]);

  const lo = Math.min(...f.daily.temperature_2m_min);
  const hi = Math.max(...f.daily.temperature_2m_max);
  const span = Math.max(1, hi - lo);
  const uv = f.daily.uv_index_max[0] ?? 0;
  const wind = unit === 'F' ? `${Math.round(c.wind_speed_10m * 0.621)} mph` : `${Math.round(c.wind_speed_10m)} km/h`;
  const rainChance = f.daily.precipitation_probability_max[0];

  // sun progress for the sunrise / sunset arc
  const toMin = (iso: string) => {
    const [h, m] = iso.slice(11, 16).split(':').map(Number);
    return h * 60 + m;
  };
  const rise = toMin(f.daily.sunrise[0]);
  const set = toMin(f.daily.sunset[0]);
  const now = toMin(c.time);
  const sunP = Math.min(1, Math.max(0, (now - rise) / Math.max(1, set - rise)));
  const sunX = 10 + sunP * 100;
  const sunY = 50 - Math.sin(sunP * Math.PI) * 38;
  const daytime = now >= rise && now <= set;

  const sentence = summary(f, hours, unit);

  return (
    <div className={`wx7-cols ${map ? 'wx7-split' : ''}`}>
    <div className="wa-report wx7-center fade-swap">
      <header className="wa-hero">
        <h1>{city.name}</h1>
        {city.region && <span className="wa-region">{city.region}</span>}
        <div className="wa-temp">{deg(c.temperature_2m, unit)}</div>
        <div className="wa-cond">{d.text}</div>
        <div className="wa-hl">
          H:{deg(f.daily.temperature_2m_max[0], unit)} &nbsp;L:{deg(f.daily.temperature_2m_min[0], unit)}
        </div>
      </header>

      <section className="wa-panel" aria-label="Hourly forecast">
        <p className="wx7-summary">{sentence}</p>
        <div className="wa-hours" tabIndex={0} aria-label="Next 24 hours">
          {hours.map((h) => (
            <div key={h.t} className="wa-hour">
              <span>{h.label}</span>
              <i aria-hidden="true">{h.icon}</i>
              <b>{deg(h.temp, unit)}</b>
            </div>
          ))}
        </div>
      </section>

      <div className="wa-grid">
        <section className="wa-panel wa-days" aria-label="10-day forecast">
          <h3 className="wa-cap">
            <SysIcon n="calendar" size={13} /> 10-day forecast
          </h3>
          {f.daily.time.map((day, i) => {
            const mn = f.daily.temperature_2m_min[i];
            const mx = f.daily.temperature_2m_max[i];
            const p = f.daily.precipitation_probability_max[i] ?? 0;
            return (
              <div key={day} className="wa-day">
                <span className="wa-day-n">{weekday(day, i)}</span>
                <span className="wa-day-i">
                  <i aria-hidden="true">{describe(f.daily.weather_code[i]).icon}</i>
                  {p >= 20 && <small>{p}%</small>}
                </span>
                <span className="wa-day-lo">{deg(mn, unit)}</span>
                <span className="wa-bar" aria-label={`Low ${deg(mn, unit)}, high ${deg(mx, unit)}`}>
                  <span
                    className="wa-bar-fill"
                    style={{
                      left: `${((mn - lo) / span) * 100}%`,
                      right: `${100 - ((mx - lo) / span) * 100}%`,
                      background: `linear-gradient(90deg, ${tempColor(mn)}, ${tempColor(mx)})`,
                    }}
                  />
                  {i === 0 && <span className="wa-bar-now" style={{ left: `${((Math.min(mx, Math.max(mn, c.temperature_2m)) - lo) / span) * 100}%` }} />}
                </span>
                <span className="wa-day-hi">{deg(mx, unit)}</span>
              </div>
            );
          })}
        </section>

        <div className="wa-cards">
          <section className="wa-panel wa-card">
            <h3 className="wa-cap">
              <SysIcon n="thermo" size={13} /> Feels like
            </h3>
            <div className="wa-big">{deg(c.apparent_temperature, unit)}</div>
            <p>{Math.abs(c.apparent_temperature - c.temperature_2m) < 1.5 ? 'Similar to the actual temperature.' : c.apparent_temperature > c.temperature_2m ? 'Humidity is making it feel warmer.' : 'Wind is making it feel cooler.'}</p>
          </section>
          <section className="wa-panel wa-card">
            <h3 className="wa-cap">
              <SysIcon n="drop" size={13} /> Humidity
            </h3>
            <div className="wa-big">{Math.round(c.relative_humidity_2m)}%</div>
            <div className="wa-meter" aria-hidden="true">
              <span style={{ width: `${c.relative_humidity_2m}%` }} />
            </div>
          </section>
          <section className="wa-panel wa-card">
            <h3 className="wa-cap">
              <SysIcon n="windGlyph" size={13} /> Wind
            </h3>
            <div className="wa-big">{wind}</div>
            <p>Wind speed at 10 m above ground.</p>
          </section>
          <section className="wa-panel wa-card">
            <h3 className="wa-cap">
              <SysIcon n="sun" size={13} /> UV index
            </h3>
            <div className="wa-big">
              {Math.round(uv)} <small>{uvLabel(uv)}</small>
            </div>
            <div className="wa-uv" aria-hidden="true">
              <span style={{ left: `${Math.min(100, (uv / 11) * 100)}%` }} />
            </div>
            <p>Today’s maximum.</p>
          </section>
          <section className="wa-panel wa-card">
            <h3 className="wa-cap">
              <SysIcon n="umbrella" size={13} /> Precipitation
            </h3>
            <div className="wa-big">
              {unit === 'F' ? `${(c.precipitation / 25.4).toFixed(2)}″` : `${c.precipitation} mm`}
            </div>
            <p>{rainChance != null ? `${rainChance}% chance of rain today.` : 'In the last hour.'}</p>
          </section>
          <section className="wa-panel wa-card">
            <h3 className="wa-cap">
              <SysIcon n="sunrise" size={13} /> {daytime ? 'Sunset' : 'Sunrise'}
            </h3>
            <div className="wa-big">{clock(daytime ? f.daily.sunset[0] : f.daily.sunrise[0])}</div>
            <svg className="wa-sun" viewBox="0 0 120 56" aria-hidden="true">
              <path d="M10 50 Q60 -26 110 50" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="3 4" />
              <line x1="4" y1="50" x2="116" y2="50" stroke="rgba(255,255,255,.3)" strokeWidth="1" />
              {daytime && <circle cx={sunX} cy={sunY} r="5.5" fill="#ffd54a" stroke="#fff" strokeWidth="1.5" />}
            </svg>
            <p>
              Sunrise {clock(f.daily.sunrise[0])} · Sunset {clock(f.daily.sunset[0])}
            </p>
          </section>
        </div>
      </div>
      <p className="wa-credit">Live forecast from Open-Meteo · times shown in {city.name} local time</p>
    </div>
    {map && <MapPanel city={city} f={f} unit={unit} onHide={onHideMap} />}
    </div>
  );
}

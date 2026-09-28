import { useState } from 'react';
import { personal } from '../data/portfolio';
import { notify, openExternal } from '../system/notify';
import { sharePortfolio } from '../system/share';

interface Place {
  id: string;
  name: string;
  query: string;
  note: string;
}

/** Places taken from the CV (home city, study locations). */
const PLACES: Place[] = [
  { id: 'kandy', name: 'Kandy, Sri Lanka', query: 'Kandy, Sri Lanka', note: 'Where I’m based' },
  { id: 'colombo', name: 'Colombo, Sri Lanka', query: 'Colombo, Sri Lanka', note: 'SLIIT City Uni (degree final year)' },
  { id: 'gampola', name: 'Gampola, Sri Lanka', query: 'Zahira College, Gampola, Sri Lanka', note: 'Zahira College — school' },
];

/**
 * Maps app using the Google Maps embed (no API key needed). Search any place;
 * "Open in Google Maps" and "Directions" open the full Google Maps site.
 */
export default function MapsApp() {
  const [q, setQ] = useState(PLACES[0].query);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'m' | 'k'>('m');
  const [loading, setLoading] = useState(true);

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=${mode}&z=12&ie=UTF8&iwloc=&output=embed`;
  const go = (query: string) => {
    if (query === q) return;
    setLoading(true);
    setQ(query);
  };

  return (
    <div className="maps">
      <aside className="mp-side">
        <form
          className="mp-search"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) go(input.trim());
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search Maps" aria-label="Search Maps" />
        </form>
        <div className="mp-h">Places</div>
        {PLACES.map((p) => (
          <button key={p.id} type="button" className={`mp-place ${q === p.query ? 'on' : ''}`} onClick={() => go(p.query)}>
            <span className="mp-pin" aria-hidden="true">
              📍
            </span>
            <span>
              <b>{p.name}</b>
              <small>{p.note}</small>
            </span>
          </button>
        ))}
        <div className="mp-h">Map</div>
        <div className="mp-seg">
          <button type="button" className={mode === 'm' ? 'on' : ''} onClick={() => (setLoading(true), setMode('m'))}>
            Map
          </button>
          <button type="button" className={mode === 'k' ? 'on' : ''} onClick={() => (setLoading(true), setMode('k'))}>
            Satellite
          </button>
        </div>
        <div className="mp-actions">
          <button type="button" className="btn btn-primary" onClick={() => openExternal(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, { title: 'Opening Google Maps', body: q, app: 'Maps', icon: 'maps' })}>
            Open in Google Maps
          </button>
          <button type="button" className="btn" onClick={() => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, { title: 'Directions in Google Maps', body: q, app: 'Maps', icon: 'maps' })}>
            Directions
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!navigator.geolocation) return notify({ app: 'Maps', icon: 'maps', title: 'Location isn’t available in this browser' });
              navigator.geolocation.getCurrentPosition(
                (pos) => go(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
                () => notify({ app: 'Maps', icon: 'maps', title: 'Location permission denied', body: 'Allow location access to see where you are — it is never stored or sent anywhere.' }),
                { timeout: 10000 },
              );
            }}
          >
            📍 My Location
          </button>
          <button type="button" className="btn" onClick={() => void sharePortfolio({ title: `${q} — Maps`, text: `Location: ${q}`, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` })}>
            Share
          </button>
        </div>
        <p className="mp-note">{personal.name} · {personal.location}</p>
      </aside>
      <section className="mp-map">
        <iframe key={src} title={`Google Map — ${q}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" onLoad={() => setLoading(false)} allowFullScreen />
        {loading && (
          <div className="mp-loading">
            <span className="spinner" />
          </div>
        )}
      </section>
    </div>
  );
}

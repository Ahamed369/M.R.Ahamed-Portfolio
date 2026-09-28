import { useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { fmtTime, useMusic } from '../system/MusicContext';
import { openExternal } from '../system/notify';
import { readStore, writeStore } from '../system/storage';
import type { Track } from '../data/media';

type View = 'search' | 'home' | 'new' | 'updated' | 'shows' | 'saved' | 'downloaded' | 'latest';

const P = {
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  home: 'M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5Z',
  grid: 'M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z',
  updated: 'M12 4a8 8 0 1 0 8 8M12 8v4l3 2M20 4v4h-4',
  shows: 'M5 4h14v16H5ZM9 4v16',
  saved: 'M7 4h10v16l-5-3.5L7 20Z',
  down: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5v8M8.5 12.5 12 16l3.5-3.5',
  latest: 'M5 6h14M5 12h14M5 18h9',
  station: 'M12 5v14M5 12h14',
  play: 'M8 5.5v13l11-6.5Z',
  pause: 'M8 5h3v14H8ZM13 5h3v14h-3Z',
  back: 'M11 7a6 6 0 1 1-6 6M11 4 7.5 7 11 10',
  fwd: 'M13 7a6 6 0 1 0 6 6M13 4l3.5 3L13 10',
  vol: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4ZM16 9.5l5 5M21 9.5l-5 5',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  bookmark: 'M7 4h10v16l-5-3.5L7 20Z',
};

function G({ d, size = 17, fill }: { d: string; size?: number; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Genre ids on the public podcast directory; others fall back to a web search. */
interface Cat {
  label: string;
  genre?: string;
  c: [string, string];
  glyph: string;
}
const CATS: Cat[] = [
  { label: 'Technology', genre: 'podcasts-technology/id1318', c: ['#5ac8fa', '#0a60d8'], glyph: 'M4 6h16v10H4ZM8 20h8M12 16v4' },
  { label: 'Society & Culture', genre: 'podcasts-society-culture/id1324', c: ['#ff9f43', '#e8590c'], glyph: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 10 0' },
  { label: 'Arts', genre: 'podcasts-arts/id1301', c: ['#ff6b81', '#d6336c'], glyph: 'M12 4a8 8 0 1 0 0 16c1.5 0 1.5-1.8.5-2.8-.9-1 0-2.7 1.4-2.7H17a3 3 0 0 0 3-3c0-4.2-3.6-7.5-8-7.5ZM8 11h.01M11 8h.01M15 8h.01' },
  { label: 'Business', genre: 'podcasts-business/id1321', c: ['#4dabf7', '#1c5fd4'], glyph: 'M4 8h16v11H4ZM9 8V5h6v3M4 13h16' },
  { label: 'Science', genre: 'podcasts-science/id1533', c: ['#69db7c', '#2b8a3e'], glyph: 'M10 3h4M11 3v6L5.5 18a1.5 1.5 0 0 0 1.3 2.2h10.4a1.5 1.5 0 0 0 1.3-2.2L13 9V3' },
  { label: 'Education', genre: 'podcasts-education/id1304', c: ['#38d9a9', '#0c8599'], glyph: 'M2.5 9 12 4.5 21.5 9 12 13.5ZM6 11v5c3.5 2.5 8.5 2.5 12 0v-5' },
  { label: 'News', genre: 'podcasts-news/id1489', c: ['#74c0fc', '#1971c2'], glyph: 'M4 5h13v14H6a2 2 0 0 1-2-2ZM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4' },
  { label: 'Comedy', genre: 'podcasts-comedy/id1303', c: ['#ffd43b', '#f08c00'], glyph: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8 13.5a4.5 4.5 0 0 0 8 0M9 9.5h.01M15 9.5h.01' },
  { label: 'Health & Fitness', genre: 'podcasts-health-fitness/id1512', c: ['#4dabf7', '#3b5bdb'], glyph: 'M3 12h4l2-5 4 10 2-5h6' },
  { label: 'Sports', genre: 'podcasts-sports/id1545', c: ['#94d82d', '#5c940d'], glyph: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM3.5 12h17M12 3.5c-3 3-3 14 0 17M12 3.5c3 3 3 14 0 17' },
  { label: 'True Crime', genre: 'podcasts-true-crime/id1488', c: ['#9775fa', '#5f3dc4'], glyph: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20M10.5 8.5a2 2 0 1 0 0 4' },
  { label: 'History', genre: 'podcasts-history/id1487', c: ['#e8a15a', '#a0522d'], glyph: 'M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6Z' },
  { label: 'Music', genre: 'podcasts-music/id1310', c: ['#f783ac', '#c2255c'], glyph: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z' },
  { label: 'Religion & Spirituality', genre: 'podcasts-religion-spirituality/id1314', c: ['#66d9e8', '#1098ad'], glyph: 'M12 3c2 3 5 4.5 5 9a5 5 0 0 1-10 0c0-4.5 3-6 5-9ZM12 21v-4' },
  { label: 'Kids & Family', genre: 'podcasts-kids-family/id1305', c: ['#ffa8a8', '#e03131'], glyph: 'M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM4 20v-5a4 4 0 0 1 8 0v5M13 20v-3a3 3 0 0 1 6 0v3' },
  { label: 'TV & Film', genre: 'podcasts-tv-film/id1309', c: ['#495057', '#212529'], glyph: 'M4 7h16v12H4ZM8 3l4 4 4-4' },
  { label: 'Fiction', genre: 'podcasts-fiction/id1483', c: ['#da77f2', '#862e9c'], glyph: 'M4 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4ZM20 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7Z' },
  { label: 'Leisure', genre: 'podcasts-leisure/id1502', c: ['#63e6be', '#099268'], glyph: 'M5 12a7 7 0 0 1 14 0ZM12 12v8M9 20h6' },
  { label: 'Programming', c: ['#343a40', '#0b7285'], glyph: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12' },
  { label: 'Startups', c: ['#ff8787', '#c92a2a'], glyph: 'M12 3c3 2 5 6 4 11l-4 3-4-3c-1-5 1-9 4-11ZM9 17l-2 4M15 17l2 4M12 9h.01' },
];

const catUrl = (c: Cat) => (c.genre ? `https://podcasts.apple.com/us/genre/${c.genre}` : `https://www.google.com/search?q=${encodeURIComponent(`${c.label} podcasts`)}`);

const KEY = 'mra-podcasts';

function Art({ t, size }: { t: Pick<Track, 'art'>; size?: 'sm' | 'lg' }) {
  return (
    <span className={`pc-art ${size ?? ''}`} style={{ background: `linear-gradient(135deg, ${t.art[0]}, ${t.art[1]})` }} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 3a8 8 0 0 0-4 15M12 3a8 8 0 0 1 4 15M12 7a4 4 0 0 0-2 7.5M12 7a4 4 0 0 1 2 7.5M12 11v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/**
 * Podcasts-style app. Categories open the real podcast directory in a new
 * tab. "Listen Now" plays the portfolio's own ambient loops (not podcasts).
 */
export default function PodcastsApp() {
  const m = useMusic();
  const [view, setView] = useState<View>('search');
  const [q, setQ] = useState('');
  const [saved, setSaved] = useState<string[]>(() => readStore<{ saved: string[] }>(KEY, { saved: [] }).saved);

  const toggleSave = (id: string) =>
    setSaved((s) => {
      const n = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      writeStore(KEY, { saved: n });
      return n;
    });

  const search = (term: string) => {
    const t = term.trim();
    if (!t) return;
    openExternal(`https://podcasts.apple.com/us/search?term=${encodeURIComponent(t)}`, { title: 'Searching podcasts', body: `“${t}” — opens in a new tab`, app: 'Podcasts', icon: 'podcasts' });
  };

  const playAt = (i: number) => (m.index === i ? m.toggle() : m.play(i));

  const nav: { id: View; label: string; d: string }[] = [
    { id: 'search', label: 'Search', d: P.search },
    { id: 'home', label: 'Home', d: P.home },
    { id: 'new', label: 'New', d: P.grid },
  ];
  const lib: { id: View; label: string; d: string }[] = [
    { id: 'updated', label: 'Recently Updated', d: P.updated },
    { id: 'shows', label: 'Shows', d: P.shows },
    { id: 'saved', label: 'Saved', d: P.saved },
    { id: 'downloaded', label: 'Downloaded', d: P.down },
    { id: 'latest', label: 'Latest Episodes', d: P.latest },
  ];

  const disclaimer = <p className="pc-honest">“Portfolio Ambient” is a set of original ambient loops made for this portfolio — not a podcast. Real shows open in a new tab.</p>;

  const EpRow = ({ t, i }: { t: Track; i: number }) => {
    const on = m.index === i;
    return (
      <div className={`pc-ep ${on ? 'on' : ''}`}>
        <button type="button" className="pc-ep-main" onClick={() => playAt(i)} aria-label={`${on && m.playing ? 'Pause' : 'Play'} ${t.title}`}>
          <Art t={t} size="sm" />
          <span className="pc-ep-txt">
            <small>{t.album.toUpperCase()}</small>
            <b>{t.title}</b>
            <span>
              {t.artist} · {on && m.duration ? fmtTime(m.duration) : 'Ambient loop'}
            </span>
          </span>
          <span className="pc-ep-play">
            <G d={on && m.playing ? P.pause : P.play} fill size={13} />
          </span>
        </button>
        <button type="button" className={`pc-ep-save ${saved.includes(t.id) ? 'on' : ''}`} aria-pressed={saved.includes(t.id)} aria-label={saved.includes(t.id) ? `Unsave ${t.title}` : `Save ${t.title}`} onClick={() => toggleSave(t.id)}>
          <G d={P.bookmark} fill={saved.includes(t.id)} size={15} />
        </button>
      </div>
    );
  };

  const Tiles = ({ list }: { list: Cat[] }) => (
    <div className="pc-grid">
      {list.map((c, i) => (
        <button
          key={c.label}
          type="button"
          className="pc-tile"
          style={{ background: `linear-gradient(145deg, ${c.c[0]}, ${c.c[1]})`, animationDelay: `${Math.min(i, 16) * 22}ms` }}
          onClick={() => openExternal(catUrl(c), { title: `${c.label} podcasts`, body: 'Opens in a new tab', app: 'Podcasts', icon: 'podcasts' })}
        >
          <span className="pc-tile-glyph">
            <G d={c.glyph} size={46} />
          </span>
          <span className="pc-tile-lbl">{c.label}</span>
        </button>
      ))}
    </div>
  );

  let body;
  if (view === 'search') {
    const f = q.trim().toLowerCase();
    const list = f ? CATS.filter((c) => c.label.toLowerCase().includes(f)) : CATS;
    body = (
      <>
        <h2 className="pc-h">Browse Categories</h2>
        <Tiles list={list} />
        {f && (
          <button type="button" className="pc-searchall" onClick={() => search(q)}>
            <G d={P.search} size={15} /> Search podcasts for “{q.trim()}” <G d={P.ext} size={13} />
          </button>
        )}
      </>
    );
  } else if (view === 'home' || view === 'latest' || view === 'updated') {
    body = (
      <>
        <h2 className="pc-h">{view === 'home' ? 'Listen Now' : view === 'latest' ? 'Latest Episodes' : 'Recently Updated'}</h2>
        {view === 'home' && (
          <div className="pc-hero">
            <Art t={m.track} size="lg" />
            <div>
              <small>PORTFOLIO AMBIENT · UP NEXT</small>
              <h3>{m.track.title}</h3>
              <p>{m.track.album} — ambient loop from this portfolio’s own soundtrack.</p>
              <button type="button" className="pc-btn" onClick={() => m.toggle()}>
                <G d={m.playing ? P.pause : P.play} fill size={13} /> {m.playing ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
        )}
        <div className="pc-eps">
          {m.tracks.map((t, i) => (
            <EpRow key={t.id} t={t} i={i} />
          ))}
        </div>
        {disclaimer}
      </>
    );
  } else if (view === 'new') {
    body = (
      <>
        <h2 className="pc-h">New &amp; Noteworthy</h2>
        <p className="pc-sub">Explore popular categories on the podcast directory.</p>
        <Tiles list={CATS.slice(0, 8)} />
      </>
    );
  } else if (view === 'shows') {
    const albums = Array.from(new Set(m.tracks.map((t) => t.album)));
    body = (
      <>
        <h2 className="pc-h">Shows</h2>
        <div className="pc-shows">
          {albums.map((a) => {
            const first = m.tracks.findIndex((t) => t.album === a);
            const n = m.tracks.filter((t) => t.album === a).length;
            return (
              <button key={a} type="button" className="pc-show" onClick={() => m.play(first)}>
                <Art t={m.tracks[first]} size="lg" />
                <b>{a}</b>
                <small>Portfolio Ambient · {n} loops</small>
              </button>
            );
          })}
        </div>
        {disclaimer}
      </>
    );
  } else if (view === 'saved') {
    const list = m.tracks.map((t, i) => ({ t, i })).filter(({ t }) => saved.includes(t.id));
    body = (
      <>
        <h2 className="pc-h">Saved</h2>
        {list.length ? (
          <div className="pc-eps">
            {list.map(({ t, i }) => (
              <EpRow key={t.id} t={t} i={i} />
            ))}
          </div>
        ) : (
          <div className="pc-empty">
            <G d={P.saved} size={34} />
            <b>No Saved Episodes</b>
            <p>Tap the bookmark on any item in Home to save it here.</p>
          </div>
        )}
      </>
    );
  } else {
    body = (
      <>
        <h2 className="pc-h">Downloaded</h2>
        <div className="pc-empty">
          <G d={P.down} size={34} />
          <b>Nothing Downloaded</b>
          <p>Everything here streams from the portfolio — there’s nothing to download.</p>
        </div>
      </>
    );
  }

  const prog = m.duration ? (m.currentTime / m.duration) * 100 : 0;

  return (
    <div className="pc-root">
      <div className="pc">
      <aside className="pc-side">
        <DragBar className="pc-drag">
          <Lights />
        </DragBar>
        <nav className="pc-nav" aria-label="Podcasts">
          {nav.map((n) => (
            <button key={n.id} type="button" className={`pc-item ${view === n.id ? 'on' : ''}`} onClick={() => setView(n.id)}>
              <G d={n.d} size={16} />
              {n.label}
            </button>
          ))}
          <div className="pc-sec">Library</div>
          {lib.map((n) => (
            <button key={n.id} type="button" className={`pc-item ${view === n.id ? 'on' : ''}`} onClick={() => setView(n.id)}>
              <G d={n.d} size={16} />
              {n.label}
              {n.id === 'saved' && saved.length > 0 && <span className="pc-count">{saved.length}</span>}
            </button>
          ))}
          <div className="pc-sec">Stations</div>
          <button type="button" className="pc-item" onClick={() => setView('search')}>
            <G d={P.station} size={16} />
            New Station
          </button>
        </nav>
      </aside>
      <section className="pc-main">
        <DragBar className="pc-top">
          <form
            className="pc-search"
            onSubmit={(e) => {
              e.preventDefault();
              search(q);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <G d={P.search} size={14} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setView('search');
              }}
              placeholder="Search Podcasts"
              aria-label="Search podcasts"
            />
          </form>
          <div className="pc-seg" role="tablist" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" role="tab" aria-selected={view === 'search' || view === 'home' || view === 'new'} className={view === 'search' || view === 'home' || view === 'new' ? 'on' : ''} onClick={() => setView('search')}>
              Browse
            </button>
            <button type="button" role="tab" aria-selected={!['search', 'home', 'new'].includes(view)} className={!['search', 'home', 'new'].includes(view) ? 'on' : ''} onClick={() => setView('shows')}>
              Library
            </button>
          </div>
        </DragBar>
        <div className="pc-scroll scroll-smooth">
          <div key={view} className="pc-body fade-swap">
            {body}
          </div>
        </div>
        <div className="pc-player" aria-label="Now playing">
          <button type="button" className="pc-pb sm" aria-label="Back 15 seconds" onClick={() => m.seek(Math.max(0, m.currentTime - 15))}>
            <G d={P.back} size={17} />
          </button>
          <button type="button" className="pc-pb big" aria-label={m.playing ? 'Pause' : 'Play'} onClick={() => m.toggle()}>
            <G d={m.playing ? P.pause : P.play} fill size={20} />
          </button>
          <button type="button" className="pc-pb sm" aria-label="Forward 30 seconds" onClick={() => m.seek(Math.min(m.duration || 0, m.currentTime + 30))}>
            <G d={P.fwd} size={17} />
          </button>
          <div className="pc-np">
            <Art t={m.track} size="sm" />
            <span className="pc-np-txt">
              <b>{m.track.title}</b>
              <small>
                Portfolio Ambient · {fmtTime(m.currentTime)}
                {m.duration ? ` / ${fmtTime(m.duration)}` : ''}
              </small>
            </span>
            <span className="pc-np-bar" style={{ width: `${prog}%` }} />
          </div>
          <button type="button" className="pc-pb sm" aria-label={m.muted ? 'Unmute' : 'Mute'} onClick={() => m.toggleMute()}>
            <G d={m.muted ? P.mute : P.vol} size={17} />
          </button>
        </div>
        {m.error && <div className="pc-err">{m.error}</div>}
      </section>
      </div>
    </div>
  );
}

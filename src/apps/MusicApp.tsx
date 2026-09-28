import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fmtTime, useMusic } from '../system/MusicContext';
import { personal, socials } from '../data/portfolio';
import { openExternal } from '../system/notify';
import { readStore, writeStore } from '../system/storage';
import { ccIcons as I } from '../components/ControlCenter';
import { DragBar, Lights } from '../components/Window';
import type { Track } from '../data/media';

type View = 'home' | 'new' | 'radio' | 'recent' | 'artists' | 'albums' | 'songs' | 'favs' | `album:${string}`;

const FAV_KEY = 'mra-music-favs';

const G = {
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  home: 'M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5Z',
  new: 'M4 5h16v14H4ZM4 9h16M9 5v4M15 5v4',
  radio: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
  recent: 'M12 4a8 8 0 1 0 8 8M12 8v4l3 2M20 4v4h-4',
  artists: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  albums: 'M4 4h16v16H4ZM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  songs: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  list: 'M5 7h14M5 12h14M5 17h9',
};

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cover({ t, big, label }: { t: Pick<Track, 'art'>; big?: boolean; label?: string }) {
  return (
    <span className={`am-cover ${big ? 'big' : ''}`} style={{ background: `linear-gradient(135deg, ${t.art[0]}, ${t.art[1]})` }} aria-hidden="true">
      <span className="am-cover-note">♪</span>
      {label && <span className="am-cover-label">{label}</span>}
    </span>
  );
}

/** Real track durations, read from each file's metadata once. */
function useDurations(tracks: Track[]) {
  const [d, setD] = useState<Record<string, number>>({});
  useEffect(() => {
    const audios = tracks.map((t) => {
      const a = new Audio();
      a.preload = 'metadata';
      a.src = t.src;
      a.addEventListener('loadedmetadata', () => setD((x) => ({ ...x, [t.id]: a.duration })));
      return a;
    });
    return () => audios.forEach((a) => a.removeAttribute('src'));
  }, [tracks]);
  return d;
}

/** Apple Music–style player. Shares its state with Control Center → Now Playing and the Music widget. */
export default function MusicApp() {
  const m = useMusic();
  const [view, setView] = useState<View>('home');
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<string[]>(() => readStore(FAV_KEY, { ids: [] as string[] }).ids);
  const durations = useDurations(m.tracks);
  const pct = m.duration ? (m.currentTime / m.duration) * 100 : 0;

  useEffect(() => writeStore(FAV_KEY, { ids: favs }), [favs]);

  const albums = useMemo(() => {
    const map = new Map<string, Track[]>();
    m.tracks.forEach((t) => map.set(t.album, [...(map.get(t.album) ?? []), t]));
    return [...map.entries()].map(([name, list]) => ({ name, list, art: list[0].art }));
  }, [m.tracks]);

  const idx = (t: Track) => m.tracks.findIndex((x) => x.id === t.id);
  const playTrack = (t: Track) => (idx(t) === m.index ? m.toggle() : m.play(idx(t)));
  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const query = q.trim().toLowerCase();
  const found = query ? m.tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(query)) : [];

  const nav = (id: View, label: string, d: string) => (
    <button type="button" className={`am-nav ${view === id && !query ? 'on' : ''}`} onClick={() => (setView(id), setQ(''))}>
      <Glyph d={d} />
      {label}
    </button>
  );

  const songTable = (list: Track[], title?: ReactNode) => (
    <>
      {title}
      <div className="am-table" role="table" aria-label="Songs">
        <div className="am-tr head" role="row">
          <span>#</span>
          <span>Title</span>
          <span className="am-hide-sm">Album</span>
          <span>Time</span>
          <span />
        </div>
        {list.map((t, i) => {
          const cur = idx(t) === m.index;
          return (
            <div key={t.id} className={`am-tr ${cur ? 'cur' : ''}`} role="row" onDoubleClick={() => playTrack(t)}>
              <span className="am-num">
                {cur && m.playing ? (
                  <span className="eq" aria-label="playing">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  i + 1
                )}
              </span>
              <button type="button" className="am-title" onClick={() => playTrack(t)}>
                <Cover t={t} />
                <span>
                  <b>{t.title}</b>
                  <small>{t.artist}</small>
                </span>
              </button>
              <span className="am-hide-sm am-dim">{t.album}</span>
              <span className="am-dim">{durations[t.id] ? fmtTime(durations[t.id]) : '—'}</span>
              <button type="button" className={`am-heart ${favs.includes(t.id) ? 'on' : ''}`} onClick={() => toggleFav(t.id)} aria-label={favs.includes(t.id) ? `Unfavourite ${t.title}` : `Favourite ${t.title}`}>
                <Glyph d={G.heart} />
              </button>
            </div>
          );
        })}
        {!list.length && <p className="am-empty">No songs here yet — tap ♡ on a song to add it.</p>}
      </div>
    </>
  );

  const shelf = (title: string, items: ReactNode) => (
    <section className="am-shelf">
      <h3>
        {title} <span aria-hidden="true">›</span>
      </h3>
      <div className="am-row">{items}</div>
    </section>
  );

  let content: ReactNode;
  if (query) content = songTable(found, <h1 className="am-h1">Results for “{q}”</h1>);
  else if (view === 'home' || view === 'new')
    content = (
      <>
        <h1 className="am-h1">{view === 'home' ? 'Home' : 'New'}</h1>
        {shelf(
          view === 'home' ? 'Top Picks for You' : 'New Releases',
          albums.map((a, i) => (
            <button key={a.name} type="button" className="am-pick" onClick={() => setView(`album:${a.name}`)} style={{ background: `linear-gradient(160deg, ${a.art[0]}, ${a.art[1]})` }}>
              <small>{i === 0 ? 'Featuring Portfolio Ambient' : 'Made for You'}</small>
              <span className="am-pick-note" aria-hidden="true">
                ♪
              </span>
              <b>{a.name}</b>
              <span>
                {a.list.length} songs · {a.list.map((t) => t.title).slice(0, 2).join(', ')}
              </span>
            </button>
          )),
        )}
        {shelf(
          'Recently Played',
          [...m.tracks].reverse().map((t) => (
            <button key={t.id} type="button" className="am-tile" onClick={() => playTrack(t)}>
              <Cover t={t} big />
              <b>{t.title}</b>
              <small>{t.artist}</small>
            </button>
          )),
        )}
        {shelf(
          'Made for You',
          m.tracks.slice(0, 5).map((t) => (
            <button key={t.id} type="button" className="am-tile" onClick={() => playTrack(t)}>
              <Cover t={t} big label="Mix" />
              <b>{t.title} Mix</b>
              <small>Updated today</small>
            </button>
          )),
        )}
      </>
    );
  else if (view === 'radio')
    content = (
      <>
        <h1 className="am-h1">Radio</h1>
        <button type="button" className="am-radio" onClick={() => openExternal(socials.spotify, { title: 'Opening Spotify profile', app: 'Music', icon: 'spotify' })}>
          <span className="am-radio-dot" aria-hidden="true" />
          <span>
            <b>{personal.name} on Spotify</b>
            <small>My real playlists live on Spotify — opens in a new tab</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <p className="am-note">The songs in this app are original, royalty-free tracks made for this portfolio.</p>
      </>
    );
  else if (view === 'albums')
    content = (
      <>
        <h1 className="am-h1">Albums</h1>
        <div className="am-grid">
          {albums.map((a) => (
            <button key={a.name} type="button" className="am-tile" onClick={() => setView(`album:${a.name}`)}>
              <Cover t={a} big label={a.name} />
              <b>{a.name}</b>
              <small>Portfolio Ambient</small>
            </button>
          ))}
        </div>
      </>
    );
  else if (view === 'artists')
    content = (
      <>
        <h1 className="am-h1">Artists</h1>
        <button type="button" className="am-artist" onClick={() => setView('songs')}>
          <span className="am-artist-pic" aria-hidden="true">
            ♪
          </span>
          <span>
            <b>Portfolio Ambient</b>
            <small>{m.tracks.length} songs · {albums.length} albums</small>
          </span>
        </button>
      </>
    );
  else if (view.startsWith('album:')) {
    const a = albums.find((x) => `album:${x.name}` === view) ?? albums[0];
    content = songTable(
      a.list,
      <div className="am-album-head">
        <Cover t={a} big label={a.name} />
        <div>
          <h1 className="am-h1">{a.name}</h1>
          <span className="am-dim">Portfolio Ambient · {a.list.length} songs</span>
          <div className="am-album-actions">
            <button type="button" className="am-pill" onClick={() => m.play(idx(a.list[0]))}>
              ▶ Play
            </button>
            <button type="button" className="am-pill ghost" onClick={() => {
                if (!m.shuffle) m.toggleShuffle();
                m.play(idx(a.list[Math.floor(Math.random() * a.list.length)]));
              }}>
              ⤮ Shuffle
            </button>
          </div>
        </div>
      </div>,
    );
  } else if (view === 'favs') content = songTable(m.tracks.filter((t) => favs.includes(t.id)), <h1 className="am-h1">Favourite Songs</h1>);
  else if (view === 'recent') content = songTable([...m.tracks].reverse(), <h1 className="am-h1">Recently Added</h1>);
  else content = songTable(m.tracks, <h1 className="am-h1">Songs</h1>);

  return (
    <div className="am">
      <aside className="am-side">
        <DragBar className="am-drag">
          <Lights />
        </DragBar>
        <label className="am-search">
          <Glyph d={G.search} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search music" />
        </label>
        <div className="am-side-scroll">
          {nav('home', 'Home', G.home)}
          {nav('new', 'New', G.new)}
          {nav('radio', 'Radio', G.radio)}
          <div className="am-sec">Library</div>
          {nav('recent', 'Recently Added', G.recent)}
          {nav('artists', 'Artists', G.artists)}
          {nav('albums', 'Albums', G.albums)}
          {nav('songs', 'Songs', G.songs)}
          <div className="am-sec">Playlists</div>
          {nav('favs', 'Favourite Songs', G.heart)}
          {albums.map((a) => (
            <span key={a.name}>{nav(`album:${a.name}`, a.name, G.list)}</span>
          ))}
        </div>
        <div className="am-user">
          <img src={personal.avatar} alt="" />
          <span>{personal.name}</span>
        </div>
      </aside>

      <section className="am-main">
        <DragBar className="am-drag main" />
        <div className="am-scroll scroll-smooth" key={query ? 'q' : view}>
          <div className="fade-swap">{content}</div>
        </div>

        {/* floating mini player */}
        <div className="am-player">
          <Cover t={m.track} />
          <div className="am-p-meta">
            <b>{m.track.title}</b>
            <small>
              {m.track.artist} — {m.track.album}
            </small>
            {m.error && <small className="am-err">{m.error}</small>}
          </div>
          <div className="am-p-ctrl">
            <button type="button" className={`am-p-btn sm ${m.shuffle ? 'on' : ''}`} onClick={m.toggleShuffle} aria-pressed={m.shuffle} aria-label="Shuffle">
              ⤮
            </button>
            <button type="button" className="am-p-btn" onClick={m.prev} aria-label="Previous track">
              <span className="flip">{I.next}</span>
            </button>
            <button type="button" className="am-p-btn play" onClick={m.toggle} aria-label={m.playing ? 'Pause' : 'Play'}>
              {m.playing ? I.pause : I.play}
            </button>
            <button type="button" className="am-p-btn" onClick={m.next} aria-label="Next track">
              {I.next}
            </button>
            <button type="button" className={`am-p-btn sm ${m.repeat !== 'off' ? 'on' : ''}`} onClick={m.cycleRepeat} aria-label={`Repeat: ${m.repeat}`}>
              {m.repeat === 'one' ? '🔂' : '🔁'}
            </button>
          </div>
          <div className="am-p-seek">
            <span>{fmtTime(m.currentTime)}</span>
            <input type="range" min={0} max={m.duration || 0} step={0.1} value={m.currentTime} onChange={(e) => m.seek(Number(e.target.value))} aria-label="Seek" style={{ ['--p' as string]: `${pct}%` }} />
            <span>{fmtTime(m.duration)}</span>
          </div>
          <div className="am-p-vol">
            <button type="button" className="am-p-btn sm" onClick={m.toggleMute} aria-label={m.muted ? 'Unmute' : 'Mute'}>
              {m.muted || m.volume === 0 ? I.mute : I.speaker}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={m.muted ? 0 : m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} aria-label="Volume" style={{ ['--p' as string]: `${(m.muted ? 0 : m.volume) * 100}%` }} />
          </div>
        </div>
      </section>
    </div>
  );
}

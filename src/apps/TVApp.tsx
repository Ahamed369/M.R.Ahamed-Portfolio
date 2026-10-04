import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DragBar, Lights } from '../components/Window';
import { videos, type Video } from '../data/media';
import { readStore, writeStore } from '../system/storage';

const KEY = 'mra-tv-progress';
type Progress = Record<string, { t: number; d: number; at: number }>;

const P = {
  play: 'M8 5.5v13l11-6.5Z',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  warn: 'M12 4 2.5 20h19ZM12 10v4.5M12 17.5h.01',
};

function G({ d, size = 16, fill }: { d: string; size?: number; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 1.9} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fmtLen = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const GRADS: [string, string][] = [
  ['#3a1c71', '#d76d77'],
  ['#0f2027', '#2c5364'],
  ['#42275a', '#734b6d'],
  ['#134e5e', '#71b280'],
];

function Poster({ v, i, className }: { v: Video; i: number; className?: string }) {
  const [bad, setBad] = useState(false);
  const g = GRADS[i % GRADS.length];
  return (
    <span className={`tv-poster ${className ?? ''}`} style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}>
      {!bad && <img src={v.poster} alt="" loading="lazy" onError={() => setBad(true)} />}
      {bad && <span className="tv-poster-ph">{v.title}</span>}
    </span>
  );
}

/** TV-style player for the portfolio's own screen recordings. */
export default function TVApp() {
  const [tab, setTab] = useState<'home' | 'library'>('home');
  const [prog, setProg] = useState<Progress>(() => readStore<Progress>(KEY, {}));
  const [playing, setPlaying] = useState<{ v: Video; i: number; origin: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [q, setQ] = useState('');
  const vidRef = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);

  const saveProg = (id: string, t: number, d: number, force?: boolean) => {
    const now = Date.now();
    if (!force && now - lastSave.current < 1500) return;
    lastSave.current = now;
    setProg((p) => {
      const n = { ...p };
      if (d && t / d > 0.97) delete n[id];
      else n[id] = { t, d, at: now };
      writeStore(KEY, n);
      return n;
    });
  };

  const open = (v: Video, i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const root = el.closest('.tv')?.getBoundingClientRect();
    const origin = root ? `${r.left - root.left + r.width / 2}px ${r.top - root.top + r.height / 2}px` : 'center';
    setFailed(false);
    setClosing(false);
    setPlaying({ v, i, origin });
  };

  const close = () => {
    const v = vidRef.current;
    if (playing && v && !failed && v.currentTime > 0) saveProg(playing.v.id, v.currentTime, v.duration || playing.v.length, true);
    setClosing(true);
    window.setTimeout(() => {
      setPlaying(null);
      setClosing(false);
    }, 220);
  };

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close reads latest refs
  }, [playing]);

  const upNext = useMemo(
    () =>
      videos
        .map((v, i) => ({ v, i, p: prog[v.id] }))
        .filter((x) => x.p)
        .sort((a, b) => (b.p?.at ?? 0) - (a.p?.at ?? 0)),
    [prog],
  );
  const hero = upNext[0] ?? { v: videos[0], i: 0, p: prog[videos[0]?.id] };
  const f = q.trim().toLowerCase();
  const list = videos.map((v, i) => ({ v, i })).filter(({ v }) => !f || `${v.title} ${v.description}`.toLowerCase().includes(f));

  const Card = ({ v, i, wide }: { v: Video; i: number; wide?: boolean }) => {
    const p = prog[v.id];
    return (
      <button type="button" className={`tv-card ${wide ? 'wide' : ''}`} onClick={(e) => open(v, i, e.currentTarget)}>
        <span className="tv-card-img">
          <Poster v={v} i={i} />
          <span className="tv-card-play">
            <G d={P.play} fill size={18} />
          </span>
          {p && <span className="tv-bar" style={{ '--p': `${Math.min(100, (p.t / (p.d || v.length)) * 100)}%` } as CSSProperties} />}
        </span>
        <b>{v.title}</b>
        <small>{p ? `${fmtLen(Math.max(0, (p.d || v.length) - p.t))} left` : fmtLen(v.length)}</small>
      </button>
    );
  };

  return (
    <div className="tv">
      <DragBar className="tv-top">
        <Lights />
        <div className="tv-tabs" role="tablist" onPointerDown={(e) => e.stopPropagation()}>
          {(['home', 'library'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t === 'home' ? 'Home' : 'Library'}
            </button>
          ))}
        </div>
        <label className="tv-search" onPointerDown={(e) => e.stopPropagation()}>
          <G d={P.search} size={13} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search videos" />
        </label>
      </DragBar>
      <div className="tv-scroll scroll-smooth">
        {tab === 'home' && !f && hero?.v && (
          <section className="tv-hero fade-swap">
            <Poster v={hero.v} i={hero.i} className="tv-hero-bg" />
            <div className="tv-hero-txt">
              <small>{hero.p ? 'CONTINUE WATCHING' : 'FEATURED · PORTFOLIO VIDEO'}</small>
              <h1>{hero.v.title}</h1>
              <p>{hero.v.description}</p>
              <div className="tv-hero-actions">
                <button type="button" className="tv-play" onClick={(e) => open(hero.v, hero.i, e.currentTarget)}>
                  <G d={P.play} fill size={14} /> {hero.p ? 'Resume' : 'Play'}
                </button>
                <span>{fmtLen(hero.v.length)} · Screen recording of this portfolio</span>
              </div>
            </div>
          </section>
        )}
        {tab === 'home' && !f && upNext.length > 0 && (
          <section className="tv-row">
            <h2>Up Next</h2>
            <div className="tv-strip">
              {upNext.map(({ v, i }) => (
                <Card key={v.id} v={v} i={i} wide />
              ))}
            </div>
          </section>
        )}
        <section className="tv-row">
          <h2>{f ? `Results for “${q.trim()}”` : 'Portfolio Videos'}</h2>
          {list.length ? (
            <div className={tab === 'library' || f ? 'tv-gridv' : 'tv-strip'}>
              {list.map(({ v, i }) => (
                <Card key={v.id} v={v} i={i} />
              ))}
            </div>
          ) : (
            <p className="tv-none">No videos match.</p>
          )}
        </section>
        {tab === 'home' && !f && upNext.length === 0 && (
          <section className="tv-row">
            <h2>Up Next</h2>
            <p className="tv-none">Videos you start will appear here so you can pick up where you left off.</p>
          </section>
        )}
      </div>

      {playing && (
        <div className={`tv-player ${closing ? 'closing' : ''}`} style={{ transformOrigin: playing.origin }} role="dialog" aria-modal="true" aria-label={playing.v.title}>
          <DragBar className="tv-player-bar">
            <Lights />
            <button type="button" className="tv-x" aria-label="Close player" onPointerDown={(e) => e.stopPropagation()} onClick={close}>
              <G d={P.close} size={15} />
            </button>
            <b>{playing.v.title}</b>
            {typeof document !== 'undefined' && document.pictureInPictureEnabled && !failed && (
              <button type="button" className="tv-x tv-pip" aria-label="Picture in Picture" title="Picture in Picture" onPointerDown={(e) => e.stopPropagation()} onClick={() => void vidRef.current?.requestPictureInPicture().catch(() => undefined)}>
                ⧉
              </button>
            )}
          </DragBar>
          <div className="tv-player-stage">
            {failed ? (
              <div className="tv-fail">
                <Poster v={playing.v} i={playing.i} className="tv-fail-bg" />
                <div className="tv-fail-msg">
                  <G d={P.warn} size={28} />
                  <b>Video unavailable</b>
                  <span>This recording couldn’t be loaded right now.</span>
                </div>
              </div>
            ) : (
              <video
                ref={vidRef}
                key={playing.v.id}
                src={playing.v.src}
                poster={playing.v.poster}
                controls
                autoPlay
                playsInline
                onError={() => setFailed(true)}
                onLoadedMetadata={(e) => {
                  const p = prog[playing.v.id];
                  const el = e.currentTarget;
                  if (p && p.t < (el.duration || 0) - 2) el.currentTime = p.t;
                }}
                onTimeUpdate={(e) => saveProg(playing.v.id, e.currentTarget.currentTime, e.currentTarget.duration)}
                onPause={(e) => saveProg(playing.v.id, e.currentTarget.currentTime, e.currentTarget.duration, true)}
                onEnded={() => saveProg(playing.v.id, 1, 1, true)}
              />
            )}
          </div>
          <p className="tv-player-desc">{playing.v.description}</p>
        </div>
      )}
    </div>
  );
}

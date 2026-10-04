import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tracks, type Track } from '../data/media';
import { readStore, writeStore } from './storage';
import { notify } from './notify';
import { idbGet, idbSet } from './idb';

export type RepeatMode = 'off' | 'all' | 'one';

interface MusicPrefs {
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
}

interface MusicCtx extends MusicPrefs {
  tracks: Track[];
  index: number;
  track: Track;
  playing: boolean;
  currentTime: number;
  duration: number;
  toggle: () => void;
  play: (i?: number) => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  error: string | null;
  /** v10.3 — real play history (newest first) */
  history: { id: string; at: number }[];
  clearHistory: () => void;
  /** v10.3 — songs added from the visitor's own device (kept in this browser only) */
  addUserFiles: (files: File[], lang: Track['lang']) => Promise<number>;
  removeUserTrack: (id: string) => void;
  /** v10.3 — play a list (album, language, playlist…) so Next / Previous stay inside it */
  playQueue: (ids: string[], startId?: string) => void;
  queue: string[] | null;
}

interface StoredSong {
  id: string;
  title: string;
  artist: string;
  lang: Track['lang'];
  blob: Blob;
}
const USER_KEY = 'music-user-songs';
const HIST_KEY = 'mra-music-history-v10';
const USER_ART: [string, string][] = [['#43cea2', '#185a9d'], ['#ff758c', '#ff7eb3'], ['#f6d365', '#fda085'], ['#a18cd1', '#fbc2eb'], ['#30cfd0', '#330867']];
const toTrack = (s: StoredSong, i: number): Track => ({ id: s.id, title: s.title, artist: s.artist, album: 'My Songs', src: URL.createObjectURL(s.blob), art: USER_ART[i % USER_ART.length], lang: s.lang, genre: 'My Songs', user: true });

const KEY = 'mra-portfolio-music-v1';
const Ctx = createContext<MusicCtx | null>(null);

/**
 * One shared <audio> element for the whole portfolio. The Music app, the
 * Control Center "Now Playing" tile and the Dock all read this same state,
 * so closing or minimising the Music window never stops playback.
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [prefs, setPrefs] = useState<MusicPrefs>(() => readStore(KEY, { volume: 0.7, muted: false, shuffle: false, repeat: 'all' as RepeatMode }));
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const indexRef = useRef(index);
  indexRef.current = index;
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const all = useMemo(() => [...tracks, ...userTracks], [userTracks]);
  const listRef = useRef(all);
  listRef.current = all;
  const [history, setHistory] = useState<{ id: string; at: number }[]>(() => readStore(HIST_KEY, { items: [] as { id: string; at: number }[] }).items);
  useEffect(() => writeStore(HIST_KEY, { items: history }), [history]);

  // v10.3 — load the visitor's own songs from IndexedDB
  useEffect(() => {
    let urls: string[] = [];
    void idbGet<StoredSong[]>(USER_KEY).then((list) => {
      if (!list?.length) return;
      const t = list.map(toTrack);
      urls = t.map((x) => x.src);
      setUserTracks(t);
    });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => writeStore(KEY, prefs), [prefs]);

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const [queue, setQueue] = useState<string[] | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const pick = useCallback((dir: 1 | -1): number => {
    const q = queueRef.current?.map((id) => listRef.current.findIndex((t) => t.id === id)).filter((i) => i >= 0);
    if (q && q.length) {
      if (prefsRef.current.shuffle && q.length > 1) {
        let r = indexRef.current;
        while (r === indexRef.current) r = q[Math.floor(Math.random() * q.length)];
        return r;
      }
      const at = q.indexOf(indexRef.current);
      return q[(at + dir + q.length) % q.length];
    }
    const n = listRef.current.length;
    if (prefsRef.current.shuffle && n > 1) {
      let r = indexRef.current;
      while (r === indexRef.current) r = Math.floor(Math.random() * n);
      return r;
    }
    return (indexRef.current + dir + n) % n;
  }, []);

  const load = useCallback((i: number, autoplay: boolean) => {
    const a = audioRef.current;
    if (!a) return;
    const t = listRef.current[i];
    if (!t) return;
    setIndex(i);
    setError(null);
    a.src = t.src;
    a.currentTime = 0;
    setCurrentTime(0);
    if (autoplay) {
      a.play()
        .then(() => notify({ app: 'Music', icon: 'music', title: 'Now Playing', body: `${t.title} — ${t.artist}` }))
        .catch(() => setPlaying(false));
    }
  }, []);

  // audio element events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.src) a.src = listRef.current[0].src;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onPlay = () => {
      setPlaying(true);
      const cur = listRef.current[indexRef.current];
      if (cur && a.currentTime < 1) setHistory((h) => [{ id: cur.id, at: Date.now() }, ...h.filter((x) => x.id !== cur.id)].slice(0, 40));
    };
    const onPause = () => setPlaying(false);
    const onErr = () => {
      setPlaying(false);
      setError('This track could not be loaded. Check that the audio file exists in public/assets/music/.');
    };
    const onEnd = () => {
      const { repeat } = prefsRef.current;
      const q = queueRef.current;
      const lastOfQueue = q && q.length && q[q.length - 1] === listRef.current[indexRef.current]?.id;
      if (repeat === 'one') {
        a.currentTime = 0;
        void a.play();
      } else if (repeat === 'all' || prefsRef.current.shuffle || (q && q.length ? !lastOfQueue : indexRef.current < listRef.current.length - 1)) {
        load(pick(1), true);
      } else setPlaying(false);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);
    a.addEventListener('error', onErr);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('error', onErr);
    };
  }, [load, pick]);

  // volume / mute are real audio properties
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = prefs.volume;
    a.muted = prefs.muted;
  }, [prefs.volume, prefs.muted]);

  const play = useCallback(
    (i?: number) => {
      const a = audioRef.current;
      if (!a) return;
      if (typeof i === 'number' && i !== indexRef.current) {
        load(i, true);
        return;
      }
      a.play()
        .then(() => {
          if (a.currentTime < 0.5) notify({ app: 'Music', icon: 'music', title: 'Now Playing', body: `${listRef.current[indexRef.current]?.title ?? ''} — ${listRef.current[indexRef.current]?.artist ?? ''}` });
        })
        .catch(() => setPlaying(false));
    },
    [load],
  );
  const pause = useCallback(() => audioRef.current?.pause(), []);
  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) play();
    else a.pause();
  }, [play]);
  const next = useCallback(() => load(pick(1), !audioRef.current?.paused || playing), [load, pick, playing]);
  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    load(pick(-1), !a?.paused || playing);
  }, [load, pick, playing]);
  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(t)) return;
    a.currentTime = Math.max(0, Math.min(t, a.duration || t));
    setCurrentTime(a.currentTime);
  }, []);
  const setVolume = useCallback((v: number) => setPrefs((s) => ({ ...s, volume: Math.max(0, Math.min(1, v)), muted: v <= 0 ? s.muted : false })), []);
  const toggleMute = useCallback(() => setPrefs((s) => ({ ...s, muted: !s.muted })), []);
  const toggleShuffle = useCallback(() => setPrefs((s) => ({ ...s, shuffle: !s.shuffle })), []);
  const cycleRepeat = useCallback(
    () => setPrefs((s) => ({ ...s, repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
    [],
  );

  // v8 — Media Session API: title/artwork on the lock screen & media keys / headset buttons
  useEffect(() => {
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
    if (!ms || typeof MediaMetadata === 'undefined') return;
    const t = all[index] ?? all[0];
    try {
      ms.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: [{ src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      ms.playbackState = playing ? 'playing' : 'paused';
      ms.setActionHandler('play', () => play());
      ms.setActionHandler('pause', pause);
      ms.setActionHandler('nexttrack', next);
      ms.setActionHandler('previoustrack', prev);
      ms.setActionHandler('seekto', (d) => d.seekTime != null && seek(d.seekTime));
    } catch {
      /* some actions unsupported */
    }
  }, [index, all, playing, play, pause, next, prev, seek]);

  const clearHistory = useCallback(() => setHistory([]), []);
  const playQueue = useCallback(
    (ids: string[], startId?: string) => {
      if (!ids.length) return;
      setQueue(ids);
      queueRef.current = ids;
      const first = startId ?? (prefsRef.current.shuffle ? ids[Math.floor(Math.random() * ids.length)] : ids[0]);
      const i = listRef.current.findIndex((t) => t.id === first);
      if (i < 0) return;
      if (i === indexRef.current) play();
      else load(i, true);
    },
    [load, play],
  );
  const addUserFiles = useCallback(async (files: File[], lang: Track['lang']) => {
    const ok = files.filter((f) => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus|webm)$/i.test(f.name)).slice(0, 25);
    if (!ok.length) return 0;
    const prev = (await idbGet<StoredSong[]>(USER_KEY)) ?? [];
    const added: StoredSong[] = ok.map((f, i) => {
      const base = f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
      const [artist, title] = base.includes(' - ') ? base.split(' - ', 2) : ['My Music', base];
      return { id: `u${Date.now().toString(36)}${i}`, title: title.trim() || 'Untitled', artist: artist.trim() || 'My Music', lang, blob: f };
    });
    const next = [...prev, ...added];
    await idbSet(USER_KEY, next);
    setUserTracks((u) => [...u, ...added.map((x, i) => toTrack(x, prev.length + i))]);
    return added.length;
  }, []);
  const removeUserTrack = useCallback((id: string) => {
    void idbGet<StoredSong[]>(USER_KEY).then((list) => idbSet(USER_KEY, (list ?? []).filter((x) => x.id !== id)));
    const cur = listRef.current[indexRef.current];
    if (cur?.id === id) {
      audioRef.current?.pause();
      setIndex(0);
      if (audioRef.current) audioRef.current.src = listRef.current[0].src;
    } else {
      const ri = listRef.current.findIndex((x) => x.id === id);
      if (ri >= 0 && ri < indexRef.current) setIndex(indexRef.current - 1);
    }
    setUserTracks((u) => {
      const gone = u.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.src);
      return u.filter((x) => x.id !== id);
    });
    setHistory((h) => h.filter((x) => x.id !== id));
  }, []);

  const value = useMemo<MusicCtx>(
    () => ({
      ...prefs,
      tracks: all,
      index,
      track: all[index] ?? all[0],
      playing,
      currentTime,
      duration,
      toggle,
      play,
      pause,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      error,
      history,
      clearHistory,
      addUserFiles,
      removeUserTrack,
      playQueue,
      queue,
    }),
    [queue, playQueue, all, history, clearHistory, addUserFiles, removeUserTrack, prefs, index, playing, currentTime, duration, toggle, play, pause, next, prev, seek, setVolume, toggleMute, toggleShuffle, cycleRepeat, error],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMusic(): MusicCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMusic must be used inside MusicProvider');
  return c;
}

export function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

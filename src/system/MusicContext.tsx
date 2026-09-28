import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tracks, type Track } from '../data/media';
import { readStore, writeStore } from './storage';
import { notify } from './notify';

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
}

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

  useEffect(() => writeStore(KEY, prefs), [prefs]);

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const pick = useCallback((dir: 1 | -1): number => {
    const n = tracks.length;
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
    const t = tracks[i];
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
    if (!a.src) a.src = tracks[0].src;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onErr = () => {
      setPlaying(false);
      setError('This track could not be loaded. Check that the audio file exists in public/assets/music/.');
    };
    const onEnd = () => {
      const { repeat } = prefsRef.current;
      if (repeat === 'one') {
        a.currentTime = 0;
        void a.play();
      } else if (repeat === 'all' || prefsRef.current.shuffle || indexRef.current < tracks.length - 1) {
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
          if (a.currentTime < 0.5) notify({ app: 'Music', icon: 'music', title: 'Now Playing', body: `${tracks[indexRef.current].title} — ${tracks[indexRef.current].artist}` });
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
    const t = tracks[index];
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
  }, [index, playing, play, pause, next, prev, seek]);

  const value = useMemo<MusicCtx>(
    () => ({
      ...prefs,
      tracks,
      index,
      track: tracks[index],
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
    }),
    [prefs, index, playing, currentTime, duration, toggle, play, pause, next, prev, seek, setVolume, toggleMute, toggleShuffle, cycleRepeat, error],
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

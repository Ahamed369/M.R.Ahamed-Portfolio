import { islandRecording } from '../system/island';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { AppIcon } from '../components/AppIcons';
import { notify } from '../system/notify';

type RecState = 'idle' | 'requesting' | 'recording' | 'paused';
type Problem = null | 'denied' | 'nomic' | 'unsupported' | 'insecure' | 'error';

interface Memo {
  id: number;
  name: string;
  url: string;
  blob: Blob;
  mime: string;
  created: Date;
  duration: number; // seconds
  /** normalised peak per 1/RATE s — decoded from the recorded audio (or the live meter as a fallback) */
  peaks: number[];
  /** set when the memo sits in Recently Deleted */
  deletedAt?: number;
}

/** peaks per second of audio */
const RATE = 40;
/** horizontal pixels per peak in the big waveform */
const STEP = 3;

function pickMime(): string {
  const MR = window.MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== 'function') return '';
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    try {
      if (MR.isTypeSupported(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return '';
}

function fmt(sec: number, tenths = false) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const t = Math.floor((s * 10) % 10);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}${tenths ? `.${t}` : ''}`;
}

/** "01:06.31" — minutes, seconds and hundredths like the macOS app */
function fmtHund(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const h = Math.floor((s * 100) % 100);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}.${String(h).padStart(2, '0')}`;
}

function ext(mime: string) {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

function dateLabel(d: Date) {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Resample an arbitrary-length level history to `n` values. */
function resample(src: number[], n: number): number[] {
  if (!src.length || n <= 0) return [];
  return Array.from({ length: n }, (_, i) => src[Math.min(src.length - 1, Math.floor((i / n) * src.length))]);
}

/** Decode the recorded audio and compute a real waveform (max |sample| per 1/RATE s). */
async function decodePeaks(blob: Blob): Promise<{ peaks: number[]; duration: number } | null> {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    try {
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      const ch = buf.getChannelData(0);
      const per = Math.max(1, Math.floor(buf.sampleRate / RATE));
      const n = Math.ceil(ch.length / per);
      const out: number[] = new Array(n);
      let max = 0;
      for (let i = 0; i < n; i++) {
        let pk = 0;
        const end = Math.min(ch.length, (i + 1) * per);
        for (let j = i * per; j < end; j += 4) {
          const v = Math.abs(ch[j]);
          if (v > pk) pk = v;
        }
        out[i] = pk;
        if (pk > max) max = pk;
      }
      const norm = max > 0 ? 1 / max : 1;
      return { peaks: out.map((v) => Math.min(1, v * norm)), duration: buf.duration };
    } finally {
      void ctx.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

/**
 * Voice recorder using the microphone (getUserMedia + MediaRecorder) with a
 * live waveform drawn from an AnalyserNode. Recordings live only in memory.
 */
export default function VoiceMemosApp() {
  const [rec, setRec] = useState<RecState>('idle');
  const [problem, setProblem] = useState<Problem>(null);
  const [errMsg, setErrMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const counter = useRef(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const history = useRef<number[]>([]);
  const acc = useRef({ base: 0, since: 0 });
  const memosRef = useRef<Memo[]>([]);
  memosRef.current = memos;

  const teardown = useCallback(() => {
    cancelAnimationFrame(raf.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    islandRecording(false);
    streamRef.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    analyser.current = null;
  }, []);

  useEffect(
    () => () => {
      const r = recorderRef.current;
      if (r && r.state !== 'inactive') {
        r.ondataavailable = null;
        r.onstop = null;
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
      teardown();
      memosRef.current.forEach((m) => URL.revokeObjectURL(m.url));
    },
    [teardown],
  );

  const draw = useCallback(() => {
    const c = canvasRef.current;
    const a = analyser.current;
    if (c && a) {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const ctx = c.getContext('2d');
      const buf = new Uint8Array(a.fftSize);
      a.getByteTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
      const paused = recorderRef.current?.state === 'paused';
      if (!paused) {
        history.current.push(Math.min(1, peak * 1.8));
        if (history.current.length > 20000) history.current.shift();
      }
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const bar = 2;
        const gap = 1.5;
        const head = w * 0.62; // bars grow up to a fixed red playhead, like the macOS app
        const n = Math.floor(head / (bar + gap));
        const data = history.current.slice(-n);
        const mid = h / 2;
        ctx.strokeStyle = 'rgba(128,128,128,0.25)';
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(w, mid);
        ctx.stroke();
        ctx.fillStyle = paused ? 'rgba(128,128,128,0.55)' : '#ff453a';
        const off = head - data.length * (bar + gap);
        data.forEach((v, i) => {
          const bh = Math.max(1.5, v * (h - 16));
          ctx.fillRect(off + i * (bar + gap), mid - bh / 2, bar, bh);
        });
        ctx.fillStyle = '#ff453a';
        ctx.fillRect(head, 4, 1.5, h - 8);
        ctx.beginPath();
        ctx.arc(head + 0.75, 4, 3.5, 0, Math.PI * 2);
        ctx.arc(head + 0.75, h - 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      const r = recorderRef.current;
      if (r?.state === 'recording') setElapsed(acc.current.base + (performance.now() - acc.current.since) / 1000);
    }
    raf.current = requestAnimationFrame(draw);
  }, []);

  const startRec = async () => {
    setProblem(null);
    setTrashOpen(false);
    if (!window.isSecureContext) return setProblem('insecure');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return setProblem('unsupported');
    setRec('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setRec('idle');
      const name = (e as DOMException)?.name ?? '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setProblem('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setProblem('nomic');
      else {
        setErrMsg((e as Error)?.message || 'The microphone could not be started.');
        setProblem('error');
      }
      return;
    }
    streamRef.current = stream;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      audioCtx.current = ctx;
      analyser.current = an;
    } catch {
      /* waveform unavailable — recording still works */
    }
    const mime = pickMime();
    let r: MediaRecorder;
    try {
      r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      teardown();
      setRec('idle');
      setErrMsg((e as Error)?.message || 'Recording is not supported in this browser.');
      setProblem('error');
      return;
    }
    chunks.current = [];
    history.current = [];
    r.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.current.push(ev.data);
    };
    r.onstop = () => {
      const type = r.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunks.current, { type });
      const duration = acc.current.base;
      const live = history.current.slice();
      teardown();
      setRec('idle');
      if (!blob.size) return;
      counter.current += 1;
      const memo: Memo = {
        id: Date.now(),
        name: `New Recording ${counter.current}`,
        url: URL.createObjectURL(blob),
        blob,
        mime: type,
        created: new Date(),
        duration,
        peaks: resample(live, Math.max(1, Math.round(duration * RATE))),
      };
      setMemos((m) => [memo, ...m]);
      setSel(memo.id);
      // replace the live meter with a waveform decoded from the actual recording
      void decodePeaks(blob).then((res) => {
        if (res && res.peaks.length) setMemos((all) => all.map((x) => (x.id === memo.id ? { ...x, peaks: res.peaks, duration: res.duration > 0 && Number.isFinite(res.duration) ? res.duration : x.duration } : x)));
      });
    };
    recorderRef.current = r;
    r.start(250);
    acc.current = { base: 0, since: performance.now() };
    setElapsed(0);
    setRec('recording');
    islandRecording(true);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
  };

  const pauseResume = () => {
    const r = recorderRef.current;
    if (!r) return;
    if (r.state === 'recording') {
      r.pause();
      acc.current.base += (performance.now() - acc.current.since) / 1000;
      setElapsed(acc.current.base);
      setRec('paused');
    } else if (r.state === 'paused') {
      r.resume();
      acc.current.since = performance.now();
      setRec('recording');
    }
  };

  const stopRec = () => {
    const r = recorderRef.current;
    if (!r || r.state === 'inactive') return;
    if (r.state === 'recording') acc.current.base += (performance.now() - acc.current.since) / 1000;
    r.stop();
  };

  /** Move to Recently Deleted (can be restored). */
  const remove = (m: Memo) => {
    setMemos((all) => all.map((x) => (x.id === m.id ? { ...x, deletedAt: Date.now() } : x)));
    if (sel === m.id) setSel(null);
    notify({ app: 'Voice Memos', icon: 'voicememos', title: 'Moved to Recently Deleted', body: m.name });
  };
  const restore = (m: Memo) => {
    setMemos((all) => all.map((x) => (x.id === m.id ? { ...x, deletedAt: undefined } : x)));
    notify({ app: 'Voice Memos', icon: 'voicememos', title: 'Recording recovered', body: m.name });
  };
  const eraseNow = (ids: number[]) => {
    memosRef.current.filter((m) => ids.includes(m.id)).forEach((m) => URL.revokeObjectURL(m.url));
    setMemos((all) => all.filter((x) => !ids.includes(x.id)));
    if (sel != null && ids.includes(sel)) setSel(null);
  };

  const commitRename = () => {
    const name = draft.trim();
    if (editing != null && name) setMemos((all) => all.map((m) => (m.id === editing ? { ...m, name } : m)));
    setEditing(null);
  };
  const startRename = (m: Memo) => {
    setEditing(m.id);
    setDraft(m.name);
  };

  const active = memos.filter((m) => !m.deletedAt);
  const trash = memos.filter((m) => m.deletedAt);
  const shown = (trashOpen ? trash : active).filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const selected = active.find((m) => m.id === sel) ?? null;
  const busy = rec === 'recording' || rec === 'paused';
  const detail = busy || rec === 'requesting' || !!selected;

  return (
    <div className="vm7-wrap">
      <div className={`vm7 ${detail ? 'vm7-detail' : ''}`}>
        <aside className="vm7-side" aria-label="Recordings">
          <div className="vm7-search">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.4 10.4 3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search recordings" onKeyDown={(e) => e.key === 'Escape' && setQ('')} />
          </div>
          {trashOpen && (
            <div className="vm7-trash-h">
              <button type="button" className="vm7-back" onClick={() => setTrashOpen(false)}>
                ‹ All Recordings
              </button>
              <b>Recently Deleted</b>
              <small>Recordings stay here until you close this tab or erase them.</small>
              {trash.length > 0 && (
                <div className="vm7-trash-all">
                  <button type="button" onClick={() => trash.forEach(restore)}>
                    Recover All
                  </button>
                  <button type="button" className="vm7-danger" onClick={() => eraseNow(trash.map((m) => m.id))}>
                    Erase All
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="vm7-list scroll-smooth">
            {!trashOpen && active.length === 0 ? (
              <div className="vm7-empty">
                <AppIcon name="voicememos" />
                <p>No recordings yet</p>
                <small>Recordings stay in this browser tab and are gone when you close it.</small>
              </div>
            ) : shown.length === 0 ? (
              <p className="vm7-none">{q ? `No recordings match “${q}”.` : 'Nothing here.'}</p>
            ) : (
              <ul>
                {shown.map((m) => (
                  <li key={m.id} className={!trashOpen && m.id === sel ? 'on' : ''}>
                    {editing === m.id ? (
                      <input
                        className="vm7-rename"
                        value={draft}
                        autoFocus
                        aria-label="Recording name"
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditing(null);
                        }}
                      />
                    ) : trashOpen ? (
                      <div className="vm7-item vm7-item-del">
                        <b>{m.name}</b>
                        <span>
                          <small>{dateLabel(m.created)}</small>
                          <small>{fmt(m.duration)}</small>
                        </span>
                        <span className="vm7-item-acts">
                          <button type="button" onClick={() => restore(m)}>
                            Recover
                          </button>
                          <button type="button" className="vm7-danger" onClick={() => eraseNow([m.id])}>
                            Delete Now
                          </button>
                        </span>
                      </div>
                    ) : (
                      <button type="button" className="vm7-item" onClick={() => setSel(m.id)} onDoubleClick={() => startRename(m)}>
                        <b>{m.name}</b>
                        <span>
                          <small>{dateLabel(m.created)}</small>
                          <small>{fmt(m.duration)}</small>
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!trashOpen && (
            <button type="button" className="vm7-trashrow" onClick={() => setTrashOpen(true)}>
              <span>
                <b>Recently Deleted</b>
                <small>
                  {trash.length} File{trash.length === 1 ? '' : 's'}
                </small>
              </span>
              <svg viewBox="0 0 10 16" aria-hidden="true">
                <path d="m2 2 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <div className="vm7-recbar">
            <button
              type="button"
              className={`vm7-rec ${busy ? 'busy' : ''}`}
              onClick={busy ? stopRec : () => void startRec()}
              disabled={rec === 'requesting'}
              aria-label={busy ? 'Stop recording' : 'Start recording'}
            >
              <span />
            </button>
          </div>
        </aside>

        <section className="vm7-main">
          {busy || rec === 'requesting' ? (
            <div className="vm7-live">
              <div className="vm7-toolbar">
                <b className={`vm7-live-title ${rec === 'recording' ? 'on' : ''}`}>{rec === 'paused' ? 'Paused' : rec === 'requesting' ? 'Waiting for microphone…' : 'Recording'}</b>
              </div>
              <div className="vm7-live-stage">
                <canvas ref={canvasRef} className="vm7-live-wave" aria-label="Live audio waveform" role="img" />
              </div>
              <div className="vm7-bigtime" aria-live="off">
                {fmt(elapsed, true)}
              </div>
              <div className="vm7-controls">
                {busy && (
                  <button type="button" className="vm7-ctl" onClick={pauseResume} aria-label={rec === 'paused' ? 'Resume recording' : 'Pause recording'}>
                    {rec === 'paused' ? (
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <circle cx="10" cy="10" r="6" fill="#ff453a" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <rect x="5" y="4" width="3.4" height="12" rx="1" fill="currentColor" />
                        <rect x="11.6" y="4" width="3.4" height="12" rx="1" fill="currentColor" />
                      </svg>
                    )}
                  </button>
                )}
                {busy && (
                  <button type="button" className="vm7-done" onClick={stopRec}>
                    Done
                  </button>
                )}
              </div>
            </div>
          ) : selected ? (
            <Player
              key={selected.id}
              memo={selected}
              renaming={editing === selected.id}
              draft={draft}
              onDraft={setDraft}
              onCommitRename={commitRename}
              onCancelRename={() => setEditing(null)}
              onRename={() => startRename(selected)}
              onDelete={() => remove(selected)}
              onBack={() => setSel(null)}
            />
          ) : (
            <div className="vm7-hero">
              <span className="vm7-hero-ico">
                <AppIcon name="voicememos" />
              </span>
              <h2>Voice Memos</h2>
              <p>Press the red record button to capture audio from your microphone.</p>
              <small>Recordings are kept in memory only — nothing is uploaded or saved.</small>
            </div>
          )}

        </section>
          {problem && (
          <div className="vm7-problem fade-swap" role="alert">
            {problem === 'denied' && (
              <>
                <b>Microphone access is blocked.</b> Click the lock or microphone icon in the address bar, allow the Microphone for this
                site, then try again.
              </>
            )}
            {problem === 'nomic' && (
              <>
                <b>No microphone found.</b> Connect a microphone and try again.
              </>
            )}
            {problem === 'unsupported' && (
              <>
                <b>Recording isn’t supported</b> in this browser. Try a recent Chrome, Safari, Edge or Firefox.
              </>
            )}
            {problem === 'insecure' && (
              <>
                <b>Secure connection required.</b> Microphone access needs https:// or localhost.
              </>
            )}
            {problem === 'error' && (
              <>
                <b>Couldn’t record.</b> {errMsg}
              </>
            )}
            <button type="button" className="vm7-x" aria-label="Dismiss" onClick={() => setProblem(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Waveform drawing ───────────────────────────── */

function sizeCanvas(c: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** Big waveform: the playhead stays in the middle and the audio scrolls past it, with a time ruler underneath. */
function drawBig(c: HTMLCanvasElement, peaks: number[], t: number) {
  const { ctx, w, h } = sizeCanvas(c);
  if (!ctx) return;
  const cs = getComputedStyle(c);
  const fg = cs.color || '#555';
  const accent = cs.getPropertyValue('--vm7-head').trim() || '#0a84ff';
  const ruler = 24;
  const wh = h - ruler;
  const mid = wh / 2;
  const cx = Math.round(w / 2);
  ctx.clearRect(0, 0, w, h);
  // stage
  ctx.fillStyle = cs.getPropertyValue('--vm7-stage').trim() || 'rgba(128,128,128,.08)';
  ctx.fillRect(0, 8, w, wh - 16);
  const pxPerSec = RATE * STEP;
  const x0 = cx - t * pxPerSec;
  const first = Math.max(0, Math.floor(-x0 / STEP));
  const last = Math.min(peaks.length, Math.ceil((w - x0) / STEP));
  for (let i = first; i < last; i++) {
    const x = x0 + i * STEP;
    const bh = Math.max(1.2, peaks[i] * (wh - 30));
    ctx.globalAlpha = x < cx ? 0.95 : 0.55;
    ctx.fillStyle = fg;
    ctx.fillRect(x, mid - bh / 2, 1.3, bh);
  }
  ctx.globalAlpha = 1;
  // ruler
  ctx.fillStyle = fg;
  ctx.font = '10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  const s0 = Math.floor((0 - x0) / pxPerSec) - 1;
  const s1 = Math.ceil((w - x0) / pxPerSec) + 1;
  for (let s = Math.max(0, s0); s <= s1; s++) {
    const x = x0 + s * pxPerSec;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, wh - 4, 1, 8);
    for (let k = 1; k < 4; k++) ctx.fillRect(x + (k * pxPerSec) / 4, wh - 1, 1, 3);
    ctx.globalAlpha = 0.6;
    ctx.fillText(fmt(s), x + 3, wh + 16);
  }
  ctx.globalAlpha = 1;
  // playhead
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 0.75, 6, 1.5, wh - 12);
  ctx.beginPath();
  ctx.arc(cx, 6, 3.5, 0, Math.PI * 2);
  ctx.arc(cx, wh - 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Overview: the whole recording squeezed into the scrubber. */
function drawOverview(c: HTMLCanvasElement, peaks: number[]) {
  const { ctx, w, h } = sizeCanvas(c);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const fg = getComputedStyle(c).color || '#777';
  const bars = Math.max(1, Math.floor(w / 3));
  const data = peaks.length ? Array.from({ length: bars }, (_, i) => {
    const a = Math.floor((i / bars) * peaks.length);
    const b = Math.max(a + 1, Math.floor(((i + 1) / bars) * peaks.length));
    let m = 0;
    for (let j = a; j < b && j < peaks.length; j++) m = Math.max(m, peaks[j]);
    return m;
  }) : [];
  ctx.fillStyle = fg;
  ctx.globalAlpha = 0.6;
  const mid = h / 2;
  data.forEach((v, i) => {
    const bh = Math.max(1, v * (h - 8));
    ctx.fillRect(i * 3, mid - bh / 2, 1, bh);
  });
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, mid - 0.5, w, 1);
  ctx.globalAlpha = 1;
}

/* ───────────────────────────── Player ───────────────────────────── */

function Player({
  memo,
  renaming,
  draft,
  onDraft,
  onCommitRename,
  onCancelRename,
  onRename,
  onDelete,
  onBack,
}: {
  memo: Memo;
  renaming: boolean;
  draft: string;
  onDraft: (s: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onRename: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bigRef = useRef<HTMLCanvasElement>(null);
  const ovRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(memo.duration);
  const [editOpen, setEditOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const drag = useRef<{ x: number; t: number } | null>(null);
  const peaks = memo.peaks;

  useEffect(() => {
    const a = new Audio(memo.url);
    a.preload = 'metadata';
    audioRef.current = a;
    const onTime = () => setT(a.currentTime);
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setDur(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setT(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('ended', onEnd);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.pause();
      a.removeAttribute('src');
      a.load();
      audioRef.current = null;
    };
  }, [memo.url]);

  // decoded duration (MediaRecorder webm files often report Infinity)
  useEffect(() => {
    if (memo.duration > 0) setDur((d) => (Number.isFinite(d) && d > 0 && Math.abs(d - memo.duration) < 0.5 ? d : memo.duration));
  }, [memo.duration]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // smooth playhead while playing
  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const tick = () => {
      const a = audioRef.current;
      if (a) setT(a.currentTime);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  useLayoutEffect(() => {
    if (bigRef.current) drawBig(bigRef.current, peaks, t);
  }, [peaks, t]);
  useLayoutEffect(() => {
    const c = ovRef.current;
    if (!c) return;
    drawOverview(c, peaks);
    const ro = new ResizeObserver(() => {
      drawOverview(c, peaks);
      if (bigRef.current) drawBig(bigRef.current, peaks, audioRef.current?.currentTime ?? 0);
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [peaks]);

  const seek = useCallback(
    (v: number) => {
      const x = Math.max(0, Math.min(dur || 0, v));
      const a = audioRef.current;
      if (a) a.currentTime = x;
      setT(x);
    },
    [dur],
  );

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  };
  const skip = (d: number) => {
    const a = audioRef.current;
    if (!a) return;
    seek(a.currentTime + d);
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = memo.url;
    a.download = `${memo.name}.${ext(memo.mime)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const share = async () => {
    const file = new File([memo.blob], `${memo.name}.${ext(memo.mime)}`, { type: memo.mime });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: memo.name });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    download();
    notify({ app: 'Voice Memos', icon: 'voicememos', title: 'Recording downloaded', body: `${memo.name}.${ext(memo.mime)}` });
  };

  const onBigDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, t };
  };
  const onBigMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    seek(drag.current.t - (e.clientX - drag.current.x) / (RATE * STEP));
  };
  const onBigUp = () => {
    drag.current = null;
  };

  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;
  const created = useMemo(() => memo.created.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), [memo.created]);

  return (
    <div
      className="vm7-player fade-swap"
      onKeyDown={(e) => {
        if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="vm7-toolbar">
        <button type="button" className="vm7-back vm7-only-narrow" onClick={onBack} aria-label="Back to recordings">
          ‹ Recordings
        </button>
        {renaming ? (
          <input
            className="vm7-title-input"
            value={draft}
            autoFocus
            aria-label="Recording name"
            onChange={(e) => onDraft(e.target.value)}
            onBlur={onCommitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename();
              if (e.key === 'Escape') onCancelRename();
            }}
          />
        ) : (
          <button type="button" className="vm7-title" onDoubleClick={onRename} onClick={onRename} title="Rename">
            <b>{memo.name}</b>
            <small>
              {created} · {fmt(dur)}
            </small>
          </button>
        )}
        <span className="vm7-grow" />
        <button type="button" className={`vm7-tb ${editOpen ? 'on' : ''}`} aria-pressed={editOpen} onClick={() => setEditOpen((v) => !v)}>
          Edit
        </button>
        <button type="button" className="vm7-tb vm7-tb-ico" aria-label="Share or download" title="Share / Download" onClick={() => void share()}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2.5v10M6.5 6 10 2.5 13.5 6M6 9H4.5v8.5h11V9H14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="vm7-tb vm7-tb-ico" aria-label="Delete recording" title="Delete" onClick={onDelete}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 5.5h12M8 5.5V4h4v1.5M5.5 5.5l.8 11h7.4l.8-11M8.5 8.5v5.5M11.5 8.5v5.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {editOpen && (
        <div className="vm7-edit fade-swap">
          <button type="button" className="vm7-chip" onClick={onRename}>
            Rename
          </button>
          <span className="vm7-edit-l">Speed</span>
          <div className="vm7-seg" role="group" aria-label="Playback speed">
            {[0.5, 1, 1.5, 2].map((s) => (
              <button key={s} type="button" className={speed === s ? 'on' : ''} aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
          <button type="button" className="vm7-chip" onClick={download}>
            Download .{ext(memo.mime)}
          </button>
          <button type="button" className="vm7-chip vm7-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}

      <div className="vm7-bigwrap">
        <canvas
          ref={bigRef}
          className="vm7-big"
          role="img"
          aria-label="Waveform — drag to scrub"
          onPointerDown={onBigDown}
          onPointerMove={onBigMove}
          onPointerUp={onBigUp}
          onPointerCancel={onBigUp}
        />
      </div>

      <div className="vm7-overview">
        <div className="vm7-ov-track">
          <canvas ref={ovRef} className="vm7-ov" aria-hidden="true" />
          <span className="vm7-ov-head" style={{ left: `${pct}%` }} aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.05}
            value={Math.min(t, dur || 0)}
            aria-label="Playback position"
            aria-valuetext={`${fmt(t)} of ${fmt(dur)}`}
            onChange={(e) => seek(Number(e.target.value))}
          />
        </div>
        <div className="vm7-ov-t">
          <span>{fmt(0)}</span>
          <span>{fmt(dur)}</span>
        </div>
      </div>

      <div className="vm7-bigtime">{fmtHund(t)}</div>

      <div className="vm7-controls">
        <button type="button" className="vm7-ctl" onClick={() => skip(-15)} aria-label="Back 15 seconds">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7.8 3.8 7.4 7.6l3.8.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <text x="12" y="15" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor">
              15
            </text>
          </svg>
        </button>
        <button type="button" className="vm7-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="5" y="4" width="3.4" height="12" rx="1" fill="currentColor" />
              <rect x="11.6" y="4" width="3.4" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5.5 3.5v13l11-6.5z" fill="currentColor" />
            </svg>
          )}
        </button>
        <button type="button" className="vm7-ctl" onClick={() => skip(15)} aria-label="Forward 15 seconds">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.5 12a6.5 6.5 0 1 1-2-4.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="m16.2 3.8.4 3.8-3.8.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <text x="12" y="15" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor">
              15
            </text>
          </svg>
        </button>
      </div>
    </div>
  );
}

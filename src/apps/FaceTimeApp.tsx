import { startCall } from '../system/call';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { personal } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { notify, openExternal } from '../system/notify';

type CamState = 'idle' | 'requesting' | 'live' | 'denied' | 'nocamera' | 'unsupported' | 'insecure' | 'error';
type Mode = 'lobby' | 'preview';

const WHATSAPP = 'https://wa.me/94763539501';

const FX: { id: string; label: string; filter: string }[] = [
  { id: 'none', label: 'None', filter: 'none' },
  { id: 'blur', label: 'Blur', filter: 'blur(7px) saturate(1.1)' },
  { id: 'soft', label: 'Soft', filter: 'blur(1.4px) brightness(1.08) contrast(0.95)' },
  { id: 'studio', label: 'Studio', filter: 'contrast(1.15) brightness(1.05) saturate(1.15)' },
  { id: 'mono', label: 'Mono', filter: 'grayscale(1) contrast(1.1)' },
  { id: 'warm', label: 'Warm', filter: 'sepia(0.3) saturate(1.35) hue-rotate(-8deg)' },
];

const P = {
  video: 'M3.5 7.5A2 2 0 0 1 5.5 5.5h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2ZM15.5 10.5l5-3v9l-5-3',
  videoOff: 'M3.5 7.5A2 2 0 0 1 5.5 5.5h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2ZM15.5 10.5l5-3v9l-5-3M3 3l18 18',
  mic: 'M12 3.5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0V6A2.5 2.5 0 0 1 12 3.5ZM6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20',
  micOff: 'M12 3.5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0V6A2.5 2.5 0 0 1 12 3.5ZM6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20M4 4l16 16',
  fx: 'M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4ZM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9Z',
  end: 'M3.5 13.5c4.8-4.4 12.2-4.4 17 0l-2.2 2.4-3.3-1.4v-2.4a10 10 0 0 0-6 0v2.4l-3.3 1.4Z',
  phone: 'M6.6 3.5h2.7l1.4 4-2 1.3a11 11 0 0 0 6.5 6.5l1.3-2 4 1.4v2.7a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z',
  chat: 'M4 5.5h16v10H9l-4.5 3.5v-3.5H4Z',
  mail: 'M3.5 6h17v12h-17ZM3.5 6.5 12 13l8.5-6.5',
  wa: 'M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5ZM9 8.5c0 3.5 2.8 6.5 6.5 6.5l1-1.6-2-1-1 .9a4.5 4.5 0 0 1-2.4-2.4l.9-1-1-2Z',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 11v5M12 8h.01',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  close: 'M6 6l12 12M18 6 6 18',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
};

function G({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Attaches a MediaStream to a <video> element. */
function StreamVideo({ stream, className, style }: { stream: MediaStream | null; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => undefined);
  }, [stream]);
  return <video ref={ref} className={className} style={style} autoPlay playsInline muted />;
}

/**
 * FaceTime-style app. The camera/mic are real (getUserMedia) and never leave
 * the browser. There is no video-calling backend, so "calling" M.R. Ahamed
 * offers real contact options instead; the self-call is a labelled preview.
 */
export default function FaceTimeApp() {
  const wm = useWM();
  const [state, setState] = useState<CamState>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasMic, setHasMic] = useState(false);
  const [mode, setMode] = useState<Mode>('lobby');
  const [sheet, setSheet] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [fx, setFx] = useState(FX[0]);
  const [fxOpen, setFxOpen] = useState(false);
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [pipCorner, setPipCorner] = useState(0);
  const [q, setQ] = useState('');
  const [recents, setRecents] = useState<{ id: number; at: Date; secs: number }[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const reqId = useRef(0);

  const start = useCallback(async () => {
    const my = ++reqId.current;
    if (streamRef.current) return setState('live');
    if (!window.isSecureContext) return setState('insecure');
    if (!navigator.mediaDevices?.getUserMedia) return setState('unsupported');
    setState('requesting');
    let s: MediaStream | null = null;
    let mic = true;
    try {
      s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
    } catch (e) {
      const name = (e as DOMException)?.name ?? '';
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        // maybe no microphone: retry with the camera only
        try {
          s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          mic = false;
        } catch {
          if (my === reqId.current) setState('nocamera');
          return;
        }
      } else {
        if (my !== reqId.current) return;
        if (name === 'NotAllowedError' || name === 'SecurityError') setState('denied');
        else {
          setErrMsg(name === 'NotReadableError' ? 'The camera is being used by another app. Close it and try again.' : (e as Error)?.message || 'The camera could not be started.');
          setState('error');
        }
        return;
      }
    }
    if (my !== reqId.current) {
      s?.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = s;
    setStream(s);
    setHasMic(mic && !!s?.getAudioTracks().length);
    setMicOn(true);
    setCamOn(true);
    setState('live');
  }, []);

  // ask for camera + mic as soon as FaceTime opens; release on close
  useEffect(() => {
    void start();
    return () => {
      reqId.current++;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [start]);

  // mute / camera-off act on the real tracks
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [stream, micOn]);
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [stream, camOn]);

  // call timer
  useEffect(() => {
    if (mode !== 'preview') return;
    setSecs(0);
    const t = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [mode]);

  // live microphone level (local only)
  useEffect(() => {
    if (mode !== 'preview' || !stream || !hasMic || !micOn) {
      setLevel(0);
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    let ctx: AudioContext;
    try {
      ctx = new AC();
    } catch {
      return;
    }
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 80) return;
      last = t;
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 64));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      src.disconnect();
      void ctx.close().catch(() => undefined);
    };
  }, [mode, stream, hasMic, micOn]);

  const startPreview = () => {
    setSheet(false);
    setMode('preview');
    setFxOpen(false);
    if (!streamRef.current) void start();
  };

  const endPreview = () => {
    setRecents((r) => [{ id: Date.now(), at: new Date(), secs }, ...r].slice(0, 5));
    setMode('lobby');
    setFxOpen(false);
    setCamOn(true);
    setMicOn(true);
  };

  // Esc ends the preview / closes the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sheet) setSheet(false);
      else if (fxOpen) setFxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, fxOpen]);

  const matches = `${personal.name} ${personal.phone} ${personal.email}`.toLowerCase().includes(q.trim().toLowerCase());

  const options = [
    {
      id: 'wa',
      label: 'WhatsApp video or voice call',
      sub: personal.phone,
      icon: P.wa,
      tone: 'green',
      run: () => openExternal(WHATSAPP, { title: 'Opening WhatsApp', body: `Chat or call ${personal.name}`, app: 'FaceTime', icon: 'facetime' }),
    },
    {
      id: 'tel',
      label: 'Phone call',
      sub: personal.phone,
      icon: P.phone,
      tone: 'green',
      run: () => openExternal(personal.phoneHref, { title: `Calling ${personal.name}`, body: personal.phone, app: 'FaceTime', icon: 'facetime' }),
    },
    { id: 'msg', label: 'Send a message', sub: 'Opens Messages', icon: P.chat, tone: 'blue', run: () => wm.open('messages') },
    { id: 'mail', label: 'Send an email', sub: personal.email, icon: P.mail, tone: 'blue', run: () => wm.open('mail', { compose: '1' }) },
  ];

  const pipPos = ['br', 'bl', 'tl', 'tr'][pipCorner];

  const status = (
    <div className="ft-status fade-swap">
      {state === 'requesting' && (
        <>
          <span className="spinner" aria-hidden="true" />
          <b>Allow camera &amp; microphone</b>
          <p>Your browser will ask for permission. Video stays on this device — nothing is uploaded.</p>
        </>
      )}
      {state === 'denied' && (
        <>
          <G d={P.videoOff} size={34} />
          <b>Camera access was blocked</b>
          <p>Allow the camera and microphone for this site in your browser’s address bar, then try again.</p>
          <button type="button" className="ft-pill" onClick={() => void start()}>
            Try Again
          </button>
        </>
      )}
      {state === 'nocamera' && (
        <>
          <G d={P.videoOff} size={34} />
          <b>No camera found</b>
          <p>Connect a camera to preview yourself. You can still reach {personal.name} using the options on the left.</p>
          <button type="button" className="ft-pill" onClick={() => void start()}>
            Try Again
          </button>
        </>
      )}
      {(state === 'unsupported' || state === 'insecure') && (
        <>
          <G d={P.videoOff} size={34} />
          <b>Camera not available</b>
          <p>{state === 'insecure' ? 'The camera only works on a secure (https) page.' : 'This browser doesn’t support camera access.'}</p>
        </>
      )}
      {state === 'error' && (
        <>
          <G d={P.videoOff} size={34} />
          <b>Couldn’t start the camera</b>
          <p>{errMsg}</p>
          <button type="button" className="ft-pill" onClick={() => void start()}>
            Try Again
          </button>
        </>
      )}
      {state === 'idle' && <span className="spinner" aria-hidden="true" />}
    </div>
  );

  return (
    <div className={`ft ${mode === 'preview' ? 'is-call' : ''}`}>
      {/* live camera behind everything, like macOS FaceTime */}
      <div className="ft-stage">
        {stream && camOn ? (
          <StreamVideo stream={stream} className="ft-video" style={{ filter: fx.filter }} />
        ) : stream && !camOn ? (
          <div className="ft-camoff">
            <span className="ft-me-ph">You</span>
            <small>Camera Off</small>
          </div>
        ) : (
          status
        )}
      </div>

      {mode === 'lobby' && (
        <aside className="ft-side">
          <button type="button" className="ft-new" onClick={() => setSheet(true)}>
            <G d={P.video} />
            New FaceTime
          </button>
          <label className="ft-search">
            <G d={P.search} size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search contacts" />
          </label>
          <div className="ft-sec">Contacts</div>
          {matches ? (
            <>
            <div className="ft-row">
              <button type="button" className="ft-person" onClick={() => setSheet(true)}>
                <img src={personal.avatar} alt="" />
                <span>
                  <b>{personal.name}</b>
                  <small>Tap to see ways to connect</small>
                </span>
              </button>
              <button type="button" className="ft-row-ico" aria-label={`FaceTime ${personal.name}`} title="FaceTime (demo call)" onClick={() => startCall({ app: 'facetime', video: true })}>
                <G d={P.video} />
              </button>
            </div>
            <button type="button" className="ft-demo-in" onClick={() => startCall({ app: 'facetime', video: true, incoming: true })}>
              Try an incoming FaceTime (demo)
            </button>
            </>
          ) : (
            <p className="ft-empty">No Results</p>
          )}
          <div className="ft-sec">Recent</div>
          {recents.length === 0 ? (
            <p className="ft-empty">No recent calls</p>
          ) : (
            recents.map((r) => (
              <div key={r.id} className="ft-recent fade-swap">
                <span className="ft-me-ph sm">You</span>
                <span>
                  <b>Camera preview</b>
                  <small>
                    Demo · {fmtDur(r.secs)} · {r.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </small>
                </span>
              </div>
            ))
          )}
          <p className="ft-note">
            <G d={P.info} size={13} />
            Video calls can’t be placed from a web portfolio. Your camera preview stays on this device.
          </p>
        </aside>
      )}

      {mode === 'preview' && (
        <>
          <div className="ft-top">
            <span className="ft-badge">Demo · Camera preview</span>
            <b>{fmtDur(secs)}</b>
            <small>Only you can see this — no one else is on this call.</small>
          </div>
          {stream && (
            <button type="button" className={`ft-pip ${pipPos}`} onClick={() => setPipCorner((c) => (c + 1) % 4)} aria-label="Move picture-in-picture">
              {camOn ? <StreamVideo stream={stream} className="ft-video" /> : <span className="ft-me-ph">You</span>}
              <span className="ft-pip-lbl">You · original</span>
            </button>
          )}
          {fxOpen && (
            <div className="ft-fx fade-swap" role="menu" aria-label="Effects">
              {FX.map((f) => (
                <button key={f.id} type="button" role="menuitemradio" aria-checked={fx.id === f.id} className={fx.id === f.id ? 'on' : ''} onClick={() => setFx(f)}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <div className="ft-controls">
            <button type="button" className={`ft-ctl ${!micOn ? 'off' : ''}`} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={!micOn} disabled={!hasMic} onClick={() => setMicOn((m) => !m)}>
              <G d={micOn ? P.mic : P.micOff} size={20} />
              {hasMic && micOn && <span className="ft-level" style={{ transform: `scaleX(${0.08 + level * 0.92})` }} />}
            </button>
            <button type="button" className={`ft-ctl ${!camOn ? 'off' : ''}`} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'} aria-pressed={!camOn} disabled={!stream} onClick={() => setCamOn((c) => !c)}>
              <G d={camOn ? P.video : P.videoOff} size={20} />
            </button>
            <button type="button" className={`ft-ctl ${fx.id !== 'none' ? 'lit' : ''}`} aria-label="Effects" aria-expanded={fxOpen} onClick={() => setFxOpen((o) => !o)}>
              <G d={P.fx} size={20} />
            </button>
            <button type="button" className="ft-ctl end" aria-label="End preview" onClick={endPreview}>
              <G d={P.end} size={22} />
            </button>
          </div>
        </>
      )}

      {sheet && (
        <div className="ft-sheet-bg fade-swap" onClick={() => setSheet(false)}>
          <div className="ft-sheet" role="dialog" aria-modal="true" aria-label={`Connect with ${personal.name}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ft-x" aria-label="Close" onClick={() => setSheet(false)}>
              <G d={P.close} size={14} />
            </button>
            <img className="ft-sheet-av" src={personal.avatar} alt={`Portrait of ${personal.name}`} />
            <h3>{personal.name}</h3>
            <p className="ft-sheet-sub">
              This portfolio has no video-calling service, so a real FaceTime call can’t be placed from here. Reach {personal.name} directly:
            </p>
            <div className="ft-opts">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="ft-opt"
                  onClick={() => {
                    setSheet(false);
                    o.run();
                  }}
                >
                  <span className={`ft-opt-ico ${o.tone}`}>
                    <G d={o.icon} />
                  </span>
                  <span>
                    <b>{o.label}</b>
                    <small>{o.sub}</small>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ft-demo"
              onClick={() => {
                startPreview();
                notify({ app: 'FaceTime', icon: 'facetime', title: 'Camera preview (demo)', body: 'Only you can see this preview.' });
              }}
            >
              <G d={P.video} />
              Preview your camera <em>Demo self-call</em>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

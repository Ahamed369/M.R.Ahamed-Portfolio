import { useCallback, useEffect, useRef, useState } from 'react';
import { playShutter } from '../system/sounds';
import { useSettings } from '../system/SettingsContext';
import { AppIcon } from '../components/AppIcons';

type CamState = 'requesting' | 'granted' | 'denied' | 'nocamera' | 'unsupported' | 'insecure' | 'error' | 'paused';

interface Effect {
  id: string;
  label: string;
  filter: string;
}

const EFFECTS: Effect[] = [
  { id: 'normal', label: 'Normal', filter: 'none' },
  { id: 'mono', label: 'Mono', filter: 'grayscale(1) contrast(1.1)' },
  { id: 'sepia', label: 'Sepia', filter: 'sepia(0.85) contrast(1.05)' },
  { id: 'vivid', label: 'Vivid', filter: 'saturate(1.8) contrast(1.1)' },
  { id: 'cool', label: 'Cool', filter: 'hue-rotate(-18deg) saturate(1.2) brightness(1.03)' },
  { id: 'warm', label: 'Warm', filter: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)' },
  { id: 'comic', label: 'Comic', filter: 'contrast(2.2) saturate(2.4) brightness(1.1)' },
  { id: 'invert', label: 'Invert', filter: 'invert(1)' },
];

interface Shot {
  id: number;
  url: string;
  blob: Blob;
  time: Date;
  effect: string;
}

function stamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} at ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

/**
 * Photo Booth–style camera. Uses the real webcam via getUserMedia; photos
 * are rendered to a canvas (with the chosen effect baked in) and kept in
 * memory only as object URLs — nothing is uploaded.
 */
export default function CameraApp() {
  const { settings } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reqId = useRef(0);
  const [state, setState] = useState<CamState>('requesting');
  const [errMsg, setErrMsg] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [mirror, setMirror] = useState(true);
  const [effect, setEffect] = useState<Effect>(EFFECTS[0]);
  const [showFx, setShowFx] = useState(false);
  const [timer, setTimer] = useState(false);
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [view, setView] = useState<Shot | null>(null);
  const shotsRef = useRef<Shot[]>([]);
  shotsRef.current = shots;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(
    async (id: string | null) => {
      const my = ++reqId.current;
      stop();
      if (!window.isSecureContext) return setState('insecure');
      if (!navigator.mediaDevices?.getUserMedia) return setState('unsupported');
      setState('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: id ? { deviceId: { exact: id } } : { facingMode: 'user' },
          audio: false,
        });
        if (my !== reqId.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => undefined);
        }
        setState('granted');
        try {
          const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
          if (my === reqId.current) {
            setDevices(list);
            const cur = stream.getVideoTracks()[0]?.getSettings().deviceId;
            if (cur) setDeviceId(cur);
          }
        } catch {
          /* enumerate unsupported */
        }
      } catch (e) {
        if (my !== reqId.current) return;
        const name = (e as DOMException)?.name ?? '';
        if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') setState('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') setState('nocamera');
        else {
          setErrMsg(name === 'NotReadableError' ? 'The camera is being used by another app. Close it and try again.' : (e as Error)?.message || 'The camera could not be started.');
          setState('error');
        }
      }
    },
    [stop],
  );

  // start on mount; stop on unmount (window closed)
  useEffect(() => {
    void start(null);
    return () => {
      reqId.current++;
      stop();
    };
  }, [start, stop]);

  // release the camera while the tab is hidden, resume when visible again
  const devRef = useRef<string | null>(null);
  devRef.current = deviceId;
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (streamRef.current) {
          reqId.current++;
          stop();
          setState('paused');
        }
      } else {
        if (stateRef.current === 'paused') void start(devRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [start, stop]);

  // revoke object URLs on unmount
  useEffect(() => () => shotsRef.current.forEach((s) => URL.revokeObjectURL(s.url)), []);

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (mirror) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = effect.filter;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    setFlash((f) => f + 1);
    playShutter(settings.uiSounds ? 0.6 : 0.35);
    const time = new Date();
    const fx = effect.label;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setShots((s) => [{ id: time.getTime() + Math.random(), url, blob, time, effect: fx }, ...s]);
    }, 'image/png');
  }, [mirror, effect, settings.uiSounds]);

  // countdown
  useEffect(() => {
    if (count <= 0) return;
    const t = window.setTimeout(() => {
      if (count === 1) {
        setCount(0);
        capture();
      } else setCount(count - 1);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [count, capture]);

  const shoot = () => {
    if (state !== 'granted' || count > 0) return;
    if (timer) setCount(3);
    else capture();
  };

  const remove = (s: Shot) => {
    URL.revokeObjectURL(s.url);
    setShots((all) => all.filter((x) => x.id !== s.id));
    setView(null);
  };

  const download = (s: Shot) => {
    const a = document.createElement('a');
    a.href = s.url;
    a.download = `Photo Booth ${stamp(s.time)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const switchCam = () => {
    if (devices.length < 2) return;
    const i = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(i + 1) % devices.length];
    setDeviceId(next.deviceId);
    void start(next.deviceId);
  };

  // Escape closes the photo preview
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setView(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const live = state === 'granted';

  return (
    <div className="cam-root">
      <div className="cam-stage">
        <video
          ref={videoRef}
          className={`cam-video ${live ? 'on' : ''}`}
          style={{ transform: mirror ? 'scaleX(-1)' : undefined, filter: effect.filter }}
          playsInline
          muted
          autoPlay
        />

        {!live && (
          <div className="cam-gate fade-swap" role="status">
            <div className="cam-gate-ico">
              <AppIcon name="camera" />
            </div>
            {state === 'requesting' && (
              <>
                <h2>Camera access</h2>
                <p>Allow camera access in your browser’s prompt to see a live preview and take photos.</p>
                <p className="cam-small">Photos stay on this device and are not uploaded.</p>
                <span className="spinner" aria-hidden="true" />
              </>
            )}
            {state === 'paused' && (
              <>
                <h2>Camera paused</h2>
                <p>The camera turns off while this tab is in the background.</p>
                <button type="button" className="btn btn-primary" onClick={() => void start(deviceId)}>
                  Resume
                </button>
              </>
            )}
            {state === 'denied' && (
              <>
                <h2>Camera access is blocked</h2>
                <p>
                  To use Camera, click the camera or lock icon in your browser’s address bar, choose <b>Allow</b> for Camera in the site
                  settings, then press Retry.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => void start(null)}>
                  Retry
                </button>
              </>
            )}
            {state === 'nocamera' && (
              <>
                <h2>No camera found</h2>
                <p>Connect a camera (or enable the built-in one) and try again.</p>
                <button type="button" className="btn btn-primary" onClick={() => void start(null)}>
                  Retry
                </button>
              </>
            )}
            {state === 'unsupported' && (
              <>
                <h2>Camera not supported</h2>
                <p>This browser doesn’t support camera access. Try a recent version of Chrome, Safari, Edge or Firefox.</p>
              </>
            )}
            {state === 'insecure' && (
              <>
                <h2>Secure connection required</h2>
                <p>
                  Browsers only allow the camera on secure pages. Open this portfolio over <b>https://</b> (or on <b>localhost</b>) to use Camera.
                </p>
              </>
            )}
            {state === 'error' && (
              <>
                <h2>Camera couldn’t start</h2>
                <p>{errMsg}</p>
                <button type="button" className="btn btn-primary" onClick={() => void start(deviceId)}>
                  Retry
                </button>
              </>
            )}
          </div>
        )}

        {live && effect.id !== 'normal' && <div className="cam-fx-badge">{effect.label}</div>}
        {count > 0 && (
          <div className="cam-count" key={count} aria-live="assertive">
            {count}
          </div>
        )}
        {flash > 0 && <div className="cam-flash" key={flash} aria-hidden="true" />}

        {showFx && live && (
          <div className="cam-fx fade-swap" role="radiogroup" aria-label="Effects">
            {EFFECTS.map((fx) => (
              <button
                key={fx.id}
                type="button"
                role="radio"
                aria-checked={fx.id === effect.id}
                className={`cam-fx-item ${fx.id === effect.id ? 'on' : ''}`}
                onClick={() => setEffect(fx)}
              >
                <span className="cam-fx-sw" style={{ filter: fx.filter }} aria-hidden="true" />
                {fx.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="cam-bar">
        <div className="cam-bar-l">
          <button type="button" className={`cam-tool ${showFx ? 'on' : ''}`} onClick={() => setShowFx((v) => !v)} disabled={!live} aria-pressed={showFx} aria-label="Effects">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="7" cy="8" r="4.5" />
              <circle cx="13" cy="8" r="4.5" />
              <circle cx="10" cy="13" r="4.5" />
            </svg>
            <span>Effects</span>
          </button>
          <button type="button" className={`cam-tool ${timer ? 'on' : ''}`} onClick={() => setTimer((v) => !v)} aria-pressed={timer} aria-label="3-second timer">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="11" r="6.5" />
              <path d="M10 7.5V11l2.3 1.6M8 2.5h4" />
            </svg>
            <span>3s</span>
          </button>
        </div>
        <button type="button" className="cam-shutter" onClick={shoot} disabled={!live || count > 0} aria-label={timer ? 'Take photo in 3 seconds' : 'Take photo'}>
          <span />
        </button>
        <div className="cam-bar-r">
          <button type="button" className={`cam-tool ${mirror ? 'on' : ''}`} onClick={() => setMirror((m) => !m)} aria-pressed={mirror} aria-label="Mirror preview">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2v16" strokeDasharray="2 2" />
              <path d="M7.5 5 3 15h4.5zM12.5 5 17 15h-4.5z" />
            </svg>
            <span>Mirror</span>
          </button>
          {devices.length > 1 && (
            <button type="button" className="cam-tool" onClick={switchCam} aria-label="Switch camera">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 7.5h2.5L7 5.5h6l1.5 2H17v8H3z" />
                <path d="M8 11.5a2.2 2.2 0 0 1 4-1.1M12 11.3a2.2 2.2 0 0 1-4 1.1M12.2 9v1.5h-1.5M7.8 14v-1.5h1.5" />
              </svg>
              <span>Switch</span>
            </button>
          )}
        </div>
      </div>

      <div className="cam-strip" aria-label="Photos">
        {shots.length === 0 ? (
          <span className="cam-note">Photos stay on this device and are not uploaded.</span>
        ) : (
          shots.map((s) => (
            <button key={s.id} type="button" className="cam-thumb" onClick={() => setView(s)} aria-label={`Open photo taken ${s.time.toLocaleTimeString()}`}>
              <img src={s.url} alt="" />
            </button>
          ))
        )}
      </div>

      {view && (
        <div className="cam-view fade-swap" role="dialog" aria-label="Photo preview">
          <img src={view.url} alt={`Photo taken ${view.time.toLocaleString()}`} />
          <div className="cam-view-bar">
            <span>
              {view.time.toLocaleString()} {view.effect !== 'Normal' && `· ${view.effect}`}
            </span>
            <div>
              <button type="button" className="btn btn-primary" onClick={() => download(view)}>
                Download
              </button>
              <button type="button" className="btn cam-del" onClick={() => remove(view)}>
                Delete
              </button>
              <button type="button" className="btn" onClick={() => setView(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

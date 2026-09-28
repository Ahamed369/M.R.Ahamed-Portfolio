import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../system/SettingsContext';
import { getBatteryManager, recordBattery } from '../system/batteryLog';
import { CALL_EVT, type CallRequest } from '../system/call';
import { personal, socials } from '../data/portfolio';
import { openExternal } from '../system/notify';
import { sharePortfolio } from '../system/share';

/**
 * v9 — system agents that need no UI of their own:
 *  • battery history (Settings → Battery) + Low Power Mode
 *  • natural scrolling / pinch-zoom preferences (Settings → Trackpad)
 *  • menu-bar auto-hide reveal
 * …and the FaceTime / WhatsApp call interface.
 */
export function SystemV9() {
  const { settings } = useSettings();
  const [charging, setCharging] = useState<boolean | null>(null);

  // battery log + charging state
  useEffect(() => {
    let alive = true;
    let mgr: Awaited<ReturnType<typeof getBatteryManager>> = null;
    const up = () => {
      if (!mgr || !alive) return;
      setCharging(mgr.charging);
      recordBattery(mgr.level, mgr.charging);
    };
    void getBatteryManager().then((m) => {
      if (!m || !alive) return;
      mgr = m;
      up();
      m.addEventListener('levelchange', up);
      m.addEventListener('chargingchange', up);
    });
    const iv = window.setInterval(up, 5 * 60000);
    return () => {
      alive = false;
      window.clearInterval(iv);
      mgr?.removeEventListener('levelchange', up);
      mgr?.removeEventListener('chargingchange', up);
    };
  }, []);

  // Low Power Mode → data-lowpower-active
  useEffect(() => {
    const m = settings.lowPowerMode ?? 'never';
    const on = m === 'always' || (m === 'battery' && charging === false) || (m === 'adapter' && charging === true);
    document.documentElement.dataset.lowpowerActive = on ? 'on' : 'off';
  }, [settings.lowPowerMode, charging]);

  // Natural scrolling off → reverse wheel scrolling inside the portfolio; pinch zoom off → block page zoom
  useEffect(() => {
    const natural = settings.naturalScroll !== false;
    const pinch = settings.pinchZoom !== false;
    if (natural && pinch) return;
    const scrollable = (el: Element | null): Element | null => {
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) return el;
        el = el.parentElement;
      }
      return null;
    };
    const on = (e: WheelEvent) => {
      if (e.ctrlKey) {
        if (!pinch) e.preventDefault();
        return;
      }
      if (natural) return;
      const t = scrollable(e.target as Element);
      if (!t) return;
      e.preventDefault();
      t.scrollBy({ left: -e.deltaX, top: -e.deltaY });
    };
    window.addEventListener('wheel', on, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', on, { capture: true });
  }, [settings.naturalScroll, settings.pinchZoom]);

  // menu bar auto-hide: reveal when the pointer reaches the top edge; data-fs for "in full screen only"
  useEffect(() => {
    const root = document.documentElement;
    const fs = () => (root.dataset.fs = document.fullscreenElement ? 'on' : 'off');
    fs();
    document.addEventListener('fullscreenchange', fs);
    if ((settings.menubarAutohide ?? 'never') === 'never') return () => document.removeEventListener('fullscreenchange', fs);
    let t = 0;
    const mv = (e: PointerEvent) => {
      if (e.clientY <= 4) {
        window.clearTimeout(t);
        root.classList.add('mb-peek');
      } else if (e.clientY > 40 && root.classList.contains('mb-peek')) {
        window.clearTimeout(t);
        t = window.setTimeout(() => root.classList.remove('mb-peek'), 350);
      }
    };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => {
      document.removeEventListener('fullscreenchange', fs);
      window.removeEventListener('pointermove', mv);
      root.classList.remove('mb-peek');
    };
  }, [settings.menubarAutohide]);

  return <CallOverlay />;
}

/* ═════════════════════ FaceTime / WhatsApp call UI ═════════════════════ */

type Phase = 'incoming' | 'ringing' | 'active' | 'ended';
const REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];
const CAPTIONS = [
  `Hi, thanks for calling! This is ${personal.name}'s portfolio assistant.`,
  personal.headline + '.',
  `Based in ${personal.location} — ${personal.status.toLowerCase()}.`,
  'This is a demo call inside the portfolio. To reach Ahamed for real, tap “WhatsApp” below — it opens a chat with him directly.',
];

function ring(ctxRef: { current: AudioContext | null }) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new AC();
    ctxRef.current = ctx;
    const now = ctx.currentTime;
    [0, 0.42].forEach((d) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = d ? 880 : 660;
      g.gain.setValueAtTime(0.0001, now + d);
      g.gain.exponentialRampToValueAtTime(0.08, now + d + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(now + d);
      o.stop(now + d + 0.4);
    });
  } catch {
    /* audio blocked */
  }
}

function CallOverlay() {
  const [call, setCall] = useState<(CallRequest & { phase: Phase; started: number; ended?: number; declined?: boolean }) | null>(null);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cam, setCam] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [capIdx, setCapIdx] = useState(0);
  const [floats, setFloats] = useState<{ id: number; e: string; x: number }[]>([]);
  const [showReact, setShowReact] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const r = (e as CustomEvent<CallRequest>).detail;
      setSecs(0);
      setCapIdx(0);
      setMuted(false);
      setCam(false);
      setShowReact(false);
      setCall({ ...r, phase: r.incoming ? 'incoming' : 'ringing', started: Date.now() });
    };
    window.addEventListener(CALL_EVT, on);
    return () => window.removeEventListener(CALL_EVT, on);
  }, []);

  const stopCam = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  const end = useCallback((declined = false) => {
    window.speechSynthesis?.cancel();
    stopCam();
    setCam(false);
    setCall((c) => (c ? { ...c, phase: 'ended', ended: Date.now(), declined } : c));
  }, []);

  // ringing sound + outgoing auto-answer after ~3.5 s
  useEffect(() => {
    if (!call || (call.phase !== 'incoming' && call.phase !== 'ringing')) return;
    ring(audio);
    const iv = window.setInterval(() => ring(audio), 2200);
    const auto = call.phase === 'ringing' ? window.setTimeout(() => setCall((c) => (c && c.phase === 'ringing' ? { ...c, phase: 'active', started: Date.now() } : c)), 3600) : window.setTimeout(() => end(true), 30000);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(auto);
    };
  }, [call?.phase, end, call]);

  // active: timer + captions
  useEffect(() => {
    if (call?.phase !== 'active') return;
    const t = window.setInterval(() => setSecs(Math.round((Date.now() - call.started) / 1000)), 500);
    const c = window.setInterval(() => setCapIdx((i) => Math.min(CAPTIONS.length - 1, i + 1)), 4200);
    if (call.video) setCam(true);
    return () => {
      window.clearInterval(t);
      window.clearInterval(c);
    };
  }, [call?.phase, call?.started, call?.video]);

  // speak captions when the speaker is on
  useEffect(() => {
    if (call?.phase !== 'active' || !speaker || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(CAPTIONS[capIdx]));
  }, [capIdx, speaker, call?.phase]);

  // self-view camera (real, stays on this device)
  useEffect(() => {
    if (!cam) {
      stopCam();
      return;
    }
    let alive = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => alive && setCam(false));
    return () => {
      alive = false;
    };
  }, [cam]);

  // ended → close after a moment
  useEffect(() => {
    if (call?.phase !== 'ended') return;
    const t = window.setTimeout(() => setCall(null), 7000);
    return () => window.clearTimeout(t);
  }, [call?.phase]);

  useEffect(() => () => stopCam(), []);

  if (!call) return null;
  const wa = call.app === 'whatsapp';
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const react = (e: string) => {
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, e, x: 20 + Math.random() * 60 }]);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2200);
    setShowReact(false);
  };
  const realWa = () => openExternal(socials.whatsapp, { title: 'Opening WhatsApp chat with M.R. Ahamed', app: 'WhatsApp', icon: 'whatsapp' });

  if (call.phase === 'incoming')
    return (
      <div className={`call9-in ${wa ? 'app-wa' : 'app-ft'}`} role="alertdialog" aria-label={`Incoming ${wa ? 'WhatsApp' : 'FaceTime'} ${call.video ? 'video' : 'audio'} call`}>
        <img src={personal.avatar} alt="" className="call9-in-av" />
        <div className="call9-in-t">
          <b>{personal.name}</b>
          <span>
            {wa ? 'WhatsApp' : 'FaceTime'} {call.video ? 'Video' : 'Audio'} · demo
          </span>
        </div>
        <button type="button" className="call9-round decline" aria-label="Decline" onClick={() => end(true)}>
          <PhoneGlyph down />
        </button>
        <button type="button" className="call9-round accept" aria-label="Accept" onClick={() => setCall((c) => (c ? { ...c, phase: 'active', started: Date.now() } : c))}>
          {call.video ? '🎥' : <PhoneGlyph />}
        </button>
      </div>
    );

  return (
    <div className={`call9 ${wa ? 'app-wa' : 'app-ft'} ph-${call.phase} ${call.video ? 'video' : 'voice'}`} role="dialog" aria-label={`${wa ? 'WhatsApp' : 'FaceTime'} call`}>
      <div className="call9-bg" style={{ backgroundImage: `url(${personal.photo})` }} />
      <div className="call9-head">
        <span className="call9-app">{wa ? '🔒 End-to-end demo · WhatsApp' : 'FaceTime'}</span>
        <b>{personal.name}</b>
        <span className="call9-status">
          {call.phase === 'ringing' ? (
            <>
              {wa ? 'Ringing' : 'Calling'}
              <i className="call9-dots">
                <i />
                <i />
                <i />
              </i>
            </>
          ) : call.phase === 'active' ? (
            fmt(secs)
          ) : call.declined ? (
            'Call Declined'
          ) : (
            `Call Ended · ${fmt(secs)}`
          )}
        </span>
      </div>

      <div className="call9-center">
        <div className={`call9-avatar ${call.phase === 'ringing' ? 'pulse' : ''}`}>
          <img src={personal.avatar} alt="" />
        </div>
        {call.phase === 'active' && (
          <p className="call9-cap" key={capIdx}>
            {CAPTIONS[capIdx]}
          </p>
        )}
        {call.phase === 'ended' && (
          <div className="call9-end-actions">
            <button type="button" onClick={() => setCall({ ...call, phase: 'ringing', started: Date.now(), declined: false })}>
              ↻ Call Again
            </button>
            <button type="button" className="wa-btn" onClick={realWa}>
              💬 Message on WhatsApp
            </button>
            <button type="button" onClick={() => setCall(null)}>
              Close
            </button>
          </div>
        )}
      </div>

      {cam && call.phase === 'active' && (
        <div className="call9-self">
          <video ref={video} autoPlay muted playsInline />
          <small>You</small>
        </div>
      )}

      <div className="call9-floats" aria-hidden="true">
        {floats.map((f) => (
          <span key={f.id} style={{ left: `${f.x}%` }}>
            {f.e}
          </span>
        ))}
      </div>

      {call.phase !== 'ended' && (
        <div className="call9-controls">
          {showReact && (
            <div className="call9-react">
              {REACTIONS.map((e) => (
                <button key={e} type="button" onClick={() => react(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
          <button type="button" className={`call9-ctl ${muted ? 'on' : ''}`} onClick={() => setMuted((m) => !m)} aria-pressed={muted} title="Mute">
            {muted ? '🔇' : '🎙'}
            <small>{muted ? 'Unmute' : 'Mute'}</small>
          </button>
          <button type="button" className={`call9-ctl ${cam ? 'on' : ''}`} onClick={() => setCam((c) => !c)} aria-pressed={cam} title="Camera" disabled={call.phase !== 'active'}>
            📷<small>Camera</small>
          </button>
          <button type="button" className={`call9-ctl ${speaker ? 'on' : ''}`} onClick={() => setSpeaker((s) => !s)} aria-pressed={speaker} title="Speaker (reads captions aloud)">
            🔊<small>Speaker</small>
          </button>
          <button type="button" className="call9-ctl" onClick={() => setShowReact((v) => !v)} disabled={call.phase !== 'active'} title="Reactions">
            😊<small>React</small>
          </button>
          <button type="button" className="call9-ctl" onClick={() => void sharePortfolio()} title="Share">
            ⤴︎<small>Share</small>
          </button>
          <button type="button" className="call9-ctl wa-ctl" onClick={realWa} title="Open a real WhatsApp chat">
            💬<small>WhatsApp</small>
          </button>
          <button type="button" className="call9-round decline" onClick={() => end(call.phase === 'ringing')} aria-label="End call">
            <PhoneGlyph down />
          </button>
        </div>
      )}
      <p className="call9-demo">Demo call inside the portfolio — no audio or video leaves your device.</p>
    </div>
  );
}

function PhoneGlyph({ down }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" style={{ transform: down ? 'rotate(135deg)' : undefined }} aria-hidden="true">
      <path fill="currentColor" d="M6.6 3.5 9.3 3l1.6 4-2 1.4a11 11 0 0 0 6.7 6.7l1.4-2 4 1.6-.5 2.7c-.2 1-1.1 1.6-2.1 1.6C10.8 19 5 13.2 5 5.6c0-1 .6-1.9 1.6-2.1Z" />
    </svg>
  );
}

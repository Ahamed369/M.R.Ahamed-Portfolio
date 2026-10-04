import { useEffect, useRef, useState } from 'react';
import { Logo } from './MenuBar';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { playChime } from '../system/sounds';

/**
 * Startup screen: black → mark → progress bar → fade out. Clicking or pressing
 * any key skips it. The desktop then plays its staged entrance (see Desktop).
 */
export function BootScreen() {
  const { phase, finishBoot } = useSystem();
  const { settings, motionReduced } = useSettings();
  const [leaving, setLeaving] = useState(false);
  const [hello, setHello] = useState(false);
  const helloRef = useRef(false);
  helloRef.current = !!settings.helloScreen && !motionReduced;
  const soundRef = useRef({ on: settings.startupSound, vol: settings.alertVolume, style: settings.startupChime });
  soundRef.current = { on: settings.startupSound, vol: settings.alertVolume, style: settings.startupChime };
  const skipRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (phase !== 'boot') return;
    setLeaving(false);
    setHello(false);
    // Start-up chord (browsers may block audio before the first interaction).
    if (soundRef.current.on) playChime(soundRef.current.style ?? 'classic', soundRef.current.vol);
    const total = motionReduced ? 300 : 2100;
    const fade = motionReduced ? 150 : 560;
    let done = false;
    const timers: number[] = [];
    const leave = (delay: number) => {
      if (done) return;
      done = true;
      timers.forEach((t) => window.clearTimeout(t));
      timers.push(window.setTimeout(() => setLeaving(true), delay));
      // emblem + bar fade out on black, then the desktop fades in (Desktop intro)
      timers.push(window.setTimeout(finishBoot, delay + fade));
    };
    // v10.1 — optional handwritten “hello” before the login window
    timers.push(
      window.setTimeout(() => {
        if (!helloRef.current) return leave(0);
        setHello(true);
        timers.push(window.setTimeout(() => leave(0), 3400));
      }, total),
    );
    const skip = () => leave(0);
    skipRef.current = skip;
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('keydown', skip);
    };
  }, [phase, finishBoot, motionReduced]);

  if (phase === 'shutdown') return <ShutdownEmblem />;
  if (phase !== 'boot') return null;
  return (
    <div className={`boot v5-boot ${leaving ? 'leaving' : ''}`} role="status" aria-label="Starting up — press any key to skip" onClick={() => skipRef.current()}>
      {hello ? (
        <div className="boot-hello" aria-label="hello">
          <svg viewBox="0 0 600 220" aria-hidden="true">
            <text x="50%" y="62%" textAnchor="middle">
              hello
            </text>
          </svg>
          <small>ආයුබෝවන් · வணக்கம்</small>
        </div>
      ) : (
        <>
          <div className="boot-mark">
            <Logo />
          </div>
          <div className="boot-bar">
            <span style={{ animationDuration: motionReduced ? '0.3s' : '1.9s' }} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Shutdown / restart: the desktop fades to black, then the emblem fades in,
 * holds and fades out before power-off (or the boot screen on restart).
 */
function ShutdownEmblem() {
  return (
    <div className="v5-shut" role="status" aria-label="Shutting down">
      <div className="v5-shut-mark">
        <Logo />
      </div>
    </div>
  );
}

/** Shown after "Shut Down…" — a power button brings the desktop back. */
export function PowerOff() {
  const { phase, powerOn } = useSystem();
  if (phase !== 'off') return null;
  return (
    <div className="power-off">
      <button type="button" className="power-btn" onClick={powerOn} aria-label="Start up" autoFocus>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v8" />
          <path d="M6.4 6.6a8 8 0 1 0 11.2 0" />
        </svg>
      </button>
      <span>Click to start up</span>
    </div>
  );
}

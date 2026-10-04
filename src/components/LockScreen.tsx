import { t } from '../system/i18n';
import { WallImage } from './Wallpaper';
import { lockWallFor } from '../system/wallpaperCycle';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { personal } from '../data/portfolio';
import { SysIcon } from './SysIcons';
import { usePrefChoice } from '../system/prefs';
import { lockClockStyle } from '../system/lockStyle';

/**
 * Lock screen & display sleep.
 * - Sleep: the screen fades to black; any key / click / tap wakes it to the lock screen.
 * - Lock screen: blurred wallpaper, big clock, avatar + name. There is no password —
 *   click, tap or press Enter to unlock (this is a portfolio, not a real login).
 */
export function LockScreen() {
  const sys = useSystem();
  const { settings, motionReduced } = useSettings();
  const [leaving, setLeaving] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<{ y: number; id: number } | null>(null);
  const dragged = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const btnRef = useRef<HTMLButtonElement>(null);
  const leavingRef = useRef(false);
  const shownAt = useRef(0);
  const { locked, asleep, unlock, wake, lockReason } = sys;
  const lockFont = usePrefChoice('lock-font', 'classic');
  const lockColor = usePrefChoice('lock-color', 'white');

  // live clock while locked
  useEffect(() => {
    if (!locked) return;
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [locked]);

  useEffect(() => {
    if (!locked) {
      setLeaving(false);
      leavingRef.current = false;
      return;
    }
    shownAt.current = Date.now();
    const f = window.setTimeout(() => btnRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(f);
  }, [locked]);

  const doUnlock = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    // ignore the tail of the click / key that woke the display
    if (leavingRef.current || Date.now() - shownAt.current < 450) return;
    leavingRef.current = true;
    setLeaving(true);
    window.setTimeout(unlock, motionReduced ? 60 : 560);
  };
  const unlockRef = useRef(doUnlock);
  unlockRef.current = doUnlock;

  // While locked, swallow global shortcuts; Enter / Space unlocks.
  useEffect(() => {
    if (!locked || asleep) return;
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Tab') return;
      e.preventDefault();
      if (e.key === 'Enter' || e.key === ' ') unlockRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [locked, asleep]);

  // Sleep: any input wakes the display (short guard so the click that chose "Sleep" doesn't wake it).
  useEffect(() => {
    if (!asleep) return;
    const since = Date.now();
    const onInput = (e: Event) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      if (Date.now() - since < 700) return;
      wake();
    };
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('pointerdown', onInput, true);
    return () => {
      window.removeEventListener('keydown', onInput, true);
      window.removeEventListener('pointerdown', onInput, true);
    };
  }, [asleep, wake]);

  if (sys.phase !== 'ready') return null;

  const loggedOut = lockReason === 'logout';
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: !settings.clock24 }).replace(/\s?[AP]M$/i, '');
  const clockStyle = lockClockStyle(lockFont, lockColor);

  return (
    <>
      {locked && (
        <div
          className={`v5-lock ${leaving ? 'leaving' : ''} ${loggedOut ? 'logged-out' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={loggedOut ? 'Logged out' : 'Lock screen'}
          onClick={doUnlock}
          onPointerDown={(e: RPointerEvent) => {
            dragStart.current = { y: e.clientY, id: e.pointerId };
            dragged.current = false;
          }}
          onPointerMove={(e: RPointerEvent) => {
            const st = dragStart.current;
            if (!st || st.id !== e.pointerId) return;
            const dy = Math.min(0, e.clientY - st.y);
            if (dy < -6) dragged.current = true;
            setDrag(dy);
          }}
          onPointerUp={() => {
            const d = drag;
            dragStart.current = null;
            setDrag(0);
            if (d < -90) {
              dragged.current = false;
              doUnlock();
              dragged.current = true; // swallow the click that follows the swipe
              window.setTimeout(() => (dragged.current = false), 60);
            }
          }}
          onPointerCancel={() => {
            dragStart.current = null;
            setDrag(0);
          }}
          style={drag ? { transform: `translateY(${drag * 0.6}px)`, opacity: Math.max(0.35, 1 + drag / 500), transition: 'none' } : undefined}
        >
          <div className="v5-lock-wall">
            <WallImage id={lockWallFor(settings, 'mac')} live />
          </div>
          <div className="v5-lock-shade" />
          <div className="v5-lock-top">
            <div className="v5-lock-date" style={{ color: clockStyle.color }}>{date}</div>
            <div className="v5-lock-time" style={clockStyle}>{time}</div>
            {loggedOut && <div className="v5-lock-badge">Logged out</div>}
            {lockReason === 'login' && <div className="v5-lock-welcome">Welcome to {personal.name}’s portfolio</div>}
          </div>
          <div className="v5-lock-bottom">
            {settings.lockMessage && <p className="v5-lock-msg">{settings.lockMessage}</p>}
            {settings.userPicker && (lockReason === 'login' || loggedOut) ? (
              <div className="lock10-users" role="radiogroup" aria-label="Choose a user" onClick={(e) => e.stopPropagation()}>
                {(
                  [
                    ['owner', personal.name, personal.avatar],
                    ['recruiter', 'Recruiter', ''],
                    ['guest', 'Guest', ''],
                  ] as const
                ).map(([id, name, img]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    className="lock10-user"
                    onClick={() => {
                      try {
                        sessionStorage.setItem('mra-visitor-role', id);
                      } catch {
                        /* ignore */
                      }
                      if (id === 'recruiter') window.setTimeout(() => window.dispatchEvent(new Event('mra-recruiter-start')), 900);
                      shownAt.current = 0;
                      doUnlock();
                    }}
                  >
                    {img ? <img src={img} alt="" draggable={false} /> : <span className="lock10-ph">
                        <SysIcon n={id === 'recruiter' ? 'briefcase' : 'person'} size={34} />
                      </span>}
                    <b>{name}</b>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <img className="v5-lock-avatar" src={personal.avatar} alt="" draggable={false} />
                <div className="v5-lock-name">{personal.name}</div>
              </>
            )}
            <button
              ref={btnRef}
              type="button"
              className="v5-lock-btn"
              onClick={(e) => {
                e.stopPropagation();
                doUnlock();
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 7V5.2a4 4 0 0 1 7.6-1.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="2.5" y="7" width="11" height="7.5" rx="2" />
              </svg>
              {loggedOut ? 'Click or press Enter to log in' : t('swipeUp')}
            </button>
          </div>
          <div className="lock8-power" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => sys.sleep()} aria-label="Sleep">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.7A7.2 7.2 0 0 1 15.5 3.5Z" />
              </svg>
              <span>Sleep</span>
            </button>
            <button type="button" onClick={() => sys.restart()} aria-label="Restart">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12a7 7 0 1 1-2.1-5M19 3.8V8h-4.2" />
              </svg>
              <span>Restart</span>
            </button>
            <button type="button" onClick={() => sys.shutdown()} aria-label="Shut Down">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v8M6.4 6.6a8 8 0 1 0 11.2 0" />
              </svg>
              <span>Shut Down</span>
            </button>
          </div>
          <div className="v5-lock-swipe" aria-hidden="true">
            <span />
          </div>
        </div>
      )}
      {asleep && <div className="v5-sleep" aria-label="Display is asleep — press any key to wake" role="status" />}
    </>
  );
}

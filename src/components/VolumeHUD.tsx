import { useEffect, useRef, useState } from 'react';
import { useMusic } from '../system/MusicContext';
import { SysIcon } from './SysIcons';
import { getFlag } from '../system/prefs';
import { playTick } from '../system/sounds';

/** v10 — the volume pop-up: a slim pill by the side buttons on iPhone / iPad, a small panel at the top right on the Mac. */
export function VolumeHUD({ variant }: { variant: 'ios' | 'mac' }) {
  const music = useMusic();
  const level = music.muted ? 0 : music.volume;
  const [show, setShow] = useState(false);
  const first = useRef(true);
  const prev = useRef(level);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      prev.current = level;
      return;
    }
    if (Math.abs(prev.current - level) < 0.001) return;
    prev.current = level;
    // v10.3 — Settings → Sound → "Play feedback when volume is changed"
    if (variant === 'mac' && level > 0 && getFlag('vol-feedback', false)) playTick(Math.min(0.6, 0.15 + level * 0.4));
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 1400);
    return () => window.clearTimeout(t);
  }, [level]);
  if (!show) return null;
  const icon = <SysIcon n={level === 0 ? 'mute' : level < 0.34 ? 'speaker0' : level < 0.67 ? 'speaker1' : 'speaker'} size={variant === 'ios' ? 20 : 18} />;
  return (
    <div className={`vol-hud vol-${variant}`} role="status" aria-label={`Volume ${Math.round(level * 100)}%`}>
      <span className="vol-track">
        <i style={variant === 'ios' ? { height: `${level * 100}%` } : { width: `${level * 100}%` }} />
      </span>
      <span className="vol-ico">{icon}</span>
    </div>
  );
}

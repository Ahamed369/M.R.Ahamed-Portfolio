import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMusic } from '../system/MusicContext';
import { SysIcon } from './SysIcons';

export const MUSIC_PIP = 'mra-music-pip';
export const openMusicPiP = () => window.dispatchEvent(new Event(MUSIC_PIP));

type DPiP = { requestWindow: (o: { width: number; height: number }) => Promise<Window> };
const dpip = (): DPiP | null => (window as unknown as { documentPictureInPicture?: DPiP }).documentPictureInPicture ?? null;

const CSS = `
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#1c1c1e;color:#fff;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}
.mp{display:flex;align-items:center;gap:12px;height:100%;padding:12px}
.mp-art{flex:none;width:72px;height:72px;border-radius:10px;display:grid;place-items:center;font-size:28px;box-shadow:0 6px 16px rgba(0,0,0,.4)}
.mp-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.mp-meta b,.mp-meta small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mp-meta small{opacity:.65}
.mp-prog{height:4px;border-radius:2px;background:rgba(255,255,255,.2);margin-top:6px;overflow:hidden}.mp-prog i{display:block;height:100%;background:#fff}
.mp-ctl{display:flex;gap:4px;margin-top:6px}
.mp-ctl button{width:34px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:14px;cursor:pointer}
.mp-ctl button:hover{background:rgba(255,255,255,.22)}
`;

function Body({ inApp, onClose }: { inApp?: boolean; onClose: () => void }) {
  const m = useMusic();
  return (
    <div className="mp">
      <span className="mp-art" style={{ background: `linear-gradient(135deg, ${m.track.art[0]}, ${m.track.art[1]})` }}>
        <SysIcon n="music" size={20} />
      </span>
      <div className="mp-meta">
        <b>{m.track.title}</b>
        <small>{m.track.artist}</small>
        <span className="mp-prog">
          <i style={{ width: `${m.duration ? (m.currentTime / m.duration) * 100 : 0}%` }} />
        </span>
        <span className="mp-ctl">
          <button type="button" aria-label="Previous" onClick={m.prev}>
            <SysIcon n="prev" size={18} />
          </button>
          <button type="button" aria-label={m.playing ? 'Pause' : 'Play'} onClick={m.toggle}>
            <SysIcon n={m.playing ? 'pause' : 'play'} size={20} />
          </button>
          <button type="button" aria-label="Next" onClick={m.next}>
            <SysIcon n="next" size={18} />
          </button>
          {inApp && (
            <button type="button" aria-label="Close mini player" onClick={onClose}>
              ✕
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * v10.1 — Picture in Picture for Music. Uses the browser's Document
 * Picture-in-Picture window when available (a real floating window that
 * stays on top of other apps); otherwise a small floating player inside the
 * portfolio that can be dragged anywhere.
 */
export function MusicPiP() {
  const [win, setWin] = useState<Window | null>(null);
  const [float, setFloat] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  useEffect(() => {
    const on = async () => {
      if (win) return win.close();
      if (float) return setFloat(false);
      const api = dpip();
      if (api) {
        try {
          const w = await api.requestWindow({ width: 340, height: 110 });
          const st = w.document.createElement('style');
          st.textContent = CSS;
          w.document.head.appendChild(st);
          w.document.title = 'Music';
          w.addEventListener('pagehide', () => setWin(null));
          setWin(w);
          return;
        } catch {
          /* fall back to the in-app player */
        }
      }
      setPos({ x: Math.max(8, window.innerWidth - 356), y: Math.max(8, window.innerHeight - 220) });
      setFloat(true);
    };
    const h = () => void on();
    window.addEventListener(MUSIC_PIP, h);
    return () => window.removeEventListener(MUSIC_PIP, h);
  }, [win, float]);
  useEffect(() => () => win?.close(), [win]);
  if (win) return createPortal(<Body onClose={() => win.close()} />, win.document.body);
  if (!float) return null;
  return (
    <div
      className="mp-float"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label="Music — Picture in Picture"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d) setPos({ x: Math.max(0, Math.min(window.innerWidth - 120, d.ox + e.clientX - d.x)), y: Math.max(0, Math.min(window.innerHeight - 60, d.oy + e.clientY - d.y)) });
      }}
      onPointerUp={() => (drag.current = null)}
    >
      <style>{CSS.replace(/html,body\{[^}]*\}/, '').replace(/\*\{box-sizing:border-box\}/, '')}</style>
      <Body inApp onClose={() => setFloat(false)} />
    </div>
  );
}

import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { usePersisted, uid } from '../system/useStore';
import type { AppProps } from '../components/Desktop';

/** v9 — Stickies: coloured notes you can drag, resize, recolour and delete (saved in this browser). */
interface Sticky {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}
const COLORS = ['#fff59d', '#b9f6ca', '#ffccbc', '#b3e5fc', '#e1bee7', '#f5f5f5'];
const SEED: Sticky[] = [
  { id: 's1', text: 'Welcome to Stickies!\n\nDrag a note by its top bar, resize from the corner, and pick a colour.', color: '#fff59d', x: 24, y: 20, w: 230, h: 180, z: 2 },
  { id: 's2', text: 'Ideas:\n• Explore My Services\n• Check the Case Studies\n• Say hi on WhatsApp', color: '#b9f6ca', x: 280, y: 60, w: 220, h: 170, z: 1 },
];

export default function StickiesApp(_: AppProps) {
  const [notes, setNotes] = usePersisted<Sticky[]>('mra-stickies-v9', SEED);
  const [active, setActive] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const topZ = Math.max(0, ...notes.map((n) => n.z));
  const upd = (id: string, p: Partial<Sticky>) => setNotes((l) => l.map((n) => (n.id === id ? { ...n, ...p } : n)));
  const add = () => {
    const n: Sticky = { id: uid('st'), text: '', color: COLORS[notes.length % COLORS.length], x: 30 + (notes.length % 5) * 24, y: 30 + (notes.length % 5) * 20, w: 220, h: 170, z: topZ + 1 };
    setNotes((l) => [...l, n]);
    setActive(n.id);
  };
  const drag = (e: RPointerEvent, n: Sticky, mode: 'move' | 'size') => {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { x: n.x, y: n.y, w: n.w, h: n.h };
    upd(n.id, { z: topZ + 1 });
    setActive(n.id);
    const box = area.current?.getBoundingClientRect();
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (mode === 'move') upd(n.id, { x: Math.max(0, Math.min((box?.width ?? 800) - 60, o.x + dx)), y: Math.max(0, Math.min((box?.height ?? 600) - 30, o.y + dy)) });
      else upd(n.id, { w: Math.max(150, o.w + dx), h: Math.max(110, o.h + dy) });
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="stk">
      <div className="stk-bar">
        <button type="button" className="stk-btn" onClick={add}>
          ＋ New Note
        </button>
        <span>
          {notes.length} note{notes.length === 1 ? '' : 's'} · saved in this browser
        </span>
      </div>
      <div className="stk-area" ref={area}>
        {notes.map((n) => (
          <div key={n.id} className={`stk-note ${active === n.id ? 'on' : ''}`} style={{ left: n.x, top: n.y, width: n.w, height: n.h, zIndex: n.z, background: n.color }} onPointerDown={() => setActive(n.id)}>
            <div className="stk-top" onPointerDown={(e) => drag(e, n, 'move')}>
              <button type="button" className="stk-x" aria-label="Delete note" onPointerDown={(e) => e.stopPropagation()} onClick={() => setNotes((l) => l.filter((x) => x.id !== n.id))}>
                ×
              </button>
              <span className="stk-colors">
                {COLORS.map((c) => (
                  <button key={c} type="button" aria-label="Note colour" style={{ background: c }} className={c === n.color ? 'on' : ''} onPointerDown={(e) => e.stopPropagation()} onClick={() => upd(n.id, { color: c })} />
                ))}
              </span>
            </div>
            <textarea value={n.text} autoFocus={active === n.id && !n.text} onChange={(e) => upd(n.id, { text: e.target.value })} placeholder="Type a note…" aria-label="Sticky note" />
            <span className="stk-grip" onPointerDown={(e) => drag(e, n, 'size')} aria-hidden="true" />
          </div>
        ))}
        {!notes.length && <p className="stk-empty">No notes — click “New Note”.</p>}
      </div>
    </div>
  );
}

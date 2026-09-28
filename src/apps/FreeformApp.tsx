import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { projects } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';

type Tool = 'select' | 'pen' | 'marker' | 'eraser' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'sticky' | 'text';
type Item =
  | { id: string; t: 'path'; pts: [number, number][]; c: string; w: number; hl?: boolean }
  | { id: string; t: 'rect' | 'ellipse' | 'line' | 'arrow'; x1: number; y1: number; x2: number; y2: number; c: string; w: number }
  | { id: string; t: 'sticky'; x: number; y: number; text: string; c: string }
  | { id: string; t: 'text'; x: number; y: number; text: string; c: string };

const KEY = 'mra-freeform-v1';
const COLORS = ['#1d1d1f', '#0a84ff', '#ff3b30', '#34c759', '#ff9f0a', '#af52de'];
const STICKY = ['#ffe26a', '#ffb3c7', '#a8e6ff', '#b8f2b0'];
const uid = () => Math.random().toString(36).slice(2, 9);

/** Starter board: the portfolio's projects arranged as sticky notes (the visitor can clear it). */
function sample(): Item[] {
  const items: Item[] = [{ id: uid(), t: 'text', x: 60, y: 60, text: 'M.R. Ahamed — project map', c: '#1d1d1f' }];
  projects.slice(0, 6).forEach((p, i) => {
    const x = 60 + (i % 3) * 230;
    const y = 110 + Math.floor(i / 3) * 190;
    items.push({ id: uid(), t: 'sticky', x, y, text: `${p.name}\n${Object.values(p.stack).flat().slice(0, 3).join(' · ')}`, c: STICKY[i % STICKY.length] });
  });
  items.push({ id: uid(), t: 'arrow', x1: 250, y1: 190, x2: 285, y2: 190, c: '#8e8e93', w: 3 });
  items.push({ id: uid(), t: 'arrow', x1: 480, y1: 190, x2: 515, y2: 190, c: '#8e8e93', w: 3 });
  return items;
}

function bbox(it: Item): [number, number, number, number] {
  if (it.t === 'path') {
    const xs = it.pts.map((p) => p[0]);
    const ys = it.pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  if (it.t === 'sticky') return [it.x, it.y, it.x + 180, it.y + 140];
  if (it.t === 'text') return [it.x, it.y - 22, it.x + it.text.length * 11, it.y + 6];
  return [Math.min(it.x1, it.x2), Math.min(it.y1, it.y2), Math.max(it.x1, it.x2), Math.max(it.y1, it.y2)];
}
function move(it: Item, dx: number, dy: number): Item {
  if (it.t === 'path') return { ...it, pts: it.pts.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
  if (it.t === 'sticky' || it.t === 'text') return { ...it, x: it.x + dx, y: it.y + dy };
  return { ...it, x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy };
}

export default function FreeformApp() {
  const [items, setItems] = useState<Item[]>(() => readStore(KEY, { items: null as Item[] | null }).items ?? sample());
  const [undo, setUndo] = useState<Item[][]>([]);
  const [redo, setRedo] = useState<Item[][]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ kind: 'draw' | 'move' | 'pan'; id?: string; sx: number; sy: number; vx?: number; vy?: number; before: Item[] } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => writeStore(KEY, { items }), 400);
    return () => window.clearTimeout(t);
  }, [items]);

  const commit = (before: Item[]) => {
    setUndo((u) => [...u.slice(-50), before]);
    setRedo([]);
  };
  const pt = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / view.z + view.x, (e.clientY - r.top) / view.z + view.y];
  };

  const hit = (x: number, y: number) =>
    [...items].reverse().find((it) => {
      const [a, b, c, d] = bbox(it);
      return x >= a - 6 && x <= c + 6 && y >= b - 6 && y <= d + 6;
    });

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (edit) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const [x, y] = pt(e);
    if (e.button === 1 || (tool === 'select' && !hit(x, y))) {
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, before: items };
      setSel(null);
      return;
    }
    if (tool === 'select') {
      const h = hit(x, y)!;
      setSel(h.id);
      drag.current = { kind: 'move', id: h.id, sx: x, sy: y, before: items };
      return;
    }
    if (tool === 'eraser') {
      const h = hit(x, y);
      if (h) {
        commit(items);
        setItems((l) => l.filter((i) => i.id !== h.id));
      }
      drag.current = { kind: 'draw', sx: x, sy: y, before: items };
      return;
    }
    const id = uid();
    let it: Item;
    if (tool === 'pen' || tool === 'marker') it = { id, t: 'path', pts: [[x, y]], c: color, w: tool === 'marker' ? 16 : width, hl: tool === 'marker' };
    else if (tool === 'sticky') it = { id, t: 'sticky', x: x - 90, y: y - 70, text: 'New note', c: STICKY[items.filter((i) => i.t === 'sticky').length % STICKY.length] };
    else if (tool === 'text') it = { id, t: 'text', x, y, text: 'Text', c: color };
    else it = { id, t: tool, x1: x, y1: y, x2: x, y2: y, c: color, w: width };
    commit(items);
    setItems((l) => [...l, it]);
    if (tool === 'sticky' || tool === 'text') {
      setSel(id);
      setEdit(id);
      setTool('select');
    } else drag.current = { kind: 'draw', id, sx: x, sy: y, before: items };
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      setView((v) => ({ ...v, x: d.vx! - (e.clientX - d.sx) / v.z, y: d.vy! - (e.clientY - d.sy) / v.z }));
      return;
    }
    const [x, y] = pt(e);
    if (d.kind === 'move' && d.id) {
      const dx = x - d.sx;
      const dy = y - d.sy;
      d.sx = x;
      d.sy = y;
      setItems((l) => l.map((i) => (i.id === d.id ? move(i, dx, dy) : i)));
      return;
    }
    if (tool === 'eraser') {
      const h = hit(x, y);
      if (h) setItems((l) => l.filter((i) => i.id !== h.id));
      return;
    }
    setItems((l) =>
      l.map((i) => {
        if (i.id !== d.id) return i;
        if (i.t === 'path') return { ...i, pts: [...i.pts, [x, y] as [number, number]] };
        if (i.t === 'rect' || i.t === 'ellipse' || i.t === 'line' || i.t === 'arrow') return { ...i, x2: x, y2: y };
        return i;
      }),
    );
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'move' && d.before !== items) commit(d.before);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (edit || !svgRef.current?.closest('.ff')?.contains(document.activeElement ?? null)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        commit(items);
        setItems((l) => l.filter((i) => i.id !== sel));
        setSel(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const doUndo = () => {
    const prev = undo[undo.length - 1];
    if (!prev) return;
    setRedo((r) => [...r, items]);
    setUndo((u) => u.slice(0, -1));
    setItems(prev);
  };
  const doRedo = () => {
    const next = redo[redo.length - 1];
    if (!next) return;
    setUndo((u) => [...u, items]);
    setRedo((r) => r.slice(0, -1));
    setItems(next);
  };

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    clone.setAttribute('width', String(r.width * 2));
    clone.setAttribute('height', String(r.height * 2));
    clone.querySelectorAll('.ff-sel').forEach((n) => n.remove());
    const data = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = r.width * 2;
      c.height = r.height * 2;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fbfbfd';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'Freeform Board.png';
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        notify({ app: 'Freeform', icon: 'freeform', title: 'Board exported', body: 'Freeform Board.png saved to your Downloads.' });
      });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
  };

  const zoom = (f: number) => setView((v) => ({ ...v, z: Math.max(0.3, Math.min(3, v.z * f)) }));
  const editing = items.find((i) => i.id === edit) as Extract<Item, { t: 'sticky' | 'text' }> | undefined;
  const selBox = sel ? items.find((i) => i.id === sel) : undefined;

  const TOOLS: [Tool, string, string][] = [
    ['select', '↖', 'Select & move'],
    ['pen', '✎', 'Pen'],
    ['marker', '▮', 'Highlighter'],
    ['eraser', '⌫', 'Eraser'],
    ['rect', '▭', 'Rectangle'],
    ['ellipse', '◯', 'Ellipse'],
    ['line', '╱', 'Line'],
    ['arrow', '→', 'Arrow'],
    ['sticky', '🗒', 'Sticky note'],
    ['text', 'T', 'Text'],
  ];

  return (
    <div className="ff" tabIndex={-1}>
      <div className="ff-bar">
        <div className="ff-group">
          {TOOLS.map(([t, g, l]) => (
            <button key={t} type="button" className={tool === t ? 'on' : ''} onClick={() => setTool(t)} title={l} aria-label={l} aria-pressed={tool === t}>
              {g}
            </button>
          ))}
        </div>
        <div className="ff-group">
          {COLORS.map((c) => (
            <button key={c} type="button" className={`ff-color ${color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Colour ${c}`} />
          ))}
          <input type="range" min={1} max={12} value={width} onChange={(e) => setWidth(+e.target.value)} aria-label="Stroke width" />
        </div>
        <div className="ff-group">
          <button type="button" onClick={doUndo} disabled={!undo.length} aria-label="Undo" title="Undo (⌘Z)">
            ↶
          </button>
          <button type="button" onClick={doRedo} disabled={!redo.length} aria-label="Redo" title="Redo (⇧⌘Z)">
            ↷
          </button>
          <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">
            −
          </button>
          <span className="ff-z">{Math.round(view.z * 100)}%</span>
          <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={exportPng} title="Export PNG">
            ⤓
          </button>
          <button
            type="button"
            onClick={() => {
              commit(items);
              setItems([]);
              setSel(null);
            }}
            title="Clear board"
          >
            🗑
          </button>
        </div>
      </div>
      <div className="ff-stage">
        <svg
          ref={svgRef}
          className={`ff-svg tool-${tool}`}
          viewBox={`${view.x} ${view.y} ${(svgRef.current?.clientWidth ?? 800) / view.z} ${(svgRef.current?.clientHeight ?? 600) / view.z}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={(e) => (e.ctrlKey || e.metaKey ? zoom(e.deltaY < 0 ? 1.08 : 0.92) : setView((v) => ({ ...v, x: v.x + e.deltaX / v.z, y: v.y + e.deltaY / v.z })))}
          onDoubleClick={(e) => {
            const h = hit(...pt(e));
            if (h && (h.t === 'sticky' || h.t === 'text')) setEdit(h.id);
          }}
        >
          <defs>
            <pattern id="ff-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#c7c7cc" />
            </pattern>
            <marker id="ff-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="context-stroke" />
            </marker>
          </defs>
          <rect x={view.x - 5000} y={view.y - 5000} width="12000" height="12000" fill="url(#ff-dots)" />
          {items.map((it) => {
            if (it.t === 'path')
              return (
                <polyline
                  key={it.id}
                  points={it.pts.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke={it.c}
                  strokeWidth={it.w}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={it.hl ? 0.35 : 1}
                />
              );
            if (it.t === 'rect') return <rect key={it.id} x={Math.min(it.x1, it.x2)} y={Math.min(it.y1, it.y2)} width={Math.abs(it.x2 - it.x1)} height={Math.abs(it.y2 - it.y1)} rx="8" fill="none" stroke={it.c} strokeWidth={it.w} />;
            if (it.t === 'ellipse') return <ellipse key={it.id} cx={(it.x1 + it.x2) / 2} cy={(it.y1 + it.y2) / 2} rx={Math.abs(it.x2 - it.x1) / 2} ry={Math.abs(it.y2 - it.y1) / 2} fill="none" stroke={it.c} strokeWidth={it.w} />;
            if (it.t === 'line' || it.t === 'arrow')
              return <line key={it.id} x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} stroke={it.c} strokeWidth={it.w} strokeLinecap="round" markerEnd={it.t === 'arrow' ? 'url(#ff-arrow)' : undefined} />;
            if (it.t === 'sticky')
              return (
                <g key={it.id} className="ff-sticky">
                  <rect x={it.x} y={it.y} width="180" height="140" rx="6" fill={it.c} />
                  {it.text.split('\n').map((l, i) => (
                    <text key={i} x={it.x + 12} y={it.y + 26 + i * 20} fontSize={i === 0 ? 15 : 12} fontWeight={i === 0 ? 700 : 400} fill="#1d1d1f" fontFamily="-apple-system, Segoe UI, sans-serif">
                      {l.length > 24 ? l.slice(0, 23) + '…' : l}
                    </text>
                  ))}
                </g>
              );
            if (it.t !== 'text') return null;
            return (
              <text key={it.id} x={it.x} y={it.y} fontSize="22" fontWeight="700" fill={it.c} fontFamily="-apple-system, Segoe UI, sans-serif">
                {it.text}
              </text>
            );
          })}
          {selBox &&
            (() => {
              const [a, b, c, d] = bbox(selBox);
              return <rect className="ff-sel" x={a - 6} y={b - 6} width={c - a + 12} height={d - b + 12} fill="none" stroke="#0a84ff" strokeWidth={1.5 / view.z} strokeDasharray="6 4" rx="4" />;
            })()}
        </svg>
        {editing && (
          <textarea
            className="ff-edit"
            autoFocus
            defaultValue={editing.text}
            style={{
              left: (editing.x - view.x) * view.z,
              top: (editing.y - view.y - (editing.t === 'text' ? 26 : 0)) * view.z,
              width: (editing.t === 'sticky' ? 180 : 260) * view.z,
              height: (editing.t === 'sticky' ? 140 : 40) * view.z,
              background: editing.t === 'sticky' ? editing.c : 'var(--win-solid)',
            }}
            onBlur={(e) => {
              const text = e.target.value.trim() || (editing.t === 'text' ? 'Text' : 'Note');
              setItems((l) => l.map((i) => (i.id === editing.id ? ({ ...i, text } as Item) : i)));
              setEdit(null);
            }}
            onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget as HTMLTextAreaElement).blur()}
          />
        )}
        <p className="ff-hint">Double-click a note to edit · drag the canvas with Select to pan · ⌘/Ctrl + scroll to zoom</p>
      </div>
    </div>
  );
}

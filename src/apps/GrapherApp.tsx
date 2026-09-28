import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import type { AppProps } from '../components/Desktop';
import { usePersisted } from '../system/useStore';

/**
 * v9 — Grapher: plot y = f(x). A small safe parser (no eval) supports
 * + − × ÷ ^, parentheses, x, pi, e and sin cos tan asin acos atan sqrt abs ln log exp floor ceil.
 * Drag to pan, scroll / pinch to zoom.
 */
type Fn = (x: number) => number;
const FUNCS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
};

export function compile(src: string): Fn | null {
  const s = src.toLowerCase().replace(/\s+/g, '').replace(/^y=/, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');
  if (!s) return null;
  let i = 0;
  type Node = (x: number) => number;
  const peek = () => s[i];
  const atom = (): Node => {
    if (peek() === '(') {
      i++;
      const n = expr();
      if (peek() !== ')') throw new Error(')');
      i++;
      return n;
    }
    if (peek() === '-') {
      i++;
      const n = pow();
      return (x) => -n(x);
    }
    const num = /^\d*\.?\d+/.exec(s.slice(i));
    if (num) {
      i += num[0].length;
      const v = parseFloat(num[0]);
      return () => v;
    }
    const id = /^[a-z]+/.exec(s.slice(i));
    if (id) {
      const w = id[0];
      i += w.length;
      if (w === 'x') return (x) => x;
      if (w === 'pi') return () => Math.PI;
      if (w === 'e') return () => Math.E;
      const f = FUNCS[w];
      if (f) {
        const arg = atom();
        return (x) => f(arg(x));
      }
      throw new Error(`unknown ${w}`);
    }
    throw new Error('syntax');
  };
  // implicit multiplication: 2x, 3sin(x), (x+1)(x-1)
  const implicit = (): Node => {
    let n = atom();
    while (i < s.length && /[\d.a-z(]/.test(peek())) {
      const l = n;
      const r = atom();
      n = (x) => l(x) * r(x);
    }
    return n;
  };
  function pow(): Node {
    const b = implicit();
    if (peek() === '^') {
      i++;
      const e = pow();
      return (x) => Math.pow(b(x), e(x));
    }
    return b;
  }
  const term = (): Node => {
    let n = pow();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const l = n;
      const r = pow();
      n = op === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
    }
    return n;
  };
  function expr(): Node {
    let n = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const l = n;
      const r = term();
      n = op === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return n;
  }
  try {
    const n = expr();
    if (i !== s.length) return null;
    n(1);
    return n;
  } catch {
    return null;
  }
}

const COLORS = ['#0a84ff', '#ff453a', '#30d158', '#ff9f0a', '#bf5af2'];

export default function GrapherApp(_: AppProps) {
  const [eqs, setEqs] = usePersisted<string[]>('mra-grapher-v9', ['sin(x)', 'x^2/4', '']);
  const [view, setView] = useState({ cx: 0, cy: 0, scale: 40 }); // px per unit
  const cv = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const fns = useMemo(() => eqs.map((e) => (e.trim() ? compile(e) : null)), [eqs]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dark = document.documentElement.dataset.theme === 'dark';
    g.fillStyle = dark ? '#1c1c1f' : '#ffffff';
    g.fillRect(0, 0, size.w, size.h);
    const sx = (x: number) => size.w / 2 + (x - view.cx) * view.scale;
    const sy = (y: number) => size.h / 2 - (y - view.cy) * view.scale;
    const x0 = view.cx - size.w / 2 / view.scale;
    const x1 = view.cx + size.w / 2 / view.scale;
    const y0 = view.cy - size.h / 2 / view.scale;
    const y1 = view.cy + size.h / 2 / view.scale;
    // grid step: 1, 2, 5 × 10^n so lines are ~50 px apart
    const raw = 50 / view.scale;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * p).find((v) => v >= raw) ?? raw;
    g.lineWidth = 1;
    g.strokeStyle = dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)';
    g.font = '10px -apple-system, system-ui, sans-serif';
    g.fillStyle = dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.45)';
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
      g.beginPath();
      g.moveTo(sx(x), 0);
      g.lineTo(sx(x), size.h);
      g.stroke();
      if (Math.abs(x) > step / 2) g.fillText(String(+x.toFixed(6)), sx(x) + 3, Math.min(size.h - 4, Math.max(12, sy(0) + 12)));
    }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      g.beginPath();
      g.moveTo(0, sy(y));
      g.lineTo(size.w, sy(y));
      g.stroke();
      if (Math.abs(y) > step / 2) g.fillText(String(+y.toFixed(6)), Math.min(size.w - 30, Math.max(3, sx(0) + 4)), sy(y) - 3);
    }
    g.strokeStyle = dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.5)';
    g.beginPath();
    g.moveTo(0, sy(0));
    g.lineTo(size.w, sy(0));
    g.moveTo(sx(0), 0);
    g.lineTo(sx(0), size.h);
    g.stroke();
    fns.forEach((f, k) => {
      if (!f) return;
      g.strokeStyle = COLORS[k % COLORS.length];
      g.lineWidth = 2.2;
      g.beginPath();
      let pen = false;
      let prev = 0;
      for (let px = 0; px <= size.w; px += 1) {
        const x = x0 + px / view.scale;
        const y = f(x);
        const py = sy(y);
        if (!Number.isFinite(y) || (pen && Math.abs(py - prev) > size.h * 2)) {
          pen = false;
          continue;
        }
        if (pen) g.lineTo(px, py);
        else g.moveTo(px, py);
        pen = true;
        prev = py;
      }
      g.stroke();
    });
  }, [fns, view, size]);

  const drag = (e: RPointerEvent) => {
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { ...view };
    const mv = (ev: PointerEvent) => setView({ ...o, cx: o.cx - (ev.clientX - sx) / o.scale, cy: o.cy + (ev.clientY - sy) / o.scale });
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const zoom = (k: number) => setView((v) => ({ ...v, scale: Math.max(2, Math.min(4000, v.scale * k)) }));
  const onWheel = (e: RWheelEvent) => zoom(e.deltaY > 0 ? 0.9 : 1.1);

  return (
    <div className="gr">
      <aside className="gr-side">
        <h5>Equations</h5>
        {eqs.map((q, k) => (
          <label key={k} className={`gr-eq ${q.trim() && !fns[k] ? 'bad' : ''}`}>
            <i style={{ background: COLORS[k % COLORS.length] }} />
            <span>y =</span>
            <input value={q} onChange={(e) => setEqs((l) => l.map((x, j) => (j === k ? e.target.value : x)))} placeholder="e.g. cos(x)*x" aria-label={`Equation ${k + 1}`} />
            <button type="button" aria-label="Remove" onClick={() => setEqs((l) => (l.length > 1 ? l.filter((_, j) => j !== k) : ['']))}>
              ×
            </button>
          </label>
        ))}
        {eqs.length < 5 && (
          <button type="button" className="gr-add" onClick={() => setEqs((l) => [...l, ''])}>
            ＋ Add Equation
          </button>
        )}
        <div className="gr-ex">
          {['x^3-3x', 'sqrt(abs(x))', '2sin(x)cos(x)', '1/x', 'exp(-x^2)'].map((x) => (
            <button key={x} type="button" onClick={() => setEqs((l) => [...l.filter((v) => v.trim()), x].slice(-5))}>
              {x}
            </button>
          ))}
        </div>
        <p className="gr-help">Functions: sin cos tan sqrt abs ln log exp · constants pi, e · drag to pan, scroll to zoom.</p>
      </aside>
      <div className="gr-canvas" ref={wrap} onPointerDown={drag} onWheel={onWheel} onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHover({ x: view.cx + (e.clientX - r.left - size.w / 2) / view.scale, y: view.cy - (e.clientY - r.top - size.h / 2) / view.scale });
      }} onPointerLeave={() => setHover(null)}>
        <canvas ref={cv} style={{ width: size.w, height: size.h }} />
        <div className="gr-zoom">
          <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">
            ＋
          </button>
          <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => setView({ cx: 0, cy: 0, scale: 40 })} aria-label="Reset view">
            ⌂
          </button>
        </div>
        {hover && (
          <span className="gr-coord">
            x {hover.x.toFixed(2)} · y {hover.y.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

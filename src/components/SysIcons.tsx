/**
 * v10.3 — the shared system glyph set (original artwork, 24 × 24 grid).
 *
 * Every glyph is a solid, filled shape (or a heavy round-capped stroke where a
 * line reads better), drawn for one consistent optical weight. Cut-outs (a
 * camera lens, the gap behind a slash…) are real holes made with a per-icon
 * mask, so glyphs sit cleanly on any background — glass, colour or wallpaper.
 *
 *   <SysIcon n="wifi" size={22} />          — mono, uses currentColor
 *   <WxIcon kind="pcDay" size={28} />        — multicolour weather glyph
 *   <WxIcon kind="rain" mono />              — the same weather glyph in currentColor
 *   wxKind(code, isDay)                      — WMO weather code → WxKind
 */
import { useId, type ReactNode } from 'react';

/* ───────────────────────── geometry helpers ───────────────────────── */

const r2 = (v: number) => Math.round(v * 100) / 100;
/** point on a circle — angle in degrees, 0 = 12 o'clock, clockwise */
const pt = (cx: number, cy: number, r: number, a: number) => {
  const t = (a * Math.PI) / 180;
  return [r2(cx + r * Math.sin(t)), r2(cy - r * Math.cos(t))] as const;
};
/** open arc from a0 to a1 (clockwise) */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
/** pie sector */
const sector = (cx: number, cy: number, r: number, a0: number, a1: number) => `M${cx} ${cy}L${arc(cx, cy, r, a0, a1).slice(1)}Z`;
/** n rays around a centre */
const rays = (cx: number, cy: number, r0: number, r1: number, n = 8, off = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = off + (i * 360) / n;
    const [x0, y0] = pt(cx, cy, r0, a);
    const [x1, y1] = pt(cx, cy, r1, a);
    return `M${x0} ${y0}L${x1} ${y1}`;
  }).join('');
/** crescent: circle (cx,cy,r) minus circle (ox,oy,or) */
const crescent = (cx: number, cy: number, r: number, ox: number, oy: number, or: number) => {
  const dx = ox - cx;
  const dy = oy - cy;
  const d = Math.hypot(dx, dy);
  const a = (r * r - or * or + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r * r - a * a));
  const mx = cx + (a * dx) / d;
  const my = cy + (a * dy) / d;
  const p1 = [r2(mx + (h * dy) / d), r2(my - (h * dx) / d)];
  const p2 = [r2(mx - (h * dy) / d), r2(my + (h * dx) / d)];
  return `M${p1[0]} ${p1[1]}A${r} ${r} 0 1 0 ${p2[0]} ${p2[1]}A${or} ${or} 0 0 1 ${p1[0]} ${p1[1]}Z`;
};
/** arrow head at the clockwise end of an arc */
const arrowHead = (cx: number, cy: number, r: number, a: number, len: number, w: number) => {
  const t = (a * Math.PI) / 180;
  const [px, py] = pt(cx, cy, r, a);
  const tx = Math.cos(t);
  const ty = Math.sin(t);
  const nx = Math.sin(t);
  const ny = -Math.cos(t);
  return `M${r2(px + tx * len)} ${r2(py + ty * len)}L${r2(px + nx * w - tx * 0.4)} ${r2(py + ny * w - ty * 0.4)}L${r2(px - nx * w - tx * 0.4)} ${r2(py - ny * w - ty * 0.4)}Z`;
};
const star = (cx: number, cy: number, ro: number, ri: number) =>
  'M' +
  Array.from({ length: 10 }, (_, i) => {
    const [x, y] = pt(cx, cy, i % 2 ? ri : ro, i * 36);
    return `${x} ${y}`;
  }).join('L') +
  'Z';
const gearPath = (() => {
  const c = 12;
  const ro = 9.6;
  const ri = 7.3;
  let d = '';
  for (let i = 0; i < 8; i++) {
    const th = i * 45;
    const a = pt(c, c, ri, th - 15);
    const b = pt(c, c, ro, th - 8.5);
    const e = pt(c, c, ro, th + 8.5);
    const f = pt(c, c, ri, th + 15);
    const g = pt(c, c, ri, th + 30);
    d += `${i ? 'L' : 'M'}${a[0]} ${a[1]}L${b[0]} ${b[1]}L${e[0]} ${e[1]}L${f[0]} ${f[1]}A${ri} ${ri} 0 0 1 ${g[0]} ${g[1]}`;
  }
  return d + 'Z';
})();

/** stroked path (inherits stroke colour — currentColor, or black inside a mask) */
const L = (d: string, w = 2.2, k?: string | number) => <path key={k ?? d} d={d} fill="none" strokeWidth={w} />;
/** filled path with softly rounded corners */
const F = (d: string, round = 0.9, k?: string | number) => <path key={k ?? d} d={d} strokeWidth={round} />;
const C = (cx: number, cy: number, r: number, k?: string | number) => <circle key={k ?? `${cx}-${cy}-${r}`} cx={cx} cy={cy} r={r} strokeWidth={0} />;
const R = (x: number, y: number, w: number, h: number, rx: number, k?: string | number) => <rect key={k ?? `${x}-${y}-${w}-${h}`} x={x} y={y} width={w} height={h} rx={rx} strokeWidth={0} />;

/* ───────────────────────── shared parts ───────────────────────── */

const SPEAKER = 'M3.4 9.7c0-.66.5-1.2 1.12-1.2h2.66l4.32-3.86c.7-.62 1.8-.12 1.8.82v13.08c0 .94-1.1 1.44-1.8.82L7.18 15.5H4.52c-.62 0-1.12-.54-1.12-1.2z';
const BELL = 'M12 2.6c.75 0 1.32.55 1.37 1.27C16.2 4.5 18 6.95 18 9.95v3.75l1.55 2.05c.47.62.03 1.5-.75 1.5H5.2c-.78 0-1.22-.88-.75-1.5L6 13.7V9.95c0-3 1.8-5.45 4.63-6.08.05-.72.62-1.27 1.37-1.27z';
const PLAY = 'M7.6 5.15v13.7c0 1 1.08 1.62 1.94 1.1l11.02-6.85c.8-.5.8-1.7 0-2.2L9.54 4.05c-.86-.53-1.94.1-1.94 1.1z';
const MOON = crescent(11.2, 12.8, 8.6, 17.4, 7.2, 6.9);
const SUN_DISC = C(12, 12, 4.4, 'disc');
const SUN_RAYS = L(rays(12, 12, 7.1, 9.5), 2.1, 'rays');
const CAMERA = 'M4.6 7.2h2.5l1.35-2.03c.33-.5.88-.77 1.46-.77h4.18c.58 0 1.13.28 1.46.77l1.35 2.03h2.5c1.2 0 2.2 1 2.2 2.2v9c0 1.2-1 2.2-2.2 2.2H4.6c-1.2 0-2.2-1-2.2-2.2v-9c0-1.2 1-2.2 2.2-2.2z';
const PHONE =
  'M7.1 3.1c.6-.36 1.37-.23 1.82.3l2.1 2.5c.45.53.45 1.31-.01 1.84l-1.38 1.6c.95 2.15 2.67 3.9 4.83 4.86l1.6-1.38c.53-.46 1.3-.46 1.84-.01l2.5 2.1c.53.45.66 1.22.3 1.82l-.86 1.43c-.62 1.03-1.83 1.55-3 1.27C11.3 18.36 5.64 12.7 4.56 7.16c-.28-1.18.24-2.39 1.27-3z';
const ENVELOPE = 'M4.8 5.4h14.4c1.33 0 2.4 1.07 2.4 2.4v8.4c0 1.33-1.07 2.4-2.4 2.4H4.8c-1.33 0-2.4-1.07-2.4-2.4V7.8c0-1.33 1.07-2.4 2.4-2.4z';
const BUBBLE = 'M12 3.6c5.08 0 9.2 3.4 9.2 7.6s-4.12 7.6-9.2 7.6c-.9 0-1.77-.1-2.6-.3l-3.72 2.06c-.6.33-1.3-.2-1.14-.86l.66-2.66C3.95 15.66 2.8 13.55 2.8 11.2c0-4.2 4.12-7.6 9.2-7.6z';

interface Glyph {
  d: ReactNode;
  /** shapes knocked out of `d` (drawn black inside a mask) */
  cut?: ReactNode;
  /** drawn above, unmasked */
  top?: ReactNode;
}

/* ───────────────────────── the glyphs ───────────────────────── */

const G: Record<string, Glyph> = {
  /* connectivity */
  plane: {
    d: F(
      'M12 2.3c.92 0 1.62.95 1.62 2.15v4.86l7.08 4.32c.36.22.58.6.58 1.02v.8c0 .44-.43.76-.86.63l-6.8-2.05v4.43l1.86 1.42c.2.16.32.4.32.65v.62c0 .38-.36.66-.73.56L12 20.86l-3.07.86c-.37.1-.73-.18-.73-.56v-.62c0-.25.12-.5.32-.65l1.86-1.42v-4.43l-6.8 2.05c-.43.13-.86-.19-.86-.63v-.8c0-.42.22-.8.58-1.02l7.08-4.32V4.45c0-1.2.7-2.15 1.62-2.15z',
      0.6,
    ),
  },
  wifi: {
    d: (
      <>
        {F(sector(12, 19.4, 5, -45, 45), 1.1, 'w0')}
        {L(arc(12, 19.4, 8.7, -45, 45), 2.4, 'w1')}
        {L(arc(12, 19.4, 12.9, -45, 45), 2.4, 'w2')}
      </>
    ),
  },
  bt: { d: L('M7.1 7.7l9.8 8.7-4.9 4.4V3.2l4.9 4.4-9.8 8.7', 2.1) },
  airdrop: {
    d: (
      <>
        {C(12, 12.6, 2.4)}
        {L(arc(12, 12.6, 5.6, -138, 138), 2.2, 'a1')}
        {L(arc(12, 12.6, 9.4, -138, 138), 2.2, 'a2')}
      </>
    ),
  },
  cell: {
    d: (
      <>
        {C(12, 8.8, 2.1)}
        {L(arc(12, 8.8, 5, 232, 308), 2.1, 'c1')}
        {L(arc(12, 8.8, 5, 52, 128), 2.1, 'c2')}
        {L(arc(12, 8.8, 8.6, 236, 304), 2.1, 'c3')}
        {L(arc(12, 8.8, 8.6, 56, 124), 2.1, 'c4')}
        {F('M12 11.9l2.5 9.1H9.5z', 1.2, 'mast')}
      </>
    ),
  },
  bars: {
    d: (
      <>
        {R(3, 15, 3.4, 6, 1.4)}
        {R(7.9, 11.4, 3.4, 9.6, 1.4)}
        {R(12.8, 7.6, 3.4, 13.4, 1.4)}
        {R(17.7, 3.6, 3.4, 17.4, 1.4)}
      </>
    ),
  },
  hotspot: {
    d: (
      <>
        {L('M10.4 13.6a3.3 3.3 0 0 1 0-4.67l2.53-2.53a3.3 3.3 0 0 1 4.67 4.67l-1.27 1.27', 2.2, 'h1')}
        {L('M13.6 10.4a3.3 3.3 0 0 1 0 4.67l-2.53 2.53a3.3 3.3 0 0 1-4.67-4.67l1.27-1.27', 2.2, 'h2')}
      </>
    ),
  },
  globe: {
    d: (
      <>
        {L('M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 1.9, 'g0')}
        {L('M12 3c-2.3 2.4-3.6 5.6-3.6 9s1.3 6.6 3.6 9c2.3-2.4 3.6-5.6 3.6-9S14.3 5.4 12 3z', 1.7, 'g1')}
        {L('M3.4 12h17.2M4.9 7.6h14.2M4.9 16.4h14.2', 1.6, 'g2')}
      </>
    ),
  },

  /* display & sound */
  moon: { d: F(MOON, 0.8) },
  sun: { d: <>{SUN_DISC}{SUN_RAYS}</> },
  contrast: {
    d: (
      <>
        {L('M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2z', 2, 'r')}
        {F('M12 6.1a5.9 5.9 0 0 1 0 11.8z', 0, 'h')}
      </>
    ),
  },
  nightshift: {
    d: (
      <>
        {L(rays(12, 12, 7.3, 9.6, 8), 2, 'r')}
        {F(crescent(11.6, 12.4, 4.9, 14.9, 9.3, 3.9), 0.6, 'm')}
      </>
    ),
  },
  speaker: { d: <>{F(SPEAKER, 0.6, 's')}{L('M16.2 9.1a4.1 4.1 0 0 1 0 5.8M18.9 6.4a7.9 7.9 0 0 1 0 11.2', 2.1, 'w')}</> },
  speaker1: { d: <>{F(SPEAKER, 0.6, 's')}{L('M16.2 9.1a4.1 4.1 0 0 1 0 5.8', 2.1, 'w')}</> },
  speaker0: { d: F(SPEAKER, 0.6) },
  mute: { d: <>{F(SPEAKER, 0.6, 's')}{L('M16.3 9.6l4.8 4.8M21.1 9.6l-4.8 4.8', 2.1, 'x')}</> },
  textsize: { d: L('M2.9 19.4 8.2 5.2l5.3 14.2M4.8 14.6h6.8M14.6 19.4l3.3-8.6 3.3 8.6M15.8 16.5h4.2', 2.1) },

  /* focus, rotation, mirroring */
  rotlock: {
    d: (
      <>
        {L(arc(12, 12, 9, 40, 338), 2, 'ar')}
        {F(arrowHead(12, 12, 9, 338, 2.7, 2.4), 0.8, 'ah')}
        {L('M10 11.1V9.9a2 2 0 0 1 4 0v1.2', 1.7, 'sh')}
        {R(8.5, 10.9, 7, 5.4, 1.4, 'b')}
      </>
    ),
  },
  mirror: {
    d: (
      <>
        {L('M7.4 15H5.4a2.2 2.2 0 0 1-2.2-2.2V6.4a2.2 2.2 0 0 1 2.2-2.2h9.4a2.2 2.2 0 0 1 2.2 2.2v1.3', 2, 'b')}
        {R(9.3, 9.6, 12.2, 9.8, 2.4, 'f')}
      </>
    ),
  },
  toggles: {
    d: (
      <>
        {L('M7.4 4.2h9.2a3.6 3.6 0 0 1 0 7.2H7.4a3.6 3.6 0 0 1 0-7.2z', 1.8, 't')}
        {C(7.4, 7.8, 2.1)}
        {R(3.4, 12.6, 17.2, 7.4, 3.7, 'b')}
      </>
    ),
    cut: C(16.4, 16.3, 2.3),
  },

  /* time */
  timer: {
    d: (
      <>
        {L('M12 4.1a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8z', 2.1, 'r')}
        {F(sector(12, 12.5, 5.3, 0, 125), 0.6, 's')}
        {R(10.5, 1.3, 3, 2, 1, 'k')}
      </>
    ),
  },
  stopwatch: {
    d: (
      <>
        {L('M12 5.2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z', 2.1, 'r')}
        {L('M9.6 2.4h4.8M12 2.6v2.4M18.1 6.5l1.5-1.5', 2.1, 'c')}
        {L('M12 13.2l3.1-3.1', 2.1, 'h')}
        {C(12, 13.2, 1.6)}
      </>
    ),
  },
  alarm: {
    d: (
      <>
        {L('M12 5.8a7.3 7.3 0 1 1 0 14.6 7.3 7.3 0 0 1 0-14.6z', 2.1, 'r')}
        {L('M12 9.6v3.6l2.4 1.6M7.4 19.3l-1.5 1.9M16.6 19.3l1.5 1.9', 2, 'h')}
        {F('M2.9 8.3a4.4 4.4 0 0 1 5.5-5.4z', 1.1, 'b1')}
        {F('M21.1 8.3a4.4 4.4 0 0 0-5.5-5.4z', 1.1, 'b2')}
      </>
    ),
  },

  /* utilities */
  torch: {
    d: (
      <>
        {F('M7 3.1c0-.5.4-.9.9-.9h8.2c.5 0 .9.4.9.9v2.3c0 .32-.1.62-.28.88L15.2 8.6H8.8L7.28 6.28A1.6 1.6 0 0 1 7 5.4z', 0.6, 'h')}
        {F('M8.8 10h6.4v9.9c0 1.05-.85 1.9-1.9 1.9h-2.6c-1.05 0-1.9-.85-1.9-1.9z', 0.6, 'b')}
      </>
    ),
    cut: R(11, 13.6, 2, 3.8, 1),
  },
  torchOn: {
    d: (
      <>
        {F('M7 3.1c0-.5.4-.9.9-.9h8.2c.5 0 .9.4.9.9v2.3c0 .32-.1.62-.28.88L15.2 8.6H8.8L7.28 6.28A1.6 1.6 0 0 1 7 5.4z', 0.6, 'h')}
        {F('M8.8 10h6.4v9.9c0 1.05-.85 1.9-1.9 1.9h-2.6c-1.05 0-1.9-.85-1.9-1.9z', 0.6, 'b')}
      </>
    ),
    cut: (
      <>
        {R(11, 11.8, 2, 3.8, 1, 's')}
        {R(8.2, 4.6, 7.6, 1.5, 0.75, 'l')}
      </>
    ),
  },
  calc: {
    d: R(4.6, 2.4, 14.8, 19.2, 3.4),
    cut: (
      <>
        {R(7.2, 5, 9.6, 3.8, 1.2, 'disp')}
        {[8.5, 12, 15.5].flatMap((x) => [12.4, 15.6, 18.8].map((y) => C(x, y, 1.15, `${x}${y}`)))}
      </>
    ),
  },
  camera: {
    d: (
      <>
        {F(CAMERA, 0, 'b')}
        {C(12, 13.9, 2.6, 'l')}
      </>
    ),
    cut: L('M12 9.2a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4z', 1.5),
  },
  note: {
    d: R(3.8, 3, 16.4, 18, 3.6),
    cut: (
      <>
        {R(7.2, 7.6, 9.6, 1.9, 0.95, 'l1')}
        {R(7.2, 11.3, 9.6, 1.9, 0.95, 'l2')}
        {R(7.2, 15, 6, 1.9, 0.95, 'l3')}
      </>
    ),
  },
  doc: {
    d: (
      <>
        {F('M6.6 2.4h6.1v4.5c0 1.33 1.07 2.4 2.4 2.4h4.5v10.1c0 1.22-.98 2.2-2.2 2.2H6.6c-1.22 0-2.2-.98-2.2-2.2V4.6c0-1.22.98-2.2 2.2-2.2z', 0, 'p')}
        {F('M14.4 2.9l4.7 4.7h-3.6c-.6 0-1.1-.5-1.1-1.1z', 0.6, 'f')}
      </>
    ),
    cut: (
      <>
        {R(7.4, 12.6, 9.2, 1.7, 0.85, 'l1')}
        {R(7.4, 16.1, 6.2, 1.7, 0.85, 'l2')}
      </>
    ),
  },
  gear: { d: F(gearPath, 1.3), cut: C(12, 12, 3.2) },
  heart: {
    d: F('M12 20.5c-.3 0-.6-.1-.86-.28C7.3 17.6 3 14.1 3 9.55 3 6.9 5.08 4.8 7.65 4.8c1.8 0 3.36.97 4.35 2.45.99-1.48 2.55-2.45 4.35-2.45C18.92 4.8 21 6.9 21 9.55c0 4.55-4.3 8.05-8.14 10.67-.26.18-.56.28-.86.28z', 0.4),
  },
  music: {
    d: (
      <>
        {F('M8.3 6.3 20.2 3.3v3.4L8.3 9.7z', 1, 'beam')}
        {L('M9.25 7.6v10M19.25 5v9.4', 1.9, 'st')}
        <ellipse key="h1" cx="6.75" cy="17.9" rx="3.1" ry="2.5" transform="rotate(-18 6.75 17.9)" strokeWidth={0} />
        <ellipse key="h2" cx="16.75" cy="15" rx="3.1" ry="2.5" transform="rotate(-18 16.75 15)" strokeWidth={0} />
      </>
    ),
  },
  briefcase: {
    d: (
      <>
        {L('M8.7 7.3V5.9c0-1 .8-1.8 1.8-1.8h3c1 0 1.8.8 1.8 1.8v1.4', 2, 'h')}
        {R(2.8, 7.2, 18.4, 13.2, 3, 'b')}
      </>
    ),
    cut: R(2, 12.5, 20, 1.5, 0),
  },
  compass: {
    d: (
      <>
        {L('M12 3.1a8.9 8.9 0 1 1 0 17.8 8.9 8.9 0 0 1 0-17.8z', 2, 'r')}
        {F('M16.4 7.6l-2.65 6.15L7.6 16.4l2.65-6.15z', 1, 'n')}
      </>
    ),
    cut: C(12, 12, 1.15),
  },
  search: { d: L('M10.4 4a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8zM15.3 15.3l5 5', 2.5) },
  bell: { d: <>{F(BELL, 0.4, 'b')}{F('M9.5 18.5h5a2.5 2.5 0 0 1-5 0z', 0.4, 'c')}</> },
  bellslash: {
    d: <>{F(BELL, 0.4, 'b')}{F('M9.5 18.5h5a2.5 2.5 0 0 1-5 0z', 0.4, 'c')}</>,
    cut: L('M3.6 2.9l17.4 17.4', 4.6),
    top: L('M3.9 3.2l16.8 16.8', 2),
  },
  mic: {
    d: (
      <>
        {R(8.5, 2.4, 7, 12, 3.5, 'c')}
        {L('M5.6 11.2a6.4 6.4 0 0 0 12.8 0M12 17.8v3.4', 2, 's')}
      </>
    ),
  },
  person: {
    d: (
      <>
        {C(12, 7.6, 4.1)}
        {F('M4.5 19.3c0-3.6 3.36-6.3 7.5-6.3s7.5 2.7 7.5 6.3c0 .9-.7 1.5-1.6 1.5H6.1c-.9 0-1.6-.6-1.6-1.5z', 0, 'b')}
      </>
    ),
  },
  shot: {
    d: (
      <>
        {L('M3.6 8.4V6.1a2.5 2.5 0 0 1 2.5-2.5h2.3M15.6 3.6h2.3a2.5 2.5 0 0 1 2.5 2.5v2.3M20.4 15.6v2.3a2.5 2.5 0 0 1-2.5 2.5h-2.3M8.4 20.4H6.1a2.5 2.5 0 0 1-2.5-2.5v-2.3', 2.1, 'c')}
        {R(7.6, 8.4, 8.8, 7.2, 1.8, 'a')}
      </>
    ),
  },
  record: {
    d: (
      <>
        {L('M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2z', 2.1, 'r')}
        {C(12, 12, 5.2)}
      </>
    ),
  },
  battery: {
    d: (
      <>
        {L('M5.6 7h11.8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H5.6a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z', 1.8, 'o')}
        {R(5, 9.4, 9.6, 5.2, 1.5, 'f')}
        {L('M22.3 10.4v3.2', 1.9, 'cap')}
      </>
    ),
  },
  batteryLow: {
    d: (
      <>
        {L('M5.6 7h11.8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H5.6a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z', 1.8, 'o')}
        {R(5, 9.4, 4, 5.2, 1.5, 'f')}
        {L('M22.3 10.4v3.2', 1.9, 'cap')}
      </>
    ),
  },
  bolt: { d: F('M13.6 2.4 5.5 13.1c-.3.4 0 .95.5.95h5.1l-1.3 7.2c-.1.55.6.85.95.4l8-10.7c.3-.4 0-.95-.5-.95h-5.1l1.4-7.2c.1-.55-.6-.85-.95-.4z', 0.5) },
  qr: {
    d: (
      <>
        {L('M5.6 3.9h2.8a1.7 1.7 0 0 1 1.7 1.7v2.8a1.7 1.7 0 0 1-1.7 1.7H5.6a1.7 1.7 0 0 1-1.7-1.7V5.6a1.7 1.7 0 0 1 1.7-1.7zM15.6 3.9h2.8a1.7 1.7 0 0 1 1.7 1.7v2.8a1.7 1.7 0 0 1-1.7 1.7h-2.8a1.7 1.7 0 0 1-1.7-1.7V5.6a1.7 1.7 0 0 1 1.7-1.7zM5.6 13.9h2.8a1.7 1.7 0 0 1 1.7 1.7v2.8a1.7 1.7 0 0 1-1.7 1.7H5.6a1.7 1.7 0 0 1-1.7-1.7v-2.8a1.7 1.7 0 0 1 1.7-1.7z', 1.8, 'f')}
        {R(6, 6, 2, 2, 0.5, 'd1')}
        {R(16, 6, 2, 2, 0.5, 'd2')}
        {R(6, 16, 2, 2, 0.5, 'd3')}
        {R(13.4, 13.4, 3, 3, 0.8, 'q1')}
        {R(17.6, 17.6, 3, 3, 0.8, 'q2')}
        {R(17.6, 13.4, 3, 3, 0.8, 'q3')}
        {R(13.4, 17.6, 3, 3, 0.8, 'q4')}
      </>
    ),
  },
  sparkle: {
    d: (
      <>
        {F('M10.4 2.6c.62 4.7 2.94 7.02 7.64 7.64-4.7.62-7.02 2.94-7.64 7.64-.62-4.7-2.94-7.02-7.64-7.64 4.7-.62 7.02-2.94 7.64-7.64z', 0.9, 'a')}
        {F('M18.3 14.9c.27 2 1.27 3 3.27 3.27-2 .27-3 1.27-3.27 3.27-.27-2-1.27-3-3.27-3.27 2-.27 3-1.27 3.27-3.27z', 0.8, 'b')}
      </>
    ),
  },
  wave: { d: L('M4 10.6v2.8M8 7.4v9.2M12 4.4v15.2M16 8v8M20 10.2v3.6', 2.3) },
  translate: {
    d: R(9.6, 9.6, 12, 12, 3),
    cut: (
      <>
        <rect key="fr" x="2.4" y="2.4" width="12" height="12" rx="3" strokeWidth={2.6} />
        {L('M13.2 14.4h5.6M16 13v1.4M13.8 19.6c2.3-1.2 3.6-3 4.1-5.1M14.6 16.2c.9 1.6 2.3 2.8 4.3 3.5', 1.5, 'g')}
      </>
    ),
    top: (
      <>
        {L('M5.4 2.4h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z', 1.8, 'o')}
        {L('M5.6 11.6 8.4 5.4l2.8 6.2M6.6 9.5h3.6', 1.7, 'a')}
      </>
    ),
  },

  /* media */
  play: { d: F(PLAY, 0.4) },
  pause: { d: <>{R(6, 4.4, 4.2, 15.2, 1.4, 'a')}{R(13.8, 4.4, 4.2, 15.2, 1.4, 'b')}</> },
  next: {
    d: (
      <>
        {F('M2.6 6.6v10.8c0 .8.88 1.3 1.56.88l8.64-5.4c.64-.4.64-1.36 0-1.76L4.16 5.72c-.68-.42-1.56.08-1.56.88z', 0.4, 'a')}
        {F('M11.6 6.6v10.8c0 .8.88 1.3 1.56.88l8.64-5.4c.64-.4.64-1.36 0-1.76l-8.64-5.4c-.68-.42-1.56.08-1.56.88z', 0.4, 'b')}
      </>
    ),
  },
  prev: {
    d: (
      <>
        {F('M21.4 6.6v10.8c0 .8-.88 1.3-1.56.88l-8.64-5.4c-.64-.4-.64-1.36 0-1.76l8.64-5.4c.68-.42 1.56.08 1.56.88z', 0.4, 'a')}
        {F('M12.4 6.6v10.8c0 .8-.88 1.3-1.56.88l-8.64-5.4c-.64-.4-.64-1.36 0-1.76l8.64-5.4c.68-.42 1.56.08 1.56.88z', 0.4, 'b')}
      </>
    ),
  },

  /* system */
  plus: { d: L('M12 4.6v14.8M4.6 12h14.8', 2.4) },
  minus: { d: L('M4.6 12h14.8', 2.4) },
  x: { d: L('M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7', 2.3) },
  check: { d: L('M5.2 12.6l4.3 4.3 9.3-9.8', 2.5) },
  chev: { d: L('M9 5.5 15.5 12 9 18.5', 2.4) },
  chevDown: { d: L('M5.5 9 12 15.5 18.5 9', 2.4) },
  power: { d: L('M12 3.2v7.6M7 5.9a8 8 0 1 0 10 0', 2.4) },
  restart: {
    d: (
      <>
        {L(arc(12, 12.4, 7.8, -150, 150), 2.3, 'a')}
        {F(arrowHead(12, 12.4, 7.8, 150, 3, 2.7), 0.9, 'h')}
      </>
    ),
  },
  undo: {
    d: (
      <>
        {L('M5.4 9.6h9.1a5.3 5.3 0 0 1 0 10.6H11', 2.3, 'l')}
        {F('M8.6 5.2v8.8L3 9.6z', 1.2, 'h')}
      </>
    ),
  },
  home: {
    d: F('M10.66 3.5c.77-.66 1.91-.66 2.68 0l7.02 6.04c.48.41.19 1.2-.45 1.2h-1.36v8.25c0 1.06-.86 1.91-1.91 1.91H7.36c-1.05 0-1.91-.85-1.91-1.91v-8.25H4.09c-.64 0-.93-.79-.45-1.2z', 0.4),
    cut: R(10.2, 14.4, 3.6, 7, 1),
  },
  lock: {
    d: (
      <>
        {L('M7.8 10.6V7.9a4.2 4.2 0 0 1 8.4 0v2.7', 2.2, 's')}
        {R(4.8, 10, 14.4, 11.2, 2.8, 'b')}
      </>
    ),
  },
  grid: { d: <>{R(3.6, 3.6, 7.4, 7.4, 2.2, 'a')}{R(13, 3.6, 7.4, 7.4, 2.2, 'b')}{R(3.6, 13, 7.4, 7.4, 2.2, 'c')}{R(13, 13, 7.4, 7.4, 2.2, 'd')}</> },
  widget: { d: <>{R(3.4, 3.4, 17.2, 7.6, 2.4, 'a')}{R(3.4, 13, 7.6, 7.6, 2.4, 'b')}{R(13, 13, 7.6, 7.6, 2.4, 'c')}</> },
  pages: { d: <>{R(3.6, 3.6, 16.8, 4.2, 1.6, 'a')}{R(3.6, 9.9, 16.8, 4.2, 1.6, 'b')}{R(3.6, 16.2, 16.8, 4.2, 1.6, 'c')}</> },
  list: {
    d: (
      <>
        {C(4.8, 6.4, 1.5)}
        {C(4.8, 12, 1.5)}
        {C(4.8, 17.6, 1.5)}
        {L('M9.4 6.4h10.4M9.4 12h10.4M9.4 17.6h10.4', 2.1, 'l')}
      </>
    ),
  },
  brush: {
    d: (
      <>
        {F('M20.3 3.7c.5.5.5 1.3.02 1.82l-7.6 8.18-2.42-2.42 8.18-7.6c.52-.48 1.32-.48 1.82.02z', 0.6, 'h')}
        {F('M8.9 12.6l2.5 2.5c.1 2.9-1.86 5.5-6.2 5.5-1.1 0-2.2-.3-2.9-.7 1.6-.8 1.3-2.1 1.6-3.6.5-2.4 2.6-3.9 5-3.7z', 0.6, 'b')}
      </>
    ),
  },
  pencil: {
    d: (
      <>
        {F('M15.4 4.5l4.1 4.1-10.7 10.7-5.1 1.2c-.47.11-.89-.31-.78-.78l1.2-5.1z', 0.8, 'b')}
        {F('M16.8 3.1l.9-.9c.6-.6 1.55-.6 2.15 0l1.95 1.95c.6.6.6 1.55 0 2.15l-.9.9z', 0.8, 't')}
      </>
    ),
  },
  marker: {
    d: (
      <>
        {F('M14.6 3.4c.6-.6 1.56-.6 2.16 0l3.84 3.84c.6.6.6 1.56 0 2.16l-8.1 8.1-6-6z', 0.8, 'b')}
        {F('M5.5 12.5l6 6-2.2 2.2H4.1c-.6 0-.9-.72-.48-1.15l.98-.98-.5-.5c-.6-.6-.6-1.56 0-2.16z', 0.8, 't')}
      </>
    ),
  },
  pen: {
    d: (
      <>
        {F('M16.3 2.9c.55-.55 1.45-.55 2 0l2.8 2.8c.55.55.55 1.45 0 2l-9.2 9.2-4.8-4.8z', 0.8, 'b')}
        {F('M6.2 13.1l4.7 4.7-3.9 1.7-3.2 1.4c-.5.22-1-.28-.78-.78L4.4 17z', 0.8, 't')}
      </>
    ),
  },
  eraser: {
    d: (
      <>
        {F('M13.6 3.9c.7-.7 1.84-.7 2.54 0l4.96 4.96c.7.7.7 1.84 0 2.54l-6.7 6.7-7.5-7.5z', 0.8, 'b')}
        {F('M5.8 11.7l7.5 7.5-1.6 1.6H8.6L3.6 15.8c-.7-.7-.7-1.84 0-2.54z', 0.8, 't')}
      </>
    ),
    top: L('M13.4 20.8h7.2', 1.9),
  },
  hand: {
    d: F(
      'M9.4 11.4V4.9a1.45 1.45 0 0 1 2.9 0v5.4V3.7a1.45 1.45 0 0 1 2.9 0v6.6V5.1a1.45 1.45 0 0 1 2.9 0v8.7c0 4.3-2.6 7.6-6.8 7.6-2.4 0-4-1-5.3-2.9L3.6 14c-.5-.7-.3-1.65.45-2.05.6-.33 1.36-.2 1.83.3L7.4 14V6.6a1.45 1.45 0 0 1 2.9 0',
      0.6,
    ),
  },
  keypad: {
    d: <>{[6, 12, 18].flatMap((x) => [5, 10.4, 15.8].map((y) => C(x, y, 2.05, `${x}${y}`)))}{C(12, 21, 1.9)}</>,
  },
  download: {
    d: (
      <>
        {L('M12 3.2v10.6', 2.3, 's')}
        {F('M7.6 10.4 12 15l4.4-4.6z', 1.4, 'h')}
        {L('M4.2 15.6v2.6a2.4 2.4 0 0 0 2.4 2.4h10.8a2.4 2.4 0 0 0 2.4-2.4v-2.6', 2.2, 't')}
      </>
    ),
  },
  share: {
    d: (
      <>
        {L('M12 14.4V3.8', 2.2, 's')}
        {F('M8 7.2 12 3l4 4.2z', 1.4, 'h')}
        {L('M8.6 9.6H7.2a2.4 2.4 0 0 0-2.4 2.4v6.8a2.4 2.4 0 0 0 2.4 2.4h9.6a2.4 2.4 0 0 0 2.4-2.4V12a2.4 2.4 0 0 0-2.4-2.4h-1.4', 2, 'b')}
      </>
    ),
  },
  arrowDown: { d: <>{L('M12 3.6v12.6', 2.4, 's')}{F('M6.6 13.6 12 19.6l5.4-6z', 1.4, 'h')}</> },
  arrowUp: { d: <>{L('M12 20.4V7.8', 2.4, 's')}{F('M6.6 10.4 12 4.4l5.4 6z', 1.4, 'h')}</> },
  eye: {
    d: F('M12 5c4.6 0 8 3.3 9.4 5.8.4.75.4 1.65 0 2.4C20 15.7 16.6 19 12 19s-8-3.3-9.4-5.8a2.5 2.5 0 0 1 0-2.4C4 8.3 7.4 5 12 5z', 0),
    cut: <>{L('M12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z', 1.6, 'r')}</>,
  },
  eyeSlash: {
    d: F('M12 5c4.6 0 8 3.3 9.4 5.8.4.75.4 1.65 0 2.4C20 15.7 16.6 19 12 19s-8-3.3-9.4-5.8a2.5 2.5 0 0 1 0-2.4C4 8.3 7.4 5 12 5z', 0),
    cut: <>{L('M12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z', 1.6, 'r')}{L('M3.6 2.9l17.4 17.4', 4.6, 's')}</>,
    top: L('M3.9 3.2l16.8 16.8', 2),
  },
  circle: { d: L('M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8z', 2) },
  checkCircle: { d: C(12, 12, 9.4), cut: L('M7.6 12.4l3 3 5.8-6.2', 2.3) },
  minusCircle: { d: C(12, 12, 9.4), cut: L('M7.4 12h9.2', 2.3) },
  xCircle: { d: C(12, 12, 9.4), cut: L('M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8', 2.2) },
  plusCircle: { d: C(12, 12, 9.4), cut: L('M12 7.4v9.2M7.4 12h9.2', 2.2) },
  sizeS: { d: R(7.8, 7.8, 8.4, 8.4, 2.4) },
  sizeM: { d: R(3, 7.8, 18, 8.4, 2.4) },
  sizeL: { d: R(3, 3, 18, 18, 3.4) },
  appGrid: {
    d: <>{[5.6, 12, 18.4].flatMap((x) => [5.6, 12, 18.4].map((y) => R(x - 2.3, y - 2.3, 4.6, 4.6, 1.4, `${x}${y}`)))}</>,
  },
  phone: { d: F(PHONE, 0.5) },
  video: { d: <>{R(2.4, 6, 13.2, 12, 3, 'b')}{F('M17.2 10.2l3.5-2.4c.6-.4 1.3 0 1.3.7v7c0 .7-.7 1.1-1.3.7l-3.5-2.4z', 0.6, 'l')}</> },
  mail: { d: F(ENVELOPE, 0), cut: L('M3.8 7.6l7.15 5.1c.63.45 1.47.45 2.1 0l7.15-5.1', 1.6) },
  message: { d: F(BUBBLE, 0.4) },
  device: {
    d: L('M9.2 2.6h5.6a2.8 2.8 0 0 1 2.8 2.8v13.2a2.8 2.8 0 0 1-2.8 2.8H9.2a2.8 2.8 0 0 1-2.8-2.8V5.4a2.8 2.8 0 0 1 2.8-2.8z', 2),
    top: R(10.2, 5.2, 3.6, 1.4, 0.7),
  },
  star: { d: F(star(12, 12.6, 9.4, 4.1), 1.4) },
  calendar: {
    d: R(3, 4.4, 18, 16.6, 3.2),
    cut: <>{R(3, 9, 18, 1.6, 0, 'b')}{[7.4, 12, 16.6].flatMap((x) => [13.6, 17.2].map((y) => C(x, y, 1.2, `${x}${y}`)))}</>,
    top: L('M8 2.6v3.6M16 2.6v3.6', 2, 't'),
  },
  location: { d: F('M20.3 3.7c.4.4.5 1 .3 1.5l-6.8 14.9c-.5 1.05-2.05.9-2.32-.23L10 13.9 4.13 12.5c-1.14-.27-1.28-1.83-.22-2.32L18.8 3.4c.5-.23 1.1-.13 1.5.27z', 0.6) },
  drop: { d: F('M12 2.8c.3 0 .6.14.78.4C15.4 6.9 18.6 11.1 18.6 14.6a6.6 6.6 0 0 1-13.2 0c0-3.5 3.2-7.7 5.82-11.4.18-.26.48-.4.78-.4z', 0.4) },
  thermo: {
    d: <>{F('M12 2.6a2.9 2.9 0 0 1 2.9 2.9v8.1a4.9 4.9 0 1 1-5.8 0V5.5A2.9 2.9 0 0 1 12 2.6z', 0, 'o')}</>,
    cut: <>{R(11.1, 5, 1.8, 10, 0.9, 'c')}</>,
    top: C(12, 17.4, 2.3),
  },
  windGlyph: { d: L('M3 8.6h10.4a2.7 2.7 0 1 0-2.7-2.7M3 12.4h15.2a2.9 2.9 0 1 1-2.9 2.9M3 16.2h7.4a2.4 2.4 0 1 1-2.4 2.4', 2.1) },
  sunrise: {
    d: (
      <>
        {F('M6.4 17.2a5.6 5.6 0 0 1 11.2 0z', 0.6, 's')}
        {L(rays(12, 17.2, 7.9, 10, 5, -90 + 0), 2, 'r')}
        {L('M2.6 20.4h18.8', 2, 'h')}
      </>
    ),
  },
  umbrella: {
    d: (
      <>
        {F('M12 2.8c5.2 0 9.4 3.9 9.6 8.9 0 .4-.4.6-.7.4-.9-.6-1.8-.9-2.7-.9-1.1 0-2.1.5-2.9 1.3-.4.4-.8.4-1.2 0-.6-.8-1.3-1.3-2.1-1.3s-1.5.5-2.1 1.3c-.4.4-.8.4-1.2 0-.8-.8-1.8-1.3-2.9-1.3-.9 0-1.8.3-2.7.9-.3.2-.7 0-.7-.4.2-5 4.4-8.9 9.6-8.9z', 0.4, 'c')}
        {L('M12 12v6.4a2 2 0 0 1-4 0', 2, 's')}
      </>
    ),
  },
  focusPerson: { d: <>{C(12, 7.6, 4.1)}{F('M4.5 19.3c0-3.6 3.36-6.3 7.5-6.3s7.5 2.7 7.5 6.3c0 .9-.7 1.5-1.6 1.5H6.1c-.9 0-1.6-.6-1.6-1.5z', 0, 'b')}</> },
  graduation: {
    d: (
      <>
        {F('M11.3 3.6c.45-.2.95-.2 1.4 0l9 4.1c.5.23.5.95 0 1.18l-9 4.1c-.45.2-.95.2-1.4 0l-9-4.1c-.5-.23-.5-.95 0-1.18z', 0.4, 'c')}
        {F('M6 12.4l5.3 2.4c.45.2.95.2 1.4 0l5.3-2.4v3.8c0 1.9-2.7 3.6-6 3.6s-6-1.7-6-3.6z', 0.4, 'b')}
        {L('M20.6 8.4v5.6', 1.6, 't')}
      </>
    ),
  },
  hammer: {
    d: (
      <>
        {F('M10.2 3.4h5.1c.6 0 1.2.24 1.6.66l2.6 2.6c.36.36.36.95 0 1.3l-2.05 2.05c-.36.36-.95.36-1.3 0l-1.15-1.15-1.6 1.6-3.35-3.35 1.15-1.15-1.3-1.3c-.27-.27-.08-.75.3-.75z', 0.6, 'h')}
        {F('M9.2 9.1l3.35 3.35-7 7c-.5.5-1.3.5-1.8 0l-1.55-1.55c-.5-.5-.5-1.3 0-1.8z', 0.6, 's')}
      </>
    ),
  },
  sparkles: {
    d: F('M12 2.8c.62 4.7 2.94 7.02 7.64 7.64-4.7.62-7.02 2.94-7.64 7.64-.62-4.7-2.94-7.02-7.64-7.64 4.7-.62 7.02-2.94 7.64-7.64z', 0.9),
  },
  starFill: { d: F(star(12, 12.6, 9.4, 4.1), 1.4) },
  newBadge: {
    d: F(
      (() => {
        let d = '';
        for (let i = 0; i < 24; i++) {
          const [x, y] = pt(12, 12, i % 2 ? 8 : 9.8, i * 15);
          d += `${i ? 'L' : 'M'}${x} ${y}`;
        }
        return d + 'Z';
      })(),
      1.2,
    ),
    cut: L('M8 12.4l2.6 2.6 5.4-5.8', 2.1),
  },
  code: { d: L('M8.4 6.6 3 12l5.4 5.4M15.6 6.6 21 12l-5.4 5.4M13.6 4.2l-3.2 15.6', 2.2) },
  /* v10.3 — extra glyphs for Mail, Finder, Photos, Music, Contacts */
  trash: {
    d: (
      <>
        {F('M9.2 3.2h5.6c.6 0 1.1.5 1.1 1.1V5.4h3.6c.6 0 1.1.5 1.1 1.1s-.5 1.1-1.1 1.1H4.4c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1H8V4.3c0-.6.5-1.1 1.2-1.1z', 0.4, 'l')}
        {F('M5.4 8.8h13.2l-.86 10.4A2.4 2.4 0 0 1 15.35 21.4h-6.7a2.4 2.4 0 0 1-2.39-2.2z', 0.4, 'b')}
      </>
    ),
    cut: L('M10 11.6v6.4M14 11.6v6.4', 1.6),
  },
  folder: { d: F('M4.6 4.4h4.8c.6 0 1.17.27 1.55.73l1.25 1.47h7.2a2.4 2.4 0 0 1 2.4 2.4v9.4a2.4 2.4 0 0 1-2.4 2.4H4.6a2.4 2.4 0 0 1-2.4-2.4V6.8a2.4 2.4 0 0 1 2.4-2.4z', 0.6) },
  flag: {
    d: (
      <>
        {L('M5.4 3v18.2', 2.2, 'p')}
        {F('M6.4 3.8c3.6-1.7 6.1 1.6 11.8-.3.6-.2 1.2.24 1.2.87v8.6c0 .38-.23.72-.58.86-5.5 2.1-8.2-1.2-12.42.6z', 0.6, 'f')}
      </>
    ),
  },
  inbox: {
    d: F('M6.1 3.6h11.8c.95 0 1.8.56 2.2 1.42l1.76 3.9c.14.3.21.64.21.98v8.1a2.4 2.4 0 0 1-2.4 2.4H4.33a2.4 2.4 0 0 1-2.4-2.4V9.9c0-.34.07-.67.21-.98l1.76-3.9c.4-.86 1.25-1.42 2.2-1.42z', 0.5),
    cut: L('M3.6 10.6h4.2c.5 0 .9.36 1 .85.27 1.4 1.5 2.45 3.2 2.45s2.93-1.05 3.2-2.45c.1-.5.5-.85 1-.85h4.2', 1.6),
  },
  archive: {
    d: (
      <>
        {R(2.6, 3.8, 18.8, 4.6, 1.4, 't')}
        {F('M3.9 9.8h16.2v8.4a2.4 2.4 0 0 1-2.4 2.4H6.3a2.4 2.4 0 0 1-2.4-2.4z', 0.4, 'b')}
      </>
    ),
    cut: L('M9.6 13.4h4.8', 1.8),
  },
  paperclip: { d: L('M15.6 7.4 8.7 14.3a1.9 1.9 0 0 0 2.7 2.7l7.4-7.4a3.6 3.6 0 0 0-5.1-5.1l-7.6 7.6a5.3 5.3 0 0 0 7.5 7.5l6.3-6.3', 2) },
  pin: {
    d: (
      <>
        {F('M9.1 2.8h5.8c.6 0 1 .6.8 1.2l-.9 2.5 2.4 3.4c.76 1.07.68 2.53-.2 3.5l-.2.2H7.2l-.2-.2c-.88-.97-.96-2.43-.2-3.5l2.4-3.4-.9-2.5c-.2-.6.2-1.2.8-1.2z', 0.6, 'h')}
        {L('M12 13.8v7.4', 2, 'n')}
      </>
    ),
  },
  reply: { d: F('M10.4 5.2v3.2c5.9.3 9.9 3.9 10.4 10.4.04.5-.6.74-.92.35-2.06-2.45-5.06-3.6-9.48-3.6v3.25c0 .8-.94 1.24-1.56.73L2.6 13.2a1 1 0 0 1 0-1.54l6.24-5.7c.62-.52 1.56-.08 1.56.74z', 0.6) },
  forward: { d: F('M13.6 5.2v3.2c-5.9.3-9.9 3.9-10.4 10.4-.04.5.6.74.92.35 2.06-2.45 5.06-3.6 9.48-3.6v3.25c0 .8.94 1.24 1.56.73l6.24-5.33a1 1 0 0 0 0-1.54l-6.24-5.7c-.62-.52-1.56-.08-1.56.74z', 0.6) },
  photo: {
    d: R(2.4, 4.2, 19.2, 15.6, 3, 'f'),
    cut: (
      <>
        {C(8.2, 9.4, 1.9, 's')}
        {F('M3.6 18.2l5.1-5.2c.47-.48 1.24-.48 1.71 0l2.1 2.13 3.6-3.94c.48-.52 1.3-.52 1.78.01l3.5 3.9v3.1z', 0, 'm')}
      </>
    ),
  },
  repeat: { d: L('M4 11.4V9.6a3 3 0 0 1 3-3h12.2M16.4 3.6l3 3-3 3M20 12.6v1.8a3 3 0 0 1-3 3H4.8M7.6 20.4l-3-3 3-3', 2.1) },
  repeatOne: {
    d: (
      <>
        {L('M4 11.4V9.6a3 3 0 0 1 3-3h12.2M16.4 3.6l3 3-3 3M20 12.6v1.8a3 3 0 0 1-3 3H4.8M7.6 20.4l-3-3 3-3', 2.1, 'r')}
        {F('M11.4 10.2h1.5v4.6h-1.2v-3.3l-.8.4-.4-.9z', 0.3, 'n')}
      </>
    ),
  },
  shuffle: { d: L('M3.4 7.2h3.2c1.7 0 3.2.9 4.1 2.3l2.6 4.9c.9 1.4 2.4 2.3 4.1 2.3h3.4M17.8 4.4l2.9 2.8-2.9 2.8M17.8 14.4l2.9 2.8-2.9 2.8M3.4 16.8h3.2c1.4 0 2.6-.6 3.5-1.6M13.9 8.8c.9-1 2.1-1.6 3.5-1.6h3.2', 2) },
  info: { d: C(12, 12, 9.6, 'c'), cut: (<>{C(12, 7.6, 1.35, 'd')}{L('M12 11v6', 2.2, 'l')}</>) },
};

export type SysIconName = keyof typeof G;
export const SYS_ICON_NAMES = Object.keys(G);

/* ───────────────────────── components ───────────────────────── */

const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

export function SysIcon({ n, size = 22, className, title }: { n: string; size?: number; className?: string; title?: string }) {
  const uid = cleanId(useId());
  const g = G[n] ?? G.grid;
  const mid = `si${uid}`;
  return (
    <svg
      className={`sys-ico${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={0}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title && <title>{title}</title>}
      {g.cut ? (
        <>
          <mask id={mid} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#fff" />
            <g fill="#000" stroke="#000">
              {g.cut}
            </g>
          </mask>
          <g mask={`url(#${mid})`}>{g.d}</g>
        </>
      ) : (
        g.d
      )}
      {g.top}
    </svg>
  );
}

/* ───────────────────────── weather ───────────────────────── */

export type WxKind = 'sun' | 'moon' | 'pcDay' | 'pcNight' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'heavyRain' | 'thunder' | 'snow' | 'wind' | 'unknown';

/** WMO weather code (Open-Meteo) → glyph kind */
export function wxKind(code: number | null | undefined, isDay = true): WxKind {
  if (code === null || code === undefined || Number.isNaN(code)) return 'unknown';
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code === 1 || code === 2) return isDay ? 'pcDay' : 'pcNight';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code === 65 || code === 67 || code === 82) return 'heavyRain';
  if ((code >= 61 && code <= 67) || code === 80 || code === 81) return code === 80 ? 'drizzle' : 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloud';
}

/* the cloud: a full-size cloud in the 24 grid (x 3–22.6, y 4.6–19) */
const CLOUD = 'M7 19h10.5a4.5 4.5 0 0 0 .7-8.95A6 6 0 0 0 6.6 11.1 4 4 0 0 0 7 19z';
const SUN_RAYS_SMALL = (cx: number, cy: number, s: number) => rays(cx, cy, 5.6 * s, 7.6 * s);

interface WxParts {
  back?: 'sun' | 'moon';
  cloud?: { t: string; dark?: boolean };
  below?: ReactNode;
}

const DROPS = (n: number, long: boolean, color: string) => {
  const xs = n === 3 ? [8.4, 12.4, 16.4] : n === 4 ? [7.2, 10.6, 14, 17.4] : [8.6, 12.4, 16.2];
  const len = long ? 3.4 : 1.6;
  return xs.map((x, i) => {
    const y = 17.2 + (i % 2 ? 1 : 0);
    return <path key={i} d={`M${x} ${y}l-${len * 0.38} ${len}`} fill="none" stroke={color} strokeWidth={long ? 2 : 2.2} strokeLinecap="round" />;
  });
};
const FLAKES = (color: string, edge?: string) =>
  [
    [8.2, 18.4],
    [12.4, 20.4],
    [16.4, 18.4],
  ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.45} fill={color} stroke={edge ?? 'none'} strokeWidth={edge ? 0.5 : 0} />);

function wxParts(kind: WxKind, mono: boolean, dropRef: string): WxParts {
  const blue = mono ? 'currentColor' : dropRef;
  const up = 'translate(1.2 -2.3) scale(0.9)';
  switch (kind) {
    case 'sun':
      return {};
    case 'moon':
      return {};
    case 'pcDay':
      return { back: 'sun', cloud: { t: 'translate(-0.6 3.4) scale(0.86)' } };
    case 'pcNight':
      return { back: 'moon', cloud: { t: 'translate(-0.6 3.4) scale(0.86)' } };
    case 'cloud':
      return { cloud: { t: 'translate(0 0.4)' } };
    case 'fog':
      return {
        cloud: { t: up },
        below: <path d="M4.6 17.9h12.6M7.2 21h12.6" fill="none" stroke={mono ? 'currentColor' : '#AEB8C6'} strokeWidth="2" strokeLinecap="round" />,
      };
    case 'drizzle':
      return { cloud: { t: up }, below: DROPS(3, false, blue) };
    case 'rain':
      return { cloud: { t: up }, below: DROPS(3, true, blue) };
    case 'heavyRain':
      return { cloud: { t: up, dark: true }, below: DROPS(4, true, blue) };
    case 'thunder':
      return {
        cloud: { t: up, dark: true },
        below: <path d="M12.9 15.2l-3.7 4.6h2.9l-1.2 3.7 4.3-5.2h-2.9l1.5-3.1z" fill={mono ? 'currentColor' : '#FFD60A'} stroke={mono ? 'currentColor' : '#FFC400'} strokeWidth=".6" strokeLinejoin="round" />,
      };
    case 'snow':
      return { cloud: { t: up }, below: FLAKES(mono ? 'currentColor' : '#FFFFFF', mono ? undefined : '#A9B8CC') };
    default:
      return {};
  }
}

/**
 * Weather glyph. Multicolour by default (yellow sun, soft white clouds, blue rain);
 * `mono` draws everything in currentColor with knock-out gaps where shapes overlap.
 */
export function WxIcon({ kind, size = 24, mono = false, className, title }: { kind: WxKind; size?: number; mono?: boolean; className?: string; title?: string }) {
  const uid = cleanId(useId());
  const id = (s: string) => `wx${uid}${s}`;
  const p = wxParts(kind, mono, `url(#${id('drop')})`);
  const sunFill = mono ? 'currentColor' : `url(#${id('sun')})`;
  const moonFill = mono ? 'currentColor' : `url(#${id('moon')})`;
  const cloudFill = (dark?: boolean) => (mono ? 'currentColor' : `url(#${id(dark ? 'dcl' : 'cl')})`);
  const below = p.below;

  let body: ReactNode;
  if (kind === 'sun')
    body = (
      <g>
        <circle cx="12" cy="12" r="4.9" fill={sunFill} />
        <path d={rays(12, 12, 7.5, 9.9)} stroke={mono ? 'currentColor' : '#FFC800'} strokeWidth="2.1" strokeLinecap="round" fill="none" />
      </g>
    );
  else if (kind === 'moon') body = <path d={MOON} fill={moonFill} stroke={mono ? 'currentColor' : '#E3E8EF'} strokeWidth=".6" strokeLinejoin="round" />;
  else if (kind === 'wind')
    body = <path d="M3 8.6h10.4a2.7 2.7 0 1 0-2.7-2.7M3 12.4h15.2a2.9 2.9 0 1 1-2.9 2.9M3 16.2h7.4a2.4 2.4 0 1 1-2.4 2.4" fill="none" stroke={mono ? 'currentColor' : '#A7B7CA'} strokeWidth="2.1" strokeLinecap="round" />;
  else if (kind === 'unknown')
    body = (
      <g fill={mono ? 'currentColor' : '#C7CFDA'}>
        <path d="M12 2.6a2.9 2.9 0 0 1 2.9 2.9v8.1a4.9 4.9 0 1 1-5.8 0V5.5A2.9 2.9 0 0 1 12 2.6z" />
        <circle cx="12" cy="17.4" r="2.3" fill={mono ? 'currentColor' : '#FF6B5B'} />
      </g>
    );
  else {
    const back =
      p.back === 'sun' ? (
        <g>
          <circle cx="15.4" cy="8.4" r="3.7" fill={sunFill} />
          <path d={SUN_RAYS_SMALL(15.4, 8.4, 0.95)} stroke={mono ? 'currentColor' : '#FFC800'} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
      ) : p.back === 'moon' ? (
        <path d={crescent(14.6, 8.4, 5.6, 18.6, 5, 4.4)} fill={moonFill} />
      ) : null;
    const cloudT = p.cloud?.t ?? '';
    body = (
      <>
        {back &&
          (mono ? (
            <>
              <mask id={id('m')} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="#fff" />
                <path d={CLOUD} transform={cloudT} fill="#000" stroke="#000" strokeWidth={2.6 / (cloudT.includes('0.86') ? 0.86 : 1)} />
              </mask>
              <g mask={`url(#${id('m')})`}>{back}</g>
            </>
          ) : (
            back
          ))}
        {p.cloud && (
          <path
            d={CLOUD}
            transform={cloudT}
            fill={cloudFill(p.cloud.dark)}
            stroke={mono ? 'none' : p.cloud.dark ? 'rgba(60,70,90,.18)' : 'rgba(120,135,160,.22)'}
            strokeWidth={mono ? 0 : 0.6}
          />
        )}
        {below}
      </>
    );
  }

  return (
    <svg className={`wx-ico${mono ? ' mono' : ''}${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" width={size} height={size} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {!mono && (
        <defs>
          <radialGradient id={id('sun')} cx="40%" cy="38%" r="70%">
            <stop offset="0" stopColor="#FFE874" />
            <stop offset=".6" stopColor="#FFD21F" />
            <stop offset="1" stopColor="#FFB800" />
          </radialGradient>
          <linearGradient id={id('moon')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#D9DFEA" />
          </linearGradient>
          <linearGradient id={id('cl')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#D3DBE6" />
          </linearGradient>
          <linearGradient id={id('dcl')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C9D1DD" />
            <stop offset="1" stopColor="#8A95A6" />
          </linearGradient>
          <linearGradient id={id('drop')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7FD3FF" />
            <stop offset="1" stopColor="#2F8DFF" />
          </linearGradient>
        </defs>
      )}
      {body}
    </svg>
  );
}

/** short readable label for a weather kind (for aria / fallbacks) */
export const WX_LABEL: Record<WxKind, string> = {
  sun: 'Clear',
  moon: 'Clear',
  pcDay: 'Partly Cloudy',
  pcNight: 'Partly Cloudy',
  cloud: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  heavyRain: 'Heavy Rain',
  thunder: 'Thunderstorms',
  snow: 'Snow',
  wind: 'Windy',
  unknown: 'Weather',
};

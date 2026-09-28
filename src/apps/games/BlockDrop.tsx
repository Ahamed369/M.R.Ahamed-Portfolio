import { useEffect, useRef, useState } from 'react';
import { Overlay, rand, roundRect, tone, useFitCanvas, useKeys, useLoop, type GameProps } from './core';

const W = 10;
const H = 20;
const S = 24;
const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];
const COLORS = ['#5ac8fa', '#ffcc00', '#af52de', '#0a84ff', '#ff9f0a', '#ff3b30', '#34c759'];
interface Piece {
  m: number[][];
  x: number;
  y: number;
  c: number;
}
const rot = (m: number[][]) => m[0].map((_, i) => m.map((r) => r[i]).reverse());
const newPiece = (): Piece => {
  const c = rand(7);
  return { m: SHAPES[c], x: 3, y: 0, c };
};

export default function BlockDrop({ api }: GameProps) {
  const { wrapRef, canvasRef, css, begin } = useFitCanvas(W * S, H * S);
  const [status, setStatus] = useState<'ready' | 'play' | 'over'>('ready');
  const [info, setInfo] = useState({ score: 0, lines: 0, level: 1 });
  const g = useRef({ grid: Array.from({ length: H }, () => Array(W).fill(-1)) as number[][], p: newPiece(), next: newPiece(), acc: 0, score: 0, lines: 0 });

  const fits = (m: number[][], x: number, y: number) =>
    m.every((r, dy) => r.every((v, dx) => !v || (x + dx >= 0 && x + dx < W && y + dy < H && (y + dy < 0 || g.current.grid[y + dy][x + dx] < 0))));

  const lock = () => {
    const s = g.current;
    s.p.m.forEach((r, dy) => r.forEach((v, dx) => v && s.p.y + dy >= 0 && (s.grid[s.p.y + dy][s.p.x + dx] = s.p.c)));
    const kept = s.grid.filter((r) => r.some((v) => v < 0));
    const cleared = H - kept.length;
    s.grid = [...Array.from({ length: cleared }, () => Array(W).fill(-1)), ...kept];
    if (cleared) {
      s.lines += cleared;
      s.score += [0, 100, 300, 500, 800][cleared] * (1 + Math.floor(s.lines / 10));
      tone(520 + cleared * 120, 160);
      if (s.lines >= 10) api.achieve('blocks-10');
    } else tone(180, 40, 'triangle', 0.06);
    s.p = s.next;
    s.next = newPiece();
    setInfo({ score: s.score, lines: s.lines, level: 1 + Math.floor(s.lines / 10) });
    api.setScore(s.score);
    if (!fits(s.p.m, s.p.x, s.p.y)) {
      setStatus('over');
      api.finish(s.score);
    }
  };
  const act = (k: 'left' | 'right' | 'down' | 'rotate' | 'drop') => {
    if (status !== 'play') return;
    const s = g.current;
    if (k === 'left' && fits(s.p.m, s.p.x - 1, s.p.y)) s.p.x--;
    if (k === 'right' && fits(s.p.m, s.p.x + 1, s.p.y)) s.p.x++;
    if (k === 'down') {
      if (fits(s.p.m, s.p.x, s.p.y + 1)) s.p.y++;
      else lock();
    }
    if (k === 'rotate') {
      const r = rot(s.p.m);
      for (const off of [0, -1, 1, -2, 2]) if (fits(r, s.p.x + off, s.p.y)) {
        s.p.m = r;
        s.p.x += off;
        break;
      }
    }
    if (k === 'drop') {
      while (fits(s.p.m, s.p.x, s.p.y + 1)) s.p.y++;
      lock();
    }
    draw();
  };
  useKeys(api.focused, (e) => {
    const map: Record<string, 'left' | 'right' | 'down' | 'rotate' | 'drop'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', ' ': 'drop', a: 'left', d: 'right', s: 'down', w: 'rotate' };
    if (map[e.key]) {
      e.preventDefault();
      if (status === 'ready') setStatus('play');
      act(map[e.key]);
    }
  });

  const draw = () => {
    const ctx = begin();
    if (!ctx) return;
    const s = g.current;
    ctx.fillStyle = api.dark ? '#141418' : '#f2f2f7';
    ctx.fillRect(0, 0, W * S, H * S);
    const cell = (x: number, y: number, c: number, a = 1) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = COLORS[c];
      roundRect(ctx, x * S + 1, y * S + 1, S - 2, S - 2, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    s.grid.forEach((r, y) => r.forEach((v, x) => v >= 0 && cell(x, y, v)));
    let gy = s.p.y;
    while (fits(s.p.m, s.p.x, gy + 1)) gy++;
    s.p.m.forEach((r, dy) => r.forEach((v, dx) => v && cell(s.p.x + dx, gy + dy, s.p.c, 0.18)));
    s.p.m.forEach((r, dy) => r.forEach((v, dx) => v && cell(s.p.x + dx, s.p.y + dy, s.p.c)));
  };
  useEffect(draw);
  useLoop(status === 'play' && !api.paused, (dt) => {
    const s = g.current;
    s.acc += dt;
    const speed = Math.max(0.08, 0.7 - Math.floor(s.lines / 10) * 0.07);
    if (s.acc >= speed) {
      s.acc = 0;
      act('down');
    }
  });

  return (
    <div className="gm-canvas-stage gm-blocks">
      <div className="gm-side-info">
        <span>Score <b>{info.score}</b></span>
        <span>Lines <b>{info.lines}</b></span>
        <span>Level <b>{info.level}</b></span>
      </div>
      <div className="gm-fit" ref={wrapRef}>
        <canvas ref={canvasRef} style={{ width: css.w, height: css.h }} className="gm-canvas" onPointerDown={() => status === 'ready' && setStatus('play')} aria-label="Block Drop board" />
        {status === 'ready' && (
          <Overlay title="Block Drop" sub="← → move · ↑ rotate · ↓ soft drop · Space hard drop.">
            <button type="button" className="btn btn-primary" onClick={() => setStatus('play')}>Start</button>
          </Overlay>
        )}
        {status === 'over' && (
          <Overlay title="Game over" sub={`${info.score} points · ${info.lines} lines.`} tone="lose">
            <button type="button" className="btn btn-primary" onClick={api.restart}>Play again</button>
          </Overlay>
        )}
      </div>
      <div className="gm-pad">
        <button type="button" onClick={() => act('left')} aria-label="Left">◀</button>
        <button type="button" onClick={() => act('rotate')} aria-label="Rotate">⟳</button>
        <button type="button" onClick={() => act('right')} aria-label="Right">▶</button>
        <button type="button" onClick={() => act('down')} aria-label="Down">▼</button>
        <button type="button" onClick={() => act('drop')} aria-label="Hard drop">⤓</button>
      </div>
    </div>
  );
}

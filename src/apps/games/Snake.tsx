import { useEffect, useRef, useState } from 'react';
import { Overlay, keyDir, rand, roundRect, useFitCanvas, useKeys, useLoop, useSwipe, type Dir, type GameProps } from './core';

const N = 20;
const CELL = 20;
type P = { x: number; y: number };
const DV: Record<Dir, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function freeCell(body: P[]): P {
  for (;;) {
    const p = { x: rand(N), y: rand(N) };
    if (!body.some((b) => b.x === p.x && b.y === p.y)) return p;
  }
}

export default function Snake({ api }: GameProps) {
  const { wrapRef, canvasRef, css, begin } = useFitCanvas(N * CELL, N * CELL);
  const [status, setStatus] = useState<'ready' | 'play' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const st = useRef({
    body: [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }] as P[],
    dir: 'right' as Dir,
    queue: [] as Dir[],
    food: { x: 14, y: 10 } as P,
    acc: 0,
    speed: 0.14,
    score: 0,
    pulse: 0,
  });

  const draw = () => {
    const ctx = begin();
    if (!ctx) return;
    const s = st.current;
    const dark = api.dark;
    ctx.fillStyle = dark ? '#16241b' : '#e8f6e4';
    ctx.fillRect(0, 0, N * CELL, N * CELL);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.035)' : 'rgba(40,120,40,0.07)';
    for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    // food
    const r = 6.5 + Math.sin(s.pulse * 6) * 1.2;
    ctx.fillStyle = '#ff4d5e';
    ctx.beginPath();
    ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5fd35f';
    ctx.fillRect(s.food.x * CELL + CELL / 2 - 1, s.food.y * CELL + 2, 3, 5);
    // body
    s.body.forEach((b, i) => {
      const t = i / Math.max(1, s.body.length - 1);
      ctx.fillStyle = `hsl(${140 - t * 40}, 70%, ${dark ? 52 - t * 12 : 42 - t * 8}%)`;
      roundRect(ctx, b.x * CELL + 1.5, b.y * CELL + 1.5, CELL - 3, CELL - 3, i === 0 ? 7 : 5);
      ctx.fill();
    });
    // eyes
    const h = s.body[0];
    const d = DV[s.dir];
    ctx.fillStyle = '#fff';
    const cx = h.x * CELL + CELL / 2;
    const cy = h.y * CELL + CELL / 2;
    for (const k of [-1, 1]) {
      const ex = cx + d.x * 4 + d.y * k * 4.5;
      const ey = cy + d.y * 4 + d.x * k * 4.5;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  useEffect(draw); // redraw on any render (resize, theme, status)

  const turn = (d: Dir) => {
    const s = st.current;
    if (status === 'over') return;
    if (status === 'ready') {
      setStatus('play');
      // first key both starts the game and steers (a reverse press turns via the side instead of being ignored)
      if (d === OPP[s.dir]) {
        s.queue.push(s.dir === 'left' || s.dir === 'right' ? 'up' : 'left');
        return;
      }
    }
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (d !== last && d !== OPP[last] && s.queue.length < 3) s.queue.push(d);
  };

  useKeys(api.focused, (e) => {
    const d = keyDir(e.key);
    if (d) {
      e.preventDefault();
      turn(d);
    } else if ((e.key === ' ' || e.key === 'Enter') && status === 'ready') {
      e.preventDefault();
      setStatus('play');
    }
  });
  useSwipe(wrapRef, turn);

  useLoop(status === 'play' && !api.paused, (dt) => {
    const s = st.current;
    s.pulse += dt;
    s.acc += dt;
    while (s.acc >= s.speed) {
      s.acc -= s.speed;
      if (s.queue.length) s.dir = s.queue.shift()!;
      const d = DV[s.dir];
      const head = { x: s.body[0].x + d.x, y: s.body[0].y + d.y };
      const eats = head.x === s.food.x && head.y === s.food.y;
      const body = eats ? s.body : s.body.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || body.some((b) => b.x === head.x && b.y === head.y)) {
        setStatus('over');
        api.finish(s.score);
        break;
      }
      s.body = [head, ...body];
      if (eats) {
        s.score += 10;
        s.speed = Math.max(0.06, s.speed - 0.004);
        s.food = freeCell(s.body);
        setScore(s.score);
        api.setScore(s.score);
        if (s.score >= 100) api.achieve('snake-100');
      }
    }
    draw();
  });

  return (
    <div className="gm-canvas-stage gm-snake">
      <div className="gm-fit" ref={wrapRef}>
        <canvas ref={canvasRef} style={{ width: css.w, height: css.h }} className="gm-canvas" aria-label={`Snake board, score ${score}`} onPointerDown={() => status === 'ready' && setStatus('play')} />
        {status === 'ready' && <Overlay title="Snake" sub="Arrow keys / WASD or swipe to steer. Eat the red dots, don't bite yourself." />}
        {status === 'over' && (
          <Overlay title="Game over" sub={`You scored ${score} points (length ${st.current.body.length}).`} tone="lose">
            <button type="button" className="btn btn-primary" onClick={api.restart}>Play again</button>
          </Overlay>
        )}
      </div>
      <div className="gm-dpad" aria-label="Direction pad">
        {(['up', 'left', 'down', 'right'] as Dir[]).map((d) => (
          <button key={d} type="button" className={`gm-dpad-${d}`} aria-label={d} onClick={() => turn(d)}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4 13 11H3Z" fill="currentColor" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Overlay, roundRect, tone, useFitCanvas, useKeys, useLoop, type GameProps } from './core';

const W = 480;
const H = 360;
const COLS = 10;
const ROWS = 5;
const COLORS = ['#ff3b30', '#ff9f0a', '#ffcc00', '#34c759', '#0a84ff'];
const bricks = () => Array.from({ length: COLS * ROWS }, () => true);

export default function Bricks({ api }: GameProps) {
  const { wrapRef, canvasRef, css, begin, toWorld } = useFitCanvas(W, H);
  const [status, setStatus] = useState<'ready' | 'play' | 'over' | 'won'>('ready');
  const [hud, setHud] = useState({ score: 0, lives: 3 });
  const s = useRef({ px: W / 2, bx: W / 2, by: H - 60, vx: 180, vy: -220, b: bricks(), score: 0, lives: 3, keys: { l: false, r: false } });

  useKeys(api.focused, (e) => {
    if (e.key === ' ' && status !== 'play') setStatus('play');
  });
  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') s.current.keys.l = e.type === 'keydown';
      if (e.key === 'ArrowRight') s.current.keys.r = e.type === 'keydown';
    };
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', d);
    return () => {
      window.removeEventListener('keydown', d);
      window.removeEventListener('keyup', d);
    };
  }, []);

  const draw = () => {
    const ctx = begin();
    if (!ctx) return;
    const g = s.current;
    ctx.fillStyle = api.dark ? '#101014' : '#f5f5f7';
    ctx.fillRect(0, 0, W, H);
    const bw = W / COLS;
    g.b.forEach((alive, i) => {
      if (!alive) return;
      ctx.fillStyle = COLORS[Math.floor(i / COLS)];
      roundRect(ctx, (i % COLS) * bw + 3, Math.floor(i / COLS) * 22 + 40, bw - 6, 16, 4);
      ctx.fill();
    });
    ctx.fillStyle = api.dark ? '#e5e5ea' : '#1d1d1f';
    roundRect(ctx, g.px - 45, H - 24, 90, 12, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(g.bx, g.by, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2d55';
    ctx.fill();
  };
  useEffect(draw);
  useLoop(status === 'play' && !api.paused, (dt) => {
    const g = s.current;
    if (g.keys.l) g.px -= 420 * dt;
    if (g.keys.r) g.px += 420 * dt;
    g.px = Math.max(45, Math.min(W - 45, g.px));
    g.bx += g.vx * dt;
    g.by += g.vy * dt;
    if (g.bx < 7 || g.bx > W - 7) {
      g.vx *= -1;
      g.bx = Math.max(7, Math.min(W - 7, g.bx));
    }
    if (g.by < 7) {
      g.vy = Math.abs(g.vy);
    }
    if (g.by > H - 30 && g.by < H - 12 && Math.abs(g.bx - g.px) < 50 && g.vy > 0) {
      g.vy = -Math.abs(g.vy) * 1.02;
      g.vx = ((g.bx - g.px) / 50) * 260;
      tone(500, 40);
    }
    const bw = W / COLS;
    const col = Math.floor(g.bx / bw);
    const row = Math.floor((g.by - 40) / 22);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS && g.b[row * COLS + col]) {
      g.b[row * COLS + col] = false;
      g.vy *= -1;
      g.score += 10 * (ROWS - row);
      tone(700 + row * 60, 50);
      setHud({ score: g.score, lives: g.lives });
      api.setScore(g.score);
      if (!g.b.some(Boolean)) {
        setStatus('won');
        api.achieve('bricks-clear');
        api.finish(g.score, { win: true });
      }
    }
    if (g.by > H + 10) {
      g.lives--;
      tone(150, 300, 'sawtooth');
      setHud({ score: g.score, lives: g.lives });
      if (g.lives <= 0) {
        setStatus('over');
        api.finish(g.score);
      } else Object.assign(g, { bx: g.px, by: H - 60, vx: 160, vy: -220 });
    }
    draw();
  });

  return (
    <div className="gm-canvas-stage">
      <p className="gm-hint">Score {hud.score} · {'❤️'.repeat(Math.max(0, hud.lives))}</p>
      <div className="gm-fit" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: css.w, height: css.h, touchAction: 'none' }}
          className="gm-canvas"
          onPointerMove={(e) => (s.current.px = toWorld(e.clientX, e.clientY).x)}
          onPointerDown={(e) => {
            s.current.px = toWorld(e.clientX, e.clientY).x;
            if (status === 'ready') setStatus('play');
          }}
          aria-label="Brick Breaker"
        />
        {status === 'ready' && <Overlay title="Brick Breaker" sub="Move the paddle with the mouse, touch or ← →. Click or press Space to launch." />}
        {(status === 'over' || status === 'won') && (
          <Overlay title={status === 'won' ? 'Wall cleared!' : 'Game over'} sub={`Score ${hud.score}.`} tone={status === 'won' ? 'win' : 'lose'}>
            <button type="button" className="btn btn-primary" onClick={api.restart}>Play again</button>
          </Overlay>
        )}
      </div>
    </div>
  );
}

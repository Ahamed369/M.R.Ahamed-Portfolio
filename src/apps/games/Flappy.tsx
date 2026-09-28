import { useEffect, useRef, useState } from 'react';
import { Overlay, roundRect, tone, useFitCanvas, useKeys, useLoop, type GameProps } from './core';

const W = 360;
const H = 480;
const GAP = 140;

export default function Flappy({ api }: GameProps) {
  const { wrapRef, canvasRef, css, begin } = useFitCanvas(W, H);
  const [status, setStatus] = useState<'ready' | 'play' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const s = useRef({ y: H / 2, v: 0, pipes: [] as { x: number; gap: number; passed: boolean }[], t: 0, score: 0 });

  const flap = () => {
    if (status === 'over') return;
    if (status === 'ready') setStatus('play');
    s.current.v = -290;
    tone(620, 50, 'triangle', 0.06);
  };
  useKeys(api.focused, (e) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
      e.preventDefault();
      flap();
    }
  });

  const draw = () => {
    const ctx = begin();
    if (!ctx) return;
    const g = s.current;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, api.dark ? '#0b1d3a' : '#7fd4ff');
    sky.addColorStop(1, api.dark ? '#1c3b5e' : '#d8f3ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    g.pipes.forEach((p) => {
      ctx.fillStyle = '#34c759';
      roundRect(ctx, p.x, -10, 56, p.gap - GAP / 2 + 10, 8);
      ctx.fill();
      roundRect(ctx, p.x, p.gap + GAP / 2, 56, H, 8);
      ctx.fill();
    });
    ctx.fillStyle = '#c8a86b';
    ctx.fillRect(0, H - 24, W, 24);
    ctx.save();
    ctx.translate(90, g.y);
    ctx.rotate(Math.max(-0.5, Math.min(0.9, g.v / 500)));
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1d1f';
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9f0a';
    ctx.fillRect(10, 1, 9, 5);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(g.score), W / 2, 60);
  };
  useEffect(draw);
  useLoop(status === 'play' && !api.paused, (dt) => {
    const g = s.current;
    g.v += 900 * dt;
    g.y += g.v * dt;
    g.t += dt;
    if (g.t > 1.45) {
      g.t = 0;
      g.pipes.push({ x: W, gap: 110 + Math.random() * (H - 260), passed: false });
    }
    g.pipes.forEach((p) => {
      p.x -= 140 * dt;
      if (!p.passed && p.x + 56 < 90) {
        p.passed = true;
        g.score++;
        setScore(g.score);
        api.setScore(g.score);
        tone(880, 60);
        if (g.score >= 10) api.achieve('flappy-10');
      }
    });
    g.pipes = g.pipes.filter((p) => p.x > -60);
    const hit = g.y > H - 38 || g.y < 0 || g.pipes.some((p) => p.x < 104 && p.x + 56 > 76 && (g.y - 12 < p.gap - GAP / 2 || g.y + 12 > p.gap + GAP / 2));
    if (hit) {
      setStatus('over');
      tone(140, 300, 'sawtooth');
      api.finish(g.score);
    }
    draw();
  });

  return (
    <div className="gm-canvas-stage">
      <div className="gm-fit" ref={wrapRef}>
        <canvas ref={canvasRef} style={{ width: css.w, height: css.h }} className="gm-canvas" onPointerDown={flap} aria-label={`Flappy Dot, score ${score}`} />
        {status === 'ready' && <Overlay title="Flappy Dot" sub="Click, tap or press Space to flap through the gaps." />}
        {status === 'over' && (
          <Overlay title="Ouch!" sub={`You passed ${score} pipes.`} tone="lose">
            <button type="button" className="btn btn-primary" onClick={api.restart}>Fly again</button>
          </Overlay>
        )}
      </div>
    </div>
  );
}

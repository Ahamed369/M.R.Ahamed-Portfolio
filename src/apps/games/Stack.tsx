import { useEffect, useRef, useState } from 'react';
import { Overlay, roundRect, tone, useFitCanvas, useKeys, useLoop, type GameProps } from './core';

const W = 360;
const H = 520;
const BH = 26;

export default function Stack({ api }: GameProps) {
  const { wrapRef, canvasRef, css, begin } = useFitCanvas(W, H);
  const [status, setStatus] = useState<'ready' | 'play' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const s = useRef({ blocks: [{ x: 80, w: 200 }] as { x: number; w: number }[], cur: { x: 0, w: 200, dir: 1 }, speed: 170, cam: 0, perfect: 0 });

  const place = () => {
    if (status === 'ready') return setStatus('play');
    if (status !== 'play') return;
    const g = s.current;
    const top = g.blocks[g.blocks.length - 1];
    const left = Math.max(top.x, g.cur.x);
    const right = Math.min(top.x + top.w, g.cur.x + g.cur.w);
    let w = right - left;
    if (w <= 0) {
      setStatus('over');
      tone(140, 300, 'sawtooth');
      api.finish(g.blocks.length - 1);
      return;
    }
    let x = left;
    if (Math.abs(g.cur.x - top.x) < 5) {
      x = top.x;
      w = top.w;
      g.perfect++;
      tone(700 + g.perfect * 60, 90);
    } else {
      g.perfect = 0;
      tone(440, 60);
    }
    g.blocks.push({ x, w });
    g.cur = { x: g.blocks.length % 2 ? -w : W, w, dir: g.blocks.length % 2 ? 1 : -1 };
    g.speed = Math.min(420, g.speed + 8);
    const n = g.blocks.length - 1;
    setScore(n);
    api.setScore(n);
    if (n >= 15) api.achieve('stack-15');
  };
  useKeys(api.focused, (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      place();
    }
  });

  const draw = () => {
    const ctx = begin();
    if (!ctx) return;
    const g = s.current;
    const n = g.blocks.length;
    const hue = (i: number) => `hsl(${(200 + i * 9) % 360} 75% 58%)`;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `hsl(${(210 + n * 9) % 360} 60% ${api.dark ? 14 : 88}%)`);
    bg.addColorStop(1, `hsl(${(250 + n * 9) % 360} 60% ${api.dark ? 22 : 96}%)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const base = H - 60 + g.cam;
    g.blocks.forEach((b, i) => {
      ctx.fillStyle = hue(i);
      roundRect(ctx, b.x, base - i * BH, b.w, BH - 2, 4);
      ctx.fill();
    });
    if (status !== 'over') {
      ctx.fillStyle = hue(n);
      roundRect(ctx, g.cur.x, base - n * BH, g.cur.w, BH - 2, 4);
      ctx.fill();
    }
    ctx.fillStyle = api.dark ? '#fff' : '#1d1d1f';
    ctx.font = 'bold 40px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(n - 1), W / 2, 70);
  };
  useEffect(draw);
  useLoop(status === 'play' && !api.paused, (dt) => {
    const g = s.current;
    g.cur.x += g.cur.dir * g.speed * dt;
    if (g.cur.x > W - g.cur.w / 3) g.cur.dir = -1;
    if (g.cur.x < -g.cur.w * 0.66) g.cur.dir = 1;
    const target = Math.max(0, (g.blocks.length - 10) * BH);
    g.cam += (target - g.cam) * Math.min(1, dt * 6);
    draw();
  });

  return (
    <div className="gm-canvas-stage">
      <div className="gm-fit" ref={wrapRef}>
        <canvas ref={canvasRef} style={{ width: css.w, height: css.h }} className="gm-canvas" onPointerDown={place} aria-label={`Stack Tower, height ${score}`} />
        {status === 'ready' && <Overlay title="Stack Tower" sub="Tap or press Space to drop each block exactly on the one below. Perfect drops keep it wide!" />}
        {status === 'over' && (
          <Overlay title={`${score} blocks high`} tone="lose">
            <button type="button" className="btn btn-primary" onClick={api.restart}>Stack again</button>
          </Overlay>
        )}
      </div>
    </div>
  );
}

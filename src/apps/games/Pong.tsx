import { useEffect, useRef, useState } from 'react';
import { Overlay, roundRect, tone, useFitCanvas, useLoop, type GameProps } from './core';

const W = 480;
const H = 320;

export default function Pong({ api }: GameProps) {
  const { wrapRef, canvasRef, css, begin, toWorld } = useFitCanvas(W, H);
  const [status, setStatus] = useState<'ready' | 'play' | 'over'>('ready');
  const [sc, setSc] = useState({ me: 0, ai: 0 });
  const s = useRef({ me: H / 2, ai: H / 2, bx: W / 2, by: H / 2, vx: 240, vy: 120, keys: { u: false, d: false }, score: { me: 0, ai: 0 } });

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') s.current.keys.u = e.type === 'keydown';
      if (e.key === 'ArrowDown' || e.key === 's') s.current.keys.d = e.type === 'keydown';
    };
    window.addEventListener('keydown', k);
    window.addEventListener('keyup', k);
    return () => {
      window.removeEventListener('keydown', k);
      window.removeEventListener('keyup', k);
    };
  }, []);

  const draw = () => {
    const ctx = begin();
    if (!ctx) return;
    const g = s.current;
    ctx.fillStyle = '#0c1a12';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    roundRect(ctx, 14, g.me - 32, 10, 64, 5);
    ctx.fill();
    roundRect(ctx, W - 24, g.ai - 32, 10, 64, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(g.bx, g.by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${g.score.me}   ${g.score.ai}`, W / 2, 42);
  };
  useEffect(draw);
  useLoop(status === 'play' && !api.paused, (dt) => {
    const g = s.current;
    if (g.keys.u) g.me -= 360 * dt;
    if (g.keys.d) g.me += 360 * dt;
    g.me = Math.max(32, Math.min(H - 32, g.me));
    g.ai += Math.max(-230 * dt, Math.min(230 * dt, g.by - g.ai));
    g.bx += g.vx * dt;
    g.by += g.vy * dt;
    if (g.by < 7 || g.by > H - 7) g.vy *= -1;
    const paddle = (px: number, py: number, dirOk: boolean) => dirOk && Math.abs(g.bx - px) < 12 && Math.abs(g.by - py) < 38;
    if (paddle(24, g.me, g.vx < 0) || paddle(W - 24, g.ai, g.vx > 0)) {
      g.vx = -g.vx * 1.05;
      g.vy += (g.by - (g.vx > 0 ? g.me : g.ai)) * 4;
      tone(560, 40);
    }
    if (g.bx < -10 || g.bx > W + 10) {
      if (g.bx < 0) g.score.ai++;
      else g.score.me++;
      setSc({ ...g.score });
      api.setScore(g.score.me);
      tone(g.bx < 0 ? 200 : 800, 160);
      Object.assign(g, { bx: W / 2, by: H / 2, vx: g.bx < 0 ? 240 : -240, vy: (Math.random() - 0.5) * 240 });
      if (g.score.me === 5 || g.score.ai === 5) {
        setStatus('over');
        if (g.score.me === 5) api.achieve('pong-win');
        api.finish(g.score.me, { win: g.score.me === 5 });
      }
    }
    draw();
  });

  return (
    <div className="gm-canvas-stage">
      <div className="gm-fit" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: css.w, height: css.h, touchAction: 'none' }}
          className="gm-canvas"
          onPointerMove={(e) => (s.current.me = toWorld(e.clientX, e.clientY).y)}
          onPointerDown={() => status === 'ready' && setStatus('play')}
          aria-label={`Pong ${sc.me} to ${sc.ai}`}
        />
        {status === 'ready' && <Overlay title="Pong" sub="Move your paddle with the mouse, touch or ↑ ↓. First to 5 wins. Click to serve." />}
        {status === 'over' && (
          <Overlay title={sc.me === 5 ? 'You win!' : 'Computer wins'} sub={`${sc.me} – ${sc.ai}`} tone={sc.me === 5 ? 'win' : 'lose'}>
            <button type="button" className="btn btn-primary" onClick={api.restart}>Rematch</button>
          </Overlay>
        )}
      </div>
    </div>
  );
}

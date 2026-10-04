import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../system/SettingsContext';

type Fx = 'rain' | 'snow' | null;
const CK = 'mra-wxfx-cache';

async function currentFx(): Promise<Fx> {
  try {
    const c = JSON.parse(sessionStorage.getItem(CK) ?? 'null') as { at: number; fx: Fx } | null;
    if (c && Date.now() - c.at < 30 * 60000) return c.fx;
  } catch {
    /* ignore */
  }
  const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=7.2906&longitude=80.6337&current=weather_code&timezone=Asia%2FColombo');
  if (!r.ok) return null;
  const d = (await r.json()) as { current?: { weather_code?: number } };
  const code = d.current?.weather_code ?? 0;
  const fx: Fx = (code >= 71 && code <= 77) || code === 85 || code === 86 ? 'snow' : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 ? 'rain' : null;
  try {
    sessionStorage.setItem(CK, JSON.stringify({ at: Date.now(), fx }));
  } catch {
    /* ignore */
  }
  return fx;
}

/**
 * v10.1 — gentle rain or snow over the desktop wallpaper when it is raining or
 * snowing in Kandy right now (live Open-Meteo data, checked every 30 minutes).
 * Off with Reduce Motion, Low Power or slow graphics.
 */
export function WeatherFx() {
  const { settings, motionReduced } = useSettings();
  const [fx, setFx] = useState<Fx>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const on = settings.weatherFx !== false && !motionReduced && settings.lowPowerMode !== 'always';
  useEffect(() => {
    if (!on) return;
    let live = true;
    const check = () => void currentFx().then((f) => live && setFx(f)).catch(() => undefined);
    check();
    const t = window.setInterval(check, 30 * 60000);
    // a demo hook for the console / tests: window.dispatchEvent(new CustomEvent('mra-wxfx', { detail: 'rain' }))
    const demo = (e: Event) => setFx((e as CustomEvent<Fx>).detail);
    window.addEventListener('mra-wxfx', demo);
    return () => {
      live = false;
      window.clearInterval(t);
      window.removeEventListener('mra-wxfx', demo);
    };
  }, [on]);
  useEffect(() => {
    const c = cv.current;
    if (!on || !fx || !c) return;
    const g = c.getContext('2d');
    if (!g) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    };
    size();
    window.addEventListener('resize', size);
    const N = fx === 'rain' ? 140 : 90;
    const P = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6, r: Math.random() }));
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      if (document.documentElement.dataset.perf === 'low' || document.hidden) {
        raf = requestAnimationFrame(step);
        return;
      }
      g.clearRect(0, 0, c.width, c.height);
      for (const p of P) {
        if (fx === 'rain') {
          p.y += p.v * dt * 1.4;
          p.x += dt * 0.05;
          g.strokeStyle = `rgba(200,215,255,${0.18 + p.r * 0.25})`;
          g.lineWidth = dpr;
          g.beginPath();
          g.moveTo(p.x * c.width, p.y * c.height);
          g.lineTo(p.x * c.width + 2 * dpr, p.y * c.height + (10 + p.r * 10) * dpr);
          g.stroke();
        } else {
          p.y += p.v * dt * 0.12;
          p.x += Math.sin(now / 1200 + p.r * 6) * dt * 0.02;
          g.fillStyle = `rgba(255,255,255,${0.5 + p.r * 0.4})`;
          g.beginPath();
          g.arc(p.x * c.width, p.y * c.height, (1 + p.r * 2) * dpr, 0, Math.PI * 2);
          g.fill();
        }
        if (p.y > 1.02) {
          p.y = -0.05;
          p.x = Math.random();
        }
        if (p.x > 1.02) p.x = -0.02;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
  }, [on, fx]);
  if (!on || !fx) return null;
  return <canvas ref={cv} className="wx-fx" aria-hidden="true" />;
}

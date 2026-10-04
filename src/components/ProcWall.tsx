import { memo, useEffect, useRef, useState } from 'react';
import { useSettings } from '../system/SettingsContext';
import { sunTimes } from '../system/sun';
import { personal } from '../data/portfolio';

/**
 * v10.2 — wallpapers drawn in code. Every one is responsive (container units), so
 * a phone gets a tall composition, an iPad a balanced one in portrait and
 * landscape, and a Mac a wide one — not one picture cropped three ways.
 *
 *  · still = a static representative frame (thumbnails, Reduce Motion, Low Power,
 *    "Motion" switched off). Live ones pause automatically in hidden tabs.
 */
export const ProcWall = memo(function ProcWall({ id, still: stillProp = false }: { id: string; still?: boolean }) {
  const { settings, motionReduced } = useSettings();
  const still = stillProp || motionReduced || settings.lowPowerMode === 'always' || settings.wallMotion === false;
  const box = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWide(el.clientWidth >= el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // pointer depth for Glass Orbs (desktop pointers only, never while still)
  useEffect(() => {
    if (id !== 'live-orbs' || still) return;
    const el = box.current;
    const mv = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !el) return;
      el.style.setProperty('--px', String(e.clientX / window.innerWidth - 0.5));
      el.style.setProperty('--py', String(e.clientY / window.innerHeight - 0.5));
    };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => window.removeEventListener('pointermove', mv);
  }, [id, still]);
  return (
    <div ref={box} className={`pw pw-${id} ${still ? 'still' : 'moving'} ${wide ? 'wide' : 'tall'}`} aria-hidden="true">
      <Body id={id} still={still} wide={wide} />
    </div>
  );
});

function Body({ id, still, wide }: { id: string; still: boolean; wide: boolean }) {
  switch (id) {
    case 'live-aurora':
      return (
        <>
          <Stars n={70} seed={3} />
          <i className="au a1" />
          <i className="au a2" />
          <i className="au a3" />
          <i className="au-ground" />
        </>
      );
    case 'live-flow':
      return (
        <>
          <i className="fb b1" />
          <i className="fb b2" />
          <i className="fb b3" />
          <i className="fb b4" />
          <i className="grain" />
        </>
      );
    case 'live-orbs':
      return (
        <>
          <i className="orb o1" />
          <i className="orb o2" />
          <i className="orb o3" />
          <i className="orb o4" />
        </>
      );
    case 'live-waves':
      return (
        <>
          <i className="wv-sky" />
          {[0, 1, 2, 3].map((k) => (
            <svg key={k} className={`wv w${k}`} viewBox="0 0 1200 200" preserveAspectRatio="none">
              <path d="M0 100 C 150 40 300 160 450 100 S 750 40 900 100 S 1200 160 1200 100 V200 H0 Z M1200 100 C 1350 40 1500 160 1650 100 S 1950 40 2100 100 S 2400 160 2400 100 V200 H1200 Z" />
            </svg>
          ))}
        </>
      );
    case 'live-space':
      return <Space still={still} />;
    case 'live-clouds':
      return (
        <>
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <i key={k} className={`cl c${k}`} />
          ))}
        </>
      );
    case 'dyn-sky':
      return <Sky />;
    case 'dyn-theme':
      return (
        <>
          <i className="th light" />
          <i className="th dark" />
        </>
      );
    case 'art-ribbons':
      return <Ribbons wide={wide} />;
    case 'art-bloom':
      return (
        <>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
            <i key={k} className="petal" style={{ ['--k' as string]: k }} />
          ))}
          <i className="bloom-core" />
        </>
      );
    case 'grad-sunrise':
    case 'grad-ocean':
      return <i className="grain" />;
    case 'space-nebula':
      return (
        <>
          <Stars n={110} seed={11} />
          <i className="nb n1" />
          <i className="nb n2" />
          <i className="nb n3" />
        </>
      );
    case 'min-ink':
      return <span className="emblem">&lt;/&gt;</span>;
    case 'min-paper':
      return <i className="lines" />;
    case 'portfolio-mra':
      return (
        <>
          <i className="fb b1" />
          <i className="fb b3" />
          <span className="mono">
            M.R.<b>Ahamed</b>
          </span>
          <span className="emblem small">&lt;/&gt;</span>
        </>
      );
    case 'portfolio-code':
      return <Code />;
    /* v10.3 — iPad set (light + dark) and light/dark variants for every device */
    case 'ipad-folds-light':
    case 'ipad-folds-dark':
      return <Folds dark={id.endsWith('dark')} wide={wide} />;
    case 'ipad-halo-light':
    case 'ipad-halo-dark':
      return <Halo dark={id.endsWith('dark')} />;
    case 'ipad-dunes-light':
    case 'ipad-dunes-dark':
      return <Dunes dark={id.endsWith('dark')} wide={wide} />;
    case 'art-ribbons-light':
      return <Ribbons wide={wide} light />;
    default:
      return null;
  }
}

/* ───── pieces ───── */

function rnd(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function Stars({ n, seed }: { n: number; seed: number }) {
  const r = rnd(seed);
  return (
    <span className="stars">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ left: `${r() * 100}%`, top: `${r() * 70}%`, ['--s' as string]: `${0.6 + r() * 1.6}px`, ['--d' as string]: `${r() * 4}s` }} />
      ))}
    </span>
  );
}

function Ribbons({ wide, light }: { wide: boolean; light?: boolean }) {
  // two compositions: tall (phones, iPad portrait) and wide (Mac, iPad landscape)
  return wide ? (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="rbA" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#ff6b9a" />
          <stop offset="0.5" stopColor="#845ef7" />
          <stop offset="1" stopColor="#22b8cf" />
        </linearGradient>
        <linearGradient id="rbB" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffa94d" />
          <stop offset="1" stopColor="#f06595" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill={light ? '#f6f2fb' : '#0c0b1d'} />
      <path d="M-100 760 C 300 520 600 900 1000 560 S 1500 300 1750 420" stroke="url(#rbA)" strokeWidth="190" fill="none" opacity="0.95" />
      <path d="M-100 860 C 350 700 700 980 1100 760 S 1500 560 1750 640" stroke="url(#rbB)" strokeWidth="90" fill="none" opacity="0.75" />
      <path d="M-100 380 C 400 260 700 520 1150 300 S 1600 160 1750 220" stroke="url(#rbA)" strokeWidth="60" fill="none" opacity="0.45" />
    </svg>
  ) : (
    <svg viewBox="0 0 1000 2000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="rbAt" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#22b8cf" />
          <stop offset="0.5" stopColor="#845ef7" />
          <stop offset="1" stopColor="#ff6b9a" />
        </linearGradient>
        <linearGradient id="rbBt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f06595" />
          <stop offset="1" stopColor="#ffa94d" />
        </linearGradient>
      </defs>
      <rect width="1000" height="2000" fill={light ? '#f6f2fb' : '#0c0b1d'} />
      {/* keeps the top (status bar, Dynamic Island) calm and the colour in the lower two-thirds, behind the Dock */}
      <path d="M760 -100 C 520 500 980 800 520 1200 S 160 1700 300 2150" stroke="url(#rbAt)" strokeWidth="230" fill="none" opacity="0.95" />
      <path d="M980 600 C 760 1000 1000 1300 640 1600 S 400 2000 480 2150" stroke="url(#rbBt)" strokeWidth="110" fill="none" opacity="0.75" />
      <path d="M200 -100 C 60 400 360 700 120 1100" stroke="url(#rbAt)" strokeWidth="70" fill="none" opacity="0.35" />
    </svg>
  );
}

/** iPadOS-style folded colour planes, composed for the tablet's landscape and portrait shapes */
function Folds({ dark, wide }: { dark: boolean; wide: boolean }) {
  const bg = dark ? '#0b0d1c' : '#eef1fb';
  const c = dark ? ['#4c3cf0', '#9b3ff2', '#ff5aa5', '#ff9b3d'] : ['#7aa2ff', '#b48cff', '#ff9cc8', '#ffc58a'];
  const [w, h] = wide ? [1600, 1100] : [1100, 1600];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        {c.map((col, i) => (
          <linearGradient key={i} id={`fd${dark ? 'd' : 'l'}${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={col} />
            <stop offset="1" stopColor={c[(i + 1) % c.length]} stopOpacity={dark ? 0.75 : 0.85} />
          </linearGradient>
        ))}
      </defs>
      <rect width={w} height={h} fill={bg} />
      {c.map((_, i) => {
        const o = i * (wide ? 150 : 160);
        const d = wide
          ? `M${-200 + o} ${h} L${380 + o * 1.4} ${120 + i * 70} L${720 + o * 1.5} ${260 + i * 60} L${360 + o} ${h} Z`
          : `M0 ${h - 200 - o * 1.2} L${w} ${560 - i * 40 + o * 0.4} L${w} ${860 + o * 0.6} L0 ${h + 100 - o * 0.5} Z`;
        return <path key={i} d={d} fill={`url(#fd${dark ? 'd' : 'l'}${i})`} opacity={0.92 - i * 0.08} />;
      })}
    </svg>
  );
}

/** soft concentric halos, like a tablet glass glow — calm behind widgets and icons */
function Halo({ dark }: { dark: boolean }) {
  const bg = dark ? '#05070f' : '#f4f6fb';
  const ring = dark ? ['#2f6bff', '#7b5cff', '#00c2d1'] : ['#8fb3ff', '#c4b0ff', '#8ee6ef'];
  return (
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`hl${dark ? 'd' : 'l'}`} cx="0.5" cy="0.62" r="0.62">
          <stop offset="0" stopColor={ring[0]} stopOpacity={dark ? 0.85 : 0.7} />
          <stop offset="0.45" stopColor={ring[1]} stopOpacity={dark ? 0.55 : 0.45} />
          <stop offset="0.75" stopColor={ring[2]} stopOpacity={dark ? 0.25 : 0.25} />
          <stop offset="1" stopColor={bg} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="1000" fill={bg} />
      <rect width="1000" height="1000" fill={`url(#hl${dark ? 'd' : 'l'})`} />
      {[170, 250, 340, 440].map((r, i) => (
        <circle key={r} cx="500" cy="620" r={r} fill="none" stroke={dark ? '#ffffff' : '#3b4a7a'} strokeOpacity={0.09 - i * 0.015} strokeWidth="2" />
      ))}
    </svg>
  );
}

/** layered dunes — warm in light mode, moonlit in dark mode */
function Dunes({ dark, wide }: { dark: boolean; wide: boolean }) {
  const sky = dark ? ['#0b1030', '#2a2457'] : ['#ffe3c4', '#ffb88a'];
  const layers = dark ? ['#3b2f6b', '#2c2457', '#1f1a42', '#141030'] : ['#f6a26b', '#e9855a', '#d1694d', '#b25440'];
  const [w, h] = wide ? [1600, 1100] : [1100, 1600];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`dn${dark ? 'd' : 'l'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#dn${dark ? 'd' : 'l'})`} />
      <circle cx={w * 0.72} cy={h * 0.28} r={wide ? 70 : 80} fill={dark ? '#f1ecff' : '#fff6e8'} opacity={dark ? 0.9 : 0.95} />
      {layers.map((col, i) => {
        const y = h * (0.5 + i * 0.12);
        return <path key={i} d={`M0 ${y} C ${w * 0.25} ${y - 120 + i * 20} ${w * 0.55} ${y + 90} ${w} ${y - 60 + i * 25} V${h} H0 Z`} fill={col} />;
      })}
    </svg>
  );
}

function Sky() {
  // real sun position estimate (no location permission — see system/sun.ts)
  const [phase, setPhase] = useState(skyPhase);
  useEffect(() => {
    const t = window.setInterval(() => setPhase(skyPhase()), 60000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <>
      <i className={`sky-l ${phase}`} />
      {phase === 'night' && <Stars n={90} seed={7} />}
      <i className={`sky-sun ${phase}`} />
      <i className="sky-hills" />
    </>
  );
}
function skyPhase(): 'dawn' | 'day' | 'dusk' | 'night' {
  const now = new Date();
  const { sunrise, sunset } = sunTimes(now);
  const t = now.getTime();
  const h = 50 * 60000;
  if (t < sunrise.getTime() - h || t > sunset.getTime() + h) return 'night';
  if (t < sunrise.getTime() + h) return 'dawn';
  if (t > sunset.getTime() - h) return 'dusk';
  return 'day';
}

function Space({ still }: { still: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const low = document.documentElement.dataset.perf === 'low';
    let W = 0;
    let H = 0;
    const size = () => {
      W = c.width = Math.max(1, c.clientWidth * dpr);
      H = c.height = Math.max(1, c.clientHeight * dpr);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(c);
    const r = rnd(42);
    const N = low ? 140 : 280;
    const stars = Array.from({ length: N }, () => ({ x: r(), y: r(), z: 0.2 + r() * 0.8, tw: r() * 6 }));
    let shoot: { x: number; y: number; t: number } | null = null;
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      g.clearRect(0, 0, W, H);
      for (const s of stars) {
        if (!still) {
          s.x -= dt * 0.004 * s.z;
          if (s.x < 0) s.x += 1;
        }
        const a = 0.35 + 0.65 * s.z * (still ? 1 : 0.75 + 0.25 * Math.sin(now / 900 + s.tw));
        g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        const rr = s.z * 1.4 * dpr;
        g.fillRect(s.x * W, s.y * H, rr, rr);
      }
      if (!still) {
        if (!shoot && Math.random() < dt * 0.06) shoot = { x: 0.3 + Math.random() * 0.6, y: Math.random() * 0.4, t: 0 };
        if (shoot) {
          shoot.t += dt;
          const p = shoot.t / 0.9;
          const x = (shoot.x - p * 0.25) * W;
          const y = (shoot.y + p * 0.12) * H;
          const grad = g.createLinearGradient(x, y, x + 90 * dpr, y - 43 * dpr);
          grad.addColorStop(0, `rgba(255,255,255,${(0.9 * (1 - p)).toFixed(2)})`);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = grad;
          g.lineWidth = 1.5 * dpr;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + 90 * dpr, y - 43 * dpr);
          g.stroke();
          if (p >= 1) shoot = null;
        }
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [still]);
  return (
    <>
      <i className="sp-glow" />
      <canvas ref={cv} className="sp-cv" />
    </>
  );
}

function Code() {
  const lines = ['const developer = {', `  name: '${personal.name}',`, `  role: '${personal.shortTitle}',`, `  basedIn: '${personal.city}',`, `  status: '${personal.status}',`, '};', '', 'export default developer;'];
  return (
    <pre className="code">
      {lines.map((l, i) => (
        <span key={i}>
          <em>{String(i + 1).padStart(2, ' ')}</em> {l}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}

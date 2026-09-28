import { useEffect, useRef, useState } from 'react';
import { readStore, writeStore } from '../system/storage';

type Tab = 'ruler' | 'level';

interface Line {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const KEY = 'mra-measure-v1';
/** CSS reference pixel: 96 px per inch → 3.7795 px per mm. */
const DEFAULT_PX_PER_MM = 96 / 25.4;
const CARD_MM = 85.6;

function snap(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x2: x1 + Math.cos(a) * len, y2: y1 + Math.sin(a) * len };
}

export default function MeasureApp() {
  const [tab, setTab] = useState<Tab>('ruler');
  return (
    <div className="ms-root">
      <div className="ms-top">
        <div className="ms-seg" role="tablist" aria-label="Measure mode">
          <button type="button" role="tab" aria-selected={tab === 'ruler'} className={tab === 'ruler' ? 'on' : ''} onClick={() => setTab('ruler')}>
            Measure
          </button>
          <button type="button" role="tab" aria-selected={tab === 'level'} className={tab === 'level' ? 'on' : ''} onClick={() => setTab('level')}>
            Level
          </button>
        </div>
      </div>
      {tab === 'ruler' ? <Ruler /> : <Level />}
    </div>
  );
}

function Ruler() {
  const [pxPerMm, setPxPerMm] = useState(() => readStore(KEY, { pxPerMm: DEFAULT_PX_PER_MM }).pxPerMm);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState<Line | null>(null);
  const [calib, setCalib] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; pid: number } | null>(null);

  useEffect(() => writeStore(KEY, { pxPerMm }), [pxPerMm]);

  const pos = (e: React.PointerEvent) => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = pos(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const id = Date.now();
    drag.current = { id, pid: e.pointerId };
    setDraft({ id, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.pid !== e.pointerId) return;
    const p = pos(e);
    setDraft((d) => {
      if (!d) return d;
      const s = e.shiftKey ? snap(d.x1, d.y1, p.x, p.y) : { x2: p.x, y2: p.y };
      return { ...d, ...s };
    });
  };
  const onUp = () => {
    drag.current = null;
    const d = draft;
    if (d && Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 4) setLines((l) => [...l, d]);
    setDraft(null);
  };

  const fmtLen = (px: number) => {
    const mm = px / pxPerMm;
    return unit === 'cm' ? `${(mm / 10).toFixed(mm < 100 ? 2 : 1)} cm` : `${(mm / 25.4).toFixed(2)} in`;
  };

  const all = draft ? [...lines, draft] : lines;
  const cardPx = CARD_MM * pxPerMm;
  const calibrated = Math.abs(pxPerMm - DEFAULT_PX_PER_MM) > 0.005;

  // ruler ticks along top (every mm, labels every cm) or inches
  const ticks: { x: number; h: number; label?: string }[] = [];
  const width = 2400;
  if (unit === 'cm') {
    for (let mm = 0; mm * pxPerMm < width; mm++) ticks.push({ x: mm * pxPerMm, h: mm % 10 === 0 ? 12 : mm % 5 === 0 ? 8 : 5, label: mm % 10 === 0 && mm ? String(mm / 10) : undefined });
  } else {
    const ppi = pxPerMm * 25.4;
    for (let s = 0; (s / 16) * ppi < width; s++) ticks.push({ x: (s / 16) * ppi, h: s % 16 === 0 ? 12 : s % 8 === 0 ? 9 : s % 4 === 0 ? 7 : 4, label: s % 16 === 0 && s ? String(s / 16) : undefined });
  }

  return (
    <div className="ms-ruler-wrap">
      <div className="ms-tools">
        <div className="ms-seg sm" role="radiogroup" aria-label="Units">
          <button type="button" role="radio" aria-checked={unit === 'cm'} className={unit === 'cm' ? 'on' : ''} onClick={() => setUnit('cm')}>
            cm
          </button>
          <button type="button" role="radio" aria-checked={unit === 'in'} className={unit === 'in' ? 'on' : ''} onClick={() => setUnit('in')}>
            in
          </button>
        </div>
        <button type="button" className={`btn ${calib ? 'btn-primary' : ''}`} onClick={() => setCalib((c) => !c)} aria-expanded={calib}>
          Calibrate
        </button>
        <button type="button" className="btn" onClick={() => setLines([])} disabled={!lines.length}>
          Clear
        </button>
        <span className="ms-count">{lines.length ? `${lines.length} measurement${lines.length > 1 ? 's' : ''}` : ''}</span>
      </div>

      {calib && (
        <div className="ms-calib fade-swap">
          <p>
            <b>Match a credit card (85.6 mm).</b> Hold a bank card against the screen and drag the slider until the blue card is exactly the
            same width.
          </p>
          <div className="ms-card" style={{ width: cardPx, height: cardPx * (53.98 / 85.6) }} aria-hidden="true">
            <span className="chip" />
            <span className="txt">85.6 mm</span>
          </div>
          <div className="ms-calib-row">
            <input
              type="range"
              min={2}
              max={8}
              step={0.01}
              value={pxPerMm}
              onChange={(e) => setPxPerMm(Number(e.target.value))}
              aria-label="Pixels per millimetre"
            />
            <span className="ms-mono">{pxPerMm.toFixed(2)} px/mm</span>
            <button type="button" className="btn" onClick={() => setPxPerMm(DEFAULT_PX_PER_MM)} disabled={!calibrated}>
              Reset
            </button>
          </div>
        </div>
      )}

      <div
        ref={areaRef}
        className="ms-area"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="application"
        aria-label="Measuring area — drag to draw a measurement line"
      >
        <svg className="ms-svg" aria-hidden="true">
          <g className="ms-ticks">
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={t.x} y1={0} x2={t.x} y2={t.h} />
                {t.label && (
                  <text x={t.x + 2} y={22}>
                    {t.label}
                  </text>
                )}
              </g>
            ))}
          </g>
          {all.map((l) => {
            const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
            const mx = (l.x1 + l.x2) / 2;
            const my = (l.y1 + l.y2) / 2;
            const ang = (Math.atan2(l.y2 - l.y1, l.x2 - l.x1) * 180) / Math.PI;
            const label = `${fmtLen(len)} · ${Math.round(len)} px`;
            const w = label.length * 6.6 + 16;
            return (
              <g key={l.id} className={l === draft ? 'ms-line live' : 'ms-line'}>
                <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className="ln" />
                <circle cx={l.x1} cy={l.y1} r={5} className="dot" />
                <circle cx={l.x2} cy={l.y2} r={5} className="dot" />
                <g transform={`translate(${mx} ${my - 18})`}>
                  <rect x={-w / 2} y={-11} width={w} height={22} rx={11} className="pill" />
                  <text textAnchor="middle" dominantBaseline="central" className="pill-t">
                    {label}
                  </text>
                  {l === draft && (
                    <text y={24} textAnchor="middle" className="ang">
                      {Math.round(((-ang % 360) + 360) % 360)}°
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
        {!all.length && (
          <div className="ms-hint">
            <b>Drag to measure</b>
            <span>Hold Shift to snap to 0°, 45° or 90°.</span>
          </div>
        )}
      </div>
      <p className="ms-foot">
        Lengths are approximate: they assume CSS pixels at 96 dpi{calibrated ? ' — adjusted by your calibration' : ''}. Screen scaling and
        zoom change the real size; use Calibrate for better accuracy.
      </p>
    </div>
  );
}

type LevelState = 'checking' | 'need-permission' | 'active' | 'unavailable' | 'denied';

type DOEWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };

function Level() {
  const hasApi = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  const needsPermission = hasApi && typeof (window.DeviceOrientationEvent as DOEWithPermission).requestPermission === 'function';
  const [state, setState] = useState<LevelState>(!hasApi ? 'unavailable' : needsPermission ? 'need-permission' : 'checking');
  const [listen, setListen] = useState(hasApi && !needsPermission);
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });

  useEffect(() => {
    if (!listen) return;
    let got = false;
    const onO = (e: DeviceOrientationEvent) => {
      if (e.beta == null && e.gamma == null) return;
      got = true;
      setState('active');
      setTilt({ beta: e.beta ?? 0, gamma: e.gamma ?? 0 });
    };
    window.addEventListener('deviceorientation', onO);
    const t = window.setTimeout(() => {
      if (!got) setState('unavailable');
    }, 1500);
    return () => {
      window.removeEventListener('deviceorientation', onO);
      window.clearTimeout(t);
    };
  }, [listen]);

  const ask = async () => {
    try {
      const res = await (window.DeviceOrientationEvent as DOEWithPermission).requestPermission!();
      if (res !== 'granted') return setState('denied');
      setState('checking');
      setListen(true);
    } catch {
      setState('denied');
    }
  };

  if (state !== 'active') {
    return (
      <div className="ms-level-msg fade-swap">
        <div className="ms-bubble-ico" aria-hidden="true">
          <span />
        </div>
        {state === 'checking' && <h3>Looking for motion sensors…</h3>}
        {state === 'unavailable' && (
          <>
            <h3>Level needs a device with motion sensors</h3>
            <p>Open this portfolio on a phone or tablet and lay it on a surface to check if it’s level.</p>
          </>
        )}
        {state === 'need-permission' && (
          <>
            <h3>Allow motion access</h3>
            <p>Your device asks before sharing motion data. It is only used here, in this browser.</p>
            <button type="button" className="btn btn-primary" onClick={() => void ask()}>
              Allow Motion &amp; Orientation
            </button>
          </>
        )}
        {state === 'denied' && (
          <>
            <h3>Motion access was denied</h3>
            <p>Enable Motion &amp; Orientation Access for this site in your browser settings, then reload.</p>
          </>
        )}
      </div>
    );
  }

  const g = Math.max(-45, Math.min(45, tilt.gamma));
  const b = Math.max(-45, Math.min(45, tilt.beta));
  const deg = Math.round(Math.hypot(g, b));
  const level = deg <= 1;
  return (
    <div className={`ms-level ${level ? 'lvl' : ''}`}>
      <div className="ms-level-c">
        <div className="ms-ring" />
        <div className="ms-dot" style={{ transform: `translate(${(g / 45) * 90}px, ${(b / 45) * 90}px)` }} />
        <div className="ms-deg">{deg}°</div>
      </div>
      <p>{level ? 'Level' : 'Tilt your device until the circles line up'}</p>
    </div>
  );
}

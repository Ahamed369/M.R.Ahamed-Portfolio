import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { DragBar, Lights } from '../components/Window';
import { readStore, writeStore } from '../system/storage';

/**
 * Stocks-style app with DEMO data. There is no key-free live market API, so
 * every price here is a deterministic seeded random walk — not real prices.
 */

interface Sym {
  s: string;
  name: string;
  ex: string;
  base: number;
  vol: number;
}

const SYMBOLS: Sym[] = [
  { s: 'AAPL', name: 'Apple Inc.', ex: 'NASDAQ', base: 190, vol: 0.016 },
  { s: 'MSFT', name: 'Microsoft Corporation', ex: 'NASDAQ', base: 380, vol: 0.015 },
  { s: 'GOOGL', name: 'Alphabet Inc.', ex: 'NASDAQ', base: 150, vol: 0.018 },
  { s: 'AMZN', name: 'Amazon.com, Inc.', ex: 'NASDAQ', base: 170, vol: 0.019 },
  { s: 'NVDA', name: 'NVIDIA Corporation', ex: 'NASDAQ', base: 120, vol: 0.03 },
  { s: 'TSLA', name: 'Tesla, Inc.', ex: 'NASDAQ', base: 220, vol: 0.034 },
  { s: 'META', name: 'Meta Platforms, Inc.', ex: 'NASDAQ', base: 450, vol: 0.022 },
  { s: 'NFLX', name: 'Netflix, Inc.', ex: 'NASDAQ', base: 600, vol: 0.022 },
  { s: 'ADBE', name: 'Adobe Inc.', ex: 'NASDAQ', base: 520, vol: 0.02 },
  { s: 'AMD', name: 'Advanced Micro Devices, Inc.', ex: 'NASDAQ', base: 150, vol: 0.028 },
  { s: 'INTC', name: 'Intel Corporation', ex: 'NASDAQ', base: 35, vol: 0.022 },
  { s: 'ORCL', name: 'Oracle Corporation', ex: 'NYSE', base: 130, vol: 0.017 },
  { s: 'IBM', name: 'International Business Machines', ex: 'NYSE', base: 180, vol: 0.013 },
  { s: 'CRM', name: 'Salesforce, Inc.', ex: 'NYSE', base: 260, vol: 0.02 },
  { s: 'UBER', name: 'Uber Technologies, Inc.', ex: 'NYSE', base: 70, vol: 0.025 },
  { s: 'SPOT', name: 'Spotify Technology S.A.', ex: 'NYSE', base: 300, vol: 0.025 },
  { s: 'DIS', name: 'The Walt Disney Company', ex: 'NYSE', base: 100, vol: 0.016 },
  { s: 'KO', name: 'The Coca-Cola Company', ex: 'NYSE', base: 60, vol: 0.009 },
  { s: 'NKE', name: 'NIKE, Inc.', ex: 'NYSE', base: 95, vol: 0.017 },
  { s: 'JPM', name: 'JPMorgan Chase & Co.', ex: 'NYSE', base: 190, vol: 0.013 },
  { s: 'V', name: 'Visa Inc.', ex: 'NYSE', base: 270, vol: 0.011 },
];
const bySym = (s: string) => SYMBOLS.find((x) => x.s === s);

const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '5Y', '10Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];

const KEY = 'mra-stocks';
interface Prefs {
  list: string[];
  sel: string;
  range: Range;
}
const DEFAULT: Prefs = { list: ['AAPL', 'MSFT', 'TSLA', 'GOOGL'], sel: 'MSFT', range: '3M' };

/* ─────────── deterministic series ─────────── */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => {
  const u = Math.max(1e-9, r());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
};

interface Pt {
  t: number;
  v: number;
}
const DAY = 86400000;
const TODAY = (() => {
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  return d.getTime();
})();

/** ~15 years of daily closes (weekdays), ending today; walks backwards from `base`. */
const dailyCache = new Map<string, Pt[]>();
function daily(sym: Sym): Pt[] {
  const hit = dailyCache.get(sym.s);
  if (hit) return hit;
  const r = rng(hash(sym.s));
  const out: Pt[] = [];
  let v = sym.base * (0.85 + r() * 0.3);
  let t = TODAY;
  const drift = 0.00045;
  while (out.length < 3900) {
    const wd = new Date(t).getDay();
    if (wd !== 0 && wd !== 6) {
      out.push({ t, v });
      v = v / Math.exp(drift + sym.vol * gauss(r));
      v = Math.max(1, v);
    }
    t -= DAY;
  }
  out.reverse();
  dailyCache.set(sym.s, out);
  return out;
}

function intraday(sym: Sym, days: number, stepMin: number): Pt[] {
  const d = daily(sym);
  const out: Pt[] = [];
  const r = rng(hash(`${sym.s}-${new Date(TODAY).toDateString()}-${stepMin}`));
  const start = d.length - days;
  for (let k = start; k < d.length; k++) {
    const close = d[k].v;
    const open = k > 0 ? d[k - 1].v : close;
    const n = Math.round(390 / stepMin);
    const open0 = new Date(d[k].t);
    open0.setHours(9, 30, 0, 0);
    // brownian bridge from previous close to this close
    let w = 0;
    const walk: number[] = [0];
    for (let i = 1; i <= n; i++) walk.push((w += gauss(r)));
    for (let i = 0; i <= n; i++) {
      const frac = i / n;
      const bridge = walk[i] - frac * walk[n];
      const v = open + (close - open) * frac + bridge * close * sym.vol * 0.07;
      out.push({ t: open0.getTime() + i * stepMin * 60000, v });
    }
  }
  return out;
}

function seriesFor(sym: Sym, range: Range): Pt[] {
  if (range === '1D') return intraday(sym, 1, 5);
  if (range === '1W') return intraday(sym, 5, 30);
  const d = daily(sym);
  const days: Record<string, number> = { '1M': 22, '3M': 65, '6M': 130, '1Y': 252, '2Y': 504, '5Y': 1260, '10Y': 2520, ALL: d.length };
  let n = days[range];
  if (range === 'YTD') {
    const y = new Date(new Date(TODAY).getFullYear(), 0, 1).getTime();
    n = d.filter((p) => p.t >= y).length + 1;
  }
  const slice = d.slice(Math.max(0, d.length - n));
  const stride = Math.max(1, Math.floor(slice.length / 260));
  return slice.filter((_, i) => i % stride === 0 || i === slice.length - 1);
}

const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const big = (v: number) => (v >= 1e12 ? `${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : `${(v / 1e6).toFixed(2)}M`);

function quote(sym: Sym) {
  const d = daily(sym);
  const last = d[d.length - 1].v;
  const prev = d[d.length - 2].v;
  const r = rng(hash(`${sym.s}-stats`));
  const day = intraday(sym, 1, 5);
  const yr = d.slice(-252).map((p) => p.v);
  const volM = 5 + r() * 60;
  return {
    last,
    chg: last - prev,
    pct: ((last - prev) / prev) * 100,
    open: day[0].v,
    high: Math.max(...day.map((p) => p.v)),
    low: Math.min(...day.map((p) => p.v)),
    vol: volM * 1e6,
    avgVol: volM * (0.8 + r() * 0.5) * 1e6,
    pe: 12 + r() * 40,
    cap: last * (0.5 + r() * 12) * 1e9,
    hi52: Math.max(...yr),
    lo52: Math.min(...yr),
    yieldPct: r() > 0.4 ? r() * 3 : null,
    beta: 0.6 + r() * 1.2,
    eps: last / (12 + r() * 40),
  };
}

const P = {
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  sidebar: 'M4 5h16v14H4ZM9.5 5v14',
  plus: 'M12 5v14M5 12h14',
  minus: 'M6 12h12',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};
function G({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spark({ sym }: { sym: Sym }) {
  const pts = intraday(sym, 1, 15);
  const vs = pts.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const up = vs[vs.length - 1] >= daily(sym)[daily(sym).length - 2].v;
  const d = vs.map((v, i) => `${i ? 'L' : 'M'}${((i / (vs.length - 1)) * 60).toFixed(1)},${(22 - ((v - lo) / (hi - lo || 1)) * 20).toFixed(1)}`).join('');
  return (
    <svg className={`sk-spark ${up ? 'up' : 'down'}`} viewBox="0 0 60 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ─────────── chart ─────────── */

function Chart({ pts, range, up, prevClose }: { pts: Pt[]; range: Range; up: boolean; prevClose: number | null }) {
  const W = 800;
  const H = 300;
  const PR = 52;
  const PB = 26;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const vs = pts.map((p) => p.v);
  let lo = Math.min(...vs, prevClose ?? Infinity);
  let hi = Math.max(...vs, prevClose ?? -Infinity);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;
  const x = (i: number) => (i / (pts.length - 1)) * (W - PR);
  const y = (v: number) => (1 - (v - lo) / (hi - lo)) * (H - PB);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.length - 1)},${H - PB}L0,${H - PB}Z`;

  const ticks = 4;
  const yt = Array.from({ length: ticks }, (_, i) => lo + ((hi - lo) * (i + 0.5)) / ticks);

  // x labels at period boundaries
  const xl: { i: number; label: string }[] = [];
  const intra = range === '1D' || range === '1W';
  const key = (t: number) => {
    const d = new Date(t);
    if (range === '1D') return String(d.getHours());
    if (intra) return d.toDateString();
    if (['1M'].includes(range)) return String(Math.floor(d.getDate() / 7));
    if (['3M', '6M', 'YTD', '1Y'].includes(range)) return `${d.getFullYear()}-${d.getMonth()}`;
    if (range === '2Y') return `${d.getFullYear()}-${Math.floor(d.getMonth() / 6)}`;
    return String(d.getFullYear() - (range === 'ALL' || range === '10Y' ? d.getFullYear() % 2 : 0));
  };
  const lab = (t: number) => {
    const d = new Date(t);
    if (range === '1D') return d.toLocaleTimeString([], { hour: 'numeric' });
    if (intra) return d.toLocaleDateString([], { weekday: 'short' });
    if (range === '1M') return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (['3M', '6M', 'YTD', '1Y', '2Y'].includes(range)) return d.toLocaleDateString([], { month: 'short' });
    return String(d.getFullYear());
  };
  pts.forEach((p, i) => {
    if (i === 0 || key(p.t) !== key(pts[i - 1].t)) xl.push({ i, label: lab(p.t) });
  });
  const minGap = (W - PR) / 7;
  const xs = xl.filter((l, k, arr) => k === 0 || x(l.i) - x(arr[k - 1].i) >= minGap * 0.55).filter((l) => x(l.i) < W - PR - 24);

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round((Math.min(W - PR, Math.max(0, px)) / (W - PR)) * (pts.length - 1));
    setHover(i);
  };

  const hp = hover !== null ? pts[hover] : null;
  const first = pts[0].v;
  const hoverChg = hp ? ((hp.v - first) / first) * 100 : 0;
  const color = up ? 'var(--sk-up)' : 'var(--sk-down)';

  return (
    <div className="sk-chart">
      {hp && (
        <div className="sk-tip" style={{ left: `${(x(hover!) / W) * 100}%` }}>
          <b>{fmt(hp.v)}</b>
          <span className={hoverChg >= 0 ? 'up' : 'down'}>
            {hoverChg >= 0 ? '+' : ''}
            {hoverChg.toFixed(2)}%
          </span>
          <small>{new Date(hp.t).toLocaleString([], intra ? { weekday: 'short', hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric' })}</small>
        </div>
      )}
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Demo price chart, ${range}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
      >
        <defs>
          <linearGradient id="sk-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.32" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yt.map((v) => (
          <g key={v}>
            <line className="sk-grid" x1="0" x2={W - PR} y1={y(v)} y2={y(v)} />
            <text className="sk-ylab" x={W - PR + 8} y={y(v) + 4}>
              {v >= 1000 && hi - lo > 40 ? Math.round(v).toLocaleString() : v.toFixed(hi - lo < 8 ? 2 : hi - lo < 40 ? 1 : 0)}
            </text>
          </g>
        ))}
        {xs.map((l) => (
          <g key={l.i}>
            <line className="sk-grid v" x1={x(l.i)} x2={x(l.i)} y1="0" y2={H - PB} />
            <text className="sk-xlab" x={x(l.i) + 4} y={H - 7}>
              {l.label}
            </text>
          </g>
        ))}
        <line className="sk-base" x1="0" x2={W - PR} y1={H - PB} y2={H - PB} />
        {prevClose !== null && <line className="sk-prev" x1="0" x2={W - PR} y1={y(prevClose)} y2={y(prevClose)} />}
        <path key={`a${range}`} className="sk-area" d={area} fill="url(#sk-fill)" />
        <path key={`l${range}`} className="sk-line" d={line} stroke={color} pathLength={1} />
        {hp && (
          <g className="sk-cross">
            <line x1={x(hover!)} x2={x(hover!)} y1="0" y2={H - PB} />
            <circle cx={x(hover!)} cy={y(hp.v)} r="5" fill={color} />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function StocksApp() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    const p = readStore<Prefs>(KEY, DEFAULT);
    const list = (Array.isArray(p.list) ? p.list : DEFAULT.list).filter((s) => bySym(s));
    return { list, sel: bySym(p.sel) ? p.sel : list[0] ?? 'AAPL', range: RANGES.includes(p.range) ? p.range : '3M' };
  });
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(false);
  const [side, setSide] = useState(true);

  const save = (n: Prefs) => {
    setPrefs(n);
    writeStore(KEY, n);
  };
  const sym = bySym(prefs.sel) ?? SYMBOLS[0];
  const pts = useMemo(() => seriesFor(sym, prefs.range), [sym, prefs.range]);
  const qt = useMemo(() => quote(sym), [sym]);
  const first = pts[0].v;
  const last = pts[pts.length - 1].v;
  const rangeChg = prefs.range === '1D' ? qt.chg : last - first;
  const rangePct = prefs.range === '1D' ? qt.pct : ((last - first) / first) * 100;
  const up = rangeChg >= 0;

  const f = q.trim().toLowerCase();
  const inList = prefs.list.map(bySym).filter((s): s is Sym => !!s);
  const shown = f ? inList.filter((s) => `${s.s} ${s.name}`.toLowerCase().includes(f)) : inList;
  const addable = f ? SYMBOLS.filter((s) => !prefs.list.includes(s.s) && `${s.s} ${s.name}`.toLowerCase().includes(f)) : [];

  const add = (s: string) => {
    save({ ...prefs, list: [...prefs.list, s], sel: s });
    setQ('');
  };
  const remove = (s: string) => {
    const list = prefs.list.filter((x) => x !== s);
    save({ ...prefs, list, sel: prefs.sel === s ? list[0] ?? SYMBOLS[0].s : prefs.sel });
  };

  const stats: [string, string][] = [
    ['Open', fmt(qt.open)],
    ['High', fmt(qt.high)],
    ['Low', fmt(qt.low)],
    ['Vol', big(qt.vol)],
    ['P/E', qt.pe.toFixed(2)],
    ['Mkt Cap', big(qt.cap)],
    ['52W H', fmt(qt.hi52)],
    ['52W L', fmt(qt.lo52)],
    ['Avg Vol', big(qt.avgVol)],
    ['Yield', qt.yieldPct ? `${qt.yieldPct.toFixed(2)}%` : '–'],
    ['Beta', qt.beta.toFixed(2)],
    ['EPS', qt.eps.toFixed(2)],
  ];

  return (
    <div className="sk-root">
      <div className={`sk ${side ? '' : 'no-side'}`}>
      <aside className="sk-side" aria-label="Watchlist">
        <DragBar className="sk-drag">
          <Lights />
          <button type="button" className="sk-edit" onPointerDown={(e) => e.stopPropagation()} onClick={() => setEdit((x) => !x)} aria-pressed={edit}>
            {edit ? 'Done' : 'Edit'}
          </button>
        </DragBar>
        <label className="sk-search">
          <G d={P.search} size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or add symbol" aria-label="Search or add a symbol" />
        </label>
        <div className="sk-list scroll-smooth">
          {shown.map((s) => {
            const qq = quote(s);
            return (
              <div key={s.s} className={`sk-row ${prefs.sel === s.s ? 'on' : ''} ${edit ? 'editing' : ''}`}>
                {edit && (
                  <button type="button" className="sk-rm" aria-label={`Remove ${s.s}`} onClick={() => remove(s.s)}>
                    <G d={P.minus} size={12} />
                  </button>
                )}
                <button type="button" className="sk-row-main" onClick={() => save({ ...prefs, sel: s.s })}>
                  <span className="sk-row-id">
                    <b>{s.s}</b>
                    <small>{s.name}</small>
                  </span>
                  <Spark sym={s} />
                  <span className="sk-row-px">
                    <b>{fmt(qq.last)}</b>
                    <em className={qq.chg >= 0 ? 'up' : 'down'}>
                      {qq.chg >= 0 ? '+' : ''}
                      {qq.pct.toFixed(2)}%
                    </em>
                  </span>
                </button>
              </div>
            );
          })}
          {shown.length === 0 && !addable.length && <p className="sk-none">{f ? 'No matching symbols' : 'Your watchlist is empty. Search to add a symbol.'}</p>}
          {addable.length > 0 && (
            <>
              <div className="sk-sec">Add to Watchlist</div>
              {addable.map((s) => (
                <button key={s.s} type="button" className="sk-add" onClick={() => add(s.s)}>
                  <span className="sk-row-id">
                    <b>{s.s}</b>
                    <small>{s.name}</small>
                  </span>
                  <span className="sk-plus" aria-hidden="true">
                    <G d={P.plus} size={13} />
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
        <p className="sk-side-note">Demo data — not real market prices.</p>
      </aside>
      <section className="sk-main">
        <DragBar className="sk-bar">
          <span className="sk-lights-alt">
            <Lights />
          </span>
          <button type="button" className="sk-ibtn" aria-label={side ? 'Hide watchlist' : 'Show watchlist'} onPointerDown={(e) => e.stopPropagation()} onClick={() => setSide((x) => !x)}>
            <G d={P.sidebar} size={18} />
          </button>
          <b className="sk-title">Stocks</b>
          <span className="sk-demo" title="Prices are generated locally from a seeded random walk.">
            Demo data
          </span>
        </DragBar>
        <div className="sk-scroll scroll-smooth">
          <div key={sym.s} className="sk-head fade-swap">
            <div>
              <h1>
                {sym.s} <small>{sym.name}</small>
              </h1>
              <span className="sk-ex">{sym.ex} · USD · Simulated</span>
            </div>
            <div className="sk-quote">
              <div>
                <b>{fmt(qt.last)}</b>
                <em className={qt.chg >= 0 ? 'up' : 'down'}>
                  {qt.chg >= 0 ? '+' : ''}
                  {fmt(qt.chg)}
                </em>
                <small>At Close</small>
              </div>
              <div>
                <b className={rangeChg >= 0 ? 'up' : 'down'}>
                  {rangePct >= 0 ? '+' : ''}
                  {rangePct.toFixed(2)}%
                </b>
                <small>{prefs.range} change</small>
              </div>
            </div>
          </div>
          <div className="sk-ranges" role="tablist" aria-label="Chart range">
            {RANGES.map((r) => (
              <button key={r} type="button" role="tab" aria-selected={prefs.range === r} className={prefs.range === r ? 'on' : ''} onClick={() => save({ ...prefs, range: r })}>
                {r}
              </button>
            ))}
          </div>
          <Chart key={`${sym.s}-${prefs.range}`} pts={pts} range={prefs.range} up={up} prevClose={prefs.range === '1D' ? daily(sym)[daily(sym).length - 2].v : null} />
          <div className="sk-stats">
            {stats.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <p className="sk-disclaimer">
            <b>Demo data — not real market prices.</b> Every number on this screen is generated in your browser from a seeded random walk for illustration only. Company names are used only as labels. This is not financial advice.
          </p>
        </div>
      </section>
      </div>
    </div>
  );
}

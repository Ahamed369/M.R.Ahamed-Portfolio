import { useMemo, useState } from 'react';
import type { AppProps } from '../components/Desktop';

/**
 * v9 — Font Book: fonts actually available on this device (checked with the
 * CSS Font Loading API), with a live, editable preview.
 */
const CANDIDATES: [string, string][] = [
  ['-apple-system', 'System'],
  ['Helvetica Neue', 'Sans-serif'],
  ['Helvetica', 'Sans-serif'],
  ['Arial', 'Sans-serif'],
  ['Inter', 'Sans-serif'],
  ['Segoe UI', 'Sans-serif'],
  ['Roboto', 'Sans-serif'],
  ['Open Sans', 'Sans-serif'],
  ['Verdana', 'Sans-serif'],
  ['Tahoma', 'Sans-serif'],
  ['Trebuchet MS', 'Sans-serif'],
  ['Gill Sans', 'Sans-serif'],
  ['Avenir', 'Sans-serif'],
  ['Futura', 'Sans-serif'],
  ['Ubuntu', 'Sans-serif'],
  ['DejaVu Sans', 'Sans-serif'],
  ['Noto Sans', 'Sans-serif'],
  ['Noto Sans Sinhala', 'Sinhala'],
  ['Iskoola Pota', 'Sinhala'],
  ['Noto Sans Tamil', 'Tamil'],
  ['Latha', 'Tamil'],
  ['Georgia', 'Serif'],
  ['Times New Roman', 'Serif'],
  ['Times', 'Serif'],
  ['Palatino', 'Serif'],
  ['Baskerville', 'Serif'],
  ['Garamond', 'Serif'],
  ['Didot', 'Serif'],
  ['Cambria', 'Serif'],
  ['DejaVu Serif', 'Serif'],
  ['Noto Serif', 'Serif'],
  ['Menlo', 'Monospace'],
  ['Monaco', 'Monospace'],
  ['SF Mono', 'Monospace'],
  ['Consolas', 'Monospace'],
  ['Courier New', 'Monospace'],
  ['Fira Code', 'Monospace'],
  ['JetBrains Mono', 'Monospace'],
  ['DejaVu Sans Mono', 'Monospace'],
  ['Comic Sans MS', 'Fun'],
  ['Impact', 'Display'],
  ['Brush Script MT', 'Script'],
  ['Snell Roundhand', 'Script'],
  ['Apple Color Emoji', 'Emoji'],
  ['Segoe UI Emoji', 'Emoji'],
  ['Noto Color Emoji', 'Emoji'],
];

function available(f: string): boolean {
  if (f === '-apple-system') return true;
  try {
    return document.fonts.check(`16px "${f}"`) && isRealFont(f);
  } catch {
    return false;
  }
}
/** document.fonts.check() returns true for unknown local fonts in some browsers — compare widths with a fallback. */
function isRealFont(f: string): boolean {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return true;
  const s = 'mmmmmmmmmmlli1WQ@#';
  return ['monospace', 'serif', 'sans-serif'].some((base) => {
    c.font = `32px ${base}`;
    const w0 = c.measureText(s).width;
    c.font = `32px "${f}", ${base}`;
    return c.measureText(s).width !== w0;
  });
}

export default function FontBookApp(_: AppProps) {
  const fonts = useMemo(() => CANDIDATES.filter(([f]) => available(f)), []);
  const cats = ['All Fonts', ...Array.from(new Set(fonts.map((f) => f[1])))];
  const [cat, setCat] = useState('All Fonts');
  const [sel, setSel] = useState(fonts[0]?.[0] ?? '-apple-system');
  const [text] = useState('M.R. Ahamed — The quick brown fox jumps over the lazy dog. 0123456789');
  const [size, setSize] = useState(36);
  const [q, setQ] = useState('');
  const list = fonts.filter(([f, c]) => (cat === 'All Fonts' || c === cat) && f.toLowerCase().includes(q.toLowerCase()));
  const fam = sel === '-apple-system' ? '-apple-system, BlinkMacSystemFont, system-ui' : `"${sel}"`;
  return (
    <div className="fb">
      <aside className="fb-side">
        <h5>Collections</h5>
        {cats.map((c) => (
          <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
        <p className="fb-note">{fonts.length} fonts found on this device</p>
      </aside>
      <div className="fb-list">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search fonts" />
        {list.map(([f]) => (
          <button key={f} type="button" className={sel === f ? 'on' : ''} onClick={() => setSel(f)} style={{ fontFamily: f === '-apple-system' ? 'system-ui' : `"${f}"` }}>
            {f === '-apple-system' ? 'System Font' : f}
          </button>
        ))}
      </div>
      <main className="fb-main">
        <div className="fb-tools">
          <b>{sel === '-apple-system' ? 'System Font' : sel}</b>
          <input type="range" min={10} max={96} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Preview size" />
          <span>{size} pt</span>
        </div>
        <div className="fb-preview" style={{ fontFamily: fam, fontSize: size }} contentEditable suppressContentEditableWarning spellCheck={false}>
          {text}
        </div>
        <div className="fb-glyphs" style={{ fontFamily: fam }}>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 1234567890 !@#$%&*()'.split('').map((ch, i) => (
            <span key={i}>{ch === ' ' ? ' ' : ch}</span>
          ))}
        </div>
        <div className="fb-weights" style={{ fontFamily: fam }}>
          {[300, 400, 600, 800].map((w) => (
            <span key={w} style={{ fontWeight: w }}>
              {w} — Portfolio
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}

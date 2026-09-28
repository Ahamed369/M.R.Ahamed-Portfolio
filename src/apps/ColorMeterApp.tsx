import { useState } from 'react';
import type { AppProps } from '../components/Desktop';
import { usePersisted } from '../system/useStore';
import { notify } from '../system/notify';

/**
 * v9 — Digital Color Meter: pick any colour on screen with the browser's
 * EyeDropper (Chrome / Edge), or type one. Shows HEX, RGB, HSL and contrast.
 */
const hexToRgb = (h: string) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(h.trim());
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
};
const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};
const lum = (r: number, g: number, b: number) => {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

export default function ColorMeterApp(_: AppProps) {
  const [hex, setHex] = usePersisted('mra-colormeter-v9', '#0a84ff');
  const [hist, setHist] = usePersisted<string[]>('mra-colormeter-hist', []);
  const [err, setErr] = useState('');
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const L = lum(rgb.r, rgb.g, rgb.b);
  const cWhite = (1.05 / (L + 0.05)).toFixed(2);
  const cBlack = ((L + 0.05) / 0.05).toFixed(2);
  const Eye = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
  const pick = async () => {
    setErr('');
    if (!Eye) {
      setErr('Your browser doesn’t support the screen colour picker — use Chrome or Edge, or type a colour.');
      return;
    }
    try {
      const r = await new Eye().open();
      use(r.sRGBHex);
    } catch {
      /* cancelled */
    }
  };
  const use = (h: string) => {
    const v = h.startsWith('#') ? h : `#${h}`;
    setHex(v.toLowerCase());
    setHist((l) => [v.toLowerCase(), ...l.filter((x) => x !== v.toLowerCase())].slice(0, 12));
  };
  const copy = (t: string) => {
    void navigator.clipboard?.writeText(t).catch(() => undefined);
    notify({ app: 'Digital Color Meter', icon: 'colormeter', title: 'Copied', body: t, silent: true });
  };
  const rows: [string, string][] = [
    ['HEX', hex.toUpperCase()],
    ['RGB', `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
    ['HSL', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
    ['CSS var', `--color: ${hex};`],
  ];
  return (
    <div className="dcm">
      <div className="dcm-top">
        <button type="button" className="dcm-swatch" style={{ background: hex }} onClick={() => void pick()} aria-label="Pick a colour from the screen">
          <span>{Eye ? '⌖ Pick from screen' : 'Colour'}</span>
        </button>
        <div className="dcm-vals">
          {rows.map(([k, v]) => (
            <button key={k} type="button" onClick={() => copy(v)} title="Copy">
              <small>{k}</small>
              <b>{v}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="dcm-input">
        <input type="color" value={hexToRgb(hex) ? hex : '#000000'} onChange={(e) => use(e.target.value)} aria-label="Colour picker" />
        <input value={hex} onChange={(e) => setHex(e.target.value)} onBlur={() => hexToRgb(hex) && use(hex)} aria-label="Hex colour" />
        <button type="button" onClick={() => void pick()}>
          Eyedropper
        </button>
      </div>
      {err && <p className="dcm-err">{err}</p>}
      <div className="dcm-contrast">
        <span style={{ background: hex, color: '#fff' }}>White text · {cWhite}:1</span>
        <span style={{ background: hex, color: '#000' }}>Black text · {cBlack}:1</span>
      </div>
      {hist.length > 0 && (
        <div className="dcm-hist">
          {hist.map((h) => (
            <button key={h} type="button" style={{ background: h }} title={h} aria-label={h} onClick={() => setHex(h)} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * v9 — Spotlight search categories (System Settings → Spotlight), plus the
 * built-in Calculator / Conversion results and Clipboard Search.
 */
export const SPOTLIGHT_CATS: { id: string; label: string; sub?: string; def?: boolean }[] = [
  { id: 'apps', label: 'Applications' },
  { id: 'calculator', label: 'Calculator', sub: 'Solve maths like 12*(3+4)' },
  { id: 'conversion', label: 'Conversion', sub: '10 km in miles, 30 c to f, 2 kg to lb' },
  { id: 'definition', label: 'Definition', sub: 'Look words up in Dictionary' },
  { id: 'developer', label: 'Developer', sub: 'Projects and GitHub repositories' },
  { id: 'documents', label: 'Documents', sub: 'CV and files' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'images', label: 'Images', sub: 'Photos' },
  { id: 'services', label: 'My Services' },
  { id: 'skills', label: 'Skills' },
  { id: 'settings', label: 'System Settings' },
  { id: 'websites', label: 'Websites', sub: 'Social profiles and links' },
];

/** a category is on unless explicitly switched off; Clipboard Search is off by default */
export const spotOn = (cfg: Record<string, boolean> | undefined, k: string) => {
  const v = cfg?.[k];
  if (k === 'clipboard') return v === true;
  return v !== false;
};

/* ───────── Calculator: a tiny safe expression parser (no eval) ───────── */
export function calcExpr(src: string): string | null {
  const s = src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '');
  if (!/^[0-9+\-*/().%^]+$/.test(s) || !/[+\-*/%^]/.test(s.replace(/^-/, '')) || !/\d/.test(s)) return null;
  let i = 0;
  const peek = () => s[i];
  const num = (): number => {
    if (peek() === '(') {
      i++;
      const v = expr();
      if (peek() !== ')') throw new Error('paren');
      i++;
      return v;
    }
    if (peek() === '-') {
      i++;
      return -num();
    }
    const m = /^\d*\.?\d+/.exec(s.slice(i));
    if (!m) throw new Error('num');
    i += m[0].length;
    let v = parseFloat(m[0]);
    if (peek() === '%') {
      i++;
      v /= 100;
    }
    return v;
  };
  const pow = (): number => {
    const b = num();
    if (peek() === '^') {
      i++;
      return Math.pow(b, pow());
    }
    return b;
  };
  const term = (): number => {
    let v = pow();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const r = pow();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  function expr(): number {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  try {
    const v = expr();
    if (i !== s.length || !Number.isFinite(v)) return null;
    return String(Math.round(v * 1e10) / 1e10);
  } catch {
    return null;
  }
}

/* ───────── Unit conversion ───────── */
const LEN: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, inch: 0.0254, inches: 0.0254, ft: 0.3048, feet: 0.3048, foot: 0.3048, yd: 0.9144, mi: 1609.344, mile: 1609.344, miles: 1609.344 };
const MASS: Record<string, number> = { g: 1, kg: 1000, mg: 0.001, lb: 453.592, lbs: 453.592, oz: 28.3495 };
const VOL: Record<string, number> = { ml: 0.001, l: 1, liter: 1, litre: 1, gal: 3.78541, gallon: 3.78541 };
const TEMP = new Set(['c', 'f', 'k', 'celsius', 'fahrenheit', 'kelvin']);
const DATA: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };

export function convertUnits(src: string): { from: string; result: string } | null {
  const m = /^(-?\d*\.?\d+)\s*([a-z°]+)\s*(?:to|in|=|→)\s*([a-z°]+)$/i.exec(src.trim().toLowerCase());
  if (!m) return null;
  const v = parseFloat(m[1]);
  const a = m[2].replace('°', '');
  const b = m[3].replace('°', '');
  const fmt = (x: number) => String(Math.round(x * 1000) / 1000);
  for (const table of [LEN, MASS, VOL, DATA]) {
    if (a in table && b in table) return { from: `${m[1]} ${a} → ${b}`, result: `${fmt((v * table[a]) / table[b])} ${b}` };
  }
  if (TEMP.has(a) && TEMP.has(b)) {
    const k = (u: string) => u[0];
    const toC = k(a) === 'c' ? v : k(a) === 'f' ? ((v - 32) * 5) / 9 : v - 273.15;
    const out = k(b) === 'c' ? toC : k(b) === 'f' ? (toC * 9) / 5 + 32 : toC + 273.15;
    return { from: `${m[1]}° ${k(a).toUpperCase()} → ${k(b).toUpperCase()}`, result: `${fmt(out)} °${k(b).toUpperCase()}` };
  }
  return null;
}

/* ───────── System Settings results ───────── */
export const SETTINGS_INDEX: { pane: string; label: string; keys: string }[] = [
  { pane: 'wifi', label: 'Wi-Fi', keys: 'wireless network internet' },
  { pane: 'bluetooth', label: 'Bluetooth', keys: 'devices' },
  { pane: 'battery', label: 'Battery', keys: 'power low power mode health screen on usage' },
  { pane: 'general', label: 'General', keys: 'about software update storage' },
  { pane: 'accessibility', label: 'Accessibility', keys: 'reduce motion contrast text size' },
  { pane: 'appearance', label: 'Appearance', keys: 'dark mode light accent icon widget style folder color liquid glass' },
  { pane: 'siri', label: 'Apple Intelligence & Siri', keys: 'siri assistant intelligence ask ai' },
  { pane: 'controlcenter', label: 'Control Center', keys: 'modules menu bar' },
  { pane: 'dock', label: 'Desktop & Dock', keys: 'dock position autohide minimize genie hot corners' },
  { pane: 'display', label: 'Displays', keys: 'brightness resolution refresh rate night shift extended display' },
  { pane: 'menubar', label: 'Menu Bar', keys: 'menu bar extras now playing language cv' },
  { pane: 'spotlight', label: 'Spotlight', keys: 'search categories privacy clipboard' },
  { pane: 'wallpaper', label: 'Wallpaper', keys: 'background desktop picture' },
  { pane: 'notifications', label: 'Notifications', keys: 'banners alerts' },
  { pane: 'sound', label: 'Sound', keys: 'volume alert output' },
  { pane: 'focus', label: 'Focus', keys: 'do not disturb' },
  { pane: 'screentime', label: 'Screen Time', keys: 'usage apps date' },
  { pane: 'lock', label: 'Lock Screen', keys: 'lock password' },
  { pane: 'privacy', label: 'Privacy & Security', keys: 'camera microphone location permissions' },
  { pane: 'touchid', label: 'Touch ID & Password', keys: 'password fingerprint passkey' },
  { pane: 'users', label: 'Users & Groups', keys: 'account profile' },
  { pane: 'internet', label: 'Internet Accounts', keys: 'google github linkedin accounts' },
  { pane: 'gamecenter', label: 'Game Center', keys: 'games achievements' },
  { pane: 'wallet', label: 'Wallet & Pay', keys: 'cards passes' },
  { pane: 'keyboard', label: 'Keyboard', keys: 'shortcuts key repeat' },
  { pane: 'trackpad', label: 'Trackpad', keys: 'tap to click scroll zoom tracking speed' },
  { pane: 'printers', label: 'Printers & Scanners', keys: 'print pdf' },
];

/* ───────── Clipboard Search: text copied inside the portfolio ───────── */
let clip = '';
if (typeof document !== 'undefined') {
  document.addEventListener('copy', () => {
    const t = window.getSelection()?.toString().trim();
    if (t) clip = t.slice(0, 500);
  });
}
export const lastClipboard = () => clip;

import { tileRect, type TileZone } from './SystemExtras';
import { sharePortfolio } from '../system/share';
import { t, LANGS } from '../system/i18n';
import { useMusic } from '../system/MusicContext';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { APPS } from '../system/apps';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { cv, personal, socials } from '../data/portfolio';
import { useSystem } from '../system/SystemContext';
import { useScreenTime } from '../system/screenTime';
import { readStore, writeStore } from '../system/storage';
import { AppIcon, type IconName } from './AppIcons';
import type { AppId } from '../system/types';

type Item =
  | { sep: true }
  | { heading: string }
  | {
      label: string;
      action?: () => void;
      shortcut?: string;
      disabled?: boolean;
      checked?: boolean;
      href?: string;
      icon?: IconName;
      submenu?: Item[];
      /** keep the menu open after choosing (e.g. "Copy" feedback) */
      keepOpen?: boolean;
    };

interface Menu {
  id: string;
  label: string;
  bold?: boolean;
  logo?: boolean;
  items: Item[];
  className?: string;
}

function useClock(ms = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

export function Logo() {
  // Original "code" emblem for M.R. Ahamed — used in the menu bar and on the
  // start-up screen. Swap this one SVG to rebrand both places.
  return (
    <svg viewBox="0 0 24 24" className="logo-mark" aria-hidden="true">
      <path d="M8.2 6.2 2.6 12l5.6 5.8M15.8 6.2l5.6 5.8-5.6 5.8M13.6 3.8 10.4 20.2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════ Menu list (with submenus) ═══════════════════════════ */

function MenuList({
  items,
  onDone,
  autoFocus = false,
  sub = false,
  onBack,
  onSide,
  className = '',
  label,
}: {
  items: Item[];
  onDone: () => void;
  autoFocus?: boolean;
  sub?: boolean;
  onBack?: () => void;
  onSide?: (dir: 1 | -1) => void;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<number | null>(null);
  const [subFocus, setSubFocus] = useState(false);
  const [placement, setPlacement] = useState<'right' | 'left' | 'inline'>('right');
  const hoverT = useRef(0);

  const focusables = () =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>(':scope > .mb-item:not(:disabled), :scope > .v5-subwrap > .mb-item:not(:disabled)') ?? []);

  useEffect(() => {
    if (autoFocus) focusables()[0]?.focus({ preventScroll: true });
  }, [autoFocus]);
  useEffect(() => () => window.clearTimeout(hoverT.current), []);

  const openSubAt = (i: number, focus: boolean) => {
    const trigger = ref.current?.querySelector<HTMLElement>(`[data-sub="${i}"]`);
    if (window.innerWidth < 560) setPlacement('inline');
    else {
      const r = trigger?.getBoundingClientRect();
      setPlacement(r && r.right + 250 > window.innerWidth ? 'left' : 'right');
    }
    setSubFocus(focus);
    setOpenSub(i);
  };
  const closeSub = () => {
    const i = openSub;
    setOpenSub(null);
    if (i !== null) ref.current?.querySelector<HTMLElement>(`[data-sub="${i}"]`)?.focus();
  };

  const onKey = (e: RKeyboardEvent) => {
    const els = focusables();
    const idx = els.indexOf(document.activeElement as HTMLElement);
    const move = (n: number) => {
      e.preventDefault();
      e.stopPropagation();
      els[(n + els.length) % els.length]?.focus();
    };
    switch (e.key) {
      case 'ArrowDown':
        return move(idx + 1);
      case 'ArrowUp':
        return move(idx <= 0 ? els.length - 1 : idx - 1);
      case 'Home':
        return move(0);
      case 'End':
        return move(els.length - 1);
      case 'ArrowRight': {
        e.preventDefault();
        e.stopPropagation();
        const si = els[idx]?.dataset.sub;
        if (si != null) openSubAt(Number(si), true);
        else onSide?.(1);
        return;
      }
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        if (sub) onBack?.();
        else onSide?.(-1);
        return;
      case 'Escape':
        if (sub) {
          e.preventDefault();
          e.stopPropagation();
          onBack?.();
        }
        return;
      default:
    }
  };

  return (
    <div ref={ref} className={`mb-dropdown ${className}`} role="menu" aria-label={label} onKeyDown={onKey}>
      {items.map((it, i) => {
        if ('sep' in it) return <div key={i} className="mb-sep" role="separator" />;
        if ('heading' in it)
          return (
            <div key={i} className="v5-mh" role="presentation">
              {it.heading}
            </div>
          );
        const onHover = (e: RPointerEvent) => {
          if (e.pointerType !== 'mouse') return;
          window.clearTimeout(hoverT.current);
          if (it.submenu) {
            if (openSub !== i) hoverT.current = window.setTimeout(() => openSubAt(i, false), 110);
          } else if (openSub !== null) hoverT.current = window.setTimeout(() => setOpenSub(null), 220);
        };
        const inner: ReactNode = (
          <>
            <span className="check">{it.checked ? '✓' : ''}</span>
            {it.icon && <AppIcon name={it.icon} className="v5-mi-icon" />}
            <span className="v5-ml">{it.label}</span>
            {it.shortcut && <span className="shortcut">{it.shortcut}</span>}
            {it.submenu && (
              <svg className="v5-chev" viewBox="0 0 8 12" aria-hidden="true">
                <path d="m2 1.5 4.2 4.5L2 10.5" />
              </svg>
            )}
          </>
        );
        if (it.submenu)
          return (
            <div key={i} className={`v5-subwrap ${openSub === i ? 'on' : ''}`} onPointerEnter={onHover}>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={openSub === i}
                data-sub={i}
                className="mb-item"
                disabled={it.disabled}
                onClick={(e) => (openSub === i ? setOpenSub(null) : openSubAt(i, e.detail === 0))}
              >
                {inner}
              </button>
              {openSub === i && (
                <MenuList items={it.submenu} sub onDone={onDone} autoFocus={subFocus} onBack={closeSub} className={`v5-sub v5-sub-${placement}`} label={it.label} />
              )}
            </div>
          );
        if (it.href)
          return (
            <a
              key={i}
              role="menuitem"
              className="mb-item"
              href={it.href}
              target={it.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              download={it.href === cv.url ? cv.fileName : undefined}
              onClick={onDone}
              onPointerEnter={onHover}
            >
              {inner}
            </a>
          );
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            className="mb-item"
            disabled={it.disabled}
            onPointerEnter={onHover}
            onClick={() => {
              it.action?.();
              if (!it.keepOpen) onDone();
            }}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ About This Mac ═══════════════════════════ */

function browserEngine(): string {
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS/.test(ua)) return 'WebKit (iOS browser)';
  if (/Firefox\//.test(ua)) return 'Gecko (Firefox)';
  if (/Edg\//.test(ua)) return 'Blink (Microsoft Edge)';
  if (/OPR\//.test(ua)) return 'Blink (Opera)';
  if (/SamsungBrowser/.test(ua)) return 'Blink (Samsung Internet)';
  if (/Chrome\/|Chromium\//.test(ua)) return 'Blink (Chromium)';
  if (/AppleWebKit/.test(ua)) return 'WebKit (Safari)';
  return 'Unknown browser engine';
}

function hostOS(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return 'iOS';
  if (/iPad/.test(ua)) return 'iPadOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'this device';
}

/** Original MacBook-style laptop illustration (no brand marks). */
function MacBookArt() {
  return (
    <svg viewBox="0 0 220 132">
      <defs>
        <linearGradient id="mbk-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9dbe0" />
          <stop offset="1" stopColor="#a9adb5" />
        </linearGradient>
        <linearGradient id="mbk-scr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6c5ce7" />
          <stop offset="0.45" stopColor="#e056a0" />
          <stop offset="1" stopColor="#f5a623" />
        </linearGradient>
        <linearGradient id="mbk-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4e6ea" />
          <stop offset="1" stopColor="#9a9ea6" />
        </linearGradient>
      </defs>
      <rect x="34" y="4" width="152" height="104" rx="9" fill="url(#mbk-lid)" />
      <rect x="38" y="8" width="144" height="96" rx="6" fill="#0b0b0d" />
      <rect x="42" y="12" width="136" height="88" rx="3" fill="url(#mbk-scr)" />
      <path d="M42 70c30-18 58 8 88-6s40-10 48-4v40H42Z" fill="rgba(255,255,255,.18)" />
      <rect x="102" y="8" width="16" height="4" rx="2" fill="#0b0b0d" />
      <path d="M8 110h204l-6 10c-1.4 2.4-3.6 4-6.4 4H20.4c-2.8 0-5-1.6-6.4-4Z" fill="url(#mbk-base)" />
      <rect x="92" y="110" width="36" height="4" rx="2" fill="#80848c" />
    </svg>
  );
}

function AboutMac({ onClose, onMore, onCv }: { onClose: () => void; onMore: () => void; onCv: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
  const cores = navigator.hardwareConcurrency;
  const [disk, setDisk] = useState('Portfolio HD');
  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => e.quota && setDisk(`Portfolio HD — ${(e.quota / 1e9).toFixed(e.quota > 1e10 ? 0 : 1)} GB available to this site`))
      .catch(() => undefined);
  }, []);
  const rows: [string, string][] = [
    ['Chip', `${browserEngine()}${cores ? ` · ${cores}-core` : ''}`],
    ['Memory', mem ? `${mem} GB (as reported by the browser)` : 'Not reported by this browser'],
    ['Startup disk', disk],
    ['Display', `${window.screen.width} × ${window.screen.height} @ ${dpr}x`],
    ['Serial number', 'MRA-2026'],
    ['macOS', `Portfolio 9.0 · on ${hostOS()}`],
  ];
  return (
    <div className="v5-about" role="dialog" aria-modal="false" aria-labelledby="v5-about-title">
      <button ref={closeRef} type="button" className="v5-tl-close" aria-label="Close" onClick={onClose}>
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="m2.5 2.5 5 5m0-5-5 5" />
        </svg>
      </button>
      <div className="v9-about-mac" aria-hidden="true">
        <MacBookArt />
      </div>
      <h2 id="v5-about-title">{personal.name}’s Portfolio</h2>
      <p className="v5-about-sub">MacBook-style portfolio · v9 · React 19 + TypeScript</p>
      <dl className="v5-about-rows">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="v5-about-actions">
        <button type="button" className="btn" onClick={onMore}>
          More Info…
        </button>
        <button type="button" className="btn" onClick={onCv}>
          View CV
        </button>
      </div>
      <p className="v5-about-foot">Values come from this browser — nothing is sent anywhere.</p>
    </div>
  );
}

/* ═══════════════════════════ Shut Down / Restart / Log Out confirmation ═══════════════════════════ */

type PowerKind = 'shutdown' | 'restart' | 'logout';
const POWER_TEXT: Record<PowerKind, { title: string; button: string; auto: string }> = {
  shutdown: { title: 'Are you sure you want to shut down your computer now?', button: 'Shut Down', auto: 'the computer will shut down automatically' },
  restart: { title: 'Are you sure you want to restart your computer now?', button: 'Restart', auto: 'the computer will restart automatically' },
  logout: { title: 'Are you sure you want to quit all apps and log out now?', button: 'Log Out', auto: 'you will be logged out automatically' },
};

function PowerConfirm({ kind, onCancel, onConfirm }: { kind: PowerKind; onCancel: () => void; onConfirm: (reopen: boolean) => void }) {
  const [left, setLeft] = useState(60);
  const [reopen, setReopen] = useState(true);
  const okRef = useRef<HTMLButtonElement>(null);
  const reopenRef = useRef(reopen);
  reopenRef.current = reopen;
  const t = POWER_TEXT[kind];

  useEffect(() => {
    okRef.current?.focus({ preventScroll: true });
    const iv = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(iv);
  }, []);
  useEffect(() => {
    if (left <= 0) onConfirm(reopenRef.current);
  }, [left, onConfirm]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div className="v5-sheet-scrim" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="v5-sheet" role="alertdialog" aria-modal="true" aria-labelledby="v5-sheet-title" aria-describedby="v5-sheet-auto">
        <div className="v5-sheet-mark">
          <Logo />
        </div>
        <h2 id="v5-sheet-title">{t.title}</h2>
        <label className="v5-sheet-check">
          <input type="checkbox" checked={reopen} onChange={(e) => setReopen(e.target.checked)} />
          <span>Reopen windows when logging back in</span>
        </label>
        <p id="v5-sheet-auto" className="v5-sheet-auto" aria-live="off">
          If you do nothing, {t.auto} in {Math.max(0, left)} second{left === 1 ? '' : 's'}.
        </p>
        <div className="v5-sheet-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button ref={okRef} type="button" className="btn btn-primary" onClick={() => onConfirm(reopen)}>
            {t.button}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Privacy Shield ═══════════════════════════ */

interface IpInfo {
  ip: string;
  city?: string;
  region?: string;
  cc?: string;
  country?: string;
  org?: string;
  /** only the IP could be looked up (fallback service) */
  partial?: boolean;
}
type ShieldState = { status: 'idle' | 'loading' | 'ok' | 'error'; info?: IpInfo; error?: string; at?: number };

async function fetchJson(url: string, ms = 8000): Promise<Record<string, unknown>> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', credentials: 'omit' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as Record<string, unknown>;
  } finally {
    window.clearTimeout(t);
  }
}

async function lookupIp(): Promise<IpInfo> {
  try {
    const j = await fetchJson('https://ipapi.co/json/');
    if (j.error || typeof j.ip !== 'string') throw new Error(String(j.reason ?? 'lookup failed'));
    const s = (k: string) => (typeof j[k] === 'string' && j[k] ? (j[k] as string) : undefined);
    return { ip: j.ip, city: s('city'), region: s('region'), cc: s('country_code'), country: s('country_name'), org: s('org') };
  } catch {
    const j = await fetchJson('https://api.ipify.org?format=json');
    if (typeof j.ip !== 'string') throw new Error('lookup failed');
    return { ip: j.ip, partial: true };
  }
}

const flag = (cc?: string) =>
  cc && /^[A-Za-z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';

function connectionKind(): 'secure' | 'local' | 'insecure' {
  const h = location.hostname;
  const local = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || h.endsWith('.localhost') || h.endsWith('.local');
  if (location.protocol === 'https:' && window.isSecureContext) return 'secure';
  return local ? 'local' : 'insecure';
}

function useNetwork() {
  const [, force] = useState(0);
  useEffect(() => {
    const on = () => force((n) => n + 1);
    const c = (navigator as Navigator & { connection?: EventTarget }).connection;
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    c?.addEventListener?.('change', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
      c?.removeEventListener?.('change', on);
    };
  }, []);
  const eff = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;
  return { online: navigator.onLine, eff };
}

function ago(at: number | undefined, now: number) {
  if (!at) return 'never';
  const m = Math.floor((now - at) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 22" className={className} aria-hidden="true">
    <path d="M10 1.2 2.2 4.1v6.1c0 5 3.3 8.9 7.8 10.6 4.5-1.7 7.8-5.6 7.8-10.6V4.1Z" />
  </svg>
);

const RowIcon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 20 20" className="v5-sh-ri" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  lock: 'M5.5 9V6.8a4.5 4.5 0 0 1 9 0V9M4 9h12v8.5H4Z',
  ip: 'M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0M3 10h14M10 3c2.2 2.1 2.2 11.9 0 14M10 3c-2.2 2.1-2.2 11.9 0 14',
  pin: 'M10 18s-5.5-5.2-5.5-9.3a5.5 5.5 0 0 1 11 0C15.5 12.8 10 18 10 18ZM10 6.6a2 2 0 1 0 0 4 2 2 0 1 0 0-4',
  isp: 'M4 17.5V3.5h8v14M12 7.5h4v10M2.5 17.5h15M6.5 6.5h1.5M6.5 9.5h1.5M6.5 12.5h1.5M9 6.5h.8M9 9.5h.8M9 12.5h.8',
  net: 'M2.5 7.5a10.6 10.6 0 0 1 15 0M5 10.2a7 7 0 0 1 10 0M7.5 12.8a3.4 3.4 0 0 1 5 0M10 15.6h0',
  v6: 'M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0M11.8 7.2c-.5-.5-1.1-.7-1.8-.7-1.5 0-2.4 1.4-2.4 3.5s.9 3.5 2.4 3.5c1.3 0 2.1-.9 2.1-2.1s-.8-2-2-2c-1.1 0-2 .8-2.3 1.8',
  vpn: 'M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5ZM10 7.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 1 0 0-4.4M3.5 16.5l13-13',
};

function ShieldPanel({ state, onRun, onClose, onSettings, onHide }: { state: ShieldState; onRun: () => void; onClose: () => void; onSettings: () => void; onHide: () => void }) {
  const kind = connectionKind();
  const net = useNetwork();
  const now = useClock(20000).getTime();
  const [copied, setCopied] = useState<'ip' | 'report' | null>(null);
  const [about, setAbout] = useState(false);
  const info = state.info;
  const loading = state.status === 'loading';
  const title = kind === 'secure' ? 'Connection Secure' : kind === 'local' ? 'Local Preview' : 'Not Secure';
  const isV6 = info ? info.ip.includes(':') : undefined;
  const place = info && !info.partial ? [info.city, info.country].filter(Boolean).join(', ') : '';

  const rows: { icon: string; k: string; v: ReactNode }[] = [
    { icon: ICONS.lock, k: 'Connection', v: location.protocol === 'https:' ? 'HTTPS (encrypted)' : 'HTTP (not encrypted)' },
    { icon: ICONS.ip, k: 'IP Address', v: loading ? '…' : (info?.ip ?? '—') },
    {
      icon: ICONS.pin,
      k: 'IP Location',
      v: loading ? '…' : info && !info.partial && info.country ? (
        <>
          <span className="v5-sh-flag">{flag(info.cc)}</span> {info.country}
        </>
      ) : (
        '—'
      ),
    },
    { icon: ICONS.isp, k: 'ISP', v: loading ? '…' : (info?.org ?? '—') },
    { icon: ICONS.net, k: 'Network', v: net.online ? `Online${net.eff ? ` · ${net.eff.toUpperCase()}` : ''}` : 'Offline' },
    { icon: ICONS.v6, k: 'IPv6', v: loading ? '…' : isV6 === undefined ? '—' : isV6 ? 'In use (IPv6 address)' : 'Not in use (IPv4)' },
    { icon: ICONS.vpn, k: 'VPN', v: 'Can’t be detected from a web page' },
  ];

  const report = () =>
    [
      `Privacy Shield report — ${new Date().toLocaleString()}`,
      `Status: ${title}`,
      `Page: ${location.origin}`,
      ...rows.map((r) => `${r.k}: ${r.k === 'IP Location' ? place || '—' : typeof r.v === 'string' ? r.v : '—'}`),
      'Note: VPN use cannot be detected from a web page.',
    ].join('\n');

  const copy = async (text: string, what: 'ip' | 'report') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  // ⌘R / Ctrl+R → Run Full Test, ⌘C → Copy Report (when nothing is selected), ⌘, → Settings
  const reportRef = useRef(report);
  reportRef.current = report;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'r') {
        e.preventDefault();
        onRun();
      } else if (k === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        void copy(reportRef.current(), 'report');
      } else if (k === ',') {
        e.preventDefault();
        onSettings();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRun, onSettings]);

  return (
    <div className={`mb-dropdown v5-sh v5-sh-${kind}`} role="dialog" aria-label="Privacy Shield">
      <div className="v5-sh-head">
        <ShieldIcon className="v5-sh-big" />
        <div className="v5-sh-hd">
          <b>{title}</b>
          {loading ? (
            <span className="v5-sh-ip">
              <span className="spinner v5-sh-spin" /> Checking…
            </span>
          ) : info ? (
            <span className="v5-sh-ip">
              {info.ip}
              <button type="button" className="v5-sh-copy" aria-label="Copy IP address" title="Copy IP address" onClick={() => void copy(info.ip, 'ip')}>
                {copied === 'ip' ? (
                  '✓'
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="5" y="5" width="8.5" height="9.5" rx="1.8" />
                    <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" />
                  </svg>
                )}
              </button>
            </span>
          ) : (
            <span className="v5-sh-ip dim">{kind === 'secure' ? 'This page uses HTTPS' : kind === 'local' ? 'Served from this computer' : 'This page is not encrypted'}</span>
          )}
        </div>
      </div>

      {state.status === 'error' && (
        <div className="v5-sh-err" role="alert">
          <b>{net.online ? 'Couldn’t reach the IP lookup service' : 'You’re offline'}</b>
          <span>
            {net.online
              ? 'It may be blocked by your network or an ad blocker. Local checks below still work.'
              : 'Connect to the internet, then run the test again.'}
          </span>
          <button type="button" className="btn" onClick={onRun}>
            Try Again
          </button>
        </div>
      )}

      <div className="v5-sh-rows">
        {rows.map((r) => (
          <div key={r.k} className="v5-sh-row">
            <RowIcon d={r.icon} />
            <span className="k">{r.k}</span>
            <span className="v">{r.v}</span>
          </div>
        ))}
      </div>
      {info?.partial && <p className="v5-sh-note">Location and ISP unavailable — only the IP could be looked up.</p>}
      <p className="v5-sh-checked">Last checked: {loading ? 'checking…' : ago(state.at, now)}</p>
      <p className="v5-sh-note">Your IP is looked up only when you open this panel.</p>
      {about && (
        <p className="v5-sh-about">
          Privacy Shield shows what any website can see about your connection: the page protocol, your public IP address and its approximate location (via ipapi.co).
          It is not a VPN and does not change your connection.
        </p>
      )}
      <div className="mb-sep" />
      <button type="button" className="mb-item" onClick={onRun} disabled={loading}>
        <span className="v5-ml">Run Full Test</span>
        <span className="shortcut">⌘R</span>
      </button>
      <button type="button" className="mb-item" onClick={() => void copy(report(), 'report')}>
        <span className="v5-ml">{copied === 'report' ? 'Report Copied ✓' : 'Copy Report'}</span>
        <span className="shortcut">⌘C</span>
      </button>
      <div className="mb-sep" />
      <button type="button" className="mb-item" onClick={onSettings}>
        <span className="v5-ml">Settings…</span>
        <span className="shortcut">⌘,</span>
      </button>
      <button type="button" className="mb-item" onClick={() => setAbout((a) => !a)} aria-expanded={about}>
        <span className="v5-ml">About Privacy Shield</span>
      </button>
      <div className="mb-sep" />
      <button
        type="button"
        className="mb-item"
        onClick={() => {
          onHide();
          onClose();
        }}
      >
        <span className="v5-ml">Hide from Menu Bar</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════ Battery ═══════════════════════════ */

type BatteryLike = EventTarget & { level: number; charging: boolean };
function useBattery() {
  const [b, setB] = useState<{ level: number; charging: boolean } | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    if (!nav.getBattery) return;
    let bat: BatteryLike | null = null;
    let dead = false;
    const upd = () => bat && !dead && setB({ level: bat.level, charging: bat.charging });
    nav
      .getBattery()
      .then((x) => {
        bat = x;
        upd();
        x.addEventListener('levelchange', upd);
        x.addEventListener('chargingchange', upd);
      })
      .catch(() => undefined);
    return () => {
      dead = true;
      bat?.removeEventListener('levelchange', upd);
      bat?.removeEventListener('chargingchange', upd);
    };
  }, []);
  return b;
}

/* ═══════════════════════════ Menu bar ═══════════════════════════ */

const REOPEN_KEY = 'mra-reopen-v1';
type Reopen = { ids: AppId[]; at: number; when: 'boot' | 'login' };
const RECENT_HIDE_KEY = 'mra-recent-hidden-v1';
const LOCATION_KEY = 'mra-location-v1';

function tzCity(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const city = tz.split('/').pop()?.replace(/_/g, ' ');
    return city || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export function MenuBar({ onShowTips }: { onShowTips: () => void }) {
  const sys = useSystem();
  const wm = useWM();
  const { settings, update, toggleAppearance } = useSettings();
  const music = useMusic();
  const st = useScreenTime();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [kbd, setKbd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [about, setAbout] = useState(false);
  const [confirm, setConfirm] = useState<PowerKind | null>(null);
  const [shield, setShield] = useState<ShieldState>({ status: 'idle' });
  const [hiddenRecent, setHiddenRecent] = useState<AppId[]>(() => readStore<{ ids: AppId[] }>(RECENT_HIDE_KEY, { ids: [] }).ids);
  const [location, setLocation] = useState<string>(() => readStore<{ loc: string }>(LOCATION_KEY, { loc: 'auto' }).loc);
  const barRef = useRef<HTMLElement>(null);
  const now = useClock();
  const battery = useBattery();

  const focused = wm.focusedId;
  const appName = focused ? APPS[focused].menuName : 'Finder';
  const visible = wm.windows.filter((w) => w.phase !== 'closing');

  const closeMenus = useCallback(() => {
    setOpenMenu(null);
    setKbd(false);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) closeMenus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const btn = barRef.current?.querySelector<HTMLElement>(`[data-menu="${openMenu}"]`);
      closeMenus();
      if (barRef.current?.contains(document.activeElement)) btn?.focus();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenu, closeMenus]);

  // close menus whenever the system changes state (lock, sleep, shutdown …)
  useEffect(() => {
    if (sys.locked || sys.asleep || sys.phase !== 'ready') {
      closeMenus();
      setAbout(false);
      setConfirm(null);
    }
  }, [sys.locked, sys.asleep, sys.phase, closeMenus]);

  /* ── Recent Items: an app opened again after "Clear Menu" reappears ── */
  const recentTop = st.recent[0];
  useEffect(() => {
    if (!recentTop) return;
    setHiddenRecent((h) => {
      if (!h.includes(recentTop)) return h;
      const next = h.filter((x) => x !== recentTop);
      writeStore(RECENT_HIDE_KEY, { ids: next });
      return next;
    });
  }, [recentTop, st.opens]);

  /* ── "Reopen windows when logging back in" ── */
  const prevPhase = useRef(sys.phase);
  const prevLocked = useRef(sys.locked);
  useEffect(() => {
    const bootDone = prevPhase.current !== 'ready' && sys.phase === 'ready';
    const loggedIn = prevLocked.current && !sys.locked;
    prevPhase.current = sys.phase;
    prevLocked.current = sys.locked;
    if (!bootDone && !loggedIn) return;
    const r = readStore<Reopen>(REOPEN_KEY, { ids: [], at: 0, when: 'boot' });
    if (!r.ids.length || (bootDone ? r.when !== 'boot' : r.when !== 'login')) return;
    writeStore(REOPEN_KEY, { ids: [], at: 0, when: 'boot' });
    if (Date.now() - r.at > 30 * 60000) return;
    const timers = r.ids.filter((id) => id in APPS).map((id, i) => window.setTimeout(() => wm.open(id), (bootDone ? 1500 : 450) + i * 140));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [sys.phase, sys.locked, wm]);

  const runPower = useCallback(
    (kind: PowerKind, reopen: boolean) => {
      setConfirm(null);
      const ids = wm.windows.filter((w) => w.phase !== 'closing').map((w) => w.id);
      writeStore(REOPEN_KEY, reopen && ids.length ? { ids, at: Date.now(), when: kind === 'logout' ? 'login' : 'boot' } : { ids: [], at: 0, when: 'boot' });
      if (kind === 'logout') {
        sys.setOverlay('none');
        ids.forEach((id, i) => window.setTimeout(() => wm.close(id), i * 70));
        window.setTimeout(
          () => {
            wm.closeAll();
            sys.logout();
          },
          ids.length ? 420 + ids.length * 70 : 60,
        );
      } else if (kind === 'restart') sys.restart();
      else sys.shutdown();
    },
    [wm, sys],
  );
  const onConfirm = useCallback((reopen: boolean) => confirm && runPower(confirm, reopen), [confirm, runPower]);
  const onCancelConfirm = useCallback(() => setConfirm(null), []);

  /* ── Global shortcuts: ⌃⌘Q lock · ⇧⌘Q log out · ⌥⌘⎋ Force Quit ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sys.phase !== 'ready' || sys.locked || sys.asleep) return;
      const k = e.key.toLowerCase();
      const cmdCtrl = e.metaKey && e.ctrlKey;
      const ctrlAlt = e.ctrlKey && e.altKey && !e.metaKey;
      if (k === 'q' && !e.shiftKey && (cmdCtrl || ctrlAlt)) {
        e.preventDefault();
        sys.lock();
      } else if (k === 'q' && e.shiftKey && ((e.metaKey && !e.ctrlKey && !e.altKey) || ctrlAlt)) {
        e.preventDefault();
        setConfirm('logout');
      } else if (e.key === 'Escape' && ((e.metaKey && e.altKey) || ctrlAlt)) {
        e.preventDefault();
        closeMenus();
        sys.setOverlay('forcequit');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sys, closeMenus]);

  /* ── Privacy Shield ── */
  const runShield = useCallback(() => {
    setShield((s) => ({ ...s, status: 'loading' }));
    if (!navigator.onLine) {
      window.setTimeout(() => setShield((s) => ({ status: 'error', error: 'offline', at: Date.now(), info: s.info })), 350);
      return;
    }
    lookupIp()
      .then((info) => setShield({ status: 'ok', info, at: Date.now() }))
      .catch((err: unknown) => setShield({ status: 'error', error: String(err), at: Date.now() }));
  }, []);
  useEffect(() => {
    if (openMenu === 'shield' && shield.status === 'idle') runShield();
  }, [openMenu, shield.status, runShield]);

  const go = (id: AppId, args?: Record<string, string>) => () => wm.open(id, args);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(personal.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = socials.email;
    }
  };
  const fullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* not supported */
    }
  };

  const city = tzCity();
  const recent = st.recent.filter((id) => id in APPS && !hiddenRecent.includes(id)).slice(0, 8);
  const setLoc = (loc: string) => {
    setLocation(loc);
    writeStore(LOCATION_KEY, { loc });
  };

  const tileFocused = (z: TileZone) => {
    if (!focused || window.innerWidth < 700) return;
    const el = document.querySelector<HTMLElement>(`[data-win-id="${focused}"]`);
    el?.classList.add('snapping');
    window.setTimeout(() => el?.classList.remove('snapping'), 380);
    wm.setRect(focused, tileRect(z));
  };

  const menus: Menu[] = [
    {
      id: 'logo',
      label: 'Menu',
      logo: true,
      className: 'v5-main',
      items: [
        { label: 'About This Mac', action: () => setAbout(true) },
        { sep: true },
        { label: 'About This Portfolio', action: go('about') },
        { label: 'Hire Me…', action: go('hireme') },
        { label: 'Open CV…', action: go('preview') },
        { label: t('downloadCv'), href: cv.url },
        { label: 'Share Portfolio…', action: () => void sharePortfolio() },
        { label: 'GitHub Profile', href: socials.github },
        { label: 'LinkedIn Profile', href: socials.linkedin },
        { sep: true },
        { label: 'System Settings…', action: go('settings') },
        {
          label: 'Location',
          submenu: [
            { label: `Automatic (${city})`, checked: location === 'auto', action: () => setLoc('auto') },
            { label: personal.location, checked: location === 'kandy', action: () => setLoc('kandy') },
          ],
        },
        { label: 'App Store…', action: go('appstore') },
        { sep: true },
        {
          label: 'Recent Items',
          submenu: [
            { heading: 'Applications' },
            ...(recent.length
              ? recent.map((id): Item => ({ label: APPS[id].title, icon: APPS[id].icon, action: go(id) }))
              : [{ label: 'No Recent Items', disabled: true } as Item]),
            { sep: true },
            {
              label: 'Clear Menu',
              disabled: !recent.length,
              action: () => {
                const ids = Array.from(new Set([...hiddenRecent, ...st.recent]));
                setHiddenRecent(ids);
                writeStore(RECENT_HIDE_KEY, { ids });
              },
            },
          ],
        },
        { sep: true },
        { label: 'Force Quit…', shortcut: '⌥⌘⎋', action: () => sys.setOverlay('forcequit') },
        { sep: true },
        { label: t('sleep'), action: sys.sleep },
        { label: t('restart'), action: () => setConfirm('restart') },
        { label: t('shutDown'), action: () => setConfirm('shutdown') },
        { sep: true },
        { label: t('lockScreen'), shortcut: '⌃⌘Q', action: () => sys.lock() },
        { label: `Log Out ${personal.name}…`, shortcut: '⇧⌘Q', action: () => setConfirm('logout') },
      ],
    },
    {
      id: 'app',
      label: appName,
      bold: true,
      items: [
        { label: `About ${appName}`, action: go('about') },
        { sep: true },
        { label: 'Settings…', action: go('settings'), shortcut: '⌘,' },
        { sep: true },
        { label: `Hide ${appName}`, action: () => focused && wm.minimize(focused), disabled: !focused },
        { label: `Quit ${appName}`, action: () => focused && wm.close(focused), disabled: !focused },
      ],
    },
    {
      id: 'file',
      label: t('mFile'),
      items: [
        { label: 'New Message', action: go('mail', { compose: '1' }) },
        { label: 'Open CV', action: go('preview') },
        { label: t('downloadCv'), href: cv.url },
        { label: 'Share…', action: () => void sharePortfolio() },
        { sep: true },
        { label: 'Close Window', action: () => focused && wm.close(focused), disabled: !focused },
      ],
    },
    {
      id: 'edit',
      label: t('mEdit'),
      items: [
        { label: copied ? 'Copied ✓' : 'Copy Email Address', action: () => void copyEmail(), keepOpen: true },
        { label: 'Copy Phone Number', action: () => void navigator.clipboard?.writeText(personal.phone).catch(() => undefined), keepOpen: true },
      ],
    },
    {
      id: 'view',
      label: t('mView'),
      items: [
        { label: 'Dark Mode', action: toggleAppearance, checked: settings.appearance === 'dark' },
        { label: sys.fullscreen ? 'Exit Full Screen' : 'Enter Full Screen', action: fullscreen, shortcut: '⌃⌘F' },
        { label: 'Control Center', action: () => sys.setOverlay('control') },
        { label: 'Notification Center', action: () => sys.setOverlay('notifications') },
      ],
    },
    {
      id: 'go',
      label: t('mGo'),
      items: [
        { label: 'About Me', action: go('about') },
        { label: 'Projects', action: go('xcode') },
        { label: 'Skills', action: go('notes') },
        { label: 'Experience', action: go('finder', { folder: 'experience' }) },
        { label: 'Education', action: go('finder', { folder: 'education' }) },
        { label: 'Achievements', action: go('slides') },
        { label: 'Contact', action: go('mail', { compose: '1' }) },
        { label: 'Terminal', action: go('terminal') },
        { label: 'Photos', action: go('photos') },
        { label: 'Messages', action: go('messages') },
        { label: 'Calendar', action: go('calendar') },
        { label: 'Music', action: go('music') },
        { label: 'Reminders', action: go('reminders') },
        { label: 'Maps', action: go('maps') },
        { label: 'Google', action: go('google') },
        { label: 'Contacts', action: go('contacts') },
        { label: 'Clock', action: go('clock') },
        { label: 'Calculator', action: go('calculator') },
        { sep: true },
        { label: 'Launchpad', action: () => sys.setOverlay('launchpad') },
        { label: 'Spotlight Search', action: () => sys.setOverlay('spotlight'), shortcut: '⌘Space' },
      ],
    },
    {
      id: 'window',
      label: t('mWindow'),
      items: [
        { label: 'Minimize', action: () => focused && wm.minimize(focused), disabled: !focused, shortcut: '⌥M' },
        { label: 'Zoom', action: () => focused && wm.toggleMaximize(focused), disabled: !focused },
        { label: 'Tile Window to Left of Screen', action: () => tileFocused('left'), disabled: !focused, shortcut: '⌃⌥←' },
        { label: 'Tile Window to Right of Screen', action: () => tileFocused('right'), disabled: !focused, shortcut: '⌃⌥→' },
        { label: 'Center', action: () => tileFocused('center'), disabled: !focused, shortcut: '⌃⌥↓' },
        { sep: true },
        { label: 'Stage Manager', checked: settings.stageManager, action: () => update({ stageManager: !settings.stageManager }), shortcut: '⌃⌥S' },
        { label: 'Mission Control', action: () => sys.setOverlay('missioncontrol'), shortcut: 'F3' },
        { label: 'Bring All to Front', action: () => visible.forEach((w) => wm.open(w.id)), disabled: !visible.length },
        ...(visible.length ? [{ sep: true } as Item] : []),
        ...visible.map((w): Item => ({ label: w.args?.title ?? APPS[w.id].title, action: go(w.id), checked: w.id === focused })),
      ],
    },
    {
      id: 'help',
      label: t('mHelp'),
      items: [
        { label: 'Show Tips', action: onShowTips },
        { label: 'Keyboard Shortcuts', action: () => window.dispatchEvent(new Event('mra-shortcuts')), shortcut: '⌃/' },
        { label: 'Ask Me AI', action: go('askai') },
        { label: 'Case Studies', action: go('casestudies') },
        { label: 'Sign the Guestbook', action: go('guestbook') },
        { sep: true },
        { label: 'GitHub — Ahamed369', href: socials.github },
        { label: 'LinkedIn — M.R. Ahamed', href: socials.linkedin },
      ],
    },
  ];

  const HIDE_SM = ['file', 'edit', 'view', 'go'];
  const side = (dir: 1 | -1) => {
    const ids = menus.map((m) => m.id).filter((id) => window.innerWidth > 900 || !HIDE_SM.includes(id));
    const i = ids.indexOf(openMenu ?? '');
    if (i === -1) return;
    setKbd(true);
    setOpenMenu(ids[(i + dir + ids.length) % ids.length]);
  };

  const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const kind = connectionKind();
  const pill = kind === 'secure' ? 'OK' : kind === 'local' ? 'Local' : 'HTTP';
  const batPct = battery ? Math.round(battery.level * 100) : null;

  return (
    <>
      <header className="menubar v5-menubar" ref={barRef}>
        <nav className="menubar-left" aria-label="Menu bar">
          {menus.map((m) => (
            <div key={m.id} className={`mb-menu ${HIDE_SM.includes(m.id) ? 'hide-sm' : ''}`}>
              <button
                type="button"
                data-menu={m.id}
                className={`mb-btn ${m.bold ? 'bold' : ''} ${m.logo ? 'v5-logo-btn' : ''} ${openMenu === m.id ? 'open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={openMenu === m.id}
                aria-label={m.logo ? 'Main menu' : undefined}
                onClick={(e) => {
                  setKbd(e.detail === 0);
                  setOpenMenu((o) => (o === m.id ? null : m.id));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setKbd(true);
                    setOpenMenu(m.id);
                  }
                }}
                onPointerEnter={() => openMenu && openMenu !== m.id && openMenu !== 'shield' && setOpenMenu(m.id)}
              >
                {m.logo ? <Logo /> : m.label}
              </button>
              {openMenu === m.id && (
                <MenuList key={m.id} items={m.items} onDone={closeMenus} autoFocus={kbd} onSide={side} className={m.className} label={m.logo ? 'Main menu' : m.label} />
              )}
            </div>
          ))}
        </nav>
        <div className="menubar-right">
          {settings.showShield && (
            <div className="mb-menu v5-sh-wrap">
              <button
                type="button"
                data-menu="shield"
                className={`mb-btn v5-sh-pill v5-sh-pill-${kind} ${openMenu === 'shield' ? 'open' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={openMenu === 'shield'}
                aria-label={`Privacy Shield: ${pill}`}
                title="Privacy Shield"
                onClick={() => setOpenMenu((o) => (o === 'shield' ? null : 'shield'))}
              >
                <svg viewBox="0 0 20 22" aria-hidden="true">
                  <path d="M10 1.2 2.2 4.1v6.1c0 5 3.3 8.9 7.8 10.6 4.5-1.7 7.8-5.6 7.8-10.6V4.1Z" />
                  {kind === 'insecure' ? (
                    <path d="M10 6.5v5.2M10 14.6v.1" className="v5-sh-glyph" />
                  ) : (
                    <path d="m6.6 11 2.3 2.3 4.6-5" className="v5-sh-glyph" />
                  )}
                </svg>
                <span className="v5-sh-pill-t">{pill}</span>
              </button>
              {openMenu === 'shield' && (
                <ShieldPanel
                  state={shield}
                  onRun={runShield}
                  onClose={closeMenus}
                  onSettings={() => {
                    closeMenus();
                    wm.open('settings', { pane: 'controlcenter' });
                  }}
                  onHide={() => update({ showShield: false })}
                />
              )}
            </div>
          )}
          {sys.focus && (
            <span className="mb-status" title="Focus is on" aria-label="Focus is on">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M9.6 1.6a6.6 6.6 0 1 0 5 10.6A6 6 0 0 1 9.6 1.6Z" />
              </svg>
            </span>
          )}
          {music.playing && settings.menuExtras?.nowPlaying !== false && (
            <button type="button" className="mb-btn mb-extra mb-np" title={`Now playing — ${music.track.title}`} onClick={() => wm.open('music')}>
              <span className="eq" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {music.track.title}
            </button>
          )}
          {settings.menuExtras?.cv !== false && (
          <a className="mb-btn mb-extra mb-cv" href={cv.url} download={cv.fileName} title={t('downloadCv')} aria-label={t('downloadCv')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.8v8.4M4.6 7l3.4 3.4L11.4 7M2.5 12.2v1.3c0 .4.3.7.7.7h9.6c.4 0 .7-.3.7-.7v-1.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>CV</span>
          </a>
          )}
          {settings.menuExtras?.language !== false && (
          <button
            type="button"
            className="mb-btn mb-extra mb-lang hide-xs"
            title={`${t('language')}: ${LANGS.find((l) => l.id === settings.language)?.native ?? 'English'} — click to switch`}
            aria-label={`${t('language')}: ${LANGS.find((l) => l.id === settings.language)?.label ?? 'English'}`}
            onClick={() => {
              const i = LANGS.findIndex((l) => l.id === settings.language);
              update({ language: LANGS[(i + 1) % LANGS.length].id });
            }}
          >
            {settings.language === 'si' ? 'සි' : settings.language === 'ta' ? 'த' : 'EN'}
          </button>
          )}
          <button type="button" className="mb-btn icon" aria-label="Toggle dark mode" title="Toggle dark mode" onClick={toggleAppearance}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {settings.appearance === 'dark' ? (
                <g>
                  <circle cx="8" cy="8" r="3.2" />
                  {Array.from({ length: 8 }, (_, i) => (
                    <rect key={i} x="7.4" y="0.6" width="1.2" height="2.6" rx=".6" transform={`rotate(${i * 45} 8 8)`} />
                  ))}
                </g>
              ) : (
                <path d="M6.2 1.2a6.8 6.8 0 1 0 8.6 8.6A5.6 5.6 0 0 1 6.2 1.2Z" />
              )}
            </svg>
          </button>
          <span
            className="mb-status hide-xs v5-bat"
            role="img"
            aria-label={batPct !== null ? `Battery ${batPct}%${battery?.charging ? ', charging' : ''}` : 'Battery level not available in this browser'}
            title={batPct !== null ? `Battery ${batPct}%${battery?.charging ? ' — charging' : ''}` : 'Battery level not available in this browser'}
          >
            {settings.showBatteryPct && batPct !== null && <span className="v5-bat-pct">{batPct}%</span>}
            <svg viewBox="0 0 26 13" aria-hidden="true">
              <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".55" />
              <rect x="2" y="2" width={Math.max(1.5, 19 * (battery ? battery.level : 1))} height="9" rx="2" className={battery && battery.level <= 0.2 && !battery.charging ? 'v5-bat-low' : ''} />
              <rect x="23.5" y="4.2" width="1.8" height="4.6" rx=".9" opacity=".55" />
              {battery?.charging && <path d="M12.6 1.8 8.4 7h3l-1 4.3L14.6 6h-3Z" className="v5-bat-bolt" />}
            </svg>
          </span>
          <span className={`mb-status hide-xs ${sys.wifi ? '' : 'off'}`} aria-hidden="true">
            <svg viewBox="0 0 18 13">
              <path d="M9 12.4 11.2 10a3.2 3.2 0 0 0-4.4 0Z" />
              <path d="M9 6.2a6.4 6.4 0 0 1 4.6 1.9l1.3-1.4a8.4 8.4 0 0 0-11.8 0l1.3 1.4A6.4 6.4 0 0 1 9 6.2Z" />
              <path d="M9 1.9a10.7 10.7 0 0 1 7.6 3.1L18 3.6a12.7 12.7 0 0 0-18 0L1.4 5A10.7 10.7 0 0 1 9 1.9Z" />
            </svg>
          </span>
          <button type="button" className="mb-btn icon" aria-label="Spotlight Search" title="Spotlight (⌘/Ctrl + Space)" onClick={() => sys.toggleOverlay('spotlight')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="m10.3 10.3 3.9 3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className={`mb-btn icon ${sys.overlay === 'control' ? 'open' : ''}`}
            aria-label="Control Center"
            aria-expanded={sys.overlay === 'control'}
            data-cc-toggle
            onClick={() => sys.toggleOverlay('control')}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1" y="2" width="14" height="5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="11.5" cy="4.5" r="1.6" />
              <rect x="1" y="9" width="14" height="5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="4.5" cy="11.5" r="1.6" />
            </svg>
          </button>
          <button
            type="button"
            className={`mb-btn mb-clock ${sys.overlay === 'notifications' ? 'open' : ''}`}
            aria-label="Notification Center"
            aria-expanded={sys.overlay === 'notifications'}
            data-nc-toggle
            onClick={() => sys.toggleOverlay('notifications')}
          >
            <time dateTime={now.toISOString()}>
              <span className="hide-xs">{dateStr}&nbsp;&nbsp;</span>
              {timeStr}
            </time>
            {sys.unreadCount > 0 && sys.overlay !== 'notifications' && (
              <span className="mb-nf-badge" aria-label={`${sys.unreadCount} unread notifications`}>
                {sys.unreadCount > 9 ? '9+' : sys.unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

{createPortal(
        <>
      {about && (
        <AboutMac
          onClose={() => setAbout(false)}
          onMore={() => {
            setAbout(false);
            wm.open('settings', { pane: 'general' });
          }}
          onCv={() => {
            setAbout(false);
            wm.open('preview');
          }}
        />
      )}
      {confirm && <PowerConfirm key={confirm} kind={confirm} onCancel={onCancelConfirm} onConfirm={onConfirm} />}
        </>,
        document.body,
      )}
    </>
  );
}
